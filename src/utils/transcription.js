import { draftSubtitles } from './subtitles.js';

export const AUDIO_RATE = 16000;
export const MAX_AUDIO_SECONDS = 120;

// Cut near low-energy boundaries, so words are less likely to be split.
export function planAudioChunks(audio, sampleRate = AUDIO_RATE) {
  if (!(audio instanceof Float32Array) || !audio.length || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('No se encontró audio válido para transcribir.');
  }
  if (audio.length / sampleRate > MAX_AUDIO_SECONDS + 0.05) throw new Error('El audio supera los 2 minutos.');
  if (audio.some(sample => !Number.isFinite(sample))) throw new Error('El audio contiene muestras inválidas.');
  const chunks = [];
  const frame = Math.max(1, Math.round(sampleRate * 0.12));
  let start = 0;
  while (start < audio.length) {
    let end = audio.length;
    if (audio.length - start > sampleRate * 22) {
      const low = start + Math.round(sampleRate * 16);
      const high = Math.min(audio.length, start + Math.round(sampleRate * 20));
      let best = Infinity;
      for (let position = low; position + frame <= high; position += Math.max(1, Math.round(sampleRate * 0.04))) {
        let energy = 0;
        for (let j = position; j < position + frame; j++) energy += audio[j] * audio[j];
        // Prefer the central boundary when energy is equal.
        const score = energy / frame + Math.abs(position - start - sampleRate * 18) / sampleRate * 1e-7;
        if (score < best) { best = score; end = position + Math.floor(frame / 2); }
      }
    }
    chunks.push({ start, end });
    start = end;
  }
  return chunks;
}

function isSilent(samples) {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length) < 0.0001;
}

export function offsetRecognition(result, offset, duration) {
  const chunks = [];
  let invalid = false;
  for (const cue of result.chunks || []) {
    const text = String(cue.text || '').trim();
    if (!text) continue;
    const start = Math.max(0, Number(cue.timestamp?.[0] ?? 0));
    const end = Math.min(duration, Number(cue.timestamp?.[1] ?? duration));
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { invalid = true; continue; }
    chunks.push({ text, timestamp: [offset + start, offset + end] });
  }
  const text = String(result.text || (result.chunks || []).map(cue => cue.text || '').join(' ')).trim();
  if ((invalid || !chunks.length) && text) {
    // Keep recognized words even when Whisper emits a zero-length timestamp.
    // These are explicitly approximate timings, restricted to the known audio window.
    return { approximateTiming: true, chunks: draftSubtitles(text, duration).map(cue => ({ text: cue.text, timestamp: [offset + cue.start, offset + cue.end] })) };
  }
  return { approximateTiming: false, chunks };
}

export async function transcribeInChunks({ audio, recognizer, language, onProgress = () => {}, createStreamer }) {
  const plan = planAudioChunks(audio);
  const combined = [];
  let approximateTiming = false;
  for (let index = 0; index < plan.length; index++) {
    const { start, end } = plan[index];
    const offset = start / AUDIO_RATE;
    const samples = audio.subarray(start, end);
    const progress = { index: index + 1, total: plan.length, processedSeconds: offset, totalSeconds: audio.length / AUDIO_RATE };
    onProgress({ status: 'chunk-start', ...progress });
    if (!isSilent(samples)) {
      const result = await recognizer(samples, {
        language, task: 'transcribe', return_timestamps: true,
        max_new_tokens: 192, num_beams: 1, do_sample: false,
        ...(createStreamer ? { streamer: createStreamer(progress) } : {}),
      });
      const normalized = offsetRecognition(result, offset, samples.length / AUDIO_RATE);
      combined.push(...normalized.chunks);
      approximateTiming ||= normalized.approximateTiming;
    }
    const result = { text: combined.map(cue => cue.text).join(' '), chunks: combined.slice(), approximateTiming };
    onProgress({ status: 'partial', ...progress, processedSeconds: end / AUDIO_RATE, result });
  }
  if (!combined.length) throw new Error('No se detectó voz con tiempos válidos. Comprueba que el archivo tenga audio audible.');
  return { text: combined.map(cue => cue.text).join(' '), chunks: combined, approximateTiming };
}

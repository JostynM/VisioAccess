// Opt-in benchmark: downloads a public model and processes local PCM. Not part of CI.
import fs from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pipeline, env } from '@huggingface/transformers';
import { transcribeInChunks } from '../src/utils/transcription.js';
import { TRANSCRIPTION_MODEL, TRANSCRIPTION_REVISION } from '../src/utils/transcriptionModel.js';
import { wordErrorRate } from './transcription-metrics.js';
const { values } = parseArgs({ options: {
  pcm: { type: 'string' }, reference: { type: 'string', default: 'tests/fixtures/blindsense-reference.json' },
  model: { type: 'string', default: TRANSCRIPTION_MODEL },
  report: { type: 'string' }, 'max-wer': { type: 'string', default: '0.25' }, legacy: { type: 'boolean', default: false },
} });
if (!values.pcm) throw new Error('Usa --pcm audio.f32le (mono, 16000 Hz, float32 little-endian).');
const maxWer = Number(values['max-wer']);
if (!Number.isFinite(maxWer) || maxWer < 0) throw new Error('--max-wer debe ser un número positivo.');
const bytes = await fs.readFile(values.pcm);
if (bytes.length % 4) throw new Error('PCM float32 inválido.');
const audio = new Float32Array(bytes.length / 4);
for (let i = 0; i < audio.length; i++) audio[i] = bytes.readFloatLE(i * 4);
const reference = JSON.parse(await fs.readFile(values.reference, 'utf8'));
env.allowLocalModels = false;
env.cacheDir = process.env.VISIO_MODEL_CACHE || '.cache/models';
let recognizer;
const start = performance.now();
try {
  recognizer = await pipeline('automatic-speech-recognition', values.model, { dtype: 'q8', device: 'cpu', ...(values.model === TRANSCRIPTION_MODEL ? { revision: TRANSCRIPTION_REVISION } : {}) });
  const result = await transcribeInChunks({ audio, language: 'spanish',
    recognizer: (samples, options) => recognizer(samples, values.legacy
      ? { ...options, repetition_penalty: 1, no_repeat_ngram_size: 0 } : options),
    onProgress: event => { if (event.status === 'partial') console.error(`Fragmento ${event.index}/${event.total}`); },
  });
  const metrics = wordErrorRate(reference.text, result.text);
  const report = { model: values.model, revision: values.model === TRANSCRIPTION_MODEL ? TRANSCRIPTION_REVISION : 'main', dtype: 'q8', legacy: values.legacy, audioSeconds: audio.length / 16000,
    secondsIncludingLoad: (performance.now() - start) / 1000, maxRssKiB: process.resourceUsage().maxRSS,
    ...metrics, lowConfidence: result.lowConfidence, approximateTiming: result.approximateTiming,
    accepted: metrics.wer <= maxWer && !result.lowConfidence, result };
  if (values.report) await fs.writeFile(values.report, JSON.stringify(report, null, 2) + '\n');
  const { result: _result, ...summary } = report;
  console.log(JSON.stringify(summary, null, 2));
  if (!report.accepted) process.exitCode = 1;
} finally { await recognizer?.dispose(); }

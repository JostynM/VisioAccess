import { pipeline, env, WhisperTextStreamer } from '@huggingface/transformers';
import { transcribeInChunks } from '../utils/transcription';

env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let transcriber;
self.onmessage = async ({ data }) => {
  let phase = 'loading';
  try {
    self.postMessage({ status: 'loading', message: 'Cargando el reconocimiento de voz. La primera descarga puede tardar varios minutos.' });
    transcriber ||= await pipeline('automatic-speech-recognition', 'onnx-community/whisper-small', {
      dtype: 'q8', device: 'wasm',
      progress_callback: event => {
        if (event.status === 'progress') self.postMessage({ status: 'progress', message: `Descargando ${event.file || 'modelo'}: ${Math.round(event.progress || 0)}%` });
      },
    });
    phase = 'recognition';
    const result = await transcribeInChunks({
      audio: data.audio, language: data.language, recognizer: transcriber,
      onProgress: event => self.postMessage(event),
      createStreamer: progress => {
        let last = 0;
        return new WhisperTextStreamer(transcriber.tokenizer, {
          skip_prompt: true,
          callback_function: () => {},
          token_callback_function: () => {
            const now = Date.now();
            if (now - last < 1000) return;
            last = now;
            self.postMessage({ status: 'progress', message: `Reconociendo fragmento ${progress.index} de ${progress.total}...` });
          },
        });
      },
    });
    self.postMessage({ status: 'complete', result });
  } catch (error) {
    console.error('Transcription failed', phase, error);
    const message = phase === 'loading'
      ? 'No se pudo cargar el modelo de voz. Comprueba la conexión y vuelve a intentarlo.'
      : error.message || 'No se pudo terminar el reconocimiento. Puedes conservar y descargar los fragmentos ya procesados.';
    self.postMessage({ status: 'error', message });
  }
};

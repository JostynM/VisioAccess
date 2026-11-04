import { pipeline, env } from '@huggingface/transformers';
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let transcriber;
self.onmessage = async ({data}) => {
  try {
    transcriber ||= await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      dtype: 'q8', device: 'wasm',
      progress_callback: event => {
        if (event.status === 'progress') self.postMessage({status:'progress',message:`Descargando reconocimiento de voz: ${Math.round(event.progress || 0)}%`});
      },
    });
    self.postMessage({status:'progress',message:'Transcribiendo audio en tu dispositivo...'});
    const result = await transcriber(data.audio, { language:data.language, task:'transcribe', return_timestamps:true, chunk_length_s:30, stride_length_s:5 });
    self.postMessage({status:'complete',result});
  } catch {
    transcriber = null;
    self.postMessage({status:'error',message:'No se pudo transcribir. Comprueba la conexión para descargar el modelo y utiliza un archivo corto con voz clara.'});
  }
};

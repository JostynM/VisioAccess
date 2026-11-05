import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_RATE, planAudioChunks, offsetRecognition, transcribeInChunks } from '../src/utils/transcription.js';

const speech = seconds => new Float32Array(Math.round(seconds * AUDIO_RATE)).fill(0.1);
test('long audio is covered once, without gaps and with bounded windows', () => {
  const audio = speech(105.43);
  const plan = planAudioChunks(audio);
  assert.equal(plan[0].start, 0);
  assert.equal(plan.at(-1).end, audio.length);
  plan.forEach((chunk, index) => {
    assert.ok(chunk.end > chunk.start);
    assert.ok((chunk.end - chunk.start) / AUDIO_RATE <= 22);
    if (index) assert.equal(chunk.start, plan[index - 1].end);
  });
});
test('audio boundaries prefer silence without deleting samples', () => {
  const audio = speech(40); audio.fill(0,17*AUDIO_RATE,17.5*AUDIO_RATE);
  const plan = planAudioChunks(audio);
  assert.ok(plan[0].end >= 17*AUDIO_RATE && plan[0].end <= 17.5*AUDIO_RATE);
});
test('valid timestamps are offset into the video timeline', () => {
  const result = offsetRecognition({ chunks:[{text:'Hola',timestamp:[-1,2]},{text:'Final',timestamp:[4,null]}] },18,6);
  assert.deepEqual(result.chunks,[{text:'Hola',timestamp:[18,20]},{text:'Final',timestamp:[22,24]}]);
  assert.equal(result.approximateTiming,false);
});
test('zero-length model timestamps retain recognized words with explicit approximate timing', () => {
  const result=offsetRecognition({text:'Texto reconocido que no debe perderse.',chunks:[{text:'Texto reconocido que no debe perderse.',timestamp:[0,0]}]},18,6);
  assert.equal(result.approximateTiming,true);
  assert.equal(result.chunks.map(c=>c.text).join(' '),'Texto reconocido que no debe perderse.');
  assert.equal(result.chunks[0].timestamp[0],18);
  assert.equal(result.chunks.at(-1).timestamp[1],24);
});
test('sequential inference provides partial results with global timestamps and bounded generation', async () => {
  let running=0,maxRunning=0,calls=0;
  const events=[];
  const result=await transcribeInChunks({audio:speech(45),language:'spanish',onProgress:event=>events.push(event),recognizer:async(audio,options)=>{
    running++;maxRunning=Math.max(maxRunning,running);calls++;
    assert.equal(options.max_new_tokens,192);assert.equal(options.language,'spanish');
    assert.equal(options.no_repeat_ngram_size,6);assert.equal(options.repetition_penalty,1.1);
    await Promise.resolve();running--;
    return {text:`Parte ${calls}`,chunks:[{text:`Parte ${calls}`,timestamp:[0,audio.length/AUDIO_RATE]}]};
  }});
  assert.equal(maxRunning,1);assert.ok(calls>1);
  assert.equal(events.filter(e=>e.status==='partial').length,calls);
  assert.equal(result.chunks.at(-1).timestamp[1],45);
  assert.match(events.find(e=>e.status==='partial').result.text,/Parte 1/);
  assert.equal(events.find(e=>e.status==='partial').result.chunks.length,1);
});
test('a failure in later audio preserves previously published partial results', async () => {
  const events=[];let calls=0;
  await assert.rejects(transcribeInChunks({audio:speech(45),onProgress:event=>events.push(event),recognizer:async()=>{
    if(++calls===2)throw new Error('inference failed');
    return {text:'Primera parte',chunks:[{text:'Primera parte',timestamp:[0,1]}]};
  }}),/inference failed/);
  assert.equal(events.filter(e=>e.status==='partial').length,1);
  assert.equal(events.find(e=>e.status==='partial').result.text,'Primera parte');
});
test('silence is not sent to recognition, and empty or excessive audio is rejected', async () => {
  let called=false;
  await assert.rejects(transcribeInChunks({audio:new Float32Array(AUDIO_RATE),recognizer:async()=>{called=true;}}),/No se detectó voz/);
  assert.equal(called,false);
  assert.throws(()=>planAudioChunks(speech(121)),/2 minutos/);
  assert.throws(()=>planAudioChunks(new Float32Array()),/audio válido/);
});


test('repeated model phrases are flagged without discarding recognized words', async () => {
  const { hasRepetitiveText } = await import('../src/utils/transcription.js');
  assert.equal(hasRepetitiveText('Una descripción clara de objetos y distancias para orientar al usuario.'), false);
  const repeated = 'Esta es una prueba. '.repeat(8);
  assert.equal(hasRepetitiveText(repeated), true);
  const result = await transcribeInChunks({ audio: new Float32Array(16000).fill(0.1), recognizer: async () => ({ text: repeated, chunks: [{ text: repeated, timestamp: [0, 1] }] }) });
  assert.equal(result.lowConfidence, true);
  assert.match(result.text, /Esta es una prueba/);
});

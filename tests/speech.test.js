import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import useSpeech from '../src/hooks/useSpeech.js';

test('long reading continues in chunks, supports pause/stop and releases speech on unmount', async()=>{
  const dom=new JSDOM('<div id="root"></div>');
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const utterances=[];let cancels=0,pauses=0,resumes=0;
  window.speechSynthesis={speak:u=>utterances.push(u),cancel:()=>cancels++,pause:()=>pauses++,resume:()=>resumes++};
  globalThis.SpeechSynthesisUtterance=window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
  let speech;
  function Harness(){const api=useSpeech();React.useEffect(()=>{speech=api;});return null;}
  const root=createRoot(document.getElementById('root'));
  await act(()=>root.render(React.createElement(Harness)));
  const text='Información accesible para todos. '.repeat(35);
  await act(()=>speech.speak(text));assert.equal(speech.isSpeaking,true);assert.ok(utterances[0].text.length<=221);
  await act(()=>speech.pauseOrResume());assert.equal(speech.isPaused,true);assert.equal(pauses,1);
  await act(()=>speech.pauseOrResume());assert.equal(resumes,1);
  let index=0;while(speech.isSpeaking){await act(()=>utterances[index++].onend());}
  assert.equal(utterances.map(u=>u.text).join(''),text);
  await act(()=>speech.speak('Otra lectura'));
  const stale=utterances.at(-1);
  await act(()=>speech.stop());await act(()=>stale.onend());assert.equal(speech.isSpeaking,false);
  await act(()=>speech.speak('Prueba error'));await act(()=>utterances.at(-1).onerror({error:'synthesis-unavailable'}));
  assert.match(speech.speechError,/no pudo reproducir/);
  const before=cancels;await act(()=>root.unmount());assert.ok(cancels>before);
  dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.SpeechSynthesisUtterance;
});

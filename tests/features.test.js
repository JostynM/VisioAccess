import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePreferences } from '../src/utils/preferences.js';
import { draftSubtitles, parseSubtitles, serializeSubtitles, validateCues } from '../src/utils/subtitles.js';

test('preferences reject malformed stored settings and clamp font size',()=>{
  assert.deepEqual(sanitizePreferences(null),{fontScale:1,themeMode:'light',highContrast:false,simplifiedMode:false,colorVisionMode:'standard'});
  assert.equal(sanitizePreferences({fontScale:9}).fontScale,1.4);
  assert.equal(sanitizePreferences({fontScale:NaN}).fontScale,1);
  assert.equal(sanitizePreferences({highContrast:'true',themeMode:'javascript:'}).highContrast,false);
});
test('manual subtitle timing covers duration and handles empty input',()=>{
  const cues=draftSubtitles('Bienvenidos a VisioAccess. '.repeat(30),20);
  assert.equal(cues[0].start,0);assert.equal(cues.at(-1).end,20);
  assert.ok(cues.every(c=>c.end>c.start&&c.text.length<=90));
  assert.throws(()=>draftSubtitles('',10));assert.throws(()=>draftSubtitles('Hola',Infinity));
});
test('SRT and VTT round trips preserve times and accents',()=>{
  const cues=[{start:0.25,end:2.5,text:'Información accesible'},{start:3,end:5.005,text:'Segunda línea'}];
  for(const type of ['srt','vtt']) {
    const serialized=serializeSubtitles(cues,type);
    assert.ok(serialized.endsWith('\n\n'));
    const parsed=parseSubtitles(serialized);
    assert.equal(parsed[0].text,cues[0].text);assert.equal(parsed[1].end,5.005);
  }
});
test('subtitle import handles BOM, CRLF, cue identifiers, settings and removes markup',()=>{
  const result=parseSubtitles('\uFEFFWEBVTT\r\n\r\nintro\r\n00:00.000 --> 00:03.000 align:start\r\n<b>Hola</b>\r\n');
  assert.equal(result[0].text,'Hola');assert.equal(result[0].end,3);
});
test('invalid subtitles and out of media times are rejected',()=>{
  for(const cues of [[{start:2,end:1,text:'a'}],[{start:-1,end:2,text:'a'}],[{start:0,end:1,text:''}],[{start:0,end:Infinity,text:'a'}]])assert.throws(()=>validateCues(cues));
  assert.throws(()=>validateCues([{start:0,end:5,text:'a'}],3));
  assert.throws(()=>parseSubtitles('nonsense'));assert.throws(()=>parseSubtitles('1\n00:70:00 --> 00:80:00\nHola'));
});

import { normalizeVoiceCommand } from '../src/utils/voiceCommands.js';
test('Spanish voice commands accept accents, punctuation and repeated spaces',()=>{
  assert.equal(normalizeVoiceCommand(' ¡IMÁGENES! '),'imagenes');
  assert.ok(normalizeVoiceCommand('Ir a imágenes').includes('imagen'));
  assert.equal(normalizeVoiceCommand('Páginas   web.'),'paginas web');
  assert.equal(normalizeVoiceCommand('Configuración'),'configuracion');
});

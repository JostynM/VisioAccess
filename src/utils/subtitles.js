export function validateCues(cues, duration = Infinity) {
  if (!Array.isArray(cues) || !cues.length || cues.length > 5000) throw new Error('No se encontraron subtítulos válidos.');
  return cues.map((cue, index) => {
    const start = Number(cue.start), end = Number(cue.end);
    const text = String(cue.text || '').replace(/<[^>]*>/g, '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration + 0.1 || !text || text.length > 3000) {
      throw new Error(`Revisa el texto y los tiempos del segmento ${index + 1}.`);
    }
    return { id: index + 1, start, end, text };
  }).sort((a,b) => a.start-b.start);
}
export function timestamp(seconds, separator = '.') {
  const ms = Math.max(0, Math.round(seconds * 1000));
  return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`;
}
function seconds(value) {
  const parts = value.replace(',','.').split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some(x=>!Number.isFinite(x)||x<0) || parts.at(-1)>=60 || parts.at(-2)>=60) throw new Error('Formato de tiempo inválido.');
  return parts.reduce((sum,x)=>sum*60+x,0);
}
export function parseSubtitles(value) {
  if (value.length > 1024*1024) throw new Error('El archivo de subtítulos supera 1 MB.');
  const blocks = value.replace(/^\uFEFF/,'').replace(/\r/g,'').trim().split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (/^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
    const index = lines.findIndex(line=>line.includes('-->'));
    if (index < 0) continue;
    const match = lines[index].match(/^\s*([\d:.,]+)\s+-->\s+([\d:.,]+)(?:\s.*)?$/);
    if (!match) throw new Error('No se pudieron interpretar los tiempos del archivo.');
    cues.push({start:seconds(match[1]),end:seconds(match[2]),text:lines.slice(index+1).join('\n')});
  }
  return validateCues(cues);
}
export function serializeSubtitles(cues, type = 'vtt') {
  const safe = validateCues(cues);
  return (type==='vtt'?'WEBVTT\n\n':'') + safe.map((c,i)=>`${i+1}\n${timestamp(c.start,type==='srt'?',':'.')} --> ${timestamp(c.end,type==='srt'?',':'.')}\n${c.text.replace(/-->/g,'→')}\n`).join('\n') + '\n';
}
export function draftSubtitles(text, duration) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Espera a que se cargue la duración del archivo.');
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || text.length > 100000) throw new Error('Introduce una transcripción de hasta 100000 caracteres.');
  const blocks = [];
  let current = '';
  for (const word of words) {
    if (current && (current+' '+word).length>90) {blocks.push(current);current='';}
    current += (current?' ':'')+word;
  }
  if (current) blocks.push(current);
  const total = blocks.reduce((sum,b)=>sum+b.length,0);
  let elapsed=0;
  return validateCues(blocks.map((text,i)=>{
    const start=elapsed; elapsed+=duration*text.length/total;
    return {id:i+1,text,start,end:i===blocks.length-1?duration:elapsed};
  }),duration);
}

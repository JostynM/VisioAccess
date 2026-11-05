import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import AccessibilityBar from '../components/AccessibilityBar';
import { draftSubtitles, parseSubtitles, serializeSubtitles, validateCues } from '../utils/subtitles';

export default function MediaCaptions(props) {
  const inputRef = useRef(null), subtitleRef = useRef(null), mediaRef = useRef(null), workerRef = useRef(null), timerRef = useRef(null), trackRef = useRef(null), operation = useRef(0);
  const [file,setFile]=useState(null), [url,setUrl]=useState(''), [duration,setDuration]=useState(0);
  const [transcript,setTranscript]=useState(''), [cues,setCues]=useState([]), [visible,setVisible]=useState(true), [time,setTime]=useState(0);
  const [elapsed,setElapsed]=useState(0), [processed,setProcessed]=useState(0);
  const [error,setError]=useState(''), [status,setStatus]=useState(''), [busy,setBusy]=useState(false), [language,setLanguage]=useState('spanish');
  useEffect(()=>()=>{workerRef.current?.terminate();clearTimeout(timerRef.current);operation.current++;},[]);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !file?.type.startsWith('video/')) return;
    if (trackRef.current?.media !== media) {
      trackRef.current = { media, track: media.addTextTrack('captions', 'Subtítulos'), cues: [] };
    }
    const entry = trackRef.current;
    const track = entry.track;
    const clear = () => { for (const cue of entry.cues) track.removeCue(cue); entry.cues = []; };
    clear();
    try {
      for (const cue of validateCues(cues, duration)) {
        const nativeCue = new VTTCue(cue.start, cue.end, cue.text);
        track.addCue(nativeCue); entry.cues.push(nativeCue);
      }
    } catch { /* Invalid edits are not displayed until corrected. */ }
    track.mode = visible ? 'showing' : 'disabled';
    return () => { clear(); track.mode = 'disabled'; };
  }, [cues, visible, file, duration]);
  const cancel=()=>{clearTimeout(timerRef.current);operation.current++;workerRef.current?.terminate();workerRef.current=null;setBusy(false);setStatus('Transcripción cancelada.');};
  const reset=()=>{cancel();mediaRef.current?.pause();setFile(null);setUrl('');setDuration(0);setTranscript('');setCues([]);setTime(0);setProcessed(0);setElapsed(0);setError('');setStatus('');if(inputRef.current)inputRef.current.value='';};
  const select=file=>{
    if(!file)return;
    if(!/^(video\/(mp4|webm|ogg)|audio\/(mpeg|mp3|wav|x-wav|wave|ogg|webm|mp4))$/.test(file.type)){setError('Selecciona un video MP4, WEBM u OGG, o audio MP3, WAV, M4A u OGG.');return;}
    if(file.size>100*1024*1024){setError('Utiliza un archivo de hasta 100 MB.');return;}
    reset();setFile(file);setUrl(URL.createObjectURL(file));
  };
  const saveCues=items=>{const validated=validateCues(items,duration||Infinity);setCues(validated);setVisible(true);setError('');};
  const generate=()=>{try{saveCues(draftSubtitles(transcript,duration));setStatus('Borrador creado. Revisa y ajusta los tiempos antes de exportarlo.');}catch(e){setError(e.message);}};
  const importCues=async event=>{
    const selected=event.target.files?.[0];if(!selected)return;
    try{if(selected.size>1024*1024)throw new Error('El archivo de subtítulos debe pesar como máximo 1 MB.');const parsed=parseSubtitles(await selected.text());saveCues(parsed);setTranscript(parsed.map(c=>c.text).join('\n'));setStatus('Subtítulos importados.');}catch(e){setError(e.message);}finally{event.target.value='';}
  };
  const download=type=>{
    try{
      const text=serializeSubtitles(validateCues(cues,duration),type);
      const downloadUrl=URL.createObjectURL(new Blob([text],{type:type==='vtt'?'text/vtt;charset=utf-8':'text/plain;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=downloadUrl;anchor.download=`subtitulos.${type}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(downloadUrl),1000);
    }catch(e){setError(e.message);}
  };
  const transcribe = async () => {
    if (!file || !Number.isFinite(duration) || duration <= 0 || duration > 120) {
      setError('Para transcripción automática utiliza hasta 2 minutos de audio o video y espera a que cargue.'); return;
    }
    const id = ++operation.current;
    setBusy(true); setError(''); setStatus('Preparando audio...'); setElapsed(0); setProcessed(0);
    setCues([]); setTranscript('');
    const started = Date.now();
    const current = () => id === operation.current;
    const stopWorker = () => {
      clearTimeout(timerRef.current); workerRef.current?.terminate(); workerRef.current = null;
    };
    const armDeadline = (milliseconds, message) => {
      clearTimeout(timerRef.current);
      const remaining = 15 * 60000 - (Date.now() - started);
      timerRef.current = setTimeout(() => {
        if (!current()) return;
        operation.current++; stopWorker(); setBusy(false); setStatus('');
        setError(message + ' Los fragmentos terminados, si los hay, se conservan.');
      }, Math.min(milliseconds, remaining));
    };
    armDeadline(45000, 'El navegador no pudo preparar el audio a tiempo. Prueba un archivo más pequeño.');
    let context;
    try {
      context = new AudioContext();
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      if (!current()) return;
      if (decoded.duration > 120) throw new Error('El audio supera los 2 minutos.');
      const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
      const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
      const mono = await offline.startRendering();
      if (!current()) return;
      const audio = mono.getChannelData(0).slice();
      const worker = new Worker(new URL('../workers/transcribe.js', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      armDeadline(300000, 'La descarga o la carga del modelo tardó demasiado. Comprueba tu conexión.');
      const fail = message => {
        if (!current()) return;
        operation.current++; stopWorker(); setBusy(false); setStatus(''); setError(message);
      };
      const acceptResult = result => {
        const items = (result.chunks || []).map(c => ({ start: c.timestamp[0], end: Math.min(duration, c.timestamp[1]), text: c.text }));
        if (items.length) { saveCues(items); setTranscript(result.text); }
      };
      worker.onerror = event => { console.error('Transcription worker failed', event.message, event.filename, event.lineno); fail('El navegador no pudo ejecutar el reconocimiento. Prueba Chrome o Edge actualizado. Los fragmentos terminados se conservan.'); };
      worker.onmessageerror = () => fail('No se pudo recibir el resultado del reconocimiento. Intenta nuevamente.');
      worker.onmessage = ({ data }) => {
        if (!current()) return;
        try {
          if (data.status === 'loading') { setStatus(data.message); return; }
          if (data.status === 'progress') { setStatus(data.message); return; }
          if (data.status === 'chunk-start') {
            setStatus(`Reconociendo fragmento ${data.index} de ${data.total}...`);
            armDeadline(150000, `El fragmento ${data.index} tardó demasiado en este dispositivo. Prueba un archivo más corto.`);
            return;
          }
          if (data.status === 'partial') {
            acceptResult(data.result);
            setProcessed(Math.min(100, Math.round(data.processedSeconds / data.totalSeconds * 100)));
            setStatus(`Fragmento ${data.index} de ${data.total} terminado. Se conservan los subtítulos reconocidos.`);
            return;
          }
          if (data.status === 'error') { fail(data.message); return; }
          if (data.status === 'complete') {
            acceptResult(data.result); stopWorker(); setBusy(false); setProcessed(100);
            setStatus(data.result.lowConfidence
              ? 'El reconocimiento terminó, pero contiene frases repetidas y puede ser poco fiable. Corrige el texto antes de usarlo. Algunos tiempos pueden ser aproximados.'
              : data.result.approximateTiming
              ? 'Transcripción terminada. Se recuperó texto con tiempos aproximados en algunos fragmentos; revísalos antes de exportar.'
              : 'Transcripción terminada. Revisa el texto y los tiempos: el reconocimiento puede cometer errores.');
          }
        } catch (error) { fail(error.message); }
      };
      worker.postMessage({ audio, language }, [audio.buffer]);
    } catch (error) {
      if (current()) {
        stopWorker(); setBusy(false); setError(error.message.includes('2 minutos') ? error.message : 'No se pudo preparar el audio. Prueba MP3, WAV o un video MP4 con audio compatible.'); setStatus('');
      }
    } finally { await context?.close().catch(() => {}); }
  };
  const update=(index,key,value)=>setCues(items=>items.map((cue,i)=>i===index?{...cue,[key]:value}:cue));
  const active=cues.filter(c=>time>=Number(c.start)&&time<Number(c.end)).map(c=>c.text).join('\n');
  const mediaProps={ref:mediaRef,src:url,controls:true,onLoadedMetadata:e=>setDuration(e.currentTarget.duration),onTimeUpdate:e=>setTime(e.currentTarget.currentTime),onSeeked:e=>setTime(e.currentTarget.currentTime),onEnded:()=>setTime(duration),onError:()=>setError('El navegador no puede reproducir este archivo. Prueba otro formato.')};
  return <section className="media-page">
    <AccessibilityBar {...props}/>
    <header className="media-header"><span className="section-label">MULTIMEDIA ACCESIBLE</span><h1>Transcripción y subtítulos</h1><p>Transcribe archivos cortos, importa subtítulos o crea un borrador a partir de tu texto.</p></header>
    <input className="file-input" aria-label="Archivo multimedia" ref={inputRef} type="file" accept="video/mp4,video/webm,video/ogg,audio/mpeg,audio/wav,audio/ogg,audio/mp4" onChange={e=>select(e.target.files?.[0])}/>
    {!file&&<div className="video-upload-card"><h2>Carga un video o audio</h2><p>Hasta 100 MB. Transcripción automática: máximo 2 minutos.</p><button className="select-video-button" onClick={()=>inputRef.current?.click()}><Upload size={20}/>Seleccionar archivo</button></div>}
    {error&&<div className="error-message" role="alert"><strong>No se pudo continuar</strong><p>{error}</p></div>}
    {status&&<p className="success-message" role="status">{status}</p>}
    {busy&&<div className="transcription-progress"><label htmlFor="transcription-progress">Audio procesado: {processed}% · Tiempo transcurrido: {elapsed} s</label><progress id="transcription-progress" max="100" value={processed}/><p>Mantén esta pestaña abierta. Puedes cancelar y conservar los fragmentos terminados.</p></div>}
    {file&&<div className="media-layout"><div className="media-main">
      <div className="selected-video-card"><div className="selected-video-header"><strong>{file.name}</strong><button className="remove-video-button" onClick={reset} aria-label="Quitar archivo"><X/></button></div>
        <div className="accessible-video">{file.type.startsWith('audio/')?<audio {...mediaProps}/>:<video {...mediaProps}/>}{visible&&active&&file.type.startsWith('audio/')&&<div className="audio-caption">{active}</div>}</div>
        <label className="subtitle-toggle-row"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>Mostrar subtítulos</label>
      </div>
      <div className="caption-generator-card"><h2>Reconocer voz automáticamente</h2><p>El primer uso descarga un modelo de aproximadamente 250 MB. El audio se procesa por fragmentos en tu dispositivo. Verás el avance y podrás conservar los resultados parciales; revisa siempre el texto.</p>
        <label>Idioma del audio <select value={language} disabled={busy} onChange={e=>setLanguage(e.target.value)}><option value="spanish">Español</option><option value="english">Inglés</option></select></label>
        <button className="generate-subtitles-button" disabled={busy||!duration} onClick={transcribe}>{busy?'Transcribiendo...':'Transcribir audio'}</button>{busy&&<button className="secondary-button" onClick={cancel}>Cancelar transcripción</button>}
      </div>
      <div className="caption-generator-card"><h2>Texto y subtítulos</h2><label htmlFor="media-transcript">Transcripción editable</label><textarea id="media-transcript" rows={6} maxLength={100000} value={transcript} onChange={e=>setTranscript(e.target.value)} disabled={busy}/>
        <p>El borrador manual reparte el texto de forma aproximada; ajusta los tiempos con el reproductor.</p>
        <button className="generate-subtitles-button" onClick={generate} disabled={busy||!duration}>Crear borrador desde texto</button>
        <input className="file-input" aria-label="Archivo de subtítulos" ref={subtitleRef} type="file" accept=".srt,.vtt" onChange={importCues}/><button className="secondary-button" disabled={busy} onClick={()=>subtitleRef.current?.click()}>Importar SRT o VTT</button>
      </div>
      {cues.length>0&&<div className="subtitle-list-card"><h2>Revisar subtítulos</h2><div className="caption-generator-actions"><button className="secondary-button" onClick={()=>download('srt')}>Descargar SRT</button><button className="secondary-button" onClick={()=>download('vtt')}>Descargar VTT</button><button className="secondary-button" disabled={busy} onClick={()=>{setCues([]);setStatus('');}}>Limpiar subtítulos</button></div>
        {cues.map((cue,index)=><div className="subtitle-editor" key={cue.id}><label>Inicio {index+1}<input type="number" min="0" step="0.01" value={cue.start} disabled={busy} onChange={e=>update(index,'start',e.target.value)}/></label><label>Fin {index+1}<input type="number" min="0" step="0.01" value={cue.end} disabled={busy} onChange={e=>update(index,'end',e.target.value)}/></label><label className="cue-text">Texto {index+1}<textarea value={cue.text} disabled={busy} maxLength={3000} onChange={e=>update(index,'text',e.target.value)}/></label></div>)}
      </div>}
    </div><aside className="media-help-panel"><h2>Tus archivos permanecen en tu dispositivo</h2><p>No enviamos el audio ni el video al servidor. Se necesita Internet para descargar el modelo de reconocimiento. Puedes cancelar la transcripción y usar texto o subtítulos existentes.</p><p>Los tiempos automáticos y el texto deben revisarse, especialmente con ruido, música o varias personas hablando.</p></aside></div>}
  </section>;
}

import { useEffect, useRef, useState } from 'react';

export default function useSpeech() {
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [speechError, setSpeechError] = useState('');
  const session = useRef(0);
  const utteranceRef = useRef(null);
  useEffect(() => () => {
    session.current++;
    if (speechSupported) window.speechSynthesis.cancel();
  }, [speechSupported]);
  const stop = () => {
    session.current++;
    if (speechSupported) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };
  const speak = text => {
    if (!speechSupported || !text?.trim()) return;
    stop();
    setSpeechError('');
    const id = session.current;
    // Short utterances avoid browser limits on long articles.
    const chunks = text.match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [];
    let index = 0;
    const next = () => {
      if (id !== session.current) return;
      if (index >= chunks.length) { setIsSpeaking(false); setIsPaused(false); return; }
      const utterance = new SpeechSynthesisUtterance(chunks[index++]);
      utteranceRef.current = utterance;
      utterance.lang = 'es-PE';
      utterance.rate = rate;
      utterance.onend = next;
      utterance.onerror = event => { if (id === session.current) { setIsSpeaking(false); setIsPaused(false); if (!['canceled','interrupted'].includes(event.error)) setSpeechError('El navegador no pudo reproducir la voz. Comprueba las voces instaladas y el sonido del dispositivo.'); } };
      window.speechSynthesis.speak(utterance);
    };
    setIsSpeaking(true);
    next();
  };
  const pauseOrResume = () => {
    if (!speechSupported || !isSpeaking) return;
    if (isPaused) window.speechSynthesis.resume(); else window.speechSynthesis.pause();
    setIsPaused(!isPaused);
  };
  return { speak, stop, pauseOrResume, isSpeaking, isPaused, rate, setRate, speechSupported, speechError };
}

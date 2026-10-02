import { useEffect, useState } from "react";

function useSpeech() {
  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [isPaused, setIsPaused] =
    useState(false);

  const [rate, setRate] =
    useState(1);

  const [speechSupported, setSpeechSupported] =
    useState(true);

  useEffect(() => {
    const supported =
      "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;

    setSpeechSupported(supported);

    return () => {
      if (supported) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text) => {
    if (
      !speechSupported ||
      !text ||
      !text.trim()
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(text);

    utterance.lang = "es-PE";
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(
      utterance,
    );
  };

  const pauseOrResume = () => {
    if (
      !speechSupported ||
      !isSpeaking
    ) {
      return;
    }

    if (
      window.speechSynthesis.paused
    ) {
      window.speechSynthesis.resume();

      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();

      setIsPaused(true);
    }
  };

  const stop = () => {
    if (!speechSupported) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setIsPaused(false);
  };

  return {
    speak,
    pauseOrResume,
    stop,
    isSpeaking,
    isPaused,
    rate,
    setRate,
    speechSupported,
  };
}

export default useSpeech;
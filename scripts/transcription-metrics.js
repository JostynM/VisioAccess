export function transcriptionWords(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
}
export function wordErrorRate(reference, hypothesis) {
  const expected = transcriptionWords(reference), actual = transcriptionWords(hypothesis);
  if (!expected.length) throw new Error('La referencia no contiene palabras.');
  let previous = Array.from({ length: actual.length + 1 }, (_, i) => i);
  for (let i = 1; i <= expected.length; i++) {
    const current = [i];
    for (let j = 1; j <= actual.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1,
        previous[j - 1] + (expected[i - 1] === actual[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  const errors = previous[actual.length];
  return { referenceWords: expected.length, recognizedWords: actual.length, errors, wer: errors / expected.length };
}

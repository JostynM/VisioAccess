import test from 'node:test';
import assert from 'node:assert/strict';
import { wordErrorRate } from '../scripts/transcription-metrics.js';
test('quality benchmark measures substitutions, deletions, insertions and ignores accents/punctuation', () => {
  assert.equal(wordErrorRate('Información útil.', 'informacion util').wer, 0);
  assert.equal(wordErrorRate('uno dos tres', 'uno cuatro tres').errors, 1);
  assert.equal(wordErrorRate('uno dos tres', 'uno tres').errors, 1);
  assert.equal(wordErrorRate('uno dos', 'uno dos tres').errors, 1);
  assert.equal(wordErrorRate('uno', 'dos tres cuatro').wer, 3);
  assert.throws(() => wordErrorRate('', 'texto'), /referencia/);
});

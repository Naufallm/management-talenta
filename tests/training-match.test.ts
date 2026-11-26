import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestTrainingMatch } from '../shared/training-match.ts';

test('training suggestions distinguish recognised tasks, other specialties and missing context', () => {
  assert.equal(suggestTrainingMatch('Statistisi Ahli Muda', 'Lokakarya Kualitas Data'), true);
  assert.equal(suggestTrainingMatch('Bendahara', 'Lokakarya Kualitas Data'), false);
  assert.equal(suggestTrainingMatch('Bendahara', 'Komunikasi Pelayanan Publik'), true);
  assert.equal(suggestTrainingMatch('Statistisi', 'Lokakarya tingkat lanjut'), null);
  assert.equal(suggestTrainingMatch('', 'Lokakarya Kualitas Data'), null);
});

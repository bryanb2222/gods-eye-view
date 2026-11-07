import assert from 'node:assert/strict';
import test from 'node:test';
import { nextIssPassVoiceResult } from './gevActions.js';

test('next_iss_pass reports the derived forecast unavailable and includes no predicted figure', () => {
  const result = nextIssPassVoiceResult();
  assert.equal(result.ok, false);
  assert.equal(result.action, 'next_iss_pass');
  assert.equal(result.status, 'unavailable');
  assert.equal(result.riseIso, null);
  assert.equal(result.minutesFromNow, null);
  assert.equal(result.durationMin, null);
  assert.equal(result.peakElevationDeg, null);
  assert.equal(result.riseDirection, null);
  assert.equal(JSON.stringify(result).match(/\d/), null);
  assert.equal(Object.values(result).includes(0), false);
});

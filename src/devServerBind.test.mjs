import test from 'node:test';
import assert from 'node:assert/strict';
import { devServerBindIsLoopback } from '../vite.config.js';

test('the dev server accepts only explicit loopback hosts', () => {
  assert.equal(devServerBindIsLoopback('127.0.0.1'), true);
  assert.equal(devServerBindIsLoopback('localhost'), true);
  assert.equal(devServerBindIsLoopback('::1'), true);
  for (const host of [true, '0.0.0.0', '::', '::0', '192.168.1.20', '', undefined, null]) {
    assert.equal(devServerBindIsLoopback(host), false, `host must not bind: ${String(host)}`);
  }
});

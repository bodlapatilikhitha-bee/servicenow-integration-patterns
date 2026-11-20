'use strict';
const test = require('node:test');
const assert = require('node:assert');
const m = require('./mocks');
m.install();
const OutboundRestClient = require('../src/OutboundRestClient');

function client(delays) { return new OutboundRestClient('Ticketing Partner', 'create', { sleep: ms => delays.push(ms), baseDelayMs: 100 }); }

test('succeeds first time and sends idempotency key', () => {
  m.rest.script = [200]; m.rest.calls.length = 0;
  const r = client([]).send({ a: 1 }, 'corr-1');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.attempts, 1);
  assert.deepStrictEqual(r.body, { id: 'EXT-1' });
  assert.strictEqual(m.rest.calls[0].headers['Idempotency-Key'], 'corr-1');
});

test('retries 503 and transport errors with exponential backoff', () => {
  const delays = [];
  m.rest.script = [503, 'throw', 200];
  const r = client(delays).send({}, 'corr-2');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.attempts, 3);
  assert.deepStrictEqual(delays, [100, 200]);
});

test('does not retry a 400', () => {
  m.rest.script = [400, 200];
  const r = client([]).send({}, 'corr-3');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.attempts, 1);
});

test('gives up after maxAttempts and logs an error without the payload', () => {
  m.rest.script = [500, 500, 500];
  const r = client([]).send({ secret_field: 'do-not-log' }, 'corr-4');
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.attempts, 3);
  assert.ok(m.logs.every(l => !l.includes('do-not-log')));
});

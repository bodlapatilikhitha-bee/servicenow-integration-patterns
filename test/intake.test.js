'use strict';
const test = require('node:test');
const assert = require('node:assert');
const m = require('./mocks');
m.install();
const api = require('../src/IncidentIntakeApi');

test('rejects invalid payloads with all reasons', () => {
  const r = api.handle({ severity: 'unknown' });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.details.length, 3);
});

test('creates an incident for a new alert', () => {
  const r = api.handle({ alert_id: 'MON-1', short_description: 'Disk 95% on app-01', severity: 'major' });
  assert.strictEqual(r.status, 201);
  const row = m.tables.incident.find(i => i.correlation_id === 'MON-1');
  assert.strictEqual(row.impact, 2);
  assert.strictEqual(row.contact_type, 'integration');
});

test('repeat alert updates the open incident instead of creating a new one', () => {
  const before = m.tables.incident.length;
  const r = api.handle({ alert_id: 'MON-1', short_description: 'Disk 97% on app-01', severity: 'major' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.result, 'updated');
  assert.strictEqual(m.tables.incident.length, before);
});

test('short description length is enforced', () => {
  const r = api.handle({ alert_id: 'X', short_description: 'a'.repeat(200), severity: 'minor' });
  assert.strictEqual(r.status, 400);
});

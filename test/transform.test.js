'use strict';
const test = require('node:test');
const assert = require('node:assert');
const t = require('../src/transform_user_import');

test('normalizes names, email and status', () => {
  const row = t.normalizeRow({ u_employee_id: ' 1001 ', u_email: 'Jane.Doe@Example.COM ', u_first_name: 'jANE', u_last_name: "o'neil-smith", u_status: 'a' });
  assert.deepStrictEqual(row, { employee_number: '1001', email: 'jane.doe@example.com', first_name: 'Jane', last_name: "O'Neil-Smith", active: true });
});

test('reject reasons', () => {
  assert.strictEqual(t.rejectReason({ employee_number: '', email: 'a@b.co', last_name: 'X' }), 'missing employee id');
  assert.strictEqual(t.rejectReason({ employee_number: '1', email: 'bad', last_name: 'X' }), 'invalid email');
  assert.strictEqual(t.rejectReason({ employee_number: '1', email: 'a@b.co', last_name: '' }), 'missing last name');
  assert.strictEqual(t.rejectReason({ employee_number: '1', email: 'a@b.co', last_name: 'X' }), '');
});

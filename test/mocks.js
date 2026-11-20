// Minimal stand-ins for ServiceNow globals used by these examples.
'use strict';
const logs = [];
const tables = { incident: [] };
let seq = 10000;

class GlideRecord {
  constructor(t) { this.t = t; this.f = []; this.rows = []; this.i = -1; this.v = {}; }
  addQuery(k, val) { this.f.push(r => r[k] === val); }
  query() { this.rows = tables[this.t].filter(r => this.f.every(fn => fn(r))); }
  next() { this.i++; if (this.i < this.rows.length) { this.v = this.rows[this.i]; return true; } return false; }
  initialize() { this.v = { active: true }; }
  getValue(k) { return this.v[k] === undefined ? '' : String(this.v[k]); }
  setValue(k, val) { this.v[k] = val; }
  insert() { seq++; this.v.sys_id = 'sys' + seq; this.v.number = 'INC00' + seq; tables[this.t].push(this.v); return this.v.sys_id; }
  update() { return this.v.sys_id; }
}

// Scripted responses for RESTMessageV2: array of status codes or 'throw'.
const rest = { script: [], calls: [] };
class RESTMessageV2 {
  constructor(msg, method) { this.req = { msg, method, headers: {} }; }
  setRequestHeader(k, v) { this.req.headers[k] = v; }
  setRequestBody(b) { this.req.body = b; }
  execute() {
    rest.calls.push(this.req);
    const next = rest.script.shift();
    if (next === 'throw') throw new Error('connection reset');
    return { getStatusCode: () => next, getBody: () => (next === 200 ? '{"id":"EXT-1"}' : 'error') };
  }
}

function install() {
  global.Class = { create: () => function () { this.initialize.apply(this, arguments); } };
  global.GlideRecord = GlideRecord;
  global.sn_ws = { RESTMessageV2 };
  global.gs = { warn: m => logs.push(m), error: m => logs.push(m), sleep: () => {} };
}

module.exports = { install, tables, rest, logs };

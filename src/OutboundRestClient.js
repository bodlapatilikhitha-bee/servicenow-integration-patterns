/**
 * OutboundRestClient — Script Include wrapping sn_ws.RESTMessageV2 with the
 * things production integrations need: retry with exponential backoff for
 * transient errors, an idempotency key, and structured logging that never
 * writes request bodies or credentials to the log.
 *
 * Credentials come from a REST Message / Connection & Credential alias
 * configured in the instance, never from script.
 * Portfolio example on synthetic data.
 */
var OutboundRestClient = Class.create();

OutboundRestClient.RETRYABLE = [408, 429, 500, 502, 503, 504];

OutboundRestClient.prototype = {
  /**
   * @param {string} restMessage  name of the REST Message record
   * @param {string} method       name of the HTTP method record
   * @param {object} [opts]       { maxAttempts, baseDelayMs, sleep }
   */
  initialize: function (restMessage, method, opts) {
    opts = opts || {};
    this.restMessage = restMessage;
    this.method = method;
    this.maxAttempts = opts.maxAttempts || 3;
    this.baseDelayMs = opts.baseDelayMs || 1000;
    this.sleep = opts.sleep || function (ms) { gs.sleep(ms); };
  },

  /** Sends a JSON payload. Returns { ok, status, body, attempts }. */
  send: function (payload, correlationId) {
    var attempt = 0;
    var last = { ok: false, status: 0, body: null };
    while (attempt < this.maxAttempts) {
      attempt++;
      try {
        var rm = new sn_ws.RESTMessageV2(this.restMessage, this.method);
        rm.setRequestHeader('Content-Type', 'application/json');
        rm.setRequestHeader('Idempotency-Key', correlationId);
        rm.setRequestBody(JSON.stringify(payload));
        var resp = rm.execute();
        var status = resp.getStatusCode();
        last = { ok: status >= 200 && status < 300, status: status, body: this._parse(resp.getBody()) };
        if (last.ok || OutboundRestClient.RETRYABLE.indexOf(status) === -1) { break; }
        gs.warn(this._log('retryable status ' + status, correlationId, attempt));
      } catch (e) {
        last = { ok: false, status: 0, body: null, error: e.message };
        gs.warn(this._log('transport error: ' + e.message, correlationId, attempt));
      }
      if (attempt < this.maxAttempts) { this.sleep(this.baseDelayMs * Math.pow(2, attempt - 1)); }
    }
    last.attempts = attempt;
    if (!last.ok) { gs.error(this._log('failed with status ' + last.status, correlationId, attempt)); }
    return last;
  },

  _parse: function (text) {
    if (!text) { return null; }
    try { return JSON.parse(text); } catch (e) { return { raw: String(text).slice(0, 500) }; }
  },

  _log: function (msg, correlationId, attempt) {
    return '[OutboundRestClient] ' + this.restMessage + '.' + this.method +
      ' corr=' + correlationId + ' attempt=' + attempt + ': ' + msg;
  },

  type: 'OutboundRestClient'
};

if (typeof module !== 'undefined') { module.exports = OutboundRestClient; }

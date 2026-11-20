/**
 * Scripted REST API resource: POST /api/x_portfolio/intake/v1/incident
 *
 * Lets a monitoring tool create incidents. Validates input, de-duplicates on
 * the caller's alert id (correlation_id) so repeated alerts update the same
 * incident instead of opening new ones, and returns clear 4xx errors.
 * Portfolio example on synthetic data.
 */
var IncidentIntakeApi = {
  MAX_SHORT_DESC: 160,
  SEVERITY_TO_IMPACT: { critical: 1, major: 2, minor: 3 },

  validate: function (body) {
    var errors = [];
    if (!body || typeof body !== 'object') { return ['body must be a JSON object']; }
    if (!body.alert_id) { errors.push('alert_id is required'); }
    if (!body.short_description) { errors.push('short_description is required'); }
    else if (body.short_description.length > this.MAX_SHORT_DESC) { errors.push('short_description exceeds ' + this.MAX_SHORT_DESC + ' characters'); }
    if (!this.SEVERITY_TO_IMPACT[body.severity]) { errors.push('severity must be one of critical, major, minor'); }
    return errors;
  },

  /** Core logic, separated from request/response objects for testing. */
  handle: function (body) {
    var errors = this.validate(body);
    if (errors.length) { return { status: 400, body: { error: 'invalid_request', details: errors } }; }

    var inc = new GlideRecord('incident');
    inc.addQuery('correlation_id', body.alert_id);
    inc.addQuery('active', true);
    inc.query();
    if (inc.next()) {
      inc.setValue('work_notes', 'Repeat alert received: ' + body.short_description);
      inc.update();
      return { status: 200, body: { result: 'updated', number: inc.getValue('number') } };
    }

    var created = new GlideRecord('incident');
    created.initialize();
    created.setValue('correlation_id', body.alert_id);
    created.setValue('short_description', body.short_description);
    created.setValue('impact', this.SEVERITY_TO_IMPACT[body.severity]);
    created.setValue('urgency', body.severity === 'critical' ? 1 : 2);
    created.setValue('category', 'monitoring');
    created.setValue('contact_type', 'integration');
    var sysId = created.insert();
    if (!sysId) { return { status: 500, body: { error: 'insert_failed' } }; }
    return { status: 201, body: { result: 'created', number: created.getValue('number') } };
  }
};

/* Resource script in the instance:
(function process(request, response) {
  var out = IncidentIntakeApi.handle(request.body.data);
  response.setStatus(out.status);
  response.setBody(out.body);
})(request, response);
*/

if (typeof module !== 'undefined') { module.exports = IncidentIntakeApi; }

/**
 * Transform Map script for an HR user feed (Import Set -> sys_user).
 *
 * onBefore: normalizes values and skips bad rows with a reason the admin can
 * see in the import log, instead of silently creating broken users.
 * Portfolio example on synthetic data.
 */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRow(src) {
  return {
    employee_number: String(src.u_employee_id || '').trim(),
    email: String(src.u_email || '').trim().toLowerCase(),
    first_name: titleCase(src.u_first_name),
    last_name: titleCase(src.u_last_name),
    active: String(src.u_status || '').toUpperCase() === 'A'
  };
}

function titleCase(v) {
  return String(v || '').trim().toLowerCase().replace(/(^|[\s'-])\S/g, function (c) { return c.toUpperCase(); });
}

/** Returns '' when the row is valid, otherwise the skip reason. */
function rejectReason(row) {
  if (!row.employee_number) { return 'missing employee id'; }
  if (!EMAIL_RE.test(row.email)) { return 'invalid email'; }
  if (!row.last_name) { return 'missing last name'; }
  return '';
}

/* onBefore script in the instance:
(function runTransformScript(source, map, log, target) {
  var row = normalizeRow(source);
  var reason = rejectReason(row);
  if (reason) { ignore = true; log.warn('Skipped ' + source.sys_id + ': ' + reason); return; }
  target.setValue('email', row.email);
  target.setValue('first_name', row.first_name);
  target.setValue('last_name', row.last_name);
  target.setValue('active', row.active);
})(source, map, log, target);
*/

if (typeof module !== 'undefined') { module.exports = { normalizeRow: normalizeRow, rejectReason: rejectReason, titleCase: titleCase }; }

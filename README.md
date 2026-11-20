# ServiceNow Integration Patterns

Three integration patterns that come up on most ServiceNow projects, written so they behave well in production: retries that do not create duplicates, inbound APIs that de-duplicate repeat events, and imports that reject bad rows with a visible reason.

> **Portfolio project.** Written from scratch for this repository with synthetic data. No employer, client or vendor code, endpoints, credentials or configuration are included.

## Patterns

### 1. Outbound REST with retry and idempotency — `src/OutboundRestClient.js`

Wraps `sn_ws.RESTMessageV2`.

- Retries only transient failures (408, 429, 5xx, transport errors) with exponential backoff.
- Sends an `Idempotency-Key` header so a retried call cannot create two records in the target system.
- Logs the REST message, method, correlation id and attempt, but never the request body.
- Credentials stay in the REST Message / Connection & Credential alias, not in script.

### 2. Inbound Scripted REST API with de-duplication — `src/IncidentIntakeApi.js`

`POST /api/x_portfolio/intake/v1/incident` for a monitoring tool.

- Validates the payload and returns every problem in one `400` response.
- Uses the caller's `alert_id` as `correlation_id`: a repeat alert adds a work note to the open incident (`200`) instead of opening a duplicate (`201`).
- Maps severity to impact and urgency, and sets `contact_type = integration` for reporting.

### 3. Transform Map validation — `src/transform_user_import.js`

`onBefore` logic for an HR user feed loaded through an Import Set.

- Normalizes names (handles `O'Neil-Smith`), email case and status codes.
- Skips rows with no employee id, an invalid email or no last name, and writes the reason to the import log.

```
Monitoring tool ──POST──▶ Scripted REST API ──▶ incident (create or update by correlation_id)
ServiceNow ──RESTMessageV2 (retry + Idempotency-Key)──▶ partner ticketing system
HR CSV ──▶ Import Set ──▶ Transform Map onBefore (normalize / reject) ──▶ sys_user
```

## Run the tests

Node.js 18+, no dependencies:

```bash
npm test
```

`test/mocks.js` provides minimal versions of `GlideRecord`, `sn_ws.RESTMessageV2` and `gs`, with scripted HTTP responses to exercise the retry logic.

## Using in a personal developer instance

1. Create a scoped app `x_portfolio`.
2. Add `OutboundRestClient` and `IncidentIntakeApi` as Script Includes.
3. Create a REST Message (for example "Ticketing Partner" with a `create` POST method) pointing to a mock endpoint, with authentication set through a credential alias.
4. Create a Scripted REST API with a POST resource and paste the resource script shown at the bottom of `IncidentIntakeApi.js`. Require authentication and restrict it to an integration user role.
5. Create an Import Set table and Transform Map to `sys_user` and paste the `onBefore` script.

## Security considerations

- No secrets in code; use credential aliases and an integration user with only the roles it needs.
- Scripted REST resources should require authentication and an ACL.
- Logs exclude payloads, since they may contain personal data.

## Limitations and next steps

- Mocks cover only the APIs used.
- Next: add an IntegrationHub spoke action version of the outbound call, and an ATF test for the Scripted REST API.

## License

MIT — see `LICENSE`.

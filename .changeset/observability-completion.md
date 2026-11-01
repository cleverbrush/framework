---
"@cleverbrush/otel": minor
"@cleverbrush/log": minor
"@cleverbrush/server": minor
---

Add safe exception policies, final log body and attribute sanitization, and
per-event execution context capture for reliable asynchronous trace correlation.
Automatic OpenTelemetry exception details default to omission; sanitized
callbacks and deliberately opted-in raw capture are supported.

Add request middleware before CORS/authentication, public route metadata, and
exactly-once response completion observations. HTTP traces and request logs now
use final wire status and include streaming duration, with explicit interruption,
deadline and cancellation outcomes. Terminate failed streams and preserve statuses
already sent to clients.

Add safe optional-instrumentation diagnostics, strict startup validation, supported
peer version checks, and caller-relative resolution for workspace installations.

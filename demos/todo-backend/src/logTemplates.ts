import { number, object, parseString, string } from '@cleverbrush/schema';

// ── Startup / shutdown ───────────────────────────────────────────────────────

export const AppStarting = parseString(
    object({ Environment: string() }),
    $t => $t`Starting application in ${t => t.Environment} mode`
);

export const MigrationsRunning = parseString(
    object({}),
    $t => $t`Running database migrations…`
);

export const MigrationsComplete = parseString(
    object({}),
    $t => $t`Migrations complete`
);

export const MigrationRan = parseString(
    object({ MigrationName: string() }),
    $t => $t`Migration completed: ${t => t.MigrationName}`
);

export const Listening = parseString(
    object({ Host: string(), Port: number() }),
    $t => $t`Listening on http://${t => t.Host}:${t => t.Port}`
);

export const OpenApiSpec = parseString(
    object({ Host: string(), Port: number() }),
    $t => $t`OpenAPI spec → http://${t => t.Host}:${t => t.Port}/openapi.json`
);

export const ShutdownReceived = parseString(
    object({ Signal: string() }),
    $t => $t`Received ${t => t.Signal}, shutting down…`
);

export const ForcedShutdown = parseString(
    object({}),
    $t => $t`Forced shutdown after timeout`
);

export const HttpServerClosed = parseString(
    object({}),
    $t => $t`HTTP server closed`
);

export const ShutdownError = parseString(
    object({}),
    $t => $t`Error during shutdown`
);

// ── Audit ────────────────────────────────────────────────────────────────────

export const AuditStart = parseString(
    object({ Method: string(), Path: string(), Principal: string() }),
    $t =>
        $t`Audit start: ${t => t.Method} ${t => t.Path} by ${t => t.Principal}`
);

export const AuditEnd = parseString(
    object({ Method: string(), Path: string(), Elapsed: number() }),
    $t =>
        $t`Audit end: ${t => t.Method} ${t => t.Path} completed in ${t => t.Elapsed}ms`
);

// ── Todos ────────────────────────────────────────────────────────────────────

export const TodoCreated = parseString(
    object({ TodoId: number(), Title: string(), UserId: number() }),
    $t =>
        $t`Todo created: #${t => t.TodoId} "${t => t.Title}" by user ${t => t.UserId}`
);

export const TodoUpdated = parseString(
    object({ TodoId: number(), UserId: number() }),
    $t => $t`Todo updated: #${t => t.TodoId} by user ${t => t.UserId}`
);

export const TodoCompleted = parseString(
    object({ TodoId: number(), UserId: number() }),
    $t => $t`Todo completed: #${t => t.TodoId} by user ${t => t.UserId}`
);

export const TodoDeleted = parseString(
    object({ TodoId: number(), UserId: number() }),
    $t => $t`Todo deleted: #${t => t.TodoId} by user ${t => t.UserId}`
);

export const TodoEventReceived = parseString(
    object({ TodoId: number(), EventType: string(), UserId: number() }),
    $t =>
        $t`Todo event: ${t => t.EventType} on #${t => t.TodoId} by user ${t => t.UserId}`
);

export const TodosImported = parseString(
    object({ Imported: number(), Total: number(), UserId: number() }),
    $t =>
        $t`Todos imported: ${t => t.Imported}/${t => t.Total} by user ${t => t.UserId}`
);

export const TodosExported = parseString(
    object({ Count: number(), UserId: number() }),
    $t => $t`Todos exported: ${t => t.Count} items by user ${t => t.UserId}`
);

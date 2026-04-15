import type { SchemaBuilder } from '@cleverbrush/schema';

/**
 * Describes an out-of-band webhook that your API can send to consumers.
 *
 * Pass instances to `ServerBuilder.webhook()` so that
 * `@cleverbrush/server-openapi` can emit them inside the `webhooks` map of
 * the generated OpenAPI document.
 *
 * @example
 * ```ts
 * const userCreatedWebhook = defineWebhook('userCreated', {
 *     method: 'POST',
 *     summary: 'Fired when a new user is created',
 *     body: object({ id: number(), email: string() }),
 * });
 * ```
 */
export interface WebhookDefinition {
    /** Unique webhook name used as the key in the `webhooks` map. */
    readonly name: string;
    /** HTTP method sent to the consumer endpoint (default: `'POST'`). */
    readonly method?: string;
    /** Short summary for OpenAPI documentation. */
    readonly summary?: string;
    /** Longer description for OpenAPI documentation. Supports Markdown. */
    readonly description?: string;
    /** Tags to group this webhook in generated documentation. */
    readonly tags?: readonly string[];
    /** Schema describing the webhook request payload. */
    readonly body?: SchemaBuilder<any, any, any, any, any>;
    /** Schema describing the expected response from the consumer. */
    readonly response?: SchemaBuilder<any, any, any, any, any>;
}

/**
 * Convenience factory for creating {@link WebhookDefinition} objects.
 *
 * @param name - Unique key for this webhook in the `webhooks` map.
 * @param options - Webhook configuration (all fields except `name`).
 */
export function defineWebhook(
    name: string,
    options: Omit<WebhookDefinition, 'name'>
): WebhookDefinition {
    return { name, ...options };
}

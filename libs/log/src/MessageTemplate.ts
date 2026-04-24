import type { LogEvent } from './LogEvent.js';
import type { LogLevel } from './LogLevel.js';
import { safeSerialize } from './serialization.js';

// ---------------------------------------------------------------------------
// Template parsing
// ---------------------------------------------------------------------------

interface TemplateToken {
    type: 'text' | 'property';
    value: string;
    destructure?: boolean;
}

const templateCache = new Map<string, TemplateToken[]>();
const eventIdCache = new Map<string, string>();

/**
 * Parses a Serilog-style message template into tokens.
 *
 * Supports `{Property}` for scalar capture and `{@Property}` for
 * destructuring (full object structure preserved in properties).
 *
 * @param template - message template string with `{Property}` holes
 * @returns array of parsed tokens
 */
export function parseTemplate(template: string): TemplateToken[] {
    const cached = templateCache.get(template);
    if (cached) return cached;

    const tokens: TemplateToken[] = [];
    let i = 0;
    const len = template.length;

    while (i < len) {
        const braceStart = template.indexOf('{', i);
        if (braceStart === -1) {
            tokens.push({ type: 'text', value: template.slice(i) });
            break;
        }

        // Escaped brace: {{
        if (braceStart + 1 < len && template[braceStart + 1] === '{') {
            tokens.push({
                type: 'text',
                value: template.slice(i, braceStart + 1)
            });
            i = braceStart + 2;
            continue;
        }

        if (braceStart > i) {
            tokens.push({
                type: 'text',
                value: template.slice(i, braceStart)
            });
        }

        const braceEnd = template.indexOf('}', braceStart);
        if (braceEnd === -1) {
            tokens.push({
                type: 'text',
                value: template.slice(braceStart)
            });
            break;
        }

        let propName = template.slice(braceStart + 1, braceEnd);
        let destructure = false;
        if (propName.startsWith('@')) {
            destructure = true;
            propName = propName.slice(1);
        }

        tokens.push({ type: 'property', value: propName, destructure });
        i = braceEnd + 1;
    }

    templateCache.set(template, tokens);
    return tokens;
}

/**
 * Renders a parsed template into a human-readable string.
 *
 * For non-destructured properties, calls `toString()` if available on
 * the value. For destructured properties (`{@Prop}`), uses JSON.stringify.
 *
 * @param tokens - parsed template tokens
 * @param properties - property values to interpolate
 * @returns the rendered message string
 */
export function renderTemplate(
    tokens: TemplateToken[],
    properties: Record<string, unknown>
): string {
    let result = '';
    for (const token of tokens) {
        if (token.type === 'text') {
            result += token.value;
        } else {
            const value = properties[token.value];
            if (value === undefined || value === null) {
                result += `{${token.destructure ? '@' : ''}${token.value}}`;
            } else if (token.destructure) {
                result += JSON.stringify(safeSerialize(value, { maxDepth: 5 }));
            } else if (
                typeof value === 'object' &&
                typeof (value as any).toString === 'function' &&
                (value as any).toString !== Object.prototype.toString
            ) {
                result += (value as any).toString();
            } else if (typeof value === 'object') {
                result += JSON.stringify(safeSerialize(value, { maxDepth: 5 }));
            } else {
                result += String(value);
            }
        }
    }
    return result;
}

/**
 * Captures structured properties from the template, applying destructure
 * semantics: `{@Prop}` keeps the full object, `{Prop}` calls `toString()`
 * on objects that have a custom `toString`.
 *
 * @param tokens - parsed template tokens
 * @param properties - raw property values
 * @returns property bag with appropriate serialization applied
 */
export function captureProperties(
    tokens: TemplateToken[],
    properties: Record<string, unknown>
): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const token of tokens) {
        if (token.type !== 'property') continue;
        const value = properties[token.value];
        if (token.destructure) {
            result[token.value] = value;
        } else if (
            typeof value === 'object' &&
            value !== null &&
            typeof (value as any).toString === 'function' &&
            (value as any).toString !== Object.prototype.toString
        ) {
            result[token.value] = (value as any).toString();
        } else {
            result[token.value] = value;
        }
    }
    // Include any extra properties not referenced in the template
    for (const key of Object.keys(properties)) {
        if (!(key in result)) {
            result[key] = properties[key];
        }
    }
    return result;
}

/**
 * Generates a deterministic hex event ID from a message template string.
 * Uses a simple FNV-1a hash for speed — no cryptographic requirements.
 *
 * @param template - the raw message template
 * @returns 8-character hex hash
 */
export function computeEventId(template: string): string {
    const cached = eventIdCache.get(template);
    if (cached) return cached;

    let hash = 0x811c9dc5;
    for (let i = 0; i < template.length; i++) {
        hash ^= template.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    const id = hash.toString(16).padStart(8, '0');
    eventIdCache.set(template, id);
    return id;
}

/**
 * Creates a complete `LogEvent` from a message template, properties,
 * and metadata.
 *
 * @param level - severity level
 * @param template - message template string with `{Property}` holes
 * @param properties - structured property values
 * @param exception - optional associated error
 * @returns a fully populated `LogEvent`
 */
export function createLogEvent(
    level: LogLevel,
    template: string,
    properties: Record<string, unknown>,
    exception?: Error
): LogEvent {
    const tokens = parseTemplate(template);
    const captured = captureProperties(tokens, properties);
    const renderedMessage = renderTemplate(tokens, properties);
    const eventId = computeEventId(template);

    return {
        timestamp: new Date(),
        level,
        messageTemplate: template,
        renderedMessage,
        properties: captured,
        exception,
        eventId
    };
}

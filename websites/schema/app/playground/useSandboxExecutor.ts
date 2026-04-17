'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface ErrorTreeNode {
    errors: string[];
    seenValue?: unknown;
    children?: Record<string, ErrorTreeNode>;
    getErrorsForResult?: unknown;
}

export interface ExecutionResult {
    validationResult?: {
        valid: boolean;
        object?: unknown;
        errors?: { message: string }[];
        errorTree?: Record<string, ErrorTreeNode>;
    };
    introspection?: Record<string, unknown>;
    error?: string;
}

const EXECUTION_TIMEOUT = 5000;

/**
 * Escapes `</` to `<\/` so inlined JS doesn't prematurely close a <script> tag.
 */
function escapeScriptClose(code: string): string {
    return code.replace(/<\//g, '<\\/');
}

function buildSrcdoc(bundle: string, zodBundle: string): string {
    const escaped = escapeScriptClose(bundle);
    const escapedZod = escapeScriptClose(zodBundle);

    // The JavaScript below runs inside the sandboxed iframe (opaque origin).
    // It receives transpiled JS via postMessage, executes it with the schema
    // library injected, and posts results back.
    return `<!DOCTYPE html><html><head><script>
${escaped}
</script><script>
${escapedZod}
</script><script>
;(function() {
    var schema = typeof __schema !== 'undefined' ? __schema : {};
    var zod = typeof __zod !== 'undefined' ? __zod : {};

    function sanitize(obj) {
        if (obj === null || obj === undefined || typeof obj !== 'object') return {};
        var result = {};
        var keys = Object.keys(obj);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var value = obj[key];
            if (typeof value === 'function') {
                result[key] = '[Function]';
            } else if (Array.isArray(value)) {
                result[key] = value.map(function(item) {
                    if (typeof item === 'function') return '[Function]';
                    if (typeof item === 'object' && item !== null) {
                        var summary = {};
                        var ks = Object.keys(item);
                        for (var j = 0; j < ks.length; j++) {
                            summary[ks[j]] = typeof item[ks[j]] === 'function' ? '[Function]' : item[ks[j]];
                        }
                        return summary;
                    }
                    return item;
                });
            } else if (typeof value === 'object') {
                result[key] = sanitize(value);
            } else {
                result[key] = value;
            }
        }
        return result;
    }

    function formatValidation(vr, schemaObj) {
        var result = {
            valid: vr.valid,
            object: vr.object,
            errors: vr.errors ? vr.errors.map(function(e) {
                return { message: e.message || 'Validation failed' };
            }) : undefined
        };
        if (schemaObj && typeof vr.getErrorsFor === 'function') {
            try {
                result.errorTree = buildErrorTree(vr, schemaObj);
            } catch(e) {}
        }
        return result;
    }

    function buildErrorTree(vr, schemaObj) {
        var tree = {};
        var intro;
        try { intro = schemaObj.introspect(); } catch(e) { return tree; }
        if (!intro || !intro.properties) return tree;
        var propNames = Object.keys(intro.properties);
        for (var i = 0; i < propNames.length; i++) {
            var propName = propNames[i];
            try {
                var selector = (function(name) {
                    return function(t) { return t[name]; };
                })(propName);
                var propResult = vr.getErrorsFor(selector);
                if (!propResult) continue;
                var node = { errors: [] };
                if (propResult.errors && propResult.errors.length > 0) {
                    node.errors = Array.prototype.slice.call(propResult.errors);
                }
                if (propResult.seenValue !== undefined) {
                    node.seenValue = propResult.seenValue;
                }
                // Serialize non-function fields from propResult for tooltip display
                try {
                    var serialized = {
                        isValid: propResult.isValid,
                        errors: propResult.errors ? Array.prototype.slice.call(propResult.errors) : [],
                        seenValue: propResult.seenValue
                    };
                    if (serialized.seenValue === undefined) {
                        delete serialized.seenValue;
                    }
                    node.getErrorsForResult = serialized;
                } catch(se) {}
                // Recurse into nested object properties
                var propSchema = intro.properties[propName];
                if (propSchema && typeof propSchema.introspect === 'function') {
                    var propIntro = propSchema.introspect();
                    if (propIntro && propIntro.type === 'object' && typeof propResult.getChildErrors === 'function') {
                        var childErrors = propResult.getChildErrors();
                        if (childErrors && childErrors.length > 0) {
                            var childResult = buildChildErrorTree(propResult, propSchema);
                            if (childResult && Object.keys(childResult).length > 0) {
                                node.children = childResult;
                            }
                        }
                    }
                }
                if (node.errors.length > 0 || node.children) {
                    tree[propName] = node;
                }
            } catch(e) {}
        }
        return tree;
    }

    function buildChildErrorTree(parentResult, parentSchema) {
        var tree = {};
        var intro;
        try { intro = parentSchema.introspect(); } catch(e) { return tree; }
        if (!intro || !intro.properties) return tree;
        var propNames = Object.keys(intro.properties);
        var childErrors = parentResult.getChildErrors ? parentResult.getChildErrors() : [];
        for (var i = 0; i < propNames.length; i++) {
            var propName = propNames[i];
            // Find matching child error by checking descriptors
            for (var j = 0; j < childErrors.length; j++) {
                var child = childErrors[j];
                if (!child || !child.descriptor) continue;
                try {
                    var childSchema = child.descriptor.getSchema();
                    var expectedSchema = intro.properties[propName];
                    if (childSchema === expectedSchema) {
                        var node = { errors: [] };
                        if (child.errors && child.errors.length > 0) {
                            node.errors = Array.prototype.slice.call(child.errors);
                        }
                        if (child.seenValue !== undefined) {
                            node.seenValue = child.seenValue;
                        }
                        // Further nesting
                        if (expectedSchema && typeof expectedSchema.introspect === 'function') {
                            var nestedIntro = expectedSchema.introspect();
                            if (nestedIntro && nestedIntro.type === 'object' && typeof child.getChildErrors === 'function') {
                                var nestedChildren = child.getChildErrors();
                                if (nestedChildren && nestedChildren.length > 0) {
                                    var nested = buildChildErrorTree(child, expectedSchema);
                                    if (nested && Object.keys(nested).length > 0) {
                                        node.children = nested;
                                    }
                                }
                            }
                        }
                        if (node.errors.length > 0 || node.children) {
                            tree[propName] = node;
                        }
                        break;
                    }
                } catch(e) {}
            }
        }
        return tree;
    }

    self.addEventListener('message', function(event) {
        var data = event.data;
        if (!data || !data.id) return;
        var id = data.id;
        var code = data.code || '';
        var testData = data.testData;

        try {
            // Strip import/export statements from transpiled JS
            var strippedCode = code.replace(
                /import\\s+\\{[^}]+\\}\\s+from\\s+['"][^'"]+['"]\\s*;?/g, ''
            );
            strippedCode = strippedCode.replace(
                /import\\s+\\*\\s+as\\s+\\w+\\s+from\\s+['"][^'"]+['"]\\s*;?/g, ''
            );
            strippedCode = strippedCode.replace(
                /import\\s+\\w+\\s+from\\s+['"][^'"]+['"]\\s*;?/g, ''
            );
            strippedCode = strippedCode.replace(
                /export\\s*\\{[^}]*\\}\\s*;?/g, ''
            );
            strippedCode = strippedCode.replace(
                /export\\s+default\\s+/g, ''
            );

            // Destructure all schema exports into scope
            var allExports = Object.keys(schema);
            var destructure = allExports.map(function(k) {
                return 'var ' + k + ' = __schema["' + k + '"];';
            }).join('\\n');

            // Build Zod bindings only for what the user explicitly imports from 'zod'.
            // Binding all Object.keys(zod) would include reserved keywords such as
            // 'default', 'enum', 'function', 'catch', and 'instanceof', which produce
            // a syntax error inside new Function(...).
            var zodNamedRe = /import\\s*\\{([^}]*)\\}\\s*from\\s*['"]zod['"]/g;
            var zodStarRe = /import\\s*\\*\\s*as\\s*(\\w+)\\s*from\\s*['"]zod['"]/g;
            var zodImportMatch;
            var zodBindingLines = [];
            while ((zodImportMatch = zodNamedRe.exec(code)) !== null) {
                var importItems = zodImportMatch[1].split(',');
                for (var zi = 0; zi < importItems.length; zi++) {
                    var importParts = importItems[zi].trim().split(/\\s+as\\s+/);
                    var exportedName = importParts[0].trim();
                    var localName = importParts.length > 1 ? importParts[1].trim() : exportedName;
                    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(localName) && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(exportedName)) {
                        zodBindingLines.push('var ' + localName + ' = __zod["' + exportedName + '"];');
                    }
                }
            }
            while ((zodImportMatch = zodStarRe.exec(code)) !== null) {
                var nsName = zodImportMatch[1].trim();
                if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(nsName)) {
                    zodBindingLines.push('var ' + nsName + ' = __zod;');
                }
            }
            var zodDestructure = zodBindingLines.join('\\n');

            var wrappedCode = destructure + '\\n'
                + zodDestructure + '\\n'
                + 'var __lastSchema, __lastResult;\\n'
                + strippedCode + '\\n';

            // Build variable detection code
            var varRegex = /(?:const|let|var)\\s+(\\w+)\\s*=/g;
            var match;
            var varNames = [];
            while ((match = varRegex.exec(strippedCode)) !== null) {
                varNames.push(match[1]);
            }
            for (var i = 0; i < varNames.length; i++) {
                var name = varNames[i];
                wrappedCode += 'try { if (typeof ' + name + ' !== "undefined" && ' + name + ' !== null) {'
                    + 'if (typeof ' + name + '.validate === "function" || typeof ' + name + '.introspect === "function") __lastSchema = ' + name + ';'
                    + 'if (typeof ' + name + ' === "object" && "valid" in ' + name + ') __lastResult = ' + name + ';'
                    + '}} catch(__e) {}\\n';
            }

            wrappedCode += 'return { __lastSchema: __lastSchema, __lastResult: __lastResult };';

            var fn = new Function('__schema', '__zod', wrappedCode);
            var execResult = fn(schema, zod);

            var output = {};

            if (execResult.__lastSchema && typeof execResult.__lastSchema.introspect === 'function') {
                try { output.introspection = sanitize(execResult.__lastSchema.introspect()); } catch(e) {}
            }

            if (execResult.__lastResult && typeof execResult.__lastResult === 'object' && 'valid' in execResult.__lastResult) {
                output.validationResult = formatValidation(execResult.__lastResult, execResult.__lastSchema);
            } else if (execResult.__lastSchema && typeof execResult.__lastSchema.validate === 'function' && testData) {
                try {
                    var parsed = JSON.parse(testData);
                    var vr = execResult.__lastSchema.validate(parsed);
                    output.validationResult = formatValidation(vr, execResult.__lastSchema);
                } catch(e) {}
            }

            parent.postMessage({ id: id, type: 'result', result: output }, '*');
        } catch(err) {
            parent.postMessage({ id: id, type: 'result', error: err && err.message ? err.message : String(err) }, '*');
        }
    });

    parent.postMessage({ type: 'ready' }, '*');
})();
</script></head><body></body></html>`;
}

/**
 * Manages a sandboxed iframe for executing user code.
 * The iframe has `sandbox="allow-scripts"` (no `allow-same-origin`),
 * giving it an opaque origin that cannot access the parent page's
 * cookies, localStorage, or same-origin APIs.
 */
export function useSandboxExecutor() {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const bundleRef = useRef<string>('');
    const zodBundleRef = useRef<string>('');
    const readyRef = useRef(false);
    const pendingRef = useRef<
        Map<
            string,
            {
                resolve: (r: ExecutionResult) => void;
                timer: ReturnType<typeof setTimeout>;
            }
        >
    >(new Map());
    const readyQueueRef = useRef<Array<() => void>>([]);

    useEffect(() => {
        function createIframe(bundle: string, zodBundle: string) {
            destroyIframe();
            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts');
            iframe.style.display = 'none';
            iframe.srcdoc = buildSrcdoc(bundle, zodBundle);
            document.body.appendChild(iframe);
            iframeRef.current = iframe;
        }

        function destroyIframe() {
            if (iframeRef.current) {
                iframeRef.current.remove();
                iframeRef.current = null;
                readyRef.current = false;
            }
        }

        function handleMessage(e: MessageEvent) {
            if (
                !iframeRef.current ||
                e.source !== iframeRef.current.contentWindow
            )
                return;

            const { id, type, result, error } = e.data ?? {};

            if (type === 'ready') {
                readyRef.current = true;
                const queue = readyQueueRef.current.splice(0);
                for (const cb of queue) cb();
                return;
            }

            if (type === 'result' && id) {
                const pending = pendingRef.current.get(id);
                if (pending) {
                    clearTimeout(pending.timer);
                    pendingRef.current.delete(id);
                    pending.resolve(error ? { error } : (result ?? {}));
                }
            }
        }

        window.addEventListener('message', handleMessage);

        Promise.all([
            fetch('/playground/schema-bundle.js').then(r => r.text()),
            fetch('/playground/zod-bundle.js')
                .then(r => r.text())
                .catch(() => '')
        ])
            .then(([schemaText, zodText]) => {
                bundleRef.current = schemaText;
                zodBundleRef.current = zodText;
                createIframe(schemaText, zodText);
            })
            .catch(() => {
                // Bundle fetch failed — sandbox won't be available
            });

        return () => {
            window.removeEventListener('message', handleMessage);
            destroyIframe();
            for (const [, p] of pendingRef.current) clearTimeout(p.timer);
            pendingRef.current.clear();
            readyQueueRef.current.length = 0;
        };
    }, []);

    const execute = useCallback(
        (jsCode: string, testDataJson?: string): Promise<ExecutionResult> => {
            return new Promise(resolve => {
                function send() {
                    const win = iframeRef.current?.contentWindow;
                    if (!win) {
                        resolve({ error: 'Sandbox not available' });
                        return;
                    }
                    const id = crypto.randomUUID();
                    const timer = setTimeout(() => {
                        pendingRef.current.delete(id);
                        resolve({ error: 'Execution timed out' });
                    }, EXECUTION_TIMEOUT);

                    pendingRef.current.set(id, { resolve, timer });
                    win.postMessage(
                        { id, code: jsCode, testData: testDataJson },
                        '*'
                    );
                }

                if (readyRef.current) {
                    send();
                } else {
                    // Queue until iframe is ready
                    const waitTimer = setTimeout(() => {
                        resolve({ error: 'Sandbox initialization timed out' });
                    }, 10_000);
                    readyQueueRef.current.push(() => {
                        clearTimeout(waitTimer);
                        send();
                    });
                }
            });
        },
        []
    );

    return { execute };
}

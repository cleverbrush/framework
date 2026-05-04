import { useState, useCallback } from 'react';
import {
    Badge,
    Box,
    Button,
    Callout,
    Card,
    Code,
    Flex,
    Heading,
    Separator,
    Text,
    TextField
} from '@radix-ui/themes';
import { client } from '../../api/client';

// ── Types ────────────────────────────────────────────────────────────────

type LogEntry = {
    step: number;
    label: string;
    expected: string;
    result: string;
    resultColor: 'blue' | 'green' | 'amber' | 'red';
};

// ── Page ─────────────────────────────────────────────────────────────────

export default function CachePage() {
    const [todoId, setTodoId] = useState(1);
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);

    const run = useCallback(async () => {
        setRunning(true);
        setLog([]);
        const entries: LogEntry[] = [];

        function add(
            step: number,
            label: string,
            expected: string,
            result: string,
            resultColor: LogEntry['resultColor'] = 'blue'
        ) {
            entries.push({ step, label, expected, result, resultColor });
            setLog([...entries]);
        }

        const id = todoId;
        let start: number;

        // Step 1 — warm the cache
        start = performance.now();
        try {
            await client.todos.get({ params: { id } });
            const ms = Math.round(performance.now() - start);
            add(
                1,
                `Fetch GET /api/todos/${id}`,
                'Network request in DevTools',
                `Completed in ${ms}ms — network fetch`,
                'blue'
            );
        } catch (err: any) {
            add(
                1,
                `Fetch GET /api/todos/${id}`,
                'Network request',
                `Error: ${err.message}`,
                'red'
            );
            setRunning(false);
            return;
        }

        await new Promise((r) => setTimeout(r, 100));

        // Step 2 — cache hit
        start = performance.now();
        await client.todos.get({ params: { id } });
        const ms2 = Math.round(performance.now() - start);
        const isCacheHit = ms2 < 50;
        add(
            2,
            `Fetch GET /api/todos/${id} again`,
            'NO request in DevTools — served from cacheTags middleware cache',
            `Completed in ${ms2}ms${isCacheHit ? ' ⚡ cache hit' : ' (network)'}`,
            isCacheHit ? 'green' : 'amber'
        );

        await new Promise((r) => setTimeout(r, 100));

        // Step 3 — list cache hit (after being warmed by previous fetch?)
        start = performance.now();
        await client.todos.list({ query: {} });
        const ms3 = Math.round(performance.now() - start);
        add(
            3,
            'Fetch GET /api/todos (list)',
            'Network request in DevTools (first list fetch)',
            `Completed in ${ms3}ms`,
            'blue'
        );

        await new Promise((r) => setTimeout(r, 100));

        // Step 4 — list cache hit (warmed)
        start = performance.now();
        await client.todos.list({ query: {} });
        const ms4 = Math.round(performance.now() - start);
        const listCacheHit = ms4 < 50;
        add(
            4,
            'Fetch GET /api/todos (list) again',
            'NO request — cache hit for "todo-list" tag',
            `Completed in ${ms4}ms${listCacheHit ? ' ⚡ cache hit' : ' (network)'}`,
            listCacheHit ? 'green' : 'amber'
        );

        await new Promise((r) => setTimeout(r, 100));

        // Step 5 — mutate
        start = performance.now();
        try {
            await client.todos.update({
                params: { id },
                body: { title: `Cache-test ${Date.now()}` }
            });
            const ms5 = Math.round(performance.now() - start);
            add(
                5,
                `Mutate PATCH /api/todos/${id}`,
                'Network request in DevTools. Invalidates "todo" and "todo-list" cache entries.',
                `Completed in ${ms5}ms`,
                'amber'
            );
        } catch (err: any) {
            add(
                5,
                `Mutate PATCH /api/todos/${id}`,
                'Network request, invalidates cache',
                `Error: ${err.message}`,
                'red'
            );
        }

        await new Promise((r) => setTimeout(r, 100));

        // Step 6 — fetch after invalidate (should be network)
        start = performance.now();
        await client.todos.get({ params: { id } });
        const ms6 = Math.round(performance.now() - start);
        const postInvalidateHit = ms6 < 50;
        add(
            6,
            `Fetch GET /api/todos/${id} after mutation`,
            'Network request in DevTools — "todo" cache was invalidated by step 5',
            `Completed in ${ms6}ms${postInvalidateHit ? ' ⚡ cache hit' : ' (network — expected)'}`,
            postInvalidateHit ? 'amber' : 'green'
        );

        await new Promise((r) => setTimeout(r, 100));

        // Step 7 — list after mutation (should also be invalidated)
        start = performance.now();
        await client.todos.list({ query: {} });
        const ms7 = Math.round(performance.now() - start);
        const listPostInvalidateHit = ms7 < 50;
        add(
            7,
            'Fetch GET /api/todos (list) after mutation',
            'Network request in DevTools — "todo-list" cache was invalidated by step 5',
            `Completed in ${ms7}ms${listPostInvalidateHit ? ' ⚡ cache hit' : ' (network — expected)'}`,
            listPostInvalidateHit ? 'amber' : 'green'
        );

        setRunning(false);
    }, [todoId]);

    const colorMap: Record<string, string> = {
        blue: 'var(--blue-9)',
        green: 'var(--green-9)',
        amber: 'var(--amber-9)',
        red: 'var(--red-9)'
    };

    return (
        <Box>
            <Heading size="5" mb="2">
                🗄️ Cache Tags
            </Heading>
            <Text size="2" color="gray" mb="4" as="p">
                Demonstrates tag-based HTTP caching with the{' '}
                <Code>cacheTags</Code> middleware. The demo runs a sequence of
                fetch + mutate operations and shows what to expect in your
                browser&apos;s DevTools Network tab.
            </Text>

            <Callout.Root color="blue" mb="4" size="1">
                <Callout.Text>
                    Open DevTools → Network tab before running. Cache hits
                    show <strong>no HTTP request at all</strong> — the response
                    comes from the middleware&apos;s in-memory cache.
                </Callout.Text>
            </Callout.Root>

            <Flex direction="column" gap="4">
                <Card size="3">
                    <Flex gap="3" align="end">
                        <Box style={{ flex: 1 }}>
                            <Text size="2" weight="medium" mb="1" as="p">
                                Todo ID
                            </Text>
                            <TextField.Root
                                size="2"
                                type="number"
                                value={String(todoId)}
                                onChange={(e) =>
                                    setTodoId(Number(e.target.value) || 1)
                                }
                            />
                        </Box>
                        <Button
                            size="2"
                            onClick={run}
                            disabled={running}
                            style={{ minWidth: '140px' }}
                        >
                            {running ? 'Running…' : 'Run Test'}
                        </Button>
                    </Flex>
                </Card>

                {log.length > 0 && (
                    <Card size="3">
                        <Heading size="3" mb="3">
                            Run Log
                        </Heading>
                        <Separator size="4" mb="3" />
                        <Flex direction="column" gap="3">
                            {log.map((entry) => (
                                <Box
                                    key={entry.step}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid var(--gray-4)',
                                        borderLeft: `3px solid ${colorMap[entry.resultColor]}`
                                    }}
                                >
                                    <Flex gap="2" align="center" mb="1">
                                        <Badge
                                            size="1"
                                            color={
                                                entry.resultColor === 'green'
                                                    ? 'green'
                                                    : entry.resultColor ===
                                                        'amber'
                                                      ? 'amber'
                                                      : entry.resultColor ===
                                                          'red'
                                                        ? 'red'
                                                        : 'blue'
                                            }
                                        >
                                            Step {entry.step}
                                        </Badge>
                                        <Text
                                            size="1"
                                            weight="medium"
                                            style={{
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {entry.label}
                                        </Text>
                                    </Flex>

                                    <Flex
                                        direction="column"
                                        gap="1"
                                        style={{ paddingLeft: '28px' }}
                                    >
                                        <Flex gap="1" align="center">
                                            <Badge size="1" color="gray">
                                                Expected
                                            </Badge>
                                            <Text size="1" color="gray">
                                                {entry.expected}
                                            </Text>
                                        </Flex>
                                        <Flex gap="1" align="center">
                                            <Badge
                                                size="1"
                                                color={entry.resultColor}
                                            >
                                                Result
                                            </Badge>
                                            <Text
                                                size="1"
                                                style={{
                                                    color:
                                                        colorMap[
                                                            entry.resultColor
                                                        ]
                                                }}
                                            >
                                                {entry.result}
                                            </Text>
                                        </Flex>
                                    </Flex>
                                </Box>
                            ))}
                        </Flex>
                    </Card>
                )}

                <Card size="3">
                    <Heading size="3" mb="3">
                        What&apos;s Happening
                    </Heading>
                    <Separator size="4" mb="3" />
                    <Flex direction="column" gap="2">
                        <Text size="2">
                            <strong>Steps 1–2:</strong> The first{' '}
                            <Code>GET /api/todos/:id</Code> fetches from the
                            network and populates the{' '}
                            <Code>todo</Code> cache entry. The second call
                            within the 5s TTL hits the in-memory cache — no
                            network request is made.
                        </Text>
                        <Text size="2">
                            <strong>Steps 3–4:</strong> Same pattern for{' '}
                            <Code>GET /api/todos</Code> with the{' '}
                            <Code>todo-list</Code> tag.
                        </Text>
                        <Text size="2">
                            <strong>Step 5:</strong> A{' '}
                            <Code>PATCH /api/todos/:id</Code> mutation triggers
                            cache invalidation for both the{' '}
                            <Code>todo</Code> tag (matching the entity) and the{' '}
                            <Code>todo-list</Code> tag (the collection). The
                            middleware deletes the matching cache entries.
                        </Text>
                        <Text size="2">
                            <strong>Steps 6–7:</strong> After invalidation, the
                            next fetch for both entity and list hits the
                            network again — the cache was cleared.
                        </Text>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}

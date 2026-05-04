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
    Spinner,
    Text,
    TextField
} from '@radix-ui/themes';
import { client } from '../../api/client';

// ── Config ───────────────────────────────────────────────────────────────

const CONFIG = {
    middleware: 'cacheTags',
    defaultTtl: 5000,
    tags: {
        'todo-list': { ttl: 5000, description: 'GET /api/todos — list cache' },
        'todo': {
            ttl: 5000,
            description: 'GET /api/todos/:id — entity cache (property: id)'
        },
        'activity-list': {
            ttl: 3000,
            description: 'GET /api/activity — activity list cache'
        },
        'todo-author': {
            ttl: 5000,
            description: 'GET /api/todos/:id/with-author (property: id)'
        },
        'todo-activity': {
            ttl: 5000,
            description: 'GET /api/todos/:id/activity (property: id)'
        },
        'user-list': { ttl: 5000, description: 'GET /api/users — user list' },
        'user-profile': {
            ttl: 5000,
            description: 'GET /api/users/me — profile'
        }
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────

type LogEntry = {
    id: number;
    type: 'fetch' | 'cache-hit' | 'mutate' | 'error';
    label: string;
    time: string;
    ms: number;
};

let logCounter = 0;

function formatMs(ms: number): string {
    return ms < 10 ? `${ms}ms ⚡ (cache hit)` : `${ms}ms (network)`;
}

// ── Demo: GET Cache ─────────────────────────────────────────────────────

function GetCacheDemo({
    addLog
}: {
    addLog: (e: LogEntry) => void;
}) {
    const [todoId, setTodoId] = useState(1);

    const fetchList = useCallback(async () => {
        const start = performance.now();
        try {
            await client.todos.list({ query: {} });

            const ms = Math.round(performance.now() - start);
            addLog({
                id: ++logCounter,
                type: ms < 100 ? 'cache-hit' : 'fetch',
                label: 'GET /api/todos (list)',
                time: formatMs(ms),
                ms
            });
        } catch (err: any) {
            addLog({
                id: ++logCounter,
                type: 'error',
                label: 'GET /api/todos — failed',
                time: err.message,
                ms: 0
            });
        }
    }, [addLog]);

    const fetchTodo = useCallback(async () => {
        const start = performance.now();
        try {
            await client.todos.get({ params: { id: todoId } });
            const ms = Math.round(performance.now() - start);
            addLog({
                id: ++logCounter,
                type: ms < 100 ? 'cache-hit' : 'fetch',
                label: `GET /api/todos/${todoId} (entity)`,
                time: formatMs(ms),
                ms
            });
        } catch (err: any) {
            addLog({
                id: ++logCounter,
                type: 'error',
                label: `GET /api/todos/${todoId} — failed`,
                time: err.message,
                ms: 0
            });
        }
    }, [addLog, todoId]);

    return (
        <Card size="3">
            <Heading size="3">GET Cache</Heading>
            <Text size="2" color="gray" mb="3" as="p">
                Each endpoint has a <Code>defaultTtl: 5000ms</Code>. The first
                fetch hits the network; a second fetch within 5s returns from
                the cacheTags middleware cache.
            </Text>
            <Separator size="4" mb="3" />

            <Flex direction="column" gap="3">
                <Flex gap="2" align="center">
                    <Button size="1" onClick={fetchList}>
                        Fetch Todo List
                    </Button>
                    <Button size="1" onClick={fetchList}>
                        Fetch Again
                    </Button>
                </Flex>
                <Flex gap="2" align="center">
                    <Text size="2">Todo ID:</Text>
                    <TextField.Root
                        size="1"
                        type="number"
                        value={String(todoId)}
                        onChange={(e) =>
                            setTodoId(Number(e.target.value) || 1)
                        }
                        style={{ width: '80px' }}
                    />
                    <Button size="1" onClick={fetchTodo}>
                        Fetch Todo
                    </Button>
                    <Button size="1" onClick={fetchTodo}>
                        Fetch Again
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

// ── Demo: Mutation Invalidation ─────────────────────────────────────────

function InvalidationDemo({
    addLog
}: {
    addLog: (e: LogEntry) => void;
}) {
    const [todoId, setTodoId] = useState(1);
    const [mutating, setMutating] = useState(false);

    const mutate = useCallback(async () => {
        setMutating(true);
        const start = performance.now();
        try {
            await client.todos.update({
                params: { id: todoId },
                body: { title: `Cache-test ${Date.now()}` }
            });
            const ms = Math.round(performance.now() - start);
            addLog({
                id: ++logCounter,
                type: 'mutate',
                label: `PATCH /api/todos/${todoId} → invalidates "todo-list" + "todo"`,
                time: `${ms}ms`,
                ms
            });
        } catch (err: any) {
            addLog({
                id: ++logCounter,
                type: 'error',
                label: `PATCH /api/todos/${todoId} — failed`,
                time: err.message,
                ms: 0
            });
        }
        setMutating(false);
    }, [addLog, todoId]);

    const fetchAfterMutate = useCallback(async () => {
        const start = performance.now();
        try {
            await client.todos.get({ params: { id: todoId } });
            const ms = Math.round(performance.now() - start);
            addLog({
                id: ++logCounter,
                type: 'fetch',
                label: `GET /api/todos/${todoId} — should be network (cache was invalidated)`,
                time: `${ms}ms`,
                ms
            });
        } catch (err: any) {
            addLog({
                id: ++logCounter,
                type: 'error',
                label: `GET /api/todos/${todoId} — failed`,
                time: err.message,
                ms: 0
            });
        }
    }, [addLog, todoId]);

    return (
        <Card size="3">
            <Heading size="3">Mutation Invalidation</Heading>
            <Text size="2" color="gray" mb="3" as="p">
                Mutations on endpoints with <Code>.cacheTag()</Code>{' '}
                automatically invalidate matching cache entries. After a
                mutation, the next GET should hit the network again.
            </Text>
            <Separator size="4" mb="3" />

            <Flex direction="column" gap="3">
                <Flex gap="2" align="center">
                    <Text size="2">Todo ID:</Text>
                    <TextField.Root
                        size="1"
                        type="number"
                        value={String(todoId)}
                        onChange={(e) =>
                            setTodoId(Number(e.target.value) || 1)
                        }
                        style={{ width: '80px' }}
                    />
                    <Button
                        size="1"
                        color="amber"
                        onClick={mutate}
                        disabled={mutating}
                    >
                        {mutating ? 'Mutating…' : 'Mutate (Update)'}
                    </Button>
                    <Button size="1" onClick={fetchAfterMutate}>
                        Fetch After Mutate
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

// ── Demo: TS Query Integration ──────────────────────────────────────────

function TsQueryDemo() {
    const { data: todos, isLoading } = client.todos.list.useQuery();
    const [title, setTitle] = useState('');
    const createMutation = client.todos.create.useMutation({
        onSuccess: () => setTitle('')
    });

    return (
        <Card size="3">
            <Heading size="3">TanStack Query Integration</Heading>
            <Text size="2" color="gray" mb="3" as="p">
                The <Code>useMutation</Code> hook automatically invalidates
                TanStack Query cache for the endpoint&apos;s group when cache
                tags are declared. No manual{' '}
                <Code>queryClient.invalidateQueries()</Code> needed.
            </Text>
            <Separator size="4" mb="3" />

            <Flex direction="column" gap="3">
                <Flex gap="2" align="center">
                    <TextField.Root
                        size="1"
                        placeholder="New todo title…"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <Button
                        size="1"
                        disabled={!title.trim() || createMutation.isPending}
                        onClick={() =>
                            createMutation.mutate({
                                body: { title: title.trim() }
                            })
                        }
                    >
                        {createMutation.isPending ? 'Creating…' : 'Create'}
                    </Button>
                    {createMutation.isSuccess && (
                        <Badge color="green">Created — list auto-refetches</Badge>
                    )}
                </Flex>

                {isLoading ? (
                    <Spinner size="1" />
                ) : (
                    <Text size="2">
                        <Badge size="1" color="blue" mr="2">
                            {todos?.length ?? 0} todos
                        </Badge>
                        Watch the Network tab — the list refetches
                        automatically after creating a todo.
                    </Text>
                )}
            </Flex>
        </Card>
    );
}

// ── Log ──────────────────────────────────────────────────────────────────

function LogView({ entries }: { entries: LogEntry[] }) {
    if (entries.length === 0) return null;

    return (
        <Card size="3">
            <Heading size="3">Event Log</Heading>
            <Separator size="4" mb="3" />
            <Flex direction="column" gap="1">
                {entries.map((e) => (
                    <Flex
                        key={e.id}
                        gap="2"
                        align="center"
                        style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            background: 'var(--gray-2)'
                        }}
                    >
                        <Badge
                            size="1"
                            color={
                                e.type === 'cache-hit'
                                    ? 'green'
                                    : e.type === 'mutate'
                                      ? 'amber'
                                      : e.type === 'error'
                                        ? 'red'
                                        : 'blue'
                            }
                        >
                            {e.type}
                        </Badge>
                        <Text size="1">{e.label}</Text>
                        <Text size="1" style={{ marginLeft: 'auto' }}>
                            {e.time}
                        </Text>
                    </Flex>
                ))}
            </Flex>
        </Card>
    );
}

// ── Config Card ──────────────────────────────────────────────────────────

function ConfigCard() {
    return (
        <Card size="3">
            <Heading size="3">Middleware Configuration</Heading>
            <Separator size="4" mb="3" />
            <Flex direction="column" gap="2">
                <Flex gap="2">
                    <Badge size="1" color="indigo">
                        middleware
                    </Badge>
                    <Code size="1">{CONFIG.middleware}</Code>
                </Flex>
                <Flex gap="2">
                    <Badge size="1" color="indigo">
                        defaultTtl
                    </Badge>
                    <Code size="1">{CONFIG.defaultTtl}ms</Code>
                </Flex>
                <Flex gap="2" align="center">
                    <Badge size="1" color="indigo">
                        active tags
                    </Badge>
                    <Flex gap="1" wrap="wrap">
                        {Object.entries(CONFIG.tags).map(([name, info]) => (
                            <Flex key={name} gap="1" align="center">
                                <Badge size="1" color="green">
                                    {name}
                                </Badge>
                                <Text size="1" color="gray">
                                    {info.ttl}ms
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                </Flex>
            </Flex>
        </Card>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function CachePage() {
    const [log, setLog] = useState<LogEntry[]>([]);

    const addLog = useCallback((entry: LogEntry) => {
        setLog((prev) => [entry, ...prev.slice(0, 19)]);
    }, []);

    const clearLog = useCallback(() => setLog([]), []);

    return (
        <Box>
            <Heading size="5" mb="2">
                🗄️ Cache Tags
            </Heading>
            <Text size="2" color="gray" mb="4" as="p">
                Interactive demos of the tag-based cache and auto-invalidation
                system. Use your browser&apos;s DevTools Network tab to observe
                which requests hit the server and which are served from cache.
            </Text>

            <Callout.Root color="blue" mb="4" size="1">
                <Callout.Text>
                    Open DevTools → Network tab to see request flows. Cache
                    hits show no HTTP request at all (served by the middleware
                    in-memory).
                </Callout.Text>
            </Callout.Root>

            <Flex direction="column" gap="4">
                <ConfigCard />
                <GetCacheDemo addLog={addLog} />
                <InvalidationDemo addLog={addLog} />
                <TsQueryDemo />

                <Flex justify="end">
                    <Button
                        size="1"
                        variant="ghost"
                        color="gray"
                        onClick={clearLog}
                    >
                        Clear Log
                    </Button>
                </Flex>
                <LogView entries={log} />
            </Flex>
        </Box>
    );
}

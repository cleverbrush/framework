import { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    Code,
    Flex,
    Heading,
    Separator,
    Text,
    Badge
} from '@radix-ui/themes';
import { client } from '../../api/client';

type DemoResult = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    duration?: number;
};

function useDemoAction(action: () => Promise<string>): [DemoResult, () => void] {
    const [result, setResult] = useState<DemoResult>({
        status: 'idle',
        message: ''
    });

    const run = useCallback(() => {
        setResult({ status: 'loading', message: 'Running…' });
        const start = performance.now();
        action()
            .then((message) => {
                setResult({
                    status: 'success',
                    message,
                    duration: Math.round(performance.now() - start)
                });
            })
            .catch((err) => {
                const message =
                    err instanceof Error ? err.message : String(err);
                setResult({
                    status: 'error',
                    message,
                    duration: Math.round(performance.now() - start)
                });
            });
    }, [action]);

    return [result, run];
}

function StatusBadge({ status }: { status: DemoResult['status'] }) {
    if (status === 'idle') return null;
    const color =
        status === 'loading'
            ? 'blue'
            : status === 'success'
              ? 'green'
              : 'red';
    return <Badge color={color}>{status}</Badge>;
}

function DemoCard({
    title,
    description,
    buttonLabel,
    result,
    onRun
}: {
    title: string;
    description: string;
    buttonLabel: string;
    result: DemoResult;
    onRun: () => void;
}) {
    return (
        <Card size="3">
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                    <Heading size="3">{title}</Heading>
                    <StatusBadge status={result.status} />
                </Flex>
                <Text size="2" color="gray">
                    {description}
                </Text>
                <Flex gap="3" align="center">
                    <Button
                        onClick={onRun}
                        disabled={result.status === 'loading'}
                    >
                        {buttonLabel}
                    </Button>
                    {result.duration !== undefined && (
                        <Text size="1" color="gray">
                            {result.duration}ms
                        </Text>
                    )}
                </Flex>
                {result.message && result.status !== 'loading' && (
                    <Code size="2" style={{ whiteSpace: 'pre-wrap' }}>
                        {result.message}
                    </Code>
                )}
            </Flex>
        </Card>
    );
}

export default function BatchingPage() {
    // Demo 1: parallel batch — fire 3 independent requests simultaneously
    const [parallelResult, runParallel] = useDemoAction(
        useCallback(async () => {
            const t0 = performance.now();
            const [todos, user, echo] = await Promise.all([
                client.todos.list({ query: {} }),
                client.users.me(),
                client.demo.echo({ body: { message: 'ping' } })
            ]);
            const elapsed = Math.round(performance.now() - t0);
            const count = Array.isArray(todos) ? todos.length : 0;
            return (
                `3 concurrent requests coalesced into 1 batch in ${elapsed}ms\n` +
                `• todos.list → ${count} item(s)\n` +
                `• users.me  → "${user.email}"\n` +
                `• demo.echo → "${echo.message}"`
            );
        }, [])
    );

    // Demo 2: sequential (single passthrough) — one request should skip batch overhead
    const [singleResult, runSingle] = useDemoAction(
        useCallback(async () => {
            const t0 = performance.now();
            const res = await client.demo.echo({ body: { message: 'solo' } });
            const elapsed = Math.round(performance.now() - t0);
            return (
                `Single request sent directly (no batch overhead) in ${elapsed}ms\n` +
                `• demo.echo → "${res.message}"`
            );
        }, [])
    );

    // Demo 3: rapid burst — fire 8 requests at once to demonstrate maxSize splitting
    const [burstResult, runBurst] = useDemoAction(
        useCallback(async () => {
            const t0 = performance.now();
            const requests = Array.from({ length: 8 }, (_, i) =>
                client.demo.echo({ body: { message: `burst-${i}` } })
            );
            const results = await Promise.all(requests);
            const elapsed = Math.round(performance.now() - t0);
            const messages = results.map(r => r.message).join(', ');
            return (
                `8 requests batched (split at maxSize=10) in ${elapsed}ms\n` +
                `• responses: ${messages}`
            );
        }, [])
    );

    return (
        <Box>
            <Heading size="5" mb="2">
                📦 Request Batching Demo
            </Heading>
            <Text size="2" color="gray" mb="5" as="p">
                Demonstrates the <Code>batching()</Code> middleware from{' '}
                <Code>@cleverbrush/client/batching</Code>. Concurrent requests
                are coalesced into a single <Code>POST /__batch</Code>. Open
                DevTools → Network to see the batch calls.
            </Text>

            <Flex direction="column" gap="4">
                <DemoCard
                    title="Parallel Batch"
                    description="Fires 3 independent requests simultaneously. The batching middleware coalesces them into a single POST /__batch and fans the responses back to each caller."
                    buttonLabel="Run 3 parallel requests"
                    result={parallelResult}
                    onRun={runParallel}
                />

                <DemoCard
                    title="Single Request Passthrough"
                    description="A single request is sent directly via fetch — no batch overhead. The middleware detects that only one item was queued at flush time and bypasses the batch path."
                    buttonLabel="Run single request"
                    result={singleResult}
                    onRun={runSingle}
                />

                <DemoCard
                    title="Burst (8 requests)"
                    description="Fires 8 requests at once. With maxSize=10 (default), all 8 are sent in one batch. Raise the count above maxSize to see the middleware split them into multiple batches."
                    buttonLabel="Run 8-request burst"
                    result={burstResult}
                    onRun={runBurst}
                />

                <Separator size="4" />

                <Card size="2" variant="surface">
                    <Heading size="2" mb="2">
                        How it is configured in this demo
                    </Heading>
                    <Code size="1" style={{ whiteSpace: 'pre' }}>
                        {`// demos/todo-frontend/src/api/client.ts
middlewares: [
    retry({ limit: 2, retryOnTimeout: true }),
    timeout({ timeout: 10_000 }),
    dedupe(),
    throttlingCache({ throttle: 2000 }),
    batching({ maxSize: 10, windowMs: 10 }), // ← innermost
]

// demos/todo-backend/src/server.ts
createServer()
    .useBatching()   // enables POST /__batch
    .handleAll(mapping)
    .listen(3000);`}
                    </Code>
                </Card>
            </Flex>
        </Box>
    );
}

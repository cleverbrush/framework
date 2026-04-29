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
    Badge,
    Tooltip
} from '@radix-ui/themes';
import {
    isApiError,
    isTimeoutError,
    isNetworkError,
    isWebError
} from '@cleverbrush/client';
import { client } from '../../api/client';

type DemoResult = {
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    duration?: number;
    traceId?: string;
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
                let message = 'Unknown error';
                let traceId: string | undefined;
                if (isTimeoutError(err)) {
                    message = `TimeoutError: timed out after ${err.timeout}ms`;
                } else if (isApiError(err)) {
                    message = `ApiError: ${err.status} — ${err.message}`;
                    traceId = err.traceId;
                } else if (isNetworkError(err)) {
                    message = `NetworkError: ${err.message}`;
                } else if (isWebError(err)) {
                    message = `WebError: ${err.message}`;
                } else if (err instanceof Error) {
                    message = err.message;
                }
                setResult({
                    status: 'error',
                    message,
                    traceId,
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

function TraceIdCopy({ traceId }: { traceId: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(traceId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            // Clipboard API unavailable or permission denied; silently ignore
        });
    }, [traceId]);

    return (
        <Flex align="center" gap="2">
            <Text size="1" color="gray">
                Trace ID:
            </Text>
            <Tooltip
                content={
                    copied ? 'Copied!' : 'Click to copy — paste into SigNoz Search'
                }
            >
                <Code
                    size="1"
                    style={{ cursor: 'pointer', userSelect: 'all' }}
                    onClick={handleCopy}
                    aria-label="Copy trace ID to clipboard"
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCopy();
                        }
                    }}
                >
                    {traceId}
                </Code>
            </Tooltip>
        </Flex>
    );
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
                {result.traceId && (
                    <TraceIdCopy traceId={result.traceId} />
                )}
            </Flex>
        </Card>
    );
}

export default function ResiliencePage() {
    const [timeoutResult, runTimeout] = useDemoAction(
        useCallback(async () => {
            // Request with a 2s timeout but the server delays 5s
            const res = await client.demo.slow({
                query: { delay: 5000 },
                timeout: 2000
            });
            return `Response: ${res.ok}`;
        }, [])
    );

    const [retryResult, runRetry] = useDemoAction(
        useCallback(async () => {
            // Server fails twice then succeeds — retry middleware handles it
            const key = `retry-${Date.now()}`;
            const res = await client.demo.flaky({
                query: { failCount: 2, key }
            });
            return `Succeeded on attempt ${res.attempt}`;
        }, [])
    );

    const [dedupeResult, runDedupe] = useDemoAction(
        useCallback(async () => {
            // Fire 3 identical requests — dedupe coalesces them
            const [a, b, c] = await Promise.all([
                client.demo.slow({ query: { delay: 500 } }),
                client.demo.slow({ query: { delay: 500 } }),
                client.demo.slow({ query: { delay: 500 } })
            ]);
            return `All 3 got: "${a.ok}" (only 1 fetch fired)`;
        }, [])
    );

    const [cacheResult, runCache] = useDemoAction(
        useCallback(async () => {
            // First call hits network, second is cached
            const start1 = performance.now();
            await client.demo.slow({ query: { delay: 300 } });
            const t1 = Math.round(performance.now() - start1);

            const start2 = performance.now();
            await client.demo.slow({ query: { delay: 300 } });
            const t2 = Math.round(performance.now() - start2);

            return `1st call: ${t1}ms (network), 2nd call: ${t2}ms (cached)`;
        }, [])
    );

    const [echoResult, runEcho] = useDemoAction(
        useCallback(async () => {
            const res = await client.demo.echo({
                body: { message: 'Hello from resilience demo!' }
            });
            return `Echo: "${res.message}"`;
        }, [])
    );

    const [errorResult, runError] = useDemoAction(
        useCallback(async () => {
            // Request a non-existent todo to trigger ApiError
            await client.todos.get({ params: { id: 999999 } });
            return 'Should not reach here';
        }, [])
    );

    const [crashSqlResult, runCrashSql] = useDemoAction(
        useCallback(async () => {
            await client.demo.crashSql({});
            return 'Should not reach here';
        }, [])
    );

    const [crashRuntimeResult, runCrashRuntime] = useDemoAction(
        useCallback(async () => {
            await client.demo.crashRuntime({});
            return 'Should not reach here';
        }, [])
    );

    return (
        <Box>
            <Heading size="5" mb="2">
                🛡️ Resilience Demo
            </Heading>
            <Text size="2" color="gray" mb="5" as="p">
                Interactive demonstrations of @cleverbrush/client middleware and
                error handling features.
            </Text>

            <Separator size="4" mb="5" />

            <Flex direction="column" gap="4">
                <DemoCard
                    title="⏱️ Timeout"
                    description="Sends a request with a 2s timeout to an endpoint that takes 5s. The timeout middleware aborts the request and throws a TimeoutError."
                    buttonLabel="Test Timeout"
                    result={timeoutResult}
                    onRun={runTimeout}
                />

                <DemoCard
                    title="🔄 Retry"
                    description="Calls an endpoint that fails twice then succeeds. The retry middleware automatically retries with exponential backoff."
                    buttonLabel="Test Retry"
                    result={retryResult}
                    onRun={runRetry}
                />

                <DemoCard
                    title="🔗 Deduplication"
                    description="Fires 3 identical GET requests simultaneously. The dedupe middleware coalesces them into a single network request."
                    buttonLabel="Test Dedupe"
                    result={dedupeResult}
                    onRun={runDedupe}
                />

                <DemoCard
                    title="💾 Cache"
                    description="Makes two identical requests in sequence. The first hits the network, the second is served from the throttling cache."
                    buttonLabel="Test Cache"
                    result={cacheResult}
                    onRun={runCache}
                />

                <DemoCard
                    title="📨 Echo"
                    description="Sends a message to the echo endpoint and displays the response. Demonstrates basic request/response flow."
                    buttonLabel="Test Echo"
                    result={echoResult}
                    onRun={runEcho}
                />

                <DemoCard
                    title="❌ Error Handling"
                    description="Requests a non-existent todo (id: 999999). Demonstrates typed ApiError with status code and message."
                    buttonLabel="Test Error"
                    result={errorResult}
                    onRun={runError}
                />

                <DemoCard
                    title="🗄️ SQL Crash"
                    description="Triggers an unhandled database error by querying a non-existent table. Check SigNoz — the span will be marked as failed with the SQL exception attached."
                    buttonLabel="Crash SQL"
                    result={crashSqlResult}
                    onRun={runCrashSql}
                />

                <DemoCard
                    title="💥 Runtime Crash"
                    description="Throws an unhandled JavaScript Error on the server. Check SigNoz — the span will be marked as failed with the exception stacktrace attached."
                    buttonLabel="Crash Runtime"
                    result={crashRuntimeResult}
                    onRun={runCrashRuntime}
                />
            </Flex>
        </Box>
    );
}

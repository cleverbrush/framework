import { useState, useCallback } from 'react';
import {
    Badge,
    Box,
    Button,
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
    id: number;
    step: number;
    label: string;
    result: string;
    kind: 'info' | 'success' | 'error';
};

// ── Page ─────────────────────────────────────────────────────────────────

export default function IdempotencyPage() {
    const [title, setTitle] = useState('Test todo');
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);

    const run = useCallback(async () => {
        setRunning(true);
        setLog([]);
        const entries: LogEntry[] = [];

        function add(
            step: number,
            label: string,
            result: string,
            kind: LogEntry['kind'] = 'info'
        ) {
            entries.push({
                id: entries.length + 1,
                step,
                label,
                result,
                kind
            });
            setLog([...entries]);
        }

        // Step 1: Create a todo — client adds X-Idempotency-Key automatically
        let createdId: number | undefined;
        try {
            const res = await client.todos.create({
                body: { title: title.trim() }
            });
            createdId = res.id;
            add(
                1,
                'POST /api/todos (create)',
                `Created todo #${res.id} with title "${res.title}" — idempotency key auto-generated`,
                'success'
            );
        } catch (err: any) {
            add(
                1,
                'POST /api/todos (create)',
                `Error: ${err.message}`,
                'error'
            );
            setRunning(false);
            return;
        }

        // Step 2: Create the same todo again (different key, should succeed)
        try {
            const res2 = await client.todos.create({
                body: { title: title.trim() }
            });
            add(
                2,
                'POST /api/todos (create) again',
                `Created todo #${res2.id} — different idempotency key, different request (expected: two todos exist)`,
                'success'
            );
        } catch (err: any) {
            add(
                2,
                'POST /api/todos (create) again',
                `Error: ${err.message}`,
                'error'
            );
        }

        // Step 3: Show what's in the Network tab
        add(
            3,
            'Check DevTools Network tab',
            'Both POST requests have X-Idempotency-Key header. Server stores the response — if the same key is replayed, the handler does not execute again.',
            'info'
        );

        setRunning(false);
    }, [title]);

    return (
        <Box>
            <Heading size="5" mb="2">
                🔑 Idempotency
            </Heading>
            <Text size="2" color="gray" mb="4" as="p">
                Demonstrates the <Code>idempotency</Code> client middleware —
                every mutating request automatically receives an{' '}
                <Code>X-Idempotency-Key</Code> header so the server can
                deduplicate replays.
            </Text>

            <Flex direction="column" gap="4">
                <Card size="3">
                    <Flex gap="3" align="end">
                        <Box style={{ flex: 1 }}>
                            <Text size="2" weight="medium" mb="1" as="p">
                                Todo title
                            </Text>
                            <TextField.Root
                                size="2"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Box>
                        <Button
                            size="2"
                            onClick={run}
                            disabled={running || !title.trim()}
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
                        <Flex direction="column" gap="2">
                            {log.map((entry) => (
                                <Flex
                                    key={entry.id}
                                    gap="2"
                                    align="start"
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        background: 'var(--gray-2)',
                                        borderLeft: `3px solid var(--${entry.kind === 'success' ? 'green' : entry.kind === 'error' ? 'red' : 'blue'}-9)`
                                    }}
                                >
                                    <Badge
                                        size="1"
                                        color={
                                            entry.kind === 'success'
                                                ? 'green'
                                                : entry.kind === 'error'
                                                  ? 'red'
                                                  : 'blue'
                                        }
                                    >
                                        Step {entry.step}
                                    </Badge>
                                    <Box style={{ flex: 1 }}>
                                        <Text
                                            size="1"
                                            weight="medium"
                                            style={{
                                                fontFamily: 'monospace'
                                            }}
                                        >
                                            {entry.label}
                                        </Text>
                                        <Text
                                            size="1"
                                            color="gray"
                                            as="p"
                                            mt="1"
                                        >
                                            {entry.result}
                                        </Text>
                                    </Box>
                                </Flex>
                            ))}
                        </Flex>
                    </Card>
                )}

                <Card size="3">
                    <Heading size="3" mb="3">
                        How It Works
                    </Heading>
                    <Separator size="4" mb="3" />
                    <Flex direction="column" gap="2">
                        <Text size="2">
                            <strong>Client:</strong> The{' '}
                            <Code>idempotency()</Code> middleware adds a{' '}
                            <Code>X-Idempotency-Key</Code> header (UUID v4) to
                            every mutating request. When a request is retried,
                            the same key is reused — so retries are
                            deduplicated server-side.
                        </Text>
                        <Text size="2">
                            <strong>Server:</strong> The{' '}
                            <Code>idempotency()</Code> middleware stores
                            responses keyed by the header value. Replayed
                            requests return the stored response instead of
                            re-executing the handler.
                        </Text>
                        <Text size="2">
                            <strong>TTL:</strong> Stored responses expire
                            after 24 hours by default. Periodic cleanup runs
                            every 60 seconds.
                        </Text>
                    </Flex>
                </Card>
            </Flex>
        </Box>
    );
}

import { useState, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    Flex,
    Heading,
    Separator,
    Text,
    Badge,
    TextField,
    ScrollArea
} from '@radix-ui/themes';
import { useSubscription } from '@cleverbrush/client/react';
import { client } from '../../api/client';

// ---------------------------------------------------------------------------
// Todo Updates — server-push only subscription
// ---------------------------------------------------------------------------

function TodoUpdatesPanel() {
    const { events, state, close } = useSubscription(
        () => client.live.todoUpdates({ reconnect: { maxRetries: 10 } }),
        { maxEvents: 50 }
    );

    return (
        <Card size="3">
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                    <Heading size="4">Live Todo Updates</Heading>
                    <Flex gap="2" align="center">
                        <Badge
                            color={
                                state === 'connected'
                                    ? 'green'
                                    : state === 'reconnecting'
                                      ? 'orange'
                                      : state === 'connecting'
                                        ? 'yellow'
                                        : 'red'
                            }
                        >
                            {state}
                        </Badge>
                        <Button size="1" variant="soft" color="red" onClick={close}>
                            Disconnect
                        </Button>
                    </Flex>
                </Flex>
                <Text size="2" color="gray">
                    Server pushes simulated todo change events every 2 seconds.
                    Reconnects automatically on unexpected drops (up to 10 retries).
                </Text>
                <ScrollArea style={{ maxHeight: 300 }}>
                    <Flex direction="column" gap="1">
                        {events.length === 0 && (
                            <Text size="2" color="gray">
                                Waiting for events…
                            </Text>
                        )}
                        {events.map((e, i) => (
                            <Flex key={i} gap="2" align="center">
                                <Badge
                                    color={
                                        e.action === 'created'
                                            ? 'green'
                                            : e.action === 'deleted'
                                              ? 'red'
                                              : e.action === 'completed'
                                                ? 'blue'
                                                : 'orange'
                                    }
                                    size="1"
                                >
                                    {e.action}
                                </Badge>
                                <Text size="2">
                                    #{e.todoId} — {e.title}
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>
            </Flex>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Chat — bidirectional subscription
// ---------------------------------------------------------------------------

function ChatPanel() {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const { events, state, send, close } = useSubscription(
        () => client.live.chat({ reconnect: { maxRetries: 10 } }),
        { maxEvents: 200 }
    );

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        send({ text });
        setInput('');
    };

    return (
        <Card size="3">
            <Flex direction="column" gap="3">
                <Flex justify="between" align="center">
                    <Heading size="4">Chat Room</Heading>
                    <Flex gap="2" align="center">
                        <Badge
                            color={
                                state === 'connected'
                                    ? 'green'
                                    : state === 'reconnecting'
                                      ? 'orange'
                                      : state === 'connecting'
                                        ? 'yellow'
                                        : 'red'
                            }
                        >
                            {state}
                        </Badge>
                        <Button size="1" variant="soft" color="red" onClick={close}>
                            Disconnect
                        </Button>
                    </Flex>
                </Flex>
                <Text size="2" color="gray">
                    Bidirectional WebSocket — messages are broadcast to all connected clients.
                </Text>
                <ScrollArea style={{ maxHeight: 300 }} ref={scrollRef}>
                    <Flex direction="column" gap="1">
                        {events.length === 0 && (
                            <Text size="2" color="gray">
                                No messages yet…
                            </Text>
                        )}
                        {events.map((e, i) => (
                            <Flex key={i} gap="2" align="baseline">
                                <Text
                                    size="2"
                                    weight="bold"
                                    color={e.user === 'system' ? 'gray' : undefined}
                                >
                                    {e.user}:
                                </Text>
                                <Text size="2">{e.text}</Text>
                                <Text size="1" color="gray">
                                    {new Date(e.ts).toLocaleTimeString()}
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                </ScrollArea>
                <Flex gap="2">
                    <Box flexGrow="1">
                        <TextField.Root
                            placeholder="Type a message…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSend();
                            }}
                            disabled={state !== 'connected'}
                        />
                    </Box>
                    <Button onClick={handleSend} disabled={state !== 'connected'}>
                        Send
                    </Button>
                </Flex>
            </Flex>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LivePage() {
    return (
        <Flex direction="column" gap="6" p="4" style={{ maxWidth: 800 }}>
            <Box>
                <Heading size="6" mb="2">
                    WebSocket Subscriptions
                </Heading>
                <Text size="3" color="gray">
                    Real-time communication powered by{' '}
                    <code>endpoint.subscription()</code> and{' '}
                    <code>useSubscription()</code>.
                </Text>
            </Box>
            <Separator size="4" />
            <TodoUpdatesPanel />
            <ChatPanel />
        </Flex>
    );
}

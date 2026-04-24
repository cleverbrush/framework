import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    Flex,
    Heading,
    IconButton,
    ScrollArea,
    Separator,
    Text
} from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import { useSubscription } from '@cleverbrush/client/react';
import { client } from '../../api/client';

// ── Types (inferred from the client) ─────────────────────────────────────────

type ActivityEvent = Awaited<
    ReturnType<typeof client.activity.listAll>
>[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function stateColor(state: string) {
    if (state === 'connected') return 'green' as const;
    if (state === 'reconnecting') return 'orange' as const;
    if (state === 'connecting') return 'yellow' as const;
    return 'red' as const;
}

function typeColor(type: string) {
    if (type === 'assigned') return 'blue' as const;
    if (type === 'commented') return 'purple' as const;
    if (type === 'completed') return 'green' as const;
    return 'gray' as const;
}

// ── Activity row renderer (polymorphic) ───────────────────────────────────────

function ActivityRow({
    event,
    onDelete
}: {
    event: ActivityEvent;
    onDelete: (id: number) => void;
}) {
    const ts = new Date(event.createdAt).toLocaleTimeString();

    let detail: ReactNode;
    if (event.type === 'assigned') {
        const assigneeLabel = (event as any).assignee?.email
            ? `${(event as any).assignee.email} (#${event.assignedToUserId})`
            : `#${event.assignedToUserId}`;
        detail = (
            <Text size="2" color="gray">
                Assigned to {assigneeLabel}
            </Text>
        );
    } else if (event.type === 'commented') {
        detail = (
            <Text size="2" color="gray">
                "{event.comment}"
            </Text>
        );
    } else {
        detail = (
            <Text size="2" color="gray">
                {event.completedAt
                    ? `Completed at ${new Date(event.completedAt).toLocaleString()}`
                    : 'Marked complete'}
            </Text>
        );
    }

    return (
        <Flex gap="3" align="start" py="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
            <Flex direction="column" align="center" gap="1" style={{ minWidth: 56 }}>
                <Badge color={typeColor(event.type)} size="1">
                    {event.type}
                </Badge>
                <Text size="1" color="gray">
                    {ts}
                </Text>
            </Flex>
            <Flex direction="column" gap="1" flexGrow="1">
                <Text size="2">
                    Todo <Text weight="bold">#{event.todoId}</Text>
                    {event.actorUserId != null && (
                        <Text color="gray"> · actor #{event.actorUserId}</Text>
                    )}
                </Text>
                {detail}
            </Flex>
            <IconButton
                size="1"
                variant="ghost"
                color="red"
                aria-label="Delete activity"
                onClick={() => onDelete(event.id)}
            >
                <Cross2Icon />
            </IconButton>
        </Flex>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
    const [seed, setSeed] = useState<ActivityEvent[]>([]);
    const [seedLoading, setSeedLoading] = useState(true);
    // Optimistically deleted IDs — removed immediately on click, restored on error.
    const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

    // Load latest 10 events via REST on mount
    useEffect(() => {
        client.activity
            .listAll({ query: { limit: 10 } })
            .then(data => setSeed(data))
            .catch(() => {})
            .finally(() => setSeedLoading(false));
    }, []);

    // Live tail via WebSocket
    const { events: liveEvents, state, close } = useSubscription(
        () => client.live.activityFeed({ reconnect: { maxRetries: 10 } }),
        { maxEvents: 200 }
    );

    const handleDelete = useCallback((id: number) => {
        // Optimistically hide the item.
        setDeletedIds(prev => new Set([...prev, id]));

        client.activity
            .delete({ params: { id } })
            .catch(() => {
                // Restore on failure.
                setDeletedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            });
    }, []);

    // Merge: live first (newest), then seed — dedupe by id
    const seenIds = new Set<number>();
    const merged: ActivityEvent[] = [];
    for (const e of [...liveEvents].reverse()) {
        if (!seenIds.has(e.id) && !deletedIds.has(e.id)) {
            seenIds.add(e.id);
            merged.push(e);
        }
    }
    for (const e of seed) {
        if (!seenIds.has(e.id) && !deletedIds.has(e.id)) {
            seenIds.add(e.id);
            merged.push(e);
        }
    }

    return (
        <Box p="5" style={{ maxWidth: 700 }}>
            <Flex justify="between" align="center" mb="4">
                <Flex direction="column" gap="1">
                    <Heading size="6">Activity Feed</Heading>
                    <Text size="2" color="gray">
                        Latest 10 events loaded via REST · new events stream live over WebSocket.
                        Demonstrates polymorphic CTI/STI inheritance + subscriptions.
                    </Text>
                </Flex>
                <Flex gap="2" align="center">
                    <Badge color={stateColor(state)}>{state}</Badge>
                    <Button size="1" variant="soft" color="red" onClick={close}>
                        Disconnect
                    </Button>
                </Flex>
            </Flex>

            <Separator mb="4" />

            <Card size="2">
                {seedLoading ? (
                    <Text size="2" color="gray">
                        Loading…
                    </Text>
                ) : merged.length === 0 ? (
                    <Text size="2" color="gray">
                        No activity yet. Send an event from a todo page to see it here.
                    </Text>
                ) : (
                    <ScrollArea style={{ maxHeight: 600 }}>
                        <Flex direction="column">
                            {merged.map(e => (
                                <ActivityRow key={e.id} event={e} onDelete={handleDelete} />
                            ))}
                        </Flex>
                    </ScrollArea>
                )}
            </Card>
        </Box>
    );
}

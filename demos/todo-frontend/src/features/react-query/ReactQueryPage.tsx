import { Suspense, useState, useCallback } from 'react';
import {
    Badge,
    Box,
    Button,
    Card,
    Code,
    Flex,
    Heading,
    Separator,
    Spinner,
    Text,
    TextField
} from '@radix-ui/themes';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError, isWebError } from '@cleverbrush/client';
import { client } from '../../api/client';

// ── Shared Helpers ──────────────────────────────────────────────────────

function DemoCard({
    title,
    description,
    children
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card size="3">
            <Flex direction="column" gap="3">
                <Heading size="3">{title}</Heading>
                <Text size="2" color="gray">
                    {description}
                </Text>
                <Separator size="4" />
                {children}
            </Flex>
        </Card>
    );
}

// ── Demo 1: Basic useQuery ──────────────────────────────────────────────

function BasicQueryDemo() {
    const { data, isLoading, isError, error, refetch } =
        client.todos.list.useQuery();

    return (
        <DemoCard
            title="1. Basic useQuery"
            description="Fetches all todos using client.todos.list.useQuery(). Data is cached and refetched automatically."
        >
            <Flex gap="2" align="center">
                <Button size="1" onClick={() => refetch()}>
                    Refetch
                </Button>
                {isLoading && <Spinner size="1" />}
                {isError && (
                    <Badge color="red">
                        Error: {isWebError(error) ? error.message : 'Unknown'}
                    </Badge>
                )}
            </Flex>
            {data && (
                <Box>
                    <Text size="2" weight="medium">
                        {data.length} todo(s) loaded
                    </Text>
                    <Box
                        mt="2"
                        style={{
                            maxHeight: '150px',
                            overflow: 'auto',
                            fontSize: '13px'
                        }}
                    >
                        {data.slice(0, 5).map((t) => (
                            <Flex key={t.id} gap="2" py="1">
                                <Badge
                                    size="1"
                                    color={t.completed ? 'green' : 'gray'}
                                >
                                    {t.completed ? '✓' : '○'}
                                </Badge>
                                <Text size="1">{t.title}</Text>
                            </Flex>
                        ))}
                        {data.length > 5 && (
                            <Text size="1" color="gray">
                                …and {data.length - 5} more
                            </Text>
                        )}
                    </Box>
                </Box>
            )}
            <Code size="1" color="gray">
                client.todos.list.useQuery()
            </Code>
        </DemoCard>
    );
}

// ── Demo 2: useQuery with Parameters ───────────────────────────────────

function ParameterQueryDemo() {
    const [todoId, setTodoId] = useState(1);
    const { data, isLoading, isError, error } = client.todos.get.useQuery({
        params: { id: todoId }
    });

    return (
        <DemoCard
            title="2. useQuery with Parameters"
            description="Fetches a single todo by ID. Changing the ID automatically refetches with a new query key."
        >
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
                {isLoading && <Spinner size="1" />}
            </Flex>
            {isError && (
                <Badge color="red">
                    {isApiError(error) ? `${error.status}` : 'Error'}
                </Badge>
            )}
            {data && (
                <Box
                    p="2"
                    style={{
                        background: 'var(--gray-2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                    }}
                >
                    {JSON.stringify(data, null, 2)}
                </Box>
            )}
            <Code size="1" color="gray">
                {'client.todos.get.useQuery({ params: { id } })'}
            </Code>
        </DemoCard>
    );
}

// ── Demo 3: useMutation + Cache Invalidation ──────────────────────────

function MutationDemo() {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const mutation = client.todos.create.useMutation({
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: client.todos.queryKey()
            });
            setTitle('');
        }
    });

    return (
        <DemoCard
            title="3. useMutation + Cache Invalidation"
            description="Creates a todo via useMutation, then invalidates all todo queries using the group-level queryKey."
        >
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
                    disabled={!title.trim() || mutation.isPending}
                    onClick={() =>
                        mutation.mutate({ body: { title: title.trim() } })
                    }
                >
                    {mutation.isPending ? 'Creating…' : 'Create'}
                </Button>
            </Flex>
            {mutation.isSuccess && (
                <Badge color="green">
                    Created! Cache invalidated.
                </Badge>
            )}
            {mutation.isError && (
                <Badge color="red">
                    {isWebError(mutation.error)
                        ? mutation.error.message
                        : 'Failed'}
                </Badge>
            )}
            <Code size="1" color="gray">
                {'client.todos.create.useMutation({ onSuccess: () => invalidate })'}
            </Code>
        </DemoCard>
    );
}

// ── Demo 4: Optimistic Toggle ─────────────────────────────────────────

function OptimisticToggleDemo() {
    const queryClient = useQueryClient();
    const { data } = client.todos.list.useQuery();

    const toggleMutation = client.todos.update.useMutation({
        onMutate: async (variables: any) => {
            await queryClient.cancelQueries({
                queryKey: client.todos.queryKey()
            });
            const key = client.todos.list.queryKey();
            const previous = queryClient.getQueryData(key);
            queryClient.setQueryData(key, (old: any[]) =>
                old?.map((t: any) =>
                    t.id === variables.params.id
                        ? { ...t, completed: variables.body.completed }
                        : t
                )
            );
            return { previous };
        },
        onError: (_err: unknown, _vars: unknown, context: any) => {
            if (context?.previous) {
                queryClient.setQueryData(
                    client.todos.list.queryKey(),
                    context.previous
                );
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: client.todos.queryKey()
            });
        }
    });

    const todos = (data ?? []).slice(0, 5);

    return (
        <DemoCard
            title="4. Optimistic Update"
            description="Toggles a todo's completed status optimistically — the UI updates immediately while the mutation fires in the background."
        >
            {todos.length === 0 ? (
                <Text size="2" color="gray">
                    No todos to toggle. Create some first.
                </Text>
            ) : (
                <Flex direction="column" gap="1">
                    {todos.map((t) => (
                        <Flex key={t.id} gap="2" align="center">
                            <Button
                                size="1"
                                variant="ghost"
                                onClick={() =>
                                    toggleMutation.mutate({
                                        params: { id: t.id },
                                        body: { completed: !t.completed }
                                    })
                                }
                            >
                                {t.completed ? '✓' : '○'}
                            </Button>
                            <Text
                                size="1"
                                style={{
                                    textDecoration: t.completed
                                        ? 'line-through'
                                        : 'none'
                                }}
                            >
                                {t.title}
                            </Text>
                        </Flex>
                    ))}
                </Flex>
            )}
            <Code size="1" color="gray">
                onMutate → cancel + setQueryData → onError → rollback
            </Code>
        </DemoCard>
    );
}

// ── Demo 5: useSuspenseQuery ──────────────────────────────────────────

function SuspenseInner() {
    const { data } = client.users.me.useSuspenseQuery();
    return (
        <Box
            p="2"
            style={{
                background: 'var(--gray-2)',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap'
            }}
        >
            {JSON.stringify(data, null, 2)}
        </Box>
    );
}

function SuspenseQueryDemo() {
    const [show, setShow] = useState(false);
    return (
        <DemoCard
            title="5. useSuspenseQuery"
            description="Uses Suspense to show a fallback spinner until the current user profile is loaded. The component suspends — no isLoading check needed."
        >
            <Button size="1" onClick={() => setShow((v) => !v)}>
                {show ? 'Hide' : 'Load Profile (Suspense)'}
            </Button>
            {show && (
                <Suspense
                    fallback={
                        <Flex align="center" gap="2" p="2">
                            <Spinner size="1" />
                            <Text size="1">Suspending…</Text>
                        </Flex>
                    }
                >
                    <SuspenseInner />
                </Suspense>
            )}
            <Code size="1" color="gray">
                client.users.me.useSuspenseQuery()
            </Code>
        </DemoCard>
    );
}

// ── Demo 6: Prefetch on Hover ─────────────────────────────────────────

function PrefetchDemo() {
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const { data: todos } = client.todos.list.useQuery();
    const { data: selectedTodo } = client.todos.get.useQuery(
        selectedId !== null
            ? { params: { id: selectedId } }
            : undefined,
        { enabled: selectedId !== null }
    );

    const items = (todos ?? []).slice(0, 5);

    return (
        <DemoCard
            title="6. Prefetch on Hover"
            description="Hovering a todo prefetches its details into the cache. Clicking it reads from the already-warm cache — instant display."
        >
            {items.length === 0 ? (
                <Text size="2" color="gray">
                    No todos available.
                </Text>
            ) : (
                <Flex gap="2" wrap="wrap">
                    {items.map((t: any) => (
                        <Button
                            key={t.id}
                            size="1"
                            variant={selectedId === t.id ? 'solid' : 'outline'}
                            onMouseEnter={() =>
                                client.todos.get.prefetch(queryClient, {
                                    params: { id: t.id }
                                })
                            }
                            onClick={() => setSelectedId(t.id)}
                        >
                            #{t.id}
                        </Button>
                    ))}
                </Flex>
            )}
            {selectedTodo && (
                <Box
                    p="2"
                    style={{
                        background: 'var(--gray-2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                    }}
                >
                    {JSON.stringify(selectedTodo, null, 2)}
                </Box>
            )}
            <Code size="1" color="gray">
                {'client.todos.get.prefetch(queryClient, { params: { id } })'}
            </Code>
        </DemoCard>
    );
}

// ── Demo 7: Query Key Inspection ──────────────────────────────────────

function QueryKeyDemo() {
    const groupKey = client.todos.queryKey();
    const listKey = client.todos.list.queryKey();
    const getKey = client.todos.get.queryKey({ params: { id: 42 } });

    return (
        <DemoCard
            title="7. Query Key Inspection"
            description="Shows the hierarchical query key structure. Group keys are prefixes of endpoint keys — invalidating a group key cascades to all its endpoints."
        >
            <Flex direction="column" gap="2">
                <Flex gap="2" align="center">
                    <Badge size="1" color="blue">
                        Group
                    </Badge>
                    <Code size="1">{JSON.stringify(groupKey)}</Code>
                </Flex>
                <Flex gap="2" align="center">
                    <Badge size="1" color="green">
                        Endpoint
                    </Badge>
                    <Code size="1">{JSON.stringify(listKey)}</Code>
                </Flex>
                <Flex gap="2" align="center">
                    <Badge size="1" color="orange">
                        With Args
                    </Badge>
                    <Code size="1">{JSON.stringify(getKey)}</Code>
                </Flex>
            </Flex>
            <Code size="1" color="gray">
                client.todos.queryKey() / client.todos.list.queryKey()
            </Code>
        </DemoCard>
    );
}

// ── Demo 8: Error Handling ────────────────────────────────────────────

function ErrorHandlingDemo() {
    const [todoId, setTodoId] = useState(99999);
    const { data, isError, error, refetch, isFetching } =
        client.todos.get.useQuery(
            { params: { id: todoId } },
            {
                enabled: false,
                retry: false
            }
        );

    const handleFetch = useCallback(() => {
        refetch();
    }, [refetch]);

    return (
        <DemoCard
            title="8. Error Handling"
            description="Demonstrates typed error handling. Fetches a non-existent todo to trigger an ApiError, then inspects the error type using type guards."
        >
            <Flex gap="2" align="center">
                <Text size="2">Todo ID:</Text>
                <TextField.Root
                    size="1"
                    type="number"
                    value={String(todoId)}
                    onChange={(e) => setTodoId(Number(e.target.value) || 1)}
                    style={{ width: '100px' }}
                />
                <Button size="1" onClick={handleFetch} disabled={isFetching}>
                    {isFetching ? 'Fetching…' : 'Fetch'}
                </Button>
            </Flex>
            {isError && error && (
                <Box
                    p="2"
                    style={{
                        background: 'var(--red-2)',
                        borderRadius: '6px',
                        border: '1px solid var(--red-6)'
                    }}
                >
                    <Flex direction="column" gap="1">
                        <Text size="2" weight="medium" color="red">
                            {isApiError(error)
                                ? `ApiError (${error.status})`
                                : error.constructor.name}
                        </Text>
                        <Code size="1">
                            {isApiError(error)
                                ? JSON.stringify(error.body)
                                : error.message}
                        </Code>
                    </Flex>
                </Box>
            )}
            {data && (
                <Badge color="green">
                    Found: {(data as any).title}
                </Badge>
            )}
            <Code size="1" color="gray">
                {'isApiError(error) → error.status, error.body'}
            </Code>
        </DemoCard>
    );
}

// ── Page ────────────────────────────────────────────────────────────────

export default function ReactQueryPage() {
    return (
        <Box>
            <Heading size="5" mb="2">
                ⚡ React Query Integration
            </Heading>
            <Text size="2" color="gray" mb="5" as="p">
                Interactive demos of <Code>@cleverbrush/client/react</Code>{' '}
                — TanStack Query hooks auto-generated from the API contract.
            </Text>
            <Flex direction="column" gap="4">
                <BasicQueryDemo />
                <ParameterQueryDemo />
                <MutationDemo />
                <OptimisticToggleDemo />
                <SuspenseQueryDemo />
                <PrefetchDemo />
                <QueryKeyDemo />
                <ErrorHandlingDemo />
            </Flex>
        </Box>
    );
}

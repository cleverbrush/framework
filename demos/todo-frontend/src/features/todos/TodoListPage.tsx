import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Badge,
    Box,
    Button,
    Callout,
    Flex,
    Heading,
    Spinner,
    Table,
    Text,
    TextField
} from '@radix-ui/themes';
import type { TodoResponse } from '@cleverbrush/todo-backend/contract';
import { ApiError } from '@cleverbrush/web';
import { client } from '../../api/client';
import { useAuth } from '../../lib/auth-context';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Pagination } from '../../components/Pagination';

const PAGE_SIZE = 10;

export function TodoListPage() {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [todos, setTodos] = useState<TodoResponse[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userIdFilter, setUserIdFilter] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<TodoResponse | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = isAdmin && userIdFilter ? Number(userIdFilter) : undefined;
            const data = await client.todos.list({ query: { page, limit: PAGE_SIZE, userId } });
            setTodos(data);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to load todos.');
        } finally {
            setLoading(false);
        }
    }, [page, isAdmin, userIdFilter]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await client.todos.delete({ params: { id: deleteTarget.id } });
            setDeleteTarget(null);
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to delete todo.');
        } finally {
            setDeleting(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const csvText = await client.todos.exportCsv();
            const blob = new Blob([csvText], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'todos.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Export failed.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <Box>
            <Flex justify="between" align="center" mb="5">
                <Heading size="5">My Todos</Heading>
                <Flex gap="2">
                    <Button variant="soft" onClick={handleExport} loading={exporting}>
                        📥 Export CSV
                    </Button>
                    <Button onClick={() => navigate('/todos/import')} variant="soft">
                        📤 Import
                    </Button>
                    <Button onClick={() => navigate('/todos/new')}>
                        + New Todo
                    </Button>
                </Flex>
            </Flex>

            {isAdmin && (
                <Flex align="center" gap="2" mb="4">
                    <Text size="2" color="gray">Filter by user ID:</Text>
                    <TextField.Root
                        type="number"
                        value={userIdFilter}
                        onChange={(e) => { setUserIdFilter(e.target.value); setPage(1); }}
                        placeholder="All users"
                        style={{ width: 120 }}
                    />
                </Flex>
            )}

            {error && (
                <Callout.Root color="red" mb="4">
                    <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
            )}

            {loading ? (
                <Flex justify="center" py="8">
                    <Spinner size="3" />
                </Flex>
            ) : todos.length === 0 ? (
                <Flex direction="column" align="center" py="8" gap="2">
                    <Text size="5">🗒️</Text>
                    <Text color="gray">No todos yet. Create your first one!</Text>
                </Flex>
            ) : (
                <Table.Root variant="surface">
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                            {isAdmin && <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>}
                            <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {todos.map((todo) => (
                            <Table.Row key={todo.id}>
                                <Table.Cell>
                                    <Text
                                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                                        onClick={() => navigate(`/todos/${todo.id}`)}
                                    >
                                        {todo.title}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Badge color={todo.completed ? 'green' : 'gray'} variant="soft" size="1">
                                        {todo.completed ? '✓ Done' : '○ Open'}
                                    </Badge>
                                </Table.Cell>
                                {isAdmin && <Table.Cell>#{todo.userId}</Table.Cell>}
                                <Table.Cell>
                                    <Text size="1" color="gray">
                                        {new Date(todo.createdAt).toLocaleDateString()}
                                    </Text>
                                </Table.Cell>
                                <Table.Cell>
                                    <Flex gap="2">
                                        <Button size="1" variant="soft" onClick={() => navigate(`/todos/${todo.id}`)}>
                                            View
                                        </Button>
                                        <Button
                                            size="1"
                                            variant="soft"
                                            color="red"
                                            onClick={() => setDeleteTarget(todo)}
                                        >
                                            Delete
                                        </Button>
                                    </Flex>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            )}

            <Pagination
                page={page}
                hasMore={todos.length === PAGE_SIZE}
                onPageChange={setPage}
                loading={loading}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Todo"
                description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleting}
            />
        </Box>
    );
}

export default TodoListPage;

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
    Badge,
    Box,
    Button,
    Callout,
    Card,
    Flex,
    Heading,
    Select,
    Separator,
    Spinner,
    Text,
    TextField
} from '@radix-ui/themes';
import { Field, useSchemaForm } from '@cleverbrush/react-form';
import { UpdateTodoBodySchema } from '@cleverbrush/todo-backend/contract';
import { ApiError, isTimeoutError, isNetworkError } from '@cleverbrush/client';
import { client } from '../../api/client';

type TodoEvent = Parameters<typeof client.todos.sendEvent>[0]['body'];
import { ConfirmDialog } from '../../components/ConfirmDialog';

type TodoWithAuthor = Awaited<ReturnType<typeof client.todos.getWithAuthor>>;

export function TodoDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [data, setData] = useState<TodoWithAuthor | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [completeLoading, setCompleteLoading] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [conflictError, setConflictError] = useState(false);

    // Event panel
    const [eventType, setEventType] = useState<'assigned' | 'commented' | 'completed'>('commented');
    const [eventComment, setEventComment] = useState('');
    const [eventAssignedTo, setEventAssignedTo] = useState('');
    const [eventCompletedAt, setEventCompletedAt] = useState('');
    const [eventLoading, setEventLoading] = useState(false);
    const [eventResult, setEventResult] = useState<string | null>(null);

    // Attachment upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // User list for the "assigned" picker
    const [users, setUsers] = useState<Array<{ id: number; email: string }>>([]);

    const editForm = useSchemaForm(UpdateTodoBodySchema);

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const result = await client.todos.getWithAuthor({ params: { id: Number(id) } });
            setData(result);
            editForm.setValue({
                title: result.todo.title,
                description: result.todo.description,
                completed: result.todo.completed
            });
        } catch (e) {
            if (e instanceof ApiError) setError(e.message);
            else if (isTimeoutError(e)) setError('Request timed out. Please try again.');
            else if (isNetworkError(e)) setError('Network error. Check your connection.');
            else setError('Failed to load todo.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Load user list once for the "assigned" picker
    useEffect(() => {
        client.users
            .list({ query: { page: 1, limit: 100 } })
            .then(rows => setUsers(rows.map(u => ({ id: u.id, email: u.email }))))
            .catch(() => {/* ignore — picker will fall back to text input */});
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        const result = await editForm.submit();
        if (!result.valid || !result.object) return;
        setSaveLoading(true);
        setError(null);
        try {
            await client.todos.update({ params: { id: Number(id) }, body: result.object });
            load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to save.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleComplete = async () => {
        setCompleteLoading(true);
        setConflictError(false);
        setError(null);
        const etag = data?.todo.updatedAt ? String(data.todo.updatedAt) : undefined;
        try {
            await client.todos.complete({ params: { id: Number(id) }, headers: { 'if-match': etag } });
            load();
        } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
                setConflictError(true);
            } else {
                setError(e instanceof ApiError ? e.message : 'Failed to complete.');
            }
        } finally {
            setCompleteLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !id) return;
        setUploadLoading(true);
        setError(null);
        try {
            await client.todos.uploadAttachment({
                params: { id: Number(id) },
                body: {},
                files: { attachment: selectedFile }
            });
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            await load();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Upload failed.');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const blob = await client.todos.downloadAttachment.file({
                params: { id: Number(id) }
            });

            // Extract filename from Content-Disposition header
            // (not directly available from Blob, use todo attachment name)
            const filename =
                data?.todo.attachmentName ?? `todo-${id}-download`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Download failed.');
        }
    };

    const handleDelete = async () => {
        setDeleteLoading(true);
        try {
            await client.todos.delete({ params: { id: Number(id) } });
            navigate('/todos');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to delete.');
            setDeleteLoading(false);
            setDeleteOpen(false);
        }
    };

    const handleSendEvent = async () => {
        setEventLoading(true);
        setEventResult(null);
        setError(null);
        try {
            let event: TodoEvent;
            if (eventType === 'assigned') {
                event = { type: 'assigned', assignedTo: Number(eventAssignedTo) };
            } else if (eventType === 'commented') {
                event = { type: 'commented', comment: eventComment };
            } else {
                event = { type: 'completed', completedAt: new Date(eventCompletedAt) };
            }
            const result = await client.todos.sendEvent({ params: { id: Number(id) }, body: event });
            setEventResult(JSON.stringify(result, null, 2));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Event failed.');
        } finally {
            setEventLoading(false);
        }
    };

    if (loading) {
        return <Flex justify="center" py="8"><Spinner size="3" /></Flex>;
    }

    if (error && !data) {
        return (
            <Callout.Root color="red">
                <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
        );
    }

    const todo = data?.todo;
    const author = data?.author;

    return (
        <Box>
            <Flex align="center" gap="3" mb="5">
                <Button variant="ghost" onClick={() => navigate('/todos')}>← Back</Button>
                <Heading size="5">Todo #{id}</Heading>
                <Badge color={todo?.completed ? 'green' : 'gray'} variant="soft">
                    {todo?.completed ? '✓ Done' : '○ Open'}
                </Badge>
            </Flex>

            {error && (
                <Callout.Root color="red" mb="4">
                    <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
            )}

            {conflictError && (
                <Callout.Root color="orange" mb="4">
                    <Callout.Text>
                        ⚠️ Conflict detected — this todo was updated elsewhere. <Button variant="ghost" size="1" onClick={load}>Refresh</Button> and try again.
                    </Callout.Text>
                </Callout.Root>
            )}

            <Flex gap="4" direction={{ initial: 'column', md: 'row' } as any}>
                {/* Edit form */}
                <Box style={{ flex: 1 }}>
                    <Card>
                        <Heading size="3" mb="4">Edit</Heading>
                        <Field forProperty={(t) => t.title} form={editForm} label="Title" />
                        <Field forProperty={(t) => t.description} form={editForm} label="Description" variant="textarea" />
                        <Field forProperty={(t) => t.completed} form={editForm} label="Completed" />
                        <Flex gap="2" mt="2">
                            <Button onClick={handleSave} loading={saveLoading}>Save Changes</Button>
                            {!todo?.completed && (
                                <Button variant="soft" color="green" onClick={handleComplete} loading={completeLoading}>
                                    ✓ Mark Complete
                                </Button>
                            )}
                        </Flex>
                    </Card>
                </Box>

                {/* Info + actions */}
                <Box style={{ width: 260 }}>
                    <Card mb="4">
                        <Heading size="3" mb="3">Author</Heading>
                        <Text size="2" color="gray" style={{ display: 'block' }}>
                            {author?.email}
                        </Text>
                        <Badge size="1" variant="soft" color="blue" mt="1">
                            {author?.role}
                        </Badge>
                        <Separator my="3" />
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                            Created: {todo ? new Date(todo.createdAt).toLocaleString() : '-'}
                        </Text>
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                            Updated: {todo ? new Date(todo.updatedAt).toLocaleString() : '-'}
                        </Text>
                        <Text size="1" color="gray" style={{ display: 'block' }}>
                            ETag: <code style={{ fontSize: 10 }}>{todo?.updatedAt ? String(todo.updatedAt) : ''}</code>
                        </Text>
                    </Card>

                    {/* Attachment upload */}
                    <Card mb="4">
                        <Heading size="3" mb="3">Attachment</Heading>
                        {todo?.attachmentName ? (
                            <Box mb="3">
                                <Text size="2" style={{ display: 'block' }}>
                                    <strong>{todo.attachmentName}</strong>
                                </Text>
                                <Text size="1" color="gray" style={{ display: 'block' }}>
                                    {todo.attachmentMimeType}
                                    {todo.attachmentSize
                                        ? ` — ${(todo.attachmentSize / 1024).toFixed(1)} KB`
                                        : ''}
                                </Text>
                            </Box>
                        ) : (
                            <Text size="2" color="gray" mb="3" style={{ display: 'block' }}>
                                No attachment uploaded.
                            </Text>
                        )}

                        <input
                            type="file"
                            accept="image/*,application/pdf,text/plain"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <Flex gap="2" direction="column">
                            <Button
                                variant="soft"
                                onClick={() => fileInputRef.current?.click()}
                                size="1"
                            >
                                📁 Choose File
                            </Button>
                            {selectedFile && (
                                <Text size="1" color="gray" style={{ display: 'block' }}>
                                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                                </Text>
                            )}
                            {selectedFile && (
                                <Button
                                    onClick={handleUpload}
                                    loading={uploadLoading}
                                    size="1"
                                >
                                    Upload
                                </Button>
                            )}
                            {todo?.attachmentName && (
                                <Button variant="soft" onClick={handleDownload} size="1">
                                    📎 Download
                                </Button>
                            )}
                        </Flex>
                    </Card>

                    <Flex direction="column" gap="2">
                        <Button variant="soft" color="red" onClick={() => setDeleteOpen(true)}>
                            🗑 Delete Todo
                        </Button>
                    </Flex>
                </Box>
            </Flex>

            {/* Events panel */}
            <Card mt="5">
                <Heading size="3" mb="4">Send Event</Heading>
                <Text size="2" color="gray" mb="3" style={{ display: 'block' }}>
                    Demonstrates the discriminated union event endpoint. The event is echoed back.
                </Text>

                <Flex gap="3" align="start" wrap="wrap">
                    <Box>
                        <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Event Type</Text>
                        <Select.Root value={eventType} onValueChange={(v) => setEventType(v as any)}>
                            <Select.Trigger />
                            <Select.Content>
                                <Select.Item value="commented">Commented</Select.Item>
                                <Select.Item value="assigned">Assigned</Select.Item>
                                <Select.Item value="completed">Completed</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </Box>

                    {eventType === 'commented' && (
                        <Box style={{ flex: 1 }}>
                            <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Comment</Text>
                            <TextField.Root
                                value={eventComment}
                                onChange={(e) => setEventComment(e.target.value)}
                                placeholder="Enter comment text..."
                            />
                        </Box>
                    )}
                    {eventType === 'assigned' && (
                        <Box>
                            <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Assign to User</Text>
                            {users.length > 0 ? (
                                <Select.Root
                                    value={eventAssignedTo}
                                    onValueChange={setEventAssignedTo}
                                >
                                    <Select.Trigger placeholder="Select user…" />
                                    <Select.Content>
                                        {users.map(u => (
                                            <Select.Item key={u.id} value={String(u.id)}>
                                                {u.email} (#{u.id})
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select.Root>
                            ) : (
                                <TextField.Root
                                    type="number"
                                    value={eventAssignedTo}
                                    onChange={(e) => setEventAssignedTo(e.target.value)}
                                    placeholder="User ID"
                                    style={{ width: 120 }}
                                />
                            )}
                        </Box>
                    )}
                    {eventType === 'completed' && (
                        <Box>
                            <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Completed At</Text>
                            <TextField.Root
                                type="datetime-local"
                                value={eventCompletedAt}
                                onChange={(e) => setEventCompletedAt(e.target.value)}
                            />
                        </Box>
                    )}

                    <Box style={{ alignSelf: 'flex-end' }}>
                        <Button onClick={handleSendEvent} loading={eventLoading} variant="soft">
                            Send Event
                        </Button>
                    </Box>
                </Flex>

                {eventResult && (
                    <Box mt="3" p="3" style={{ background: 'var(--gray-3)', borderRadius: 6 }}>
                        <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Response:</Text>
                        <pre style={{ fontSize: 12, margin: 0, overflow: 'auto' }}>{eventResult}</pre>
                    </Box>
                )}
            </Card>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete Todo"
                description={`Delete "${todo?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
                loading={deleteLoading}
            />
        </Box>
    );
}

export default TodoDetailPage;

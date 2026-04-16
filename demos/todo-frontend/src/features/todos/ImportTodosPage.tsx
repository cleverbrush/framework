import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Badge,
    Box,
    Button,
    Callout,
    Card,
    Flex,
    Heading,
    Text,
    TextField
} from '@radix-ui/themes';
import { ApiError } from '@cleverbrush/web';
import { client } from '../../api/client';

type ImportItem = { title: string; description: string };
type ImportResult = { title: string; success: boolean; error?: string };

export function ImportTodosPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<ImportItem[]>([{ title: '', description: '' }]);
    const [idempotencyKey, setIdempotencyKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<{ imported: number; total: number; items: ImportResult[] } | null>(null);
    const [acceptedAsync, setAcceptedAsync] = useState(false);

    const addItem = () => setItems((prev) => [...prev, { title: '', description: '' }]);
    const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
    const updateItem = (i: number, field: keyof ImportItem, value: string) => {
        setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
    };

    const handleImport = async () => {
        const toImport = items.filter((i) => i.title.trim());
        if (!toImport.length) {
            setError('Add at least one item with a title.');
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);
        setAcceptedAsync(false);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await client.todos.importBulk({
                body: { items: toImport },
                headers: { 'x-idempotency-key': idempotencyKey || undefined }
            }) as any;
            if (result?.items) {
                setResults(result);
            } else {
                setAcceptedAsync(true);
            }
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Import failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box style={{ maxWidth: 640 }}>
            <Flex align="center" gap="3" mb="5">
                <Button variant="ghost" onClick={() => navigate('/todos')}>← Back</Button>
                <Heading size="5">Import Todos</Heading>
            </Flex>

            {error && <Callout.Root color="red" mb="4"><Callout.Text>{error}</Callout.Text></Callout.Root>}

            {acceptedAsync && (
                <Callout.Root color="blue" mb="4">
                    <Callout.Text>
                        📨 Large batch accepted (202). Your todos are being processed asynchronously.
                    </Callout.Text>
                </Callout.Root>
            )}

            <Card mb="4">
                <Heading size="3" mb="3">Items</Heading>
                <Flex direction="column" gap="3">
                    {items.map((item, i) => (
                        <Flex key={i} gap="2" align="start">
                            <Box style={{ flex: 1 }}>
                                <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Title *</Text>
                                <TextField.Root
                                    value={item.title}
                                    onChange={(e) => updateItem(i, 'title', e.target.value)}
                                    placeholder="Todo title..."
                                />
                            </Box>
                            <Box style={{ flex: 1 }}>
                                <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>Description</Text>
                                <TextField.Root
                                    value={item.description}
                                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                                    placeholder="Optional..."
                                />
                            </Box>
                            {items.length > 1 && (
                                <Button
                                    variant="ghost"
                                    color="red"
                                    size="1"
                                    style={{ marginTop: 22 }}
                                    onClick={() => removeItem(i)}
                                >
                                    ✕
                                </Button>
                            )}
                        </Flex>
                    ))}
                </Flex>
                <Button variant="soft" size="1" mt="3" onClick={addItem}>
                    + Add Item
                </Button>
            </Card>

            <Card mb="4">
                <Heading size="3" mb="2">Options</Heading>
                <Text size="1" weight="medium" mb="1" style={{ display: 'block' }}>
                    Idempotency Key (optional)
                </Text>
                <TextField.Root
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    placeholder="Unique key to prevent duplicate imports..."
                />
                <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
                    If provided, duplicate imports with the same key will be ignored.
                </Text>
            </Card>

            <Button onClick={handleImport} loading={loading} size="3">
                📥 Import {items.filter((i) => i.title).length} Todo{items.filter((i) => i.title).length !== 1 ? 's' : ''}
            </Button>

            {results && (
                <Card mt="5">
                    <Heading size="3" mb="3">
                        Results: {results.imported}/{results.total} imported
                    </Heading>
                    <Flex direction="column" gap="2">
                        {results.items.map((item, i) => (
                            <Flex key={i} align="center" gap="3">
                                <Badge color={item.success ? 'green' : 'red'} variant="soft">
                                    {item.success ? '✓' : '✗'}
                                </Badge>
                                <Text size="2" style={{ flex: 1 }}>{item.title}</Text>
                                {item.error && <Text size="1" color="red">{item.error}</Text>}
                            </Flex>
                        ))}
                    </Flex>
                    <Button mt="4" variant="soft" onClick={() => navigate('/todos')}>
                        View Todos
                    </Button>
                </Card>
            )}
        </Box>
    );
}

export default ImportTodosPage;

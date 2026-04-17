import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
    Box,
    Button,
    Callout,
    Flex,
    Heading
} from '@radix-ui/themes';
import { Field, useSchemaForm } from '@cleverbrush/react-form';
import { CreateTodoBodySchema } from '@cleverbrush/todo-backend/contract';
import { ApiError } from '@cleverbrush/client';
import { client } from '../../api/client';

export function CreateTodoPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useSchemaForm(CreateTodoBodySchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (!result.valid || !result.object) return;

        setLoading(true);
        setError(null);
        try {
            const todo = await client.todos.create({ body: result.object });
            navigate(`/todos/${todo.id}`);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Failed to create todo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box style={{ maxWidth: 540 }}>
            <Flex align="center" gap="3" mb="5">
                <Button variant="ghost" onClick={() => navigate('/todos')}>← Back</Button>
                <Heading size="5">New Todo</Heading>
            </Flex>

            {error && (
                <Callout.Root color="red" mb="4">
                    <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
            )}

            <Field forProperty={(t) => t.title} form={form} label="Title" />
            <Field forProperty={(t) => t.description} form={form} label="Description (optional)" variant="textarea" />

            <Flex gap="3" mt="2">
                <Button onClick={handleSubmit} loading={loading}>
                    Create Todo
                </Button>
                <Button variant="soft" color="gray" onClick={() => navigate('/todos')}>
                    Cancel
                </Button>
            </Flex>
        </Box>
    );
}

export default CreateTodoPage;

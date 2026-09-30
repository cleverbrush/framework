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
import { ApiError, decodeValidationIssues } from '@cleverbrush/client';
import { client } from '../../api/client';

export function CreateTodoPage() {
    const navigate = useNavigate();
    const form = useSchemaForm(CreateTodoBodySchema);

    const handleSubmit = form.handleSubmit(async values => {
        try {
            const todo = await client.todos.create({ body: values });
            return { ok: true, data: todo };
        } catch (e) {
            const issues = decodeValidationIssues(e, { source: 'body' });
            return {
                ok: false,
                error: issues ? 'Check the highlighted fields.' : e instanceof ApiError ? e.message : 'Failed to create todo.',
                issues
            };
        }
    }, { onSuccess: todo => { navigate(`/todos/${todo!.id}`); } });

    return (
        <Box style={{ maxWidth: 540 }}>
            <Flex align="center" gap="3" mb="5">
                <Button variant="ghost" onClick={() => navigate('/todos')}>← Back</Button>
                <Heading size="5">New Todo</Heading>
            </Flex>

            {form.error && (
                <Callout.Root color="red" mb="4">
                    <Callout.Text>{form.error}</Callout.Text>
                </Callout.Root>
            )}

            <Field forProperty={(t) => t.title} form={form} label="Title" />
            <Field forProperty={(t) => t.description} form={form} label="Description (optional)" variant="textarea" />

            <Flex gap="3" mt="2">
                <Button onClick={handleSubmit} loading={form.submitting}>
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

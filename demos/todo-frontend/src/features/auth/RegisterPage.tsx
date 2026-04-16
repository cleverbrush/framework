import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    Box,
    Button,
    Card,
    Callout,
    Flex,
    Heading,
    Text
} from '@radix-ui/themes';
import { Field, useSchemaForm } from '@cleverbrush/react-form';
import { object, string } from '@cleverbrush/schema';
import { RegisterBodySchema } from '@cleverbrush/todo-shared';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/http-client';

// Extend register schema with confirm password field
const RegisterFormSchema = object({
    email: string().describe("Your email address."),
    password: string().minLength(8).describe("At least 8 characters."),
    confirmPassword: string().describe("Repeat your password.")
}).addValidator((v) => {
    if (v.password !== v.confirmPassword) {
        return {
            valid: false,
            errors: [{ message: 'Passwords do not match.', path: [(t: any) => t.confirmPassword] }]
        };
    }
    return { valid: true };
});

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useSchemaForm(RegisterFormSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (!result.valid || !result.object) return;

        setLoading(true);
        setError(null);
        try {
            await register(result.object.email, result.object.password);
            navigate('/todos');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Flex align="center" justify="center" style={{ minHeight: '100vh', background: 'var(--gray-2)' }}>
            <Card style={{ width: '100%', maxWidth: '420px' }} size="4">
                <Flex direction="column" gap="1" mb="5">
                    <Heading size="6" align="center">📝 Create Account</Heading>
                    <Text size="2" color="gray" align="center">Join Todo App today</Text>
                </Flex>

                {error && (
                    <Callout.Root color="red" mb="4">
                        <Callout.Text>{error}</Callout.Text>
                    </Callout.Root>
                )}

                <Field forProperty={(t) => t.email} form={form} label="Email" variant="email" />
                <Field forProperty={(t) => t.password} form={form} label="Password" variant="password" />
                <Field forProperty={(t) => t.confirmPassword} form={form} label="Confirm Password" variant="password" />

                <Button
                    size="3"
                    style={{ width: '100%' }}
                    onClick={handleSubmit}
                    loading={loading}
                    mt="1"
                >
                    Create Account
                </Button>

                <Box mt="5" style={{ textAlign: 'center' }}>
                    <Text size="2" color="gray">
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--accent-9)' }}>
                            Sign in
                        </Link>
                    </Text>
                </Box>
            </Card>
        </Flex>
    );
}

export default RegisterPage;

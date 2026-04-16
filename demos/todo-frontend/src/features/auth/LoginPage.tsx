import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
    Box,
    Button,
    Card,
    Callout,
    Flex,
    Heading,
    Separator,
    Text
} from '@radix-ui/themes';
import { useGoogleLogin } from '@react-oauth/google';
import { Field, useSchemaForm } from '@cleverbrush/react-form';
import { LoginBodySchema } from '@cleverbrush/todo-shared';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/http-client';

// Isolated so useGoogleLogin only runs when GoogleOAuthProvider is mounted
function GoogleLoginButton({ onError }: { onError: (msg: string) => void }) {
    const { googleLogin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const googleAuth = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                await googleLogin(tokenResponse.access_token);
                navigate('/todos');
            } catch (e) {
                onError(e instanceof ApiError ? e.message : 'Google login failed.');
            } finally {
                setLoading(false);
            }
        },
        onError: () => onError('Google login was cancelled or failed.')
    });

    return (
        <Button
            variant="outline"
            size="3"
            style={{ width: '100%' }}
            onClick={() => googleAuth()}
            loading={loading}
        >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" style={{ width: 18, height: 18 }} />
            Continue with Google
        </Button>
    );
}

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const form = useSchemaForm(LoginBodySchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (!result.valid || !result.object) return;

        setLoading(true);
        setError(null);
        try {
            await login(result.object.email, result.object.password);
            navigate('/todos');
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const googleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

    return (
        <Flex align="center" justify="center" style={{ minHeight: '100vh', background: 'var(--gray-2)' }}>
            <Card style={{ width: '100%', maxWidth: '420px' }} size="4">
                <Flex direction="column" gap="1" mb="5">
                    <Heading size="6" align="center">📝 Todo App</Heading>
                    <Text size="2" color="gray" align="center">Sign in to your account</Text>
                </Flex>

                {error && (
                    <Callout.Root color="red" mb="4">
                        <Callout.Text>{error}</Callout.Text>
                    </Callout.Root>
                )}

                <Field forProperty={(t) => t.email} form={form} label="Email" variant="email" />
                <Field forProperty={(t) => t.password} form={form} label="Password" variant="password" />

                <Button
                    size="3"
                    style={{ width: '100%' }}
                    onClick={handleSubmit}
                    loading={loading}
                    mt="1"
                >
                    Sign in
                </Button>

                {googleEnabled && (
                    <>
                        <Flex align="center" gap="3" my="4">
                            <Separator style={{ flex: 1 }} />
                            <Text size="1" color="gray">or</Text>
                            <Separator style={{ flex: 1 }} />
                        </Flex>
                        <GoogleLoginButton onError={setError} />
                    </>
                )}

                <Box mt="5" style={{ textAlign: 'center' }}>
                    <Text size="2" color="gray">
                        Don't have an account?{' '}
                        <Link to="/register" style={{ color: 'var(--accent-9)' }}>
                            Create one
                        </Link>
                    </Text>
                </Box>
            </Card>
        </Flex>
    );
}

export default LoginPage;

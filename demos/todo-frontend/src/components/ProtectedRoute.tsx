import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { Flex, Spinner } from '@radix-ui/themes';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <Flex align="center" justify="center" style={{ height: '100vh' }}>
                <Spinner size="3" />
            </Flex>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/todos" replace />;
    }

    return <Outlet />;
}

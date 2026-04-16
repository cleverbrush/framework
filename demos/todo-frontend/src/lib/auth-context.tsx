import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from 'react';
import { client } from '../api/client';
import { loadToken, setToken } from './http-client';
import type { UserResponse } from '@cleverbrush/todo-backend/contract';

type AuthState = {
    user: UserResponse | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
};

type AuthActions = {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    googleLogin: (idToken: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [token, setTokenState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const storeToken = useCallback((t: string) => {
        setToken(t);
        setTokenState(t);
    }, []);

    const fetchMe = useCallback(async (t: string) => {
        setToken(t);
        try {
            const me = await client.users.me();
            setUser(me);
            setTokenState(t);
        } catch {
            setToken(null);
            setTokenState(null);
            setUser(null);
        }
    }, []);

    // Bootstrap from localStorage on mount
    useEffect(() => {
        const saved = loadToken();
        if (saved) {
            fetchMe(saved).finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [fetchMe]);

    const login = useCallback(async (email: string, password: string) => {
        const { token: t } = await client.auth.login({ body: { email, password } });
        await fetchMe(t);
    }, [fetchMe]);

    const register = useCallback(async (email: string, password: string) => {
        await client.auth.register({ body: { email, password } });
        const { token: t } = await client.auth.login({ body: { email, password } });
        await fetchMe(t);
    }, [fetchMe]);

    const googleLogin = useCallback(async (idToken: string) => {
        const { token: t } = await client.auth.googleLogin({ body: { idToken } });
        await fetchMe(t);
    }, [fetchMe]);

    const logout = useCallback(() => {
        setToken(null);
        setTokenState(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                isAdmin: user?.role === 'admin',
                loading,
                login,
                register,
                googleLogin,
                logout
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

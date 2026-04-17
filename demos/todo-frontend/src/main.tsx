import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@radix-ui/themes/styles.css';
import { AuthProvider } from './lib/auth-context';
import { AppFormProvider } from './forms/provider';
import App from './App';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000 },
  },
});

const inner = (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AppFormProvider>
        <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
          <App />
        </Theme>
      </AppFormProvider>
    </AuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {inner}
      </GoogleOAuthProvider>
    ) : inner}
  </StrictMode>,
);

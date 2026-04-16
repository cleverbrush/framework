import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@radix-ui/themes';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@radix-ui/themes/styles.css';
import { AuthProvider } from './lib/auth-context';
import { AppFormProvider } from './forms/provider';
import App from './App';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const inner = (
  <AuthProvider>
    <AppFormProvider>
      <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
        <App />
      </Theme>
    </AppFormProvider>
  </AuthProvider>
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

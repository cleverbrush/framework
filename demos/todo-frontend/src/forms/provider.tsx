import { FormSystemProvider } from '@cleverbrush/react-form';
import type { ReactNode } from 'react';
import { radixRenderers } from './renderers';

export function AppFormProvider({ children }: { children: ReactNode }) {
    return (
        <FormSystemProvider renderers={radixRenderers}>
            {children}
        </FormSystemProvider>
    );
}

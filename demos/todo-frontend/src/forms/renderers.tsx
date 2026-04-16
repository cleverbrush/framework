import {
    Box,
    Checkbox,
    Flex,
    Text,
    TextArea,
    TextField
} from '@radix-ui/themes';
import type { FieldRenderProps, FieldRenderer } from '@cleverbrush/react-form';

function FieldWrapper({ label, error, touched, children }: {
    label?: string;
    error?: string;
    touched?: boolean;
    children: React.ReactNode;
}) {
    const showError = touched && error;
    return (
        <Box mb="3">
            {label && (
                <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
                    {label}
                </Text>
            )}
            {children}
            {showError && (
                <Text size="1" color="red" mt="1" style={{ display: 'block' }}>
                    {error}
                </Text>
            )}
        </Box>
    );
}

const stringRenderer: FieldRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    touched,
    label
}: FieldRenderProps) => (
    <FieldWrapper label={label} error={error} touched={touched}>
        <TextField.Root
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            color={touched && error ? 'red' : undefined}
            aria-invalid={!!(touched && error)}
        />
    </FieldWrapper>
);

const emailRenderer: FieldRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    touched,
    label
}: FieldRenderProps) => (
    <FieldWrapper label={label} error={error} touched={touched}>
        <TextField.Root
            type="email"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            color={touched && error ? 'red' : undefined}
            aria-invalid={!!(touched && error)}
        />
    </FieldWrapper>
);

const passwordRenderer: FieldRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    touched,
    label
}: FieldRenderProps) => (
    <FieldWrapper label={label} error={error} touched={touched}>
        <TextField.Root
            type="password"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            color={touched && error ? 'red' : undefined}
            aria-invalid={!!(touched && error)}
        />
    </FieldWrapper>
);

const textareaRenderer: FieldRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    touched,
    label
}: FieldRenderProps) => (
    <FieldWrapper label={label} error={error} touched={touched}>
        <TextArea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            color={touched && error ? 'red' : undefined}
            rows={4}
            aria-invalid={!!(touched && error)}
        />
    </FieldWrapper>
);

const numberRenderer: FieldRenderer = ({
    value,
    onChange,
    onBlur,
    error,
    touched,
    label
}: FieldRenderProps) => (
    <FieldWrapper label={label} error={error} touched={touched}>
        <TextField.Root
            type="number"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            onBlur={onBlur}
            color={touched && error ? 'red' : undefined}
            aria-invalid={!!(touched && error)}
        />
    </FieldWrapper>
);

const booleanRenderer: FieldRenderer = ({
    value,
    onChange,
    label
}: FieldRenderProps) => (
    <Box mb="3">
        <Flex align="center" gap="2">
            <Checkbox
                checked={!!value}
                onCheckedChange={(checked) => onChange(!!checked)}
            />
            {label && (
                <Text as="label" size="2">
                    {label}
                </Text>
            )}
        </Flex>
    </Box>
);

export const radixRenderers: Record<string, FieldRenderer> = {
    string: stringRenderer,
    'string:email': emailRenderer,
    'string:password': passwordRenderer,
    'string:textarea': textareaRenderer,
    number: numberRenderer,
    boolean: booleanRenderer
};

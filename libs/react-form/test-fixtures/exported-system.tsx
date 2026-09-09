import { createFormSystem, defineFieldRenderer } from '@cleverbrush/react-form';

export const SharedFormSystem = createFormSystem({
    renderers: {
        string: defineFieldRenderer<string, { placeholder?: string }>(
            () => null
        )
    }
});
export const WebFormSystem = createFormSystem({
    renderers: {
        ...SharedFormSystem.renderers,
        'number:select': defineFieldRenderer<number, { choices: number[] }>(
            () => null
        )
    }
});
export const SchemaField = WebFormSystem.Field;

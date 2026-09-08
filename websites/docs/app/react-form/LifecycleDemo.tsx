'use client';

import {
    createFormSystem,
    defineFieldRenderer,
    useSchemaForm
} from '@cleverbrush/react-form';
import { boolean, object, string } from '@cleverbrush/schema';
import { useState } from 'react';
import styles from './LifecycleDemo.module.css';

const ProfileSchema = object({
    name: string()
        .required('Name is required')
        .minLength(2, 'Use at least two characters'),
    role: string().required('Choose a role'),
    active: boolean()
});
const text = defineFieldRenderer<string, { id: string }>(props => (
    <div className="demo-field">
        <input
            id={props.fieldProps?.id}
            value={props.value ?? ''}
            onChange={e => props.onChange(e.target.value)}
            onBlur={props.onBlur}
            aria-invalid={props.touched && !!props.error}
            aria-describedby={
                props.error ? `${props.fieldProps?.id}-error` : undefined
            }
        />
        {props.touched && props.error && (
            <span id={`${props.fieldProps?.id}-error`} className="demo-error">
                {props.error}
            </span>
        )}
    </div>
));
const basic = createFormSystem({ renderers: { string: text } });
const ui = createFormSystem({
    renderers: {
        ...basic.renderers,
        'string:select': defineFieldRenderer<
            string,
            { id: string; options: string[] }
        >(props => (
            <div className="demo-field">
                <select
                    id={props.fieldProps?.id}
                    value={props.value ?? ''}
                    onChange={e => props.onChange(e.target.value)}
                    onBlur={props.onBlur}
                    aria-invalid={props.touched && !!props.error}
                >
                    <option value="">Choose a role</option>
                    {props.fieldProps?.options.map(value => (
                        <option key={value}>{value}</option>
                    ))}
                </select>
                {props.touched && props.error && (
                    <span className="demo-error">{props.error}</span>
                )}
            </div>
        )),
        boolean: defineFieldRenderer<boolean, { id: string }>(props => (
            <input
                id={props.fieldProps?.id}
                type="checkbox"
                checked={props.value ?? false}
                onChange={e => props.onChange(e.target.checked)}
                onBlur={props.onBlur}
            />
        ))
    }
});

/** Local-only demonstration: no user values are sent to a server. */
export default function LifecycleDemo() {
    const form = useSchemaForm(ProfileSchema);
    const [fail, setFail] = useState(false);
    const [confirmation, setConfirmation] = useState('');
    const submit = form.handleSubmit(
        async values => {
            setConfirmation('');
            await new Promise(resolve => setTimeout(resolve, 600));
            if (fail)
                return {
                    ok: false,
                    error: 'Demo failure: your values are preserved. Try again.'
                };
            return { ok: true, data: values };
        },
        {
            onSuccess: values => {
                setConfirmation(
                    `Saved ${values?.name}. The form was cleared without remounting.`
                );
                form.reset();
            }
        }
    );

    return (
        <form
            className={`demo-form ${styles.form}`}
            onSubmit={submit}
            noValidate
        >
            <div className="demo-form-row">
                <label htmlFor="profile-name">Profile name</label>
                <ui.Field
                    form={form}
                    forProperty={t => t.name}
                    fieldProps={{ id: 'profile-name' }}
                />
            </div>
            <div className="demo-form-row">
                <label htmlFor="profile-role">Role</label>
                <ui.Field
                    form={form}
                    forProperty={t => t.role}
                    variant="select"
                    fieldProps={{
                        id: 'profile-role',
                        options: ['reader', 'editor']
                    }}
                />
            </div>
            <div className="demo-form-row">
                <label htmlFor="profile-active">Active</label>
                <ui.Field
                    form={form}
                    forProperty={t => t.active}
                    fieldProps={{ id: 'profile-active' }}
                />
            </div>
            <p>
                <label>
                    <input
                        type="checkbox"
                        checked={fail}
                        onChange={e => setFail(e.target.checked)}
                    />{' '}
                    Simulate failure
                </label>
            </p>
            <button
                type="button"
                className="demo-submit"
                onClick={() => {
                    setConfirmation('');
                    form.reset({ name: 'Ada', role: 'editor', active: true });
                }}
            >
                Load sample
            </button>{' '}
            <button
                type="button"
                className="demo-submit"
                onClick={() => {
                    setConfirmation('');
                    form.reset();
                }}
            >
                Clear
            </button>{' '}
            <button
                type="submit"
                className="demo-submit"
                disabled={form.submitting}
            >
                {form.submitting ? 'Saving…' : 'Save profile'}
            </button>
            {form.error && (
                <p role="alert" className="demo-error">
                    {form.error}
                </p>
            )}
            <p role="status">{confirmation}</p>
        </form>
    );
}

'use client';

import { boolean, number, string } from '@cleverbrush/schema';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import { highlightTS } from '@/lib/highlight';

/* ── Schemas ─────────────────────────────────────────────────────── */

// Field-level schemas — each is a Standard Schema v1 compliant validator.
// TanStack Form detects the `['~standard']` property and calls validate()
// automatically on change/blur.
const nameSchema = string()
    .required('Name is required')
    .minLength(2, 'Name must be at least 2 characters')
    .maxLength(80, 'Name must be at most 80 characters');

const emailSchema = string()
    .required('Email is required')
    .matches(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address'
    );

const ageSchema = number()
    .required('Age is required')
    .min(18, 'Must be at least 18 years old')
    .max(120, 'Must be at most 120');

const bioSchema = string().maxLength(300, 'Bio must be at most 300 characters');

type RegistrationValues = {
    name: string;
    email: string;
    age: number | undefined;
    bio: string;
    agreeToTerms: boolean;
};

/* ── Helpers ─────────────────────────────────────────────────────── */

// TanStack Form stores raw Standard Schema issue objects { message, path? }
// in field.state.meta.errors when validating at field scope, so we must
// extract .message rather than calling .toString().
function errorMessage(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && 'message' in error)
        return String((error as { message: unknown }).message);
    return String(error);
}

/* ── Demo form component ─────────────────────────────────────────── */

function RegistrationForm() {
    const [submitted, setSubmitted] = useState<RegistrationValues | null>(null);

    const form = useForm({
        defaultValues: {
            name: '',
            email: '',
            age: undefined as number | undefined,
            bio: '',
            agreeToTerms: false
        },
        onSubmit: async ({ value }) => {
            setSubmitted(value);
        }
    });

    return (
        <div>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <div className="demo-form">
                    {/* Name */}
                    <form.Field
                        name="name"
                        validators={{
                            onChange: nameSchema,
                            onBlur: nameSchema
                        }}
                    >
                        {field => (
                            <div className="demo-form-row">
                                <label htmlFor="tf-name">Name</label>
                                <div className="demo-field">
                                    <input
                                        id="tf-name"
                                        type="text"
                                        value={field.state.value}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                        className={
                                            field.state.meta.errors.length
                                                ? 'has-error'
                                                : ''
                                        }
                                        placeholder="Your full name"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="demo-error">
                                            {errorMessage(
                                                field.state.meta.errors[0]
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </form.Field>

                    {/* Email */}
                    <form.Field
                        name="email"
                        validators={{
                            onChange: emailSchema,
                            onBlur: emailSchema
                        }}
                    >
                        {field => (
                            <div className="demo-form-row">
                                <label htmlFor="tf-email">Email</label>
                                <div className="demo-field">
                                    <input
                                        id="tf-email"
                                        type="email"
                                        value={field.state.value}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                        className={
                                            field.state.meta.errors.length
                                                ? 'has-error'
                                                : ''
                                        }
                                        placeholder="you@example.com"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="demo-error">
                                            {errorMessage(
                                                field.state.meta.errors[0]
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </form.Field>

                    {/* Age */}
                    <form.Field
                        name="age"
                        validators={{
                            onChange: ageSchema,
                            onBlur: ageSchema
                        }}
                    >
                        {field => (
                            <div className="demo-form-row">
                                <label htmlFor="tf-age">Age</label>
                                <div className="demo-field">
                                    <input
                                        id="tf-age"
                                        type="number"
                                        value={
                                            field.state.value != null
                                                ? String(field.state.value)
                                                : ''
                                        }
                                        onChange={e =>
                                            field.handleChange(
                                                e.target.value === ''
                                                    ? undefined
                                                    : Number(e.target.value)
                                            )
                                        }
                                        onBlur={field.handleBlur}
                                        className={
                                            field.state.meta.errors.length
                                                ? 'has-error'
                                                : ''
                                        }
                                        placeholder="Your age"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="demo-error">
                                            {errorMessage(
                                                field.state.meta.errors[0]
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </form.Field>

                    {/* Bio */}
                    <form.Field
                        name="bio"
                        validators={{
                            onChange: bioSchema
                        }}
                    >
                        {field => (
                            <div className="demo-form-row">
                                <label htmlFor="tf-bio">
                                    Bio{' '}
                                    <span
                                        style={{
                                            fontWeight: 400,
                                            opacity: 0.6
                                        }}
                                    >
                                        (optional)
                                    </span>
                                </label>
                                <div className="demo-field">
                                    <input
                                        id="tf-bio"
                                        type="text"
                                        value={field.state.value}
                                        onChange={e =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                        className={
                                            field.state.meta.errors.length
                                                ? 'has-error'
                                                : ''
                                        }
                                        placeholder="A short bio (max 300 chars)"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <span className="demo-error">
                                            {errorMessage(
                                                field.state.meta.errors[0]
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </form.Field>

                    {/* Agree to terms */}
                    <form.Field
                        name="agreeToTerms"
                        validators={{
                            onSubmit: boolean().required(
                                'You must agree to the terms'
                            )
                        }}
                    >
                        {field => (
                            <div className="demo-form-row">
                                <div
                                    className="demo-field"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <input
                                        id="tf-terms"
                                        type="checkbox"
                                        checked={field.state.value}
                                        onChange={e =>
                                            field.handleChange(e.target.checked)
                                        }
                                        onBlur={field.handleBlur}
                                        style={{ width: 'auto' }}
                                    />
                                    <label
                                        htmlFor="tf-terms"
                                        style={{
                                            textTransform: 'none',
                                            fontSize: '0.9rem',
                                            margin: 0
                                        }}
                                    >
                                        I agree to the terms and conditions
                                    </label>
                                </div>
                                {field.state.meta.errors.length > 0 && (
                                    <span className="demo-error">
                                        {errorMessage(
                                            field.state.meta.errors[0]
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </form.Field>

                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center',
                            marginTop: '0.5rem'
                        }}
                    >
                        <button type="submit" className="demo-submit">
                            Register
                        </button>
                        <form.Subscribe selector={state => state.isSubmitting}>
                            {isSubmitting =>
                                isSubmitting ? (
                                    <span
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Validating…
                                    </span>
                                ) : null
                            }
                        </form.Subscribe>
                    </div>
                </div>
            </form>

            {submitted && (
                <div style={{ marginTop: '1rem' }}>
                    <p
                        style={{
                            color: '#86efac',
                            fontWeight: 600,
                            marginBottom: '0.5rem'
                        }}
                    >
                        ✓ Form submitted successfully
                    </p>
                    <pre className="demo-result">
                        <code>{JSON.stringify(submitted, null, 2)}</code>
                    </pre>
                </div>
            )}
        </div>
    );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function TanStackFormPage() {
    return (
        <div className="page">
            <div className="container">
                <div className="section-header">
                    <h1>TanStack Form + Standard Schema</h1>
                    <p className="subtitle">
                        Testing{' '}
                        <a
                            href="https://tanstack.com/form"
                            target="_blank"
                            rel="noreferrer"
                        >
                            TanStack Form
                        </a>{' '}
                        field-level validation with{' '}
                        <code>@cleverbrush/schema</code> via the{' '}
                        <a
                            href="https://standardschema.dev"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Standard Schema v1
                        </a>{' '}
                        interface.
                    </p>
                </div>

                {/* ── How it works ─────────────────────────────── */}
                <div className="card">
                    <h2>How it works</h2>
                    <p>
                        TanStack Form accepts any{' '}
                        <strong>Standard Schema v1</strong> compliant validator
                        in its <code>validators</code> prop. Every{' '}
                        <code>@cleverbrush/schema</code> builder exposes a{' '}
                        <code>{'["~standard"]'}</code> property that implements
                        the spec, so you can pass schemas directly — no adapter
                        needed.
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { useForm } from '@tanstack/react-form';
import { string, number } from '@cleverbrush/schema';

const nameSchema = string()
  .required('Name is required')
  .minLength(2, 'Name must be at least 2 characters');

const ageSchema = number()
  .required('Age is required')
  .min(18, 'Must be at least 18 years old');

function MyForm() {
  const form = useForm({
    defaultValues: { name: '', age: undefined },
    onSubmit: async ({ value }) => console.log(value),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field
        name="name"
        validators={{ onChange: nameSchema, onBlur: nameSchema }}
      >
        {field => (
          <>
            <input
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.map(err => (
              <span key={String(err)}>{String(err)}</span>
            ))}
          </>
        )}
      </form.Field>
      <button type="submit">Submit</button>
    </form>
  );
}`)
                            }}
                        />
                    </pre>
                </div>

                {/* ── Live demo ────────────────────────────────── */}
                <div className="card">
                    <h2>Live Demo — Registration Form</h2>
                    <p>
                        Each field uses a <code>@cleverbrush/schema</code>{' '}
                        validator passed directly as a Standard Schema. Errors
                        appear on change after the first interaction, and again
                        on blur.
                    </p>
                    <RegistrationForm />
                </div>

                {/* ── Schema definitions ───────────────────────── */}
                <div className="card">
                    <h2>Schema Definitions</h2>
                    <p>
                        The schemas used in the form above — each is a fully
                        Standard Schema v1 compliant object (inspect{' '}
                        <code>{'nameSchema["~standard"]'}</code> in the console
                        to verify):
                    </p>
                    <pre>
                        <code
                            // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                            dangerouslySetInnerHTML={{
                                __html: highlightTS(`import { string, number, boolean, object } from '@cleverbrush/schema';

const nameSchema = string()
  .required('Name is required')
  .minLength(2, 'Name must be at least 2 characters')
  .maxLength(80, 'Name must be at most 80 characters');

const emailSchema = string()
  .required('Email is required')
  .matches(/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/, 'Please enter a valid email address');

const ageSchema = number()
  .required('Age is required')
  .min(18, 'Must be at least 18 years old')
  .max(120, 'Must be at most 120');

const bioSchema = string()
  .maxLength(300, 'Bio must be at most 300 characters');

// Standard Schema interface:
// nameSchema['~standard'].version  // => 1
// nameSchema['~standard'].vendor   // => '@cleverbrush/schema'
// nameSchema['~standard'].validate('Hi')
// => { issues: [{ message: 'Name must be at least 2 characters' }] }`)
                            }}
                        />
                    </pre>
                </div>
            </div>
        </div>
    );
}

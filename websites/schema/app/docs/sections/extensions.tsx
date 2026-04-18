import { highlightTS } from '@cleverbrush/website-shared/lib/highlight';

export default function ExtensionsSection() {
    return (
        <div className="card">
            <h2>Extensions</h2>
            <a href="/playground/custom-extensions" className="playground-link">
                ▶ Open in Playground
            </a>
            <p>
                The extension system lets you add{' '}
                <strong>custom methods</strong> to any schema builder type
                without modifying the core library. Define an extension once,
                apply it with <code>withExtensions()</code>, and every builder
                produced by the returned factories includes your new methods —
                fully typed and chainable.
            </p>

            <h3>Defining an Extension</h3>
            <p>
                Use <code>defineExtension()</code> to declare which builder
                types your extension targets and what methods it adds. The
                system automatically attaches extension metadata — no
                boilerplate needed:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`import { defineExtension, withExtensions, StringSchemaBuilder, NumberSchemaBuilder } from '@cleverbrush/schema';

// Email extension — adds .email() to string builders
const emailExt = defineExtension({
  string: {
    email(this: StringSchemaBuilder) {
      return this.addValidator((val) => {
        const valid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(val as string);
        return { valid, errors: valid ? [] : [{ message: 'Invalid email address' }] };
      });
    }
  }
});

// Port extension — adds .port() to number builders
const portExt = defineExtension({
  number: {
    port(this: NumberSchemaBuilder) {
      return this.isInteger().min(1).max(65535);
    }
  }
});`)
                    }}
                />
            </pre>

            <h3>Using Extensions</h3>
            <p>
                Pass one or more extension descriptors to{' '}
                <code>withExtensions()</code> to get augmented factory
                functions. All original builder methods remain available:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const s = withExtensions(emailExt, portExt);

// .email() is now available on string builders
const EmailSchema = s.string().email().minLength(5);

// .port() is now available on number builders
const PortSchema = s.number().port();

// Use in object schemas
const ServerConfig = s.object({
  adminEmail: s.string().email(),
  port: s.number().port(),
  name: s.string().minLength(1)
});`)
                    }}
                />
            </pre>

            <h3>Extension Metadata &amp; Introspection</h3>
            <p>
                Extension methods automatically record metadata that can be
                inspected at runtime via <code>.introspect().extensions</code>.
                Zero-arg methods store <code>true</code>, single-arg methods
                store the argument, and multi-arg methods store the arguments
                array:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const schema = s.string().email();
const meta = schema.introspect();
console.log(meta.extensions.email); // true

// For methods with arguments:
const rangeExt = defineExtension({
  number: {
    range(this: NumberSchemaBuilder, min: number, max: number) {
      return this.min(min).max(max);
    }
  }
});
const s2 = withExtensions(rangeExt);
const rangeSchema = s2.number().range(0, 100);
console.log(rangeSchema.introspect().extensions.range); // [0, 100]`)
                    }}
                />
            </pre>

            <h3>Custom Metadata</h3>
            <p>
                If you need structured metadata (e.g. an object with named
                fields), call <code>this.withExtension(key, value)</code>{' '}
                explicitly. The auto-infer logic detects the existing key and
                skips automatic attachment:
            </p>
            <pre>
                <code
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                    dangerouslySetInnerHTML={{
                        __html: highlightTS(`const currencyExt = defineExtension({
  number: {
    currency(this: NumberSchemaBuilder, opts?: { maxDecimals?: number }) {
      const maxDec = opts?.maxDecimals ?? 2;
      return this.withExtension('currency', { maxDecimals: maxDec })
        .min(0)
        .addValidator((val) => {
          const decimals = (String(val).split('.')[1] ?? '').length;
          const valid = decimals <= maxDec;
          return { valid, errors: valid ? [] : [{ message: \`Max \${maxDec} decimal places\` }] };
        });
    }
  }
});`)
                    }}
                />
            </pre>

            <h3>Build &amp; Share Extensions</h3>
            <p>
                Extensions are plain objects — easy to publish as npm packages
                and share with the community. Unlike Zod&apos;s{' '}
                <code>.refine()</code> or Yup&apos;s <code>.test()</code>,
                extensions add <strong>named, discoverable methods</strong> to
                the builder API with full TypeScript autocompletion. Unlike
                Joi&apos;s <code>.extend()</code>, extension methods are
                type-safe and composable without any casts.
            </p>
            <p>
                We encourage the community to create and publish extensions for
                common use cases — email validation, currency formatting, URL
                slugs, phone numbers, and more. A well-typed extension is just a{' '}
                <code>defineExtension()</code> call away.
            </p>
        </div>
    );
}

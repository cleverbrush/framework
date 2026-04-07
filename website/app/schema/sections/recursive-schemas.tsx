import { highlightTS } from '@/lib/highlight';

export default function RecursiveSchemasSection() {
    return (
        <>
            <div className="card">
                <h2>Recursive Schemas</h2>
                <a
                    href="/playground/recursive-schemas"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Use <code>lazy(() =&gt; schema)</code> to define recursive
                    or self-referential schemas — tree structures, comment
                    threads, nested menus, org charts, and any other type that
                    refers to itself.
                </p>
                <p>
                    The getter function is called <strong>once</strong> on first
                    validation and its result is cached. Every subsequent call
                    reuses the cache.
                </p>
                <blockquote>
                    <strong>TypeScript note:</strong> TypeScript cannot infer
                    recursive types automatically. You must provide an explicit
                    type annotation on the variable holding the schema.
                </blockquote>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import {
    object, string, number, array, lazy,
    type SchemaBuilder
} from '@cleverbrush/schema';

// ── Tree structure ────────────────────────────────────────
type TreeNode = { value: number; children: TreeNode[] };

// Explicit annotation required — TypeScript can't infer recursive types
const treeNode: SchemaBuilder<TreeNode, true> = object({
    value: number(),
    children: array(lazy(() => treeNode))
});

treeNode.validate({
    value: 1,
    children: [
        { value: 2, children: [] },
        { value: 3, children: [{ value: 4, children: [] }] }
    ]
});
// { valid: true, object: { value: 1, children: [...] } }

// ── Comment thread ────────────────────────────────────────
type Comment = { text: string; replies: Comment[] };

const commentSchema: SchemaBuilder<Comment, true> = object({
    text: string(),
    replies: array(lazy(() => commentSchema))
});

// ── Navigation menu with optional sub-levels ─────────────
type MenuItem = { label: string; submenu?: MenuItem[] };

const menuItem: SchemaBuilder<MenuItem, true> = object({
    label: string(),
    submenu: array(lazy(() => menuItem)).optional()
});`)
                        }}
                    />
                </pre>
                <p>
                    <code>lazy()</code> is fully compatible with{' '}
                    <code>.optional()</code>, <code>.addPreprocessor()</code>,{' '}
                    <code>.addValidator()</code>, and all other fluent methods.
                    Call <code>.resolve()</code> to access the underlying
                    resolved schema directly.
                </p>
            </div>
        </>
    );
}

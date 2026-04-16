// Re-export all shared API schemas and types from the shared package.
// Backend-internal files (endpoints, handlers, mappers) import from here —
// this barrel keeps their import paths unchanged while the source of truth
// lives in @cleverbrush/todo-shared.
export * from '@cleverbrush/todo-shared';

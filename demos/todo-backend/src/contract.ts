/**
 * Public contract entry point for `@cleverbrush/todo-backend/contract`.
 *
 * Re-exports all shared API schemas, types, and the typed API contract
 * so the frontend can import everything it needs from a single path.
 *
 * @module
 */

export { api } from './api/contract.js';
export * from './api/schemas.js';

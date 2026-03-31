/**
 * Pre‑wired extension pack for `@cleverbrush/schema`.
 *
 * Combines {@link stringExtensions}, {@link numberExtensions}, and
 * {@link arrayExtensions} via `withExtensions()` and re‑exports the
 * augmented factory functions.
 *
 * The default `@cleverbrush/schema` entry point re‑exports these
 * augmented factories so that `email()`, `positive()`, `nonempty()`,
 * etc. are available without any setup.
 *
 * @module
 */
import { withExtensions } from '../extension.js';
import { arrayExtensions } from './array.js';
import { numberExtensions } from './number.js';
import { stringExtensions } from './string.js';

export { arrayExtensions } from './array.js';
export { numberExtensions } from './number.js';
export { stringExtensions } from './string.js';

const s = withExtensions(stringExtensions, numberExtensions, arrayExtensions);

export const string = s.string;
export const number = s.number;
export const boolean = s.boolean;
export const date = s.date;
export const object = s.object;
export const array = s.array;
export const union = s.union;
export const func = s.func;
export const any = s.any;

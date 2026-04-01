/**
 * Array schema — array of objects with element validation.
 *
 * Array<{ id: number, label: string }>  (100 elements)
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

// ── Element schemas ─────────────────────────────────────────────────

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbArray = s.array().of(
    s.object({
        id: s.number().min(1).isInteger(),
        label: s.string().minLength(1).maxLength(100)
    })
);

// ── zod ─────────────────────────────────────────────────────────────
export const zodArray = z.array(
    z.object({
        id: z.number().int().min(1),
        label: z.string().min(1).max(100)
    })
);

// ── yup ─────────────────────────────────────────────────────────────
export const yupArray = yup.array().of(
    yup.object({
        id: yup.number().required().integer().min(1),
        label: yup.string().required().min(1).max(100)
    })
);

// ── joi ─────────────────────────────────────────────────────────────
export const joiArray = Joi.array().items(
    Joi.object({
        id: Joi.number().integer().min(1).required(),
        label: Joi.string().min(1).max(100).required()
    })
);

// ── Test fixtures ───────────────────────────────────────────────────
export const ARRAY_SIZE = 100;

export const validArray = Array.from({ length: ARRAY_SIZE }, (_, i) => ({
    id: i + 1,
    label: `item_${i + 1}`
}));

export const invalidArray = Array.from({ length: ARRAY_SIZE }, (_, i) => ({
    id: i % 2 === 0 ? i + 1 : -1, // every other element has invalid id
    label: i % 3 === 0 ? '' : `item_${i + 1}` // every 3rd element has empty label
}));

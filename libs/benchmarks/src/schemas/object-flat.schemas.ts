/**
 * Flat object schema — 5 typed properties, one optional.
 *
 * { name: string, age: number, active: boolean, email: string, nickname?: string }
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbObjectFlat = s.object({
    name: s.string().minLength(1),
    age: s.number().min(0).max(150).isInteger(),
    active: s.boolean(),
    email: s.string().email(),
    nickname: s.string().optional()
});

// ── zod ─────────────────────────────────────────────────────────────
export const zodObjectFlat = z.object({
    name: z.string().min(1),
    age: z.number().int().min(0).max(150),
    active: z.boolean(),
    email: z.string().email(),
    nickname: z.string().optional()
});

// ── yup ─────────────────────────────────────────────────────────────
export const yupObjectFlat = yup.object({
    name: yup.string().required().min(1),
    age: yup.number().required().integer().min(0).max(150),
    active: yup.boolean().required(),
    email: yup.string().required().email(),
    nickname: yup.string().optional()
});

// ── joi ─────────────────────────────────────────────────────────────
export const joiObjectFlat = Joi.object({
    name: Joi.string().min(1).required(),
    age: Joi.number().integer().min(0).max(150).required(),
    active: Joi.boolean().required(),
    email: Joi.string().email().required(),
    nickname: Joi.string().optional()
});

// ── Test fixtures ───────────────────────────────────────────────────
export const validObjectFlat = {
    name: 'Alice',
    age: 30,
    active: true,
    email: 'alice@example.com'
};

export const invalidObjectFlat = {
    name: '',
    age: -5,
    active: 'yes',
    email: 'not-an-email'
};

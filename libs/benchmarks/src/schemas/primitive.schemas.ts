/**
 * Primitive string & number schemas — identical constraints across all 4 libraries.
 *
 * String: minLength(3), maxLength(50), matches /^[a-zA-Z0-9_]+$/
 * Number: integer, min(0), max(1000)
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

const ALPHANUMERIC = /^[a-zA-Z0-9_]+$/;

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbString = s
    .string()
    .minLength(3)
    .maxLength(50)
    .matches(ALPHANUMERIC);

export const cbNumber = s.number().min(0).max(1000).isInteger();

// ── zod ─────────────────────────────────────────────────────────────
export const zodString = z.string().min(3).max(50).regex(ALPHANUMERIC);

export const zodNumber = z.number().int().min(0).max(1000);

// ── yup ─────────────────────────────────────────────────────────────
export const yupString = yup
    .string()
    .required()
    .min(3)
    .max(50)
    .matches(ALPHANUMERIC);

export const yupNumber = yup.number().required().integer().min(0).max(1000);

// ── joi ─────────────────────────────────────────────────────────────
export const joiString = Joi.string()
    .min(3)
    .max(50)
    .pattern(ALPHANUMERIC)
    .required();

export const joiNumber = Joi.number().integer().min(0).max(1000).required();

// ── Test fixtures ───────────────────────────────────────────────────
export const validString = 'hello_world';
export const invalidString = 'x'; // too short
export const validNumber = 42;
export const invalidNumber = 1500; // too large

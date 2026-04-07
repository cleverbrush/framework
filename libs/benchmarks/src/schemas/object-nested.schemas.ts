/**
 * Nested object schema — 3 levels deep.
 *
 * User { name, email, address: { street, city, zip, geo: { lat, lng } } }
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbObjectNested = s.object({
    name: s.string().minLength(1),
    email: s.string().email(),
    address: s.object({
        street: s.string().minLength(1),
        city: s.string().minLength(1),
        zip: s.string().matches(/^\d{5}$/),
        geo: s.object({
            lat: s.number().clearIsInteger().min(-90).max(90),
            lng: s.number().clearIsInteger().min(-180).max(180)
        })
    })
});

// ── zod ─────────────────────────────────────────────────────────────
export const zodObjectNested = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    address: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        zip: z.string().regex(/^\d{5}$/),
        geo: z.object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180)
        })
    })
});

// ── yup ─────────────────────────────────────────────────────────────
export const yupObjectNested = yup.object({
    name: yup.string().required().min(1),
    email: yup.string().required().email(),
    address: yup
        .object({
            street: yup.string().required().min(1),
            city: yup.string().required().min(1),
            zip: yup
                .string()
                .required()
                .matches(/^\d{5}$/),
            geo: yup
                .object({
                    lat: yup.number().required().min(-90).max(90),
                    lng: yup.number().required().min(-180).max(180)
                })
                .required()
        })
        .required()
});

// ── joi ─────────────────────────────────────────────────────────────
export const joiObjectNested = Joi.object({
    name: Joi.string().min(1).required(),
    email: Joi.string().email().required(),
    address: Joi.object({
        street: Joi.string().min(1).required(),
        city: Joi.string().min(1).required(),
        zip: Joi.string()
            .pattern(/^\d{5}$/)
            .required(),
        geo: Joi.object({
            lat: Joi.number().min(-90).max(90).required(),
            lng: Joi.number().min(-180).max(180).required()
        }).required()
    }).required()
});

// ── Test fixtures ───────────────────────────────────────────────────
export const validObjectNested = {
    name: 'Alice',
    email: 'alice@example.com',
    address: {
        street: '123 Main St',
        city: 'Springfield',
        zip: '62704',
        geo: { lat: 39.7817, lng: -89.6501 }
    }
};

export const invalidObjectNested = {
    name: '',
    email: 'bad',
    address: {
        street: '',
        city: '',
        zip: 'ABCDE',
        geo: { lat: 999, lng: -999 }
    }
};

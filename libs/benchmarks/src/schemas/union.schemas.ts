/**
 * Union schema — 3 discriminated object shapes.
 *
 * Shape A: { type: 'text', content: string }
 * Shape B: { type: 'image', url: string, width: number, height: number }
 * Shape C: { type: 'video', url: string, duration: number }
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbUnion = s
    .union(
        s.object({
            type: s.string('text'),
            content: s.string().minLength(1)
        })
    )
    .or(
        s.object({
            type: s.string('image'),
            url: s.string().url(),
            width: s.number().positive().isInteger(),
            height: s.number().positive().isInteger()
        })
    )
    .or(
        s.object({
            type: s.string('video'),
            url: s.string().url(),
            duration: s.number().clearIsInteger().positive()
        })
    );

// ── zod ─────────────────────────────────────────────────────────────
export const zodUnion = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('text'),
        content: z.string().min(1)
    }),
    z.object({
        type: z.literal('image'),
        url: z.string().url(),
        width: z.number().int().positive(),
        height: z.number().int().positive()
    }),
    z.object({
        type: z.literal('video'),
        url: z.string().url(),
        duration: z.number().positive()
    })
]);

// ── yup ─────────────────────────────────────────────────────────────
// yup doesn't have a built-in discriminated union, so we use .test() with a manual check.
const textSchema = yup.object({
    type: yup.string().required().oneOf(['text']),
    content: yup.string().required().min(1)
});
const imageSchema = yup.object({
    type: yup.string().required().oneOf(['image']),
    url: yup.string().required().url(),
    width: yup.number().required().integer().positive(),
    height: yup.number().required().integer().positive()
});
const videoSchema = yup.object({
    type: yup.string().required().oneOf(['video']),
    url: yup.string().required().url(),
    duration: yup.number().required().positive()
});

export const yupUnion = yup
    .mixed()
    .test('union', 'Must match one of: text, image, video', (value) => {
        return (
            textSchema.isValidSync(value) ||
            imageSchema.isValidSync(value) ||
            videoSchema.isValidSync(value)
        );
    });

// ── joi ─────────────────────────────────────────────────────────────
export const joiUnion = Joi.alternatives().try(
    Joi.object({
        type: Joi.string().valid('text').required(),
        content: Joi.string().min(1).required()
    }),
    Joi.object({
        type: Joi.string().valid('image').required(),
        url: Joi.string().uri().required(),
        width: Joi.number().integer().positive().required(),
        height: Joi.number().integer().positive().required()
    }),
    Joi.object({
        type: Joi.string().valid('video').required(),
        url: Joi.string().uri().required(),
        duration: Joi.number().positive().required()
    })
);

// ── Test fixtures ───────────────────────────────────────────────────
export const validUnionText = { type: 'text', content: 'Hello world' };
export const validUnionImage = {
    type: 'image',
    url: 'https://example.com/img.png',
    width: 800,
    height: 600
};
export const validUnionVideo = {
    type: 'video',
    url: 'https://example.com/vid.mp4',
    duration: 120.5
};

export const invalidUnion = {
    type: 'unknown',
    data: 123
};

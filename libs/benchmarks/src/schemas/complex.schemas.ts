/**
 * Complex real-world schema — "Create Order" API payload.
 *
 * Combines nested objects, arrays, unions, and all primitive types.
 */
import * as s from '@cleverbrush/schema';
import Joi from 'joi';
import * as yup from 'yup';
import { z } from 'zod';

// ── @cleverbrush/schema ─────────────────────────────────────────────
export const cbComplex = s.object({
    orderId: s.string().matches(/^ORD-\d{6}$/),
    customer: s.object({
        name: s.string().minLength(1).maxLength(100),
        email: s.string().email(),
        phone: s
            .string()
            .matches(/^\+\d{10,15}$/)
            .optional()
    }),
    items: s.array().of(
        s.object({
            sku: s.string().minLength(3).maxLength(20),
            quantity: s.number().min(1).max(999).isInteger(),
            price: s.number().clearIsInteger().min(0),
            discount: s.number().clearIsInteger().min(0).max(100).optional()
        })
    ),
    shipping: s.object({
        method: s
            .union(s.string('standard'))
            .or(s.string('express'))
            .or(s.string('overnight')),
        address: s.object({
            line1: s.string().minLength(1),
            line2: s.string().optional(),
            city: s.string().minLength(1),
            state: s.string().minLength(2).maxLength(2),
            zip: s.string().matches(/^\d{5}(-\d{4})?$/),
            country: s.string().minLength(2).maxLength(2)
        })
    }),
    notes: s.string().maxLength(500).optional(),
    rush: s.boolean().optional()
});

// ── zod ─────────────────────────────────────────────────────────────
export const zodComplex = z.object({
    orderId: z.string().regex(/^ORD-\d{6}$/),
    customer: z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
        phone: z
            .string()
            .regex(/^\+\d{10,15}$/)
            .optional()
    }),
    items: z.array(
        z.object({
            sku: z.string().min(3).max(20),
            quantity: z.number().int().min(1).max(999),
            price: z.number().min(0),
            discount: z.number().min(0).max(100).optional()
        })
    ),
    shipping: z.object({
        method: z.enum(['standard', 'express', 'overnight']),
        address: z.object({
            line1: z.string().min(1),
            line2: z.string().optional(),
            city: z.string().min(1),
            state: z.string().length(2),
            zip: z.string().regex(/^\d{5}(-\d{4})?$/),
            country: z.string().length(2)
        })
    }),
    notes: z.string().max(500).optional(),
    rush: z.boolean().optional()
});

// ── yup ─────────────────────────────────────────────────────────────
export const yupComplex = yup.object({
    orderId: yup
        .string()
        .required()
        .matches(/^ORD-\d{6}$/),
    customer: yup
        .object({
            name: yup.string().required().min(1).max(100),
            email: yup.string().required().email(),
            phone: yup
                .string()
                .optional()
                .matches(/^\+\d{10,15}$/)
        })
        .required(),
    items: yup
        .array()
        .of(
            yup.object({
                sku: yup.string().required().min(3).max(20),
                quantity: yup.number().required().integer().min(1).max(999),
                price: yup.number().required().min(0),
                discount: yup.number().optional().min(0).max(100)
            })
        )
        .required(),
    shipping: yup
        .object({
            method: yup
                .string()
                .required()
                .oneOf(['standard', 'express', 'overnight']),
            address: yup
                .object({
                    line1: yup.string().required().min(1),
                    line2: yup.string().optional(),
                    city: yup.string().required().min(1),
                    state: yup.string().required().length(2),
                    zip: yup
                        .string()
                        .required()
                        .matches(/^\d{5}(-\d{4})?$/),
                    country: yup.string().required().length(2)
                })
                .required()
        })
        .required(),
    notes: yup.string().optional().max(500),
    rush: yup.boolean().optional()
});

// ── joi ─────────────────────────────────────────────────────────────
export const joiComplex = Joi.object({
    orderId: Joi.string()
        .pattern(/^ORD-\d{6}$/)
        .required(),
    customer: Joi.object({
        name: Joi.string().min(1).max(100).required(),
        email: Joi.string().email().required(),
        phone: Joi.string()
            .pattern(/^\+\d{10,15}$/)
            .optional()
    }).required(),
    items: Joi.array()
        .items(
            Joi.object({
                sku: Joi.string().min(3).max(20).required(),
                quantity: Joi.number().integer().min(1).max(999).required(),
                price: Joi.number().min(0).required(),
                discount: Joi.number().min(0).max(100).optional()
            })
        )
        .required(),
    shipping: Joi.object({
        method: Joi.string()
            .valid('standard', 'express', 'overnight')
            .required(),
        address: Joi.object({
            line1: Joi.string().min(1).required(),
            line2: Joi.string().optional(),
            city: Joi.string().min(1).required(),
            state: Joi.string().length(2).required(),
            zip: Joi.string()
                .pattern(/^\d{5}(-\d{4})?$/)
                .required(),
            country: Joi.string().length(2).required()
        }).required()
    }).required(),
    notes: Joi.string().max(500).optional(),
    rush: Joi.boolean().optional()
});

// ── Test fixtures ───────────────────────────────────────────────────
export const validComplex = {
    orderId: 'ORD-123456',
    customer: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+12025551234'
    },
    items: [
        { sku: 'WIDGET-A', quantity: 3, price: 19.99, discount: 10 },
        { sku: 'GADGET-B', quantity: 1, price: 49.99 }
    ],
    shipping: {
        method: 'express',
        address: {
            line1: '123 Main St',
            line2: 'Apt 4B',
            city: 'Springfield',
            state: 'IL',
            zip: '62704',
            country: 'US'
        }
    },
    notes: 'Please gift wrap',
    rush: true
};

export const invalidComplex = {
    orderId: 'BAD',
    customer: {
        name: '',
        email: 'not-email',
        phone: '12345'
    },
    items: [
        { sku: 'AB', quantity: 0, price: -5, discount: 150 },
        { sku: '', quantity: 1.5, price: 10 }
    ],
    shipping: {
        method: 'teleport',
        address: {
            line1: '',
            city: '',
            state: 'Illinois',
            zip: 'ABCDE',
            country: 'United States'
        }
    }
};

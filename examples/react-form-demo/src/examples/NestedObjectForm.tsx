import { object, string, number } from '@cleverbrush/schema';
import {
    useSchemaForm,
    Field,
    FormSystemProvider
} from '@cleverbrush/react-form';
import { htmlRenderers } from '../renderers';

/**
 * Example 3: Nested Object Schema
 *
 * Demonstrates:
 * - Deeply nested object schemas
 * - PropertyDescriptor selectors traversing nested paths: t => t.user.address.city
 * - createMissingStructure option (auto-creates parent objects)
 * - getValue() to inspect full form state
 */

const OrderSchema = object({
    customer: object({
        name: string().addValidator(async (val) => {
            if (!val || typeof val !== 'string' || val.trim().length === 0) {
                return {
                    valid: false,
                    errors: [{ message: 'Customer name is required' }]
                };
            }
            return { valid: true };
        }),
        email: string().addValidator(async (val) => {
            if (!val || typeof val !== 'string') {
                return {
                    valid: false,
                    errors: [{ message: 'Email is required' }]
                };
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                return {
                    valid: false,
                    errors: [{ message: 'Invalid email' }]
                };
            }
            return { valid: true };
        }),
        address: object({
            street: string().addValidator(async (val) => {
                if (!val || typeof val !== 'string' || val.trim().length === 0) {
                    return {
                        valid: false,
                        errors: [{ message: 'Street is required' }]
                    };
                }
                return { valid: true };
            }),
            city: string().addValidator(async (val) => {
                if (!val || typeof val !== 'string' || val.trim().length === 0) {
                    return {
                        valid: false,
                        errors: [{ message: 'City is required' }]
                    };
                }
                return { valid: true };
            }),
            zipCode: string().addValidator(async (val) => {
                if (!val || typeof val !== 'string') {
                    return {
                        valid: false,
                        errors: [{ message: 'ZIP code is required' }]
                    };
                }
                if (!/^\d{5}(-\d{4})?$/.test(val)) {
                    return {
                        valid: false,
                        errors: [
                            { message: 'ZIP code must be 5 digits (e.g., 90210)' }
                        ]
                    };
                }
                return { valid: true };
            })
        })
    }),
    orderTotal: number().addValidator(async (val) => {
        if (val === undefined || val === null) {
            return {
                valid: false,
                errors: [{ message: 'Order total is required' }]
            };
        }
        if (typeof val !== 'number' || val <= 0) {
            return {
                valid: false,
                errors: [{ message: 'Order total must be greater than 0' }]
            };
        }
        return { valid: true };
    })
});

export function NestedObjectForm() {
    const form = useSchemaForm(OrderSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            alert(`Order placed!\n${JSON.stringify(result.object, null, 2)}`);
        }
    };

    const showValues = () => {
        const values = form.getValue();
        alert(`Current form values:\n${JSON.stringify(values, null, 2)}`);
    };

    return (
        <FormSystemProvider renderers={htmlRenderers}>
            <div className="example">
                <h2>3. Nested Object Schema</h2>
                <p className="description">
                    Deeply nested schemas: customer → address → city/zip.
                    Selectors traverse the full path:{' '}
                    <code>{'t => t.customer.address.city'}</code>
                </p>

                <div className="form-grid">
                    <h3>Customer Info</h3>
                    <label>
                        Name
                        <Field
                            selector={(t) => t.customer.name}
                            form={form}
                        />
                    </label>

                    <label>
                        Email
                        <Field
                            selector={(t) => t.customer.email}
                            form={form}
                        />
                    </label>

                    <h3>Shipping Address</h3>
                    <label>
                        Street
                        <Field
                            selector={(t) => t.customer.address.street}
                            form={form}
                        />
                    </label>

                    <label>
                        City
                        <Field
                            selector={(t) => t.customer.address.city}
                            form={form}
                        />
                    </label>

                    <label>
                        ZIP Code <small>(5 digits)</small>
                        <Field
                            selector={(t) => t.customer.address.zipCode}
                            form={form}
                        />
                    </label>

                    <h3>Order</h3>
                    <label>
                        Order Total ($)
                        <Field selector={(t) => t.orderTotal} form={form} />
                    </label>
                </div>

                <div className="button-group">
                    <button className="btn-primary" onClick={handleSubmit}>
                        Place Order
                    </button>
                    <button className="btn-secondary" onClick={showValues}>
                        Show Values
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => form.reset()}
                    >
                        Reset
                    </button>
                </div>
            </div>
        </FormSystemProvider>
    );
}

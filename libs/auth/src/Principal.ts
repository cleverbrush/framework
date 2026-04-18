/**
 * Principal — represents an authenticated (or anonymous) user identity.
 *
 * Generic over `T` — the user-defined principal shape, typically
 * declared as a `@cleverbrush/schema` object schema.
 */
export class Principal<T = unknown> {
    readonly isAuthenticated: boolean;
    readonly value: T | undefined;
    readonly claims: Map<string, string | string[]>;

    constructor(
        isAuthenticated: boolean,
        value: T | undefined,
        claims?: Map<string, string | string[]>
    ) {
        this.isAuthenticated = isAuthenticated;
        this.value = value;
        this.claims = claims ?? new Map();
    }

    /**
     * Returns true if the principal has the given role.
     * Checks the "role" claim by default; supports both single-value
     * and array-value claims.
     */
    hasRole(role: string, claimKey = 'role'): boolean {
        const v = this.claims.get(claimKey);
        if (v === undefined) return false;
        if (Array.isArray(v)) return v.includes(role);
        return v === role;
    }

    /**
     * Returns true if the principal has a claim with the given type.
     * If `value` is provided, also checks the claim value matches.
     */
    hasClaim(type: string, value?: string): boolean {
        const v = this.claims.get(type);
        if (v === undefined) return false;
        if (value === undefined) return true;
        if (Array.isArray(v)) return v.includes(value);
        return v === value;
    }

    /**
     * Creates an anonymous (unauthenticated) principal.
     */
    static anonymous(): Principal<undefined> {
        return new Principal(false, undefined);
    }
}

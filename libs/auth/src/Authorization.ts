import type { Principal } from './Principal.js';

// ---------------------------------------------------------------------------
// Authorization Requirement
// ---------------------------------------------------------------------------

/**
 * A predicate that a principal must satisfy.
 * Return `true` to allow, `false` to deny.
 */
export type AuthorizationRequirement = (
    principal: Principal<any>
) => boolean | Promise<boolean>;

// ---------------------------------------------------------------------------
// Roles Requirement
// ---------------------------------------------------------------------------

/**
 * Creates an authorization requirement that checks if the principal
 * has at least one of the specified roles.
 */
export function requireRole(...roles: string[]): AuthorizationRequirement {
    return (principal: Principal<any>) =>
        roles.some(role => principal.hasRole(role));
}

// ---------------------------------------------------------------------------
// Authorization Policy
// ---------------------------------------------------------------------------

export interface AuthorizationPolicy {
    readonly name: string;
    readonly requirements: readonly AuthorizationRequirement[];
}

// ---------------------------------------------------------------------------
// Policy Builder (fluent API for useAuthorization config)
// ---------------------------------------------------------------------------

export class PolicyBuilder {
    readonly #requirements: AuthorizationRequirement[] = [];

    requireRole(...roles: string[]): this {
        this.#requirements.push(requireRole(...roles));
        return this;
    }

    require(requirement: AuthorizationRequirement): this {
        this.#requirements.push(requirement);
        return this;
    }

    build(name: string): AuthorizationPolicy {
        return { name, requirements: [...this.#requirements] };
    }
}

// ---------------------------------------------------------------------------
// Authorization Result
// ---------------------------------------------------------------------------

export type AuthorizationResult =
    | { allowed: true }
    | { allowed: false; reason: string };

// ---------------------------------------------------------------------------
// Authorization Service
// ---------------------------------------------------------------------------

export class AuthorizationService {
    readonly #policies: Map<string, AuthorizationPolicy>;

    constructor(policies?: Map<string, AuthorizationPolicy>) {
        this.#policies = policies ?? new Map();
    }

    /**
     * Evaluate authorization for a principal.
     *
     * - `requirements` array: all must pass (AND semantics).
     * - Named policy string: looks up registered policy, then checks its requirements.
     */
    async authorize(
        principal: Principal<any>,
        requirements: readonly AuthorizationRequirement[]
    ): Promise<AuthorizationResult>;
    async authorize(
        principal: Principal<any>,
        policyName: string
    ): Promise<AuthorizationResult>;
    async authorize(
        principal: Principal<any>,
        requirementsOrPolicy: readonly AuthorizationRequirement[] | string
    ): Promise<AuthorizationResult> {
        if (!principal.isAuthenticated) {
            return { allowed: false, reason: 'Not authenticated' };
        }

        let requirements: readonly AuthorizationRequirement[];

        if (typeof requirementsOrPolicy === 'string') {
            const policy = this.#policies.get(requirementsOrPolicy);
            if (!policy) {
                return {
                    allowed: false,
                    reason: `Unknown authorization policy: "${requirementsOrPolicy}"`
                };
            }
            requirements = policy.requirements;
        } else {
            requirements = requirementsOrPolicy;
        }

        for (const req of requirements) {
            const result = await req(principal);
            if (!result) {
                return { allowed: false, reason: 'Forbidden' };
            }
        }

        return { allowed: true };
    }
}

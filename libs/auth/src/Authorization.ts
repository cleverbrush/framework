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

/**
 * A named set of authorization requirements.
 * All requirements must pass (AND semantics) for the policy to be satisfied.
 * Build instances using {@link PolicyBuilder}.
 */
export interface AuthorizationPolicy {
    readonly name: string;
    readonly requirements: readonly AuthorizationRequirement[];
}

// ---------------------------------------------------------------------------
// Policy Builder (fluent API for useAuthorization config)
// ---------------------------------------------------------------------------

/**
 * Fluent builder for composing {@link AuthorizationPolicy} instances.
 *
 * @example
 * ```ts
 * const policy = new PolicyBuilder()
 *     .requireRole('admin')
 *     .require(p => p.hasClaim('verified', 'true'))
 *     .build('admin-only');
 * ```
 */
export class PolicyBuilder {
    readonly #requirements: AuthorizationRequirement[] = [];

    /** Add a role requirement: at least one of `roles` must be held by the principal. */
    requireRole(...roles: string[]): this {
        this.#requirements.push(requireRole(...roles));
        return this;
    }

    /** Add an arbitrary predicate requirement. */
    require(requirement: AuthorizationRequirement): this {
        this.#requirements.push(requirement);
        return this;
    }

    /** Finalize the policy with the given name. */
    build(name: string): AuthorizationPolicy {
        return { name, requirements: [...this.#requirements] };
    }
}

// ---------------------------------------------------------------------------
// Authorization Result
// ---------------------------------------------------------------------------

/**
 * The result of an authorization check performed by {@link AuthorizationService.authorize}.
 */
export type AuthorizationResult =
    | { allowed: true }
    | { allowed: false; reason: string };

// ---------------------------------------------------------------------------
// Authorization Service
// ---------------------------------------------------------------------------

/**
 * Evaluates authorization requirements or named policies against a principal.
 *
 * Instantiated internally by `ServerBuilder.useAuthorization()` or directly
 * for use outside the server framework.
 */
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

import { defineRoles } from '@cleverbrush/auth';
import { object, string } from '@cleverbrush/schema';

export const Roles = defineRoles({ user: 'user', admin: 'admin' });

export const IPrincipal = object({
    userId: string(),
    name: string(),
    role: string()
});

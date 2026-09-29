import { ActionResult, errorMap } from '@cleverbrush/server';

export class MissingItem extends Error {}
export const missingItem = errorMap().on(MissingItem, () =>
    ActionResult.notFound({ message: 'Item not found' })
);

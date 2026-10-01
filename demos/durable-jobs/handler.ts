import type { JobHandler } from '@cleverbrush/scheduler';
import type { Report } from './contracts.ts';

/** Handler in a separate module retains all contract-inferred types. */
export const handleReport: JobHandler<typeof Report> = async (input, context) => {
    context.signal.throwIfAborted();
    await context.report({ percent: 50 });
    return { downloadUrl: '/reports/' + input.reportId };
};

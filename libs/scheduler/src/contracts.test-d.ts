import { number, object, string } from '@cleverbrush/schema';
import { expectTypeOf } from 'vitest';
import { defineJob, type JobHandler, type JobScheduler } from './index.js';

const report = defineJob({
    name: 'report',
    version: 1,
    input: object({ id: string() }),
    progress: object({ percent: number() }),
    output: object({ url: string() })
});
const handler: JobHandler<typeof report> = async (input, context) => {
    expectTypeOf(input.id).toEqualTypeOf<string>();
    await context.report({ percent: 50 });
    // @ts-expect-error Progress is inferred from the definition.
    await context.report({ percent: 'wrong' });
    return { url: input.id };
};
report.handle(handler);
// @ts-expect-error Output is inferred even with a separately declared handler.
report.handle(() => ({ other: 1 }));
declare const scheduler: JobScheduler;
// @ts-expect-error Input contract is required.
scheduler.enqueue(report, { id: 1 });
const run = await scheduler.enqueue(report, { id: 'one' });
expectTypeOf(run.output).toEqualTypeOf<{ url: string } | null>();
for await (const event of scheduler.events(report, run.id)) {
    if (event.type === 'progress')
        expectTypeOf(event.data.percent).toEqualTypeOf<number>();
}

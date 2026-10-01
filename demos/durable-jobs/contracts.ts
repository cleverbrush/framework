import { object, string, number } from '@cleverbrush/schema';
import { defineJob } from '@cleverbrush/scheduler';

export const Report = defineJob({
    name: 'report', version: 1,
    input: object({ reportId: string() }),
    progress: object({ percent: number() }),
    output: object({ downloadUrl: string() })
});

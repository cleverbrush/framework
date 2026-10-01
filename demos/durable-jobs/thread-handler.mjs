// Trusted default-export handler for a worker-thread execution.
export default async function handler(input, context) {
    if (input.mode === 'exit') process.exit(7);
    if (input.mode === 'hang') await new Promise(() => {});
    if (input.mode === 'invalid') { await context.report({ percent: 'wrong' }); }
    if (input.mode === 'accessor') {
        await context.report({ get percent() { throw new Error('must not execute'); } });
    }
    if (input.mode === 'unawaited-invalid') void context.report({ percent: 'wrong' });
    await context.report({ percent: 50 });
    return { url: '/reports/' + input.id };
}

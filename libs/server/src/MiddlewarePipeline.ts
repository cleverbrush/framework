import type { RequestContext } from './RequestContext.js';
import type { Middleware } from './types.js';

export class MiddlewarePipeline {
    readonly #middlewares: Middleware[] = [];

    add(middleware: Middleware): void {
        this.#middlewares.push(middleware);
    }

    async execute(
        context: RequestContext,
        finalHandler: () => Promise<void>
    ): Promise<void> {
        let index = 0;

        const next = async (): Promise<void> => {
            if (index < this.#middlewares.length) {
                const middleware = this.#middlewares[index++];
                await middleware(context, next);
            } else {
                await finalHandler();
            }
        };

        await next();
    }
}

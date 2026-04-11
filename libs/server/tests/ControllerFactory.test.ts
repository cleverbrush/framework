import { ServiceCollection } from '@cleverbrush/di';
import { func, number, object } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { createController } from '../src/ControllerFactory.js';

describe('ControllerFactory', () => {
    it('creates controller with no dependencies', () => {
        const Schema = object({ greet: func() });
        class MyController {
            greet() {
                return 'hello';
            }
        }

        const services = new ServiceCollection();
        const provider = services.buildServiceProvider();
        const ctrl = createController(Schema, MyController, provider);
        expect(ctrl.greet()).toBe('hello');
    });

    it('creates controller with single dependency', () => {
        const IConfig = object({ port: number() });
        const Schema = object({
            getPort: func()
        }).addConstructor(func().addParameter(IConfig));

        class MyController {
            #config: any;
            constructor(config: any) {
                this.#config = config;
            }
            getPort() {
                return this.#config.port;
            }
        }

        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 3000 });
        const provider = services.buildServiceProvider();
        const ctrl = createController(Schema, MyController, provider);
        expect(ctrl.getPort()).toBe(3000);
    });

    it('creates controller with multiple dependencies', () => {
        const IConfig = object({ port: number() });
        const ILogger = object({ info: func() });
        const Schema = object({
            run: func()
        }).addConstructor(func().addParameter(IConfig).addParameter(ILogger));

        class MyController {
            #config: any;
            constructor(config: any, _logger: any) {
                this.#config = config;
            }
            run() {
                return `${this.#config.port}`;
            }
        }

        const services = new ServiceCollection();
        services.addSingleton(IConfig, { port: 8080 });
        services.addSingleton(ILogger, { info: () => {} });
        const provider = services.buildServiceProvider();
        const ctrl = createController(Schema, MyController, provider);
        expect(ctrl.run()).toBe('8080');
    });

    it('throws on missing dependency', () => {
        const IMissing = object({ x: number() });
        const Schema = object({
            run: func()
        }).addConstructor(func().addParameter(IMissing));

        class MyController {
            run() {
                return 'nope';
            }
        }

        const services = new ServiceCollection();
        const provider = services.buildServiceProvider();
        expect(() =>
            createController(Schema, MyController, provider)
        ).toThrow();
    });
});

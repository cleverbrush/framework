import { any, func, number, object, string } from '@cleverbrush/schema';
import { describe, expect, it } from 'vitest';
import { defineController } from '../src/ControllerDef.js';

// ---------------------------------------------------------------------------
// Overload 1: plain method-map (no DI)
// ---------------------------------------------------------------------------

describe('defineController — plain object (no DI)', () => {
    const Schema = object({
        greet: func()
            .addParameter(object({ name: string() }))
            .hasReturnType(any()),
        add: func()
            .addParameter(number())
            .addParameter(number())
            .hasReturnType(any())
    });

    it('returns a class constructor', () => {
        const Ctrl = defineController(Schema, {
            greet({ name }) {
                return `hi ${name}`;
            },
            add(a, b) {
                return a + b;
            }
        });
        expect(typeof Ctrl).toBe('function');
        expect(typeof Ctrl.prototype).toBe('object');
    });

    it('instantiates with no args and methods work', () => {
        const Ctrl = defineController(Schema, {
            greet({ name }) {
                return `hi ${name}`;
            },
            add(a, b) {
                return a + b;
            }
        });
        const instance = new Ctrl();
        expect(instance.greet({ name: 'Alice' })).toBe('hi Alice');
        expect(instance.add(2, 3)).toBe(5);
    });

    it('methods are own properties of the instance', () => {
        const Ctrl = defineController(Schema, {
            greet({ name }) {
                return name;
            },
            add(a, b) {
                return a + b;
            }
        });
        const instance = new Ctrl();
        expect(Object.keys(instance).sort()).toEqual(['add', 'greet']);
    });

    it('multiple instances share the same behaviour', () => {
        let counter = 0;
        const Ctrl = defineController(Schema, {
            greet() {
                return ++counter;
            },
            add(a, b) {
                return a + b;
            }
        });
        const a = new Ctrl();
        const b = new Ctrl();
        expect(a.greet({ name: '' })).toBe(1);
        expect(b.greet({ name: '' })).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// Overload 2: factory function (with DI)
// ---------------------------------------------------------------------------

describe('defineController — factory function (with DI)', () => {
    const IConfig = object({ dbUrl: string() });
    const Schema = object({
        getUrl: func().hasReturnType(any())
    }).addConstructor(func().addParameter(IConfig));

    it('returns a class constructor that accepts DI deps', () => {
        const Ctrl = defineController(Schema, config => ({
            getUrl() {
                return config.dbUrl;
            }
        }));
        expect(typeof Ctrl).toBe('function');
    });

    it('constructor passes deps to factory, methods close over them', () => {
        const Ctrl = defineController(Schema, config => ({
            getUrl() {
                return config.dbUrl;
            }
        }));
        const instance = new Ctrl({ dbUrl: 'postgres://localhost/test' });
        expect(instance.getUrl()).toBe('postgres://localhost/test');
    });

    it('each instance gets its own closure with different deps', () => {
        const Ctrl = defineController(Schema, config => ({
            getUrl() {
                return config.dbUrl;
            }
        }));
        const a = new Ctrl({ dbUrl: 'db-a' });
        const b = new Ctrl({ dbUrl: 'db-b' });
        expect(a.getUrl()).toBe('db-a');
        expect(b.getUrl()).toBe('db-b');
    });

    it('works with multiple constructor deps', () => {
        const ILogger = object({ name: string() });
        const IDb = object({ host: string() });
        const MultiSchema = object({
            info: func().hasReturnType(any())
        }).addConstructor(func().addParameter(ILogger).addParameter(IDb));

        const Ctrl = defineController(MultiSchema, (logger, db) => ({
            info() {
                return { logger: logger.name, db: db.host };
            }
        }));
        const instance = new Ctrl({ name: 'app' }, { host: 'db.local' });
        expect(instance.info()).toEqual({ logger: 'app', db: 'db.local' });
    });
});

// ---------------------------------------------------------------------------
// Compatibility with ServerBuilder.controller()
// ---------------------------------------------------------------------------

describe('defineController — compatible with ServerBuilder.controller()', () => {
    it('result can be used as the implementation arg (new (...args) => any)', () => {
        const Schema = object({ get: func().hasReturnType(any()) });
        const Ctrl = defineController(Schema, {
            get() {
                return 42;
            }
        });

        // ServerBuilder expects: new (...args: any[]) => any
        // Verify it's constructable and the instance has the method
        const instance = new Ctrl();
        expect(typeof instance.get).toBe('function');
        expect(instance.get()).toBe(42);
    });
});

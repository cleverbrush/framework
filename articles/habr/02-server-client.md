# Type-safe HTTP API на TypeScript без кодогенерации: @cleverbrush/server и @cleverbrush/client


Статья о том, как единый типизированный контракт позволяет получить проверяемые на этапе компиляции сервер, клиент и React-хуки — без кодогенерации и без дублирования типов.

Дисклеймер: все описываемые библиотеки носят экспериментальный характер — они созданы в рамках эксперимента. Несмотря на это, покрытие тестами у них достаточно хорошее.


Предыстория

В предыдущей статье я рассказывал о @cleverbrush/schema — библиотеке валидации схем с fluent-API и runtime-интроспекцией. Схемы — это краеугольный камень всего фреймворка. Сегодня речь пойдёт о том, что на них строится: типизированный HTTP-сервер @cleverbrush/server и клиент @cleverbrush/client.

Классическая проблема выглядит так: у вас есть бэкенд на TypeScript и фронтенд на TypeScript, но типы между ними не разделены. Либо вы дублируете их в двух местах, либо запускаете кодогенерацию по OpenAPI-манифесту и работаете с «размороженными» типами, которые устаревают сразу после того, как меняется контракт.

Здесь работает другой подход: единый контракт API в виде TypeScript-модуля, который импортируется и сервером, и клиентом напрямую.


Контракт как единственный источник правды

Контракт — это объект, описывающий все эндпоинты приложения. Он создаётся в отдельном пакете (или файле), не содержит серверного кода и может безопасно импортироваться в браузер.

    import { array, number, object, string } from '@cleverbrush/schema';
    import { defineApi, endpoint, route } from '@cleverbrush/server/contract';

    const TodoSchema = object({
        id: number(),
        title: string(),
        completed: boolean()
    });

    const CreateTodoBodySchema = object({
        title: string().minLength(1).required()
    });

    const ById = route({ id: number().coerce() })`/${t => t.id}`;

    export const api = defineApi({
        todos: {
            list: endpoint
                .get('/api/todos')
                .query(object({ page: number().coerce().optional() }))
                .responses({ 200: array(TodoSchema) }),

            get: endpoint
                .resource('/api/todos')
                .get(ById)
                .responses({ 200: TodoSchema, 404: null }),

            create: endpoint
                .post('/api/todos')
                .body(CreateTodoBodySchema)
                .responses({ 201: TodoSchema }),

            delete: endpoint
                .resource('/api/todos')
                .delete(ById)
                .responses({ 204: null })
        }
    });

Заметьте функцию route. Это tagged template, который задаёт путь с типизированными параметрами. В примере `/${t => t.id}` — TypeScript знает, что id имеет тип number (с coerce, то есть будет распарсен из строки URL). Если переименовать поле или написать t.userId там, где ключа нет, — получите ошибку компиляции.


Сервер

Контракт сам по себе не содержит серверной логики. На бэкенде его расширяют: добавляют авторизацию, инъекцию зависимостей и метаданные для OpenAPI.

    import { createServer, mapHandlers } from '@cleverbrush/server';
    import { api } from './contract.js';
    import { DbToken } from './di/tokens.js';

    // Расширяем контракт серверными деталями
    const endpoints = {
        todos: {
            list: api.todos.list
                .authorize(PrincipalSchema)
                .inject({ db: DbToken }),

            get: api.todos.get
                .authorize(PrincipalSchema)
                .inject({ db: DbToken }),

            create: api.todos.create
                .authorize(PrincipalSchema)
                .inject({ db: DbToken }),

            delete: api.todos.delete
                .authorize(PrincipalSchema)
                .inject({ db: DbToken })
        }
    };

Здесь .authorize(PrincipalSchema) указывает, что к этому эндпоинту нужна аутентификация. PrincipalSchema — это схема объекта principal (декодированный JWT), который будет доступен в хендлере. .inject({ db: DbToken }) — это инъекция зависимостей: хендлер получит db из DI-контейнера.


DI-контейнер: токены и регистрация сервисов

В @cleverbrush/server зависимости разрешаются через @cleverbrush/di. Токен — это значение любой схемы из @cleverbrush/schema, которому через .hasType<T>() приписан фантомный тип. Сам токен ничего не делает в рантайме; он служит ключом для DI-контейнера, а TypeScript использует его тип, чтобы знать, что будет получено при резолвинге.

    import { any } from '@cleverbrush/schema';
    import type { Knex } from 'knex';
    import type { DbContext } from '@cleverbrush/orm';

    // Токен — экземпляр схемы с фантомным типом T
    export const KnexToken  = any().hasType<Knex>();
    export const DbToken    = any().hasType<DbContext<AppEntityMap>>();
    export const ConfigToken = any().hasType<AppConfig>();

Токены регистрируются в контейнере через ServiceCollection. Возможные стратегии: addSingleton — одна инстанция на всё приложение, addScoped — одна инстанция на HTTP-запрос, addTransient — новая инстанция при каждом резолвинге.

    import { ServiceCollection } from '@cleverbrush/di';
    import knex from 'knex';

    export function configureDI(services: ServiceCollection, config: AppConfig): void {
        services.addSingleton(ConfigToken, config);

        services.addSingleton(KnexToken, () =>
            knex({ client: 'pg', connection: config.db.connectionString })
        );

        services.addSingleton(DbToken, (provider) => {
            const knexInstance = provider.get(KnexToken);
            return createDb(knexInstance, entityMap);
        });
    }

Теперь — ключевой момент: когда хендлер объявлен как Handler<typeof MyEndpoint>, TypeScript уже знает тип db. Это происходит потому, что .inject({ db: DbToken }) сохраняет тип DbToken в сигнатуре эндпоинта, а Handler<E> разворачивает его во второй параметр хендлера. В итоге, если передать в DbToken строку вместо DbContext, или попытаться обратиться к несуществующему полю db.nonexistent — ошибка компиляции, не рантайм.

    export const createTodoHandler: Handler<typeof CreateTodoEndpoint> = async (
        { body, principal },
        { db }
        // db: DbContext<AppEntityMap> — тип выведен из DbToken автоматически
    ) => { ... };

Контейнер подключается к серверу через .services():

    const server = createServer()
        .services(svc => configureDI(svc, config))
        // ...
        .listen(3000);


Исчерпывающая проверка хендлеров

Самое важное при регистрации хендлеров — функция mapHandlers. Она требует, чтобы для каждого эндпоинта в контракте был указан соответствующий хендлер. Если хоть один пропустить — TypeScript выдаст ошибку компиляции. Это гарантирует, что ни один эндпоинт не окажется без обработчика.

    const mapping = mapHandlers(endpoints, {
        todos: {
            list: listTodosHandler,
            create: createTodoHandler,
            get: getTodoHandler,
            delete: deleteTodoHandler
            // Пропустить любой из них = ошибка TypeScript
        }
    });

    const server = createServer()
        .use(corsMiddleware)
        .use(requestLogMiddleware)
        .services(svc => configureDI(svc, config))
        .useAuthentication({ defaultScheme: 'jwt', schemes: [jwtScheme(...)] })
        .useAuthorization()
        .withHealthcheck()
        .handleAll(mapping);

    server.listen(3000);

Метод .withHealthcheck() автоматически добавляет GET /health эндпоинт. .useBatching() включает поддержку пакетных запросов через POST /__batch.


Типизированные хендлеры

Тип Handler<E> выводит из эндпоинта всё необходимое: какие поля есть в body, query, params и principal. Писать касты не нужно.

    import { type Handler, ActionResult } from '@cleverbrush/server';
    import { type CreateTodoEndpoint } from './endpoints.js';

    export const createTodoHandler: Handler<typeof CreateTodoEndpoint> = async (
        { body, principal },
        { db }
    ) => {
        const todo = await db.todos.insert({
            title: body.title,       // string — выведено из CreateTodoBodySchema
            completed: false,
            userId: principal.userId // number — выведено из PrincipalSchema
        });

        return ActionResult.created(todo, `/api/todos/${todo.id}`);
    };

IDE подсказывает все поля body и principal с правильными типами. Если схема изменится — хендлеры, обращающиеся к удалённым полям, перестанут компилироваться.

ActionResult предоставляет удобные фабричные методы: ActionResult.ok(data), ActionResult.created(data, location), ActionResult.notFound(body), ActionResult.forbidden(body), ActionResult.noContent() и т.д. Для нестандартных ответов можно использовать new StatusCodeResult(statusCode, body).


Ошибки и Problem Details

Когда в хендлере нужно прервать выполнение с HTTP-ошибкой, используются классы HttpError:

    import { NotFoundError, ForbiddenError, ConflictError } from '@cleverbrush/server';

    throw new NotFoundError({ message: 'Todo not found' });
    throw new ForbiddenError({ message: 'Access denied' });
    throw new ConflictError({ message: 'Already completed' });

Все ошибки автоматически сериализуются в формат RFC 9457 Problem Details с Content-Type: application/problem+json. Ошибки валидации (некорректный body или query) также возвращаются в этом формате с деталями по каждому полю.


Автоматическая генерация OpenAPI

Отдельный пакет @cleverbrush/server-openapi генерирует спецификацию OpenAPI 3.1 непосредственно из зарегистрированных эндпоинтов — никаких аннотаций или декораторов не требуется. Схемы из @cleverbrush/schema конвертируются в JSON Schema автоматически.

    import { generateOpenApiSpec } from '@cleverbrush/server-openapi';

    const spec = generateOpenApiSpec({
        server,
        info: {
            title: 'Todo API',
            version: '1.0.0'
        },
        servers: [{ url: 'http://localhost:3000' }]
    });

    // Сервируем как обычный JSON-эндпоинт
    server.handle(
        endpoint.get('/openapi.json'),
        () => spec
    );

Типы ответов, параметры пути, query-параметры, тела запросов и ответов — всё попадает в спецификацию из тех же схем, что используются для валидации. Один источник правды.

Для WebSocket-подписок пакет @cleverbrush/server-openapi также умеет генерировать AsyncAPI 2.x-спецификацию через serveAsyncApi().


Клиент без кодогенерации

На стороне клиента тот же контракт превращается в типизированный HTTP-клиент через createClient(). Никакой кодогенерации — типы выводятся из контракта в момент компиляции через Proxy.

    import { createClient } from '@cleverbrush/client';
    import { api } from './contract.js';

    const client = createClient(api, {
        baseUrl: 'https://api.example.com',
        getToken: () => localStorage.getItem('token')
    });

    // Вызов — полностью типизирован
    const todos = await client.todos.list({ query: { page: 1 } });
    //    ^? TodoResponse[]

    const todo = await client.todos.get({ params: { id: 42 } });
    //    ^? TodoResponse

    const created = await client.todos.create({
        body: { title: 'Купить молоко' }
    });
    //    ^? TodoResponse (201)

Если изменить схему запроса или ответа в контракте — IDE немедленно покажет все места, где код клиента перестал соответствовать.

Клиент поддерживает middleware-цепочки для retry, timeout, дедупликации, кэширования и батчинга запросов:

    import { createClient } from '@cleverbrush/client';
    import { retry } from '@cleverbrush/client/retry';
    import { timeout } from '@cleverbrush/client/timeout';
    import { dedupe } from '@cleverbrush/client/dedupe';

    const client = createClient(api, {
        baseUrl: BASE_URL,
        getToken: () => loadToken(),
        middlewares: [
            retry({ limit: 2, retryOnTimeout: true }),
            timeout({ timeout: 10_000 }),
            dedupe()
        ]
    });


React и TanStack Query

Для React-приложений есть отдельный вход @cleverbrush/client/react. Там createClient возвращает «унифицированный» клиент, у которого каждый метод одновременно является и вызываемой функцией, и источником TanStack Query хуков.

    import { createClient } from '@cleverbrush/client/react';
    import { api } from './contract.js';

    export const client = createClient(api, {
        baseUrl: '/api',
        getToken: () => localStorage.getItem('token')
    });

В компоненте:

    function TodoList() {
        // useQuery — данные, загрузка, ошибки
        const { data: todos, isLoading } = client.todos.list.useQuery(
            { query: { page: 1 } }
        );

        // useMutation — с типизированным телом
        const create = client.todos.create.useMutation();

        const handleAdd = () => {
            create.mutate({ body: { title: 'Новая задача' } });
        };

        if (isLoading) return <p>Загрузка…</p>;
        return (
            <ul>
                {todos?.map(t => <li key={t.id}>{t.title}</li>)}
                <button onClick={handleAdd}>Добавить</button>
            </ul>
        );
    }

Также доступны .useSuspenseQuery() и .useInfiniteQuery() с теми же принципами вывода типов. query key для TanStack Query формируется автоматически на основе имени группы, эндпоинта и аргументов.


WebSocket подписки

Для real-time обновлений контракт поддерживает подписки через endpoint.subscription(). Сервер отправляет события клиентам, а при двунаправленной подписке клиент может отправлять сообщения обратно.

Объявление в контракте:

    live: {
        todoUpdates: endpoint
            .subscription('/ws/todos')
            .outgoing(object({
                action: string(),
                todoId: number(),
                title: string()
            })),

        chat: endpoint
            .subscription('/ws/chat')
            .incoming(object({ text: string() }))
            .outgoing(object({ user: string(), text: string(), ts: number() }))
    }

На клиенте — React-хук useSubscription из @cleverbrush/client/react:

    import { useSubscription } from '@cleverbrush/client/react';

    function LiveFeed() {
        const { events, state } = useSubscription(
            () => client.live.todoUpdates({ reconnect: { maxRetries: 10 } }),
            { maxEvents: 50 }
        );

        return (
            <div>
                <p>Статус: {state}</p>
                {events.map((e, i) => (
                    <div key={i}>{e.action}: #{e.todoId} — {e.title}</div>
                ))}
            </div>
        );
    }

Для двунаправленного канала (чат):

    function Chat() {
        const { events, state, send } = useSubscription(
            () => client.live.chat({ reconnect: { maxRetries: 5 } })
        );

        return (
            <div>
                {events.map((e, i) => (
                    <p key={i}><b>{e.user}:</b> {e.text}</p>
                ))}
                <button onClick={() => send({ text: 'Привет!' })}>
                    Отправить
                </button>
            </div>
        );
    }

Хук управляет жизненным циклом соединения автоматически: подключается при монтировании, отключается при размонтировании, поддерживает переподключение.


Итоги

Вся цепочка от схемы до браузера строится из одного источника правды:

    @cleverbrush/schema     →  валидация + вывод типов
    @cleverbrush/server/contract →  defineApi(), endpoint builder, route()
    @cleverbrush/server     →  сервер с DI, авторизацией, батчингом
    @cleverbrush/server-openapi  →  OpenAPI 3.1 без аннотаций
    @cleverbrush/client     →  типизированный HTTP-клиент
    @cleverbrush/client/react    →  TanStack Query хуки + WebSocket хук

Изменение схемы в контракте мгновенно расходится по всему коду: TypeScript покажет несоответствия на сервере, в клиенте и в компонентах — до запуска приложения.


Ссылки

GitHub: github.com/cleverbrush/framework

Документация и playground: docs.cleverbrush.com

npm:
    npm install @cleverbrush/server @cleverbrush/server-openapi
    npm install @cleverbrush/client

Буду рад любой обратной связи — по API, документации, пропущенным фичам. Issues и PR приветствуются.

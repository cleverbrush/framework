# Cleverbrush Framework на практике: как устроен xpenser

Финальная статья серии о Cleverbrush Framework. В предыдущих частях я
показывал отдельные слои фреймворка: схемы, HTTP-контракты, клиент,
логирование, OpenTelemetry, Knex-интеграцию и ORM. Теперь хочется
собрать всё в одну картину и показать не учебный todo-example, а
реальное приложение.

Этим приложением стал [xpenser](https://xpenser.cleverbrush.com) —
open-source personal finance tracker для учёта доходов и расходов. Его
можно использовать как обычное приложение, self-hosted сервис или как
референсный проект, в котором видно, как все части Cleverbrush Framework
сцепляются между собой.

Код открыт: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser).

Дисклеймер остаётся тем же: Cleverbrush Framework экспериментальный.
Несмотря на это, я стараюсь держать у пакетов и у xpenser хорошее
покрытие тестами, потому что именно такие приложения быстро показывают,
где фреймворк помогает, а где API ещё нужно упрощать.

## Что было в серии

В этой серии уже вышли статьи:

- [`@cleverbrush/schema`](https://habr.com/ru/articles/1023038/) —
  schema-first подход, PropertyDescriptors и типизированные селекторы.
- [`@cleverbrush/server` и `@cleverbrush/client`](https://habr.com/ru/articles/1030342/)
  — общий API-контракт для сервера и клиента.
- [`@cleverbrush/log` и `@cleverbrush/otel`](https://habr.com/ru/articles/1040714/)
  — структурированные логи, tracing и OpenTelemetry.
- [`@cleverbrush/knex-schema` и `@cleverbrush/orm`](https://habr.com/ru/articles/1046405/)
  — schema-driven слой поверх Knex и ORM в стиле `DbContext`.

Каждая статья рассматривала один слой. xpenser интересен тем, что все эти
слои используются одновременно:

```text
packages/contracts
    -> apps/api
    -> packages/client
    -> apps/web
    -> apps/telegram-bot
    -> apps/api/src/mcp
```

Один набор схем участвует в validation, OpenAPI, typed client, React
forms, auth metadata, database layer и MCP tools.

## Что такое xpenser

Это приложение для учета личных финансов, которое выросло из Telegram бота + Google Sheets workflow. В какой-то
момент стало очевидно, что таблица уже не справляется: хочется нормальные
категории, продавцов, историю транзакций, отчёты, мультивалютность,
API-доступ и автоматизацию.

Сейчас xpenser умеет:

- учитывать income, expenses, refunds и returns;
- показывать dashboards по дням, неделям, месяцам, кварталам и годам;
- хранить категории, продавцов, заметки, даты и валюты транзакций;
- конвертировать суммы в default currency через Frankfurter;
- делать transaction scans и vendor enrichment;
- отправлять weekly/monthly email summaries с OpenAI-generated insights;
- выдавать API keys;
- предоставлять typed Node client;
- работать как MCP server для AI agents;
- подключаться к Telegram bot;
- запускаться self-hosted.

![xpenser dashboard month view: income, expenses, net total and category detail]()

![xpenser transactions table with filters and transaction history]()

![xpenser preferences page with email reports, API keys and MCP settings]()

То есть это не showcase ради showcase. Это приложение, которым можно
пользоваться, расширять и разбирать как архитектурный пример.

## Архитектура в одном экране

Если сильно упростить, архитектура такая:

```text
packages/contracts
    schemas + API contract
        |
        v
apps/api
    endpoint metadata + handlers + auth + DI + OpenAPI + MCP
        |
        v
packages/client
    typed client + retry + timeout + cache tags + batching + tracing
        |
        v
apps/web / apps/telegram-bot / external API clients
```

Рядом с этим живёт database layer:

```text
apps/api/src/db/schemas.ts
    @cleverbrush/orm entities
        |
        v
apps/api/src/di/setup.ts
    one instrumented Knex pool
        |
        v
API handlers, application services, MCP tools
```

Идея не в том, чтобы весь проект был написан «магией фреймворка».
Наоборот, в xpenser много обычного TypeScript, Next.js, Knex, React и
Node.js. Cleverbrush закрывает границы, где особенно неприятна
рассинхронизация: схемы, контракты, handlers, clients, формы,
авторизация, наблюдаемость и database metadata.

## Контракты как источник правды

В xpenser публичный API описан в `packages/contracts`. Это отдельный
workspace package, который импортируют и API, и web app, и typed client.

Пример из `packages/contracts/src/schemas.ts`:

```ts
export const TimeZoneSchema = string()
    .required('timezone is required')
    .nonempty('timezone is required')
    .maxLength(FieldLimits.timeZone, 'timezone is too long')
    .addValidator(value => {
        if (value.length > FieldLimits.timeZone) {
            return { valid: true };
        }

        try {
            new Intl.DateTimeFormat('en-US', { timeZone: value });
            return { valid: true };
        } catch {
            return {
                valid: false,
                errors: [{ message: 'timezone must be a valid IANA time zone' }]
            };
        }
    })
    .describe(
        'IANA time zone identifier, for example UTC or America/New_York.'
    );
```

Это не просто TypeScript type alias. Схема умеет:

- валидировать runtime-значение;
- выводить TypeScript-тип;
- давать metadata для OpenAPI;
- участвовать в form binding;
- возвращать PropertyDescriptors для селекторов;
- сохранять имя схемы для `$ref` в OpenAPI.

Например, тело регистрации:

```ts
export const RegisterBodySchema = object({
    email: string()
        .required('email is required')
        .nonempty('email is required')
        .maxLength(FieldLimits.email, 'email is too long')
        .email('must be a valid email address')
        .describe('Email address used to sign in. Must be unique.'),
    password: string()
        .required('password is required')
        .nonempty('password is required')
        .minLength(8, 'password must be at least 8 characters')
        .maxLength(FieldLimits.password, 'password is too long')
        .describe('Password for local sign-in.'),
    confirmPassword: string()
        .required('password confirmation is required')
        .nonempty('password confirmation is required')
        .minLength(8, 'password confirmation must be at least 8 characters')
        .maxLength(FieldLimits.password, 'password confirmation is too long')
        .describe('Password confirmation entered during registration.'),
    defaultCurrency: CurrencyCodeSchema.describe(
        'Default currency used for dashboards and reports.'
    ),
    countryCode: CountryCodeSchema.describe(
        'Country used to localize vendor enrichment.'
    ),
    favoriteCurrencies: array(CurrencyCodeSchema)
        .default([])
        .describe(
            'Favorite currencies shown first when creating transactions.'
        ),
    timezone: TimeZoneSchema.default('UTC').describe(
        'Time zone used for transaction display and reporting periods.'
    )
})
    .addValidator(value => {
        if (value.password !== value.confirmPassword) {
            return {
                valid: false,
                errors: [
                    {
                        message: 'passwords do not match',
                        property: field => field.confirmPassword
                    }
                ]
            };
        }

        return { valid: true };
    })
    .schemaName('RegisterBody');
```

Обратите внимание на `property: field => field.confirmPassword`.
Это тот же подход с PropertyDescriptors, о котором я писал в первой
статье. Ошибка привязывается не к строке `'confirmPassword'`, а к
типизированному selector expression.

## API contract

Следующий слой — `packages/contracts/src/api.ts`. Здесь описывается
публичный HTTP API:

```ts
const ById = route({ id: number().coerce() })`/${t => t.id}`;

const categories = endpoint
    .resource('/api/categories')
    .authorize(PrincipalSchema);

const transactions = endpoint
    .resource('/api/transactions')
    .authorize(PrincipalSchema);

export const api = defineApi({
    auth: {
        register: endpoint
            .post('/api/auth/register')
            .body(RegisterBodySchema)
            .responses({
                201: EmailConfirmationPendingResponseSchema,
                400: ErrorResponseSchema
            }),
        me: endpoint
            .get('/api/auth/me')
            .authorize(PrincipalSchema)
            .cacheTag('user-profile')
            .responses({ 200: UserPreferenceSchema, 401: ErrorResponseSchema })
    },
    users: {
        updatePreferences: endpoint
            .put('/api/users/me/preferences')
            .authorize(PrincipalSchema)
            .body(UpdateUserPreferenceBodySchema)
            .clearsCacheTag('user-profile')
            .clearsCacheTag('dashboard')
            .clearsCacheTag('transactions')
            .clearsCacheTag('stats')
            .responses({
                200: UserPreferenceSchema,
                400: ErrorResponseSchema,
                401: ErrorResponseSchema
            })
    },
    categories: {
        list: categories
            .get()
            .query(CategoryListQuerySchema)
            .cacheTag('categories')
            .responses({
                200: array(CategorySchema),
                401: ErrorResponseSchema
            }),
        delete: categories
            .delete(ById)
            .clearsCacheTag('categories')
            .clearsCacheTag('transactions')
            .clearsCacheTag('dashboard')
            .responses({
                204: null,
                400: ErrorResponseSchema,
                401: ErrorResponseSchema,
                404: ErrorResponseSchema
            })
    }
});
```

В этом файле нет Express/Fastify/Next handlers. Это именно contract:

- method и path;
- route params;
- request body;
- query;
- response schemas;
- auth principal;
- cache tags.

Этот contract импортируется сервером и клиентом. Поэтому если я поменяю,
например, query schema для списка транзакций, TypeScript покажет ошибки в
местах, где client или handler ещё живёт по старому контракту.

## Сервер добавляет runtime context

В `apps/api/src/api/endpoints.ts` contract превращается в серверные
endpoint definitions. На этом уровне добавляются DI dependencies,
summary, description, tags и operationId:

```ts
export const UpdatePreferencesEndpoint = api.users.updatePreferences
    .authorize(PrincipalSchema)
    .inject({ db: DbToken })
    .summary('Update preferences')
    .description(
        'Updates the current user default currency, favorite currencies, and timezone.'
    )
    .tags('users')
    .operationId('updateUserPreferences');

export const CreateApiKeyEndpoint = api.users.createApiKey
    .authorize(PrincipalSchema)
    .inject({ db: DbToken })
    .summary('Create API key')
    .description(
        'Creates a user API key and returns its plaintext secret once.'
    )
    .tags('api-keys')
    .operationId('createApiKey');
```

Мне нравится это разделение:

- `packages/contracts` остаётся public package без знания о DI и
  конкретной инфраструктуре API;
- `apps/api` добавляет runtime-зависимости и документацию для OpenAPI;
- handler получает уже разобранные `body`, `query`, `route`, `principal`
  и injected services.

Пример handler-контракта получается таким:

```ts
export const listCategoriesHandler: Handler<
    typeof ListCategoriesEndpoint
> = async ({ principal, query }, { db }) => {
    const categories = await listUserCategories(
        db,
        principal.userId,
        query
    );
    return ActionResult.ok(categories);
};
```

Если endpoint требует `db`, handler должен принять `db`. Если endpoint
требует `PrincipalSchema`, handler получает `principal`. Если response
schema поменяется, handler тоже начнёт проверяться иначе.

## Server pipeline

Сам API собирается в `apps/api/src/server.ts`:

```ts
const server = createServer({
    maxBodySize: 20 * 1024 * 1024
})
    .use(tracingMiddleware({ excludePaths: ['/health'] }))
    .use(corsMiddleware(config))
    .use(correlationMiddleware)
    .use(requestLogMiddleware)
    .services(services => configureDI(services, config, logger, resources))
    .useAuthentication({
        defaultScheme: 'xpenser',
        schemes: [xpenserAuthScheme(config, resources.db)]
    })
    .useAuthorization()
    .withHealthcheck()
    .useBatching();
```

Порядок middleware здесь важен. Tracing открывает server span первым,
потом CORS, logging, DI и auth выполняются внутри этого span. Поэтому
логи, SQL spans и application spans можно связать с конкретным HTTP
request.

OpenAPI тоже регистрируется как обычный endpoint:

```ts
const openApi = createOpenApiEndpoint({
    server,
    info: {
        title: 'xpenser API',
        version: '0.1.0',
        description:
            'Schema-first income and expense tracking API built with Cleverbrush.'
    },
    securitySchemes: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT or xpenser API key'
        },
        apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
        }
    }
});

server.handle(openApi.endpoint, openApi.handler);
server.handle(McpEndpoint, mcpHandler);
server.handleAll(mapHandlers(endpoints, handlers));
```

В результате `/openapi.json` строится не из отдельного YAML-файла, а из
тех же endpoint definitions и schema metadata, по которым реально
работает API.

## DI и database layer

В предыдущей статье я подробно разбирал `@cleverbrush/knex-schema` и
`@cleverbrush/orm`. В xpenser database layer устроен так, чтобы raw Knex
и ORM использовали один и тот же connection pool:

```ts
export function createDbResources(config: Config, logger: Logger): DbResources {
    const connection = instrumentKnex(
        knex({
            client: 'pg',
            connection: config.db.connectionString,
            pool: { min: 2, max: 10 },
            acquireConnectionTimeout: 10_000
        }),
        { sanitizeStatement: () => '<redacted>' }
    );
    logger.debug('Configured application database connection pool', {});
    return {
        knex: connection,
        db: createDb(connection, entityMap)
    };
}
```

И дальше оба ресурса регистрируются в Cleverbrush DI:

```ts
export function configureDI(
    services: ServiceCollection,
    config: Config,
    logger: Logger,
    resources?: DbResources
): void {
    const dbResources = resources ?? createDbResources(config, logger);
    services.addSingleton(ConfigToken, config);
    services.addSingleton(LoggerToken, logger);
    services.addSingletonInstance(KnexToken, dbResources.knex);
    services.addSingletonInstance(DbToken, dbResources.db);
}
```

Это даёт важный практический эффект: приложение не выбирает между ORM и
SQL. Большая часть CRUD живёт на `DbSet`, а сложные запросы могут идти
через обычный Knex. При этом OpenTelemetry видит и то, и другое, потому
что инструментирован один нижний Knex instance.

## Typed client

Клиентский package `packages/client` строится из того же `api` contract:

```ts
export function createXpenserClient(options: XpenserClientOptions) {
    const batchingMiddleware = hasBasePath(options.baseUrl)
        ? []
        : [batching({ maxSize: 10, windowMs: 10 })];

    return createClient(api, {
        baseUrl: options.baseUrl,
        getToken: options.getToken,
        headers: options.headers,
        onUnauthorized: options.onUnauthorized,
        fetch: options.fetch,
        middlewares: [
            clientTracingMiddleware(),
            retry({
                limit: 2,
                retryOnTimeout: options.retryOnTimeout ?? true
            }),
            timeout({ timeout: options.timeoutMs ?? 10_000 }),
            dedupe(),
            cacheTags({
                defaultTtl: 5_000,
                ttlByTag: {
                    currencies: 24 * 60 * 60 * 1_000,
                    dashboard: 60_000,
                    vendors: 30_000,
                    transactions: 30_000,
                    categories: 30_000,
                    'user-profile': 30_000
                }
            }),
            ...batchingMiddleware
        ]
    });
}
```

Здесь интересно, что middleware клиента знают о metadata endpoint'ов:

- `clientTracingMiddleware()` прокидывает OTel context;
- `retry()` и `timeout()` закрывают transient failures;
- `dedupe()` склеивает одинаковые запросы;
- `cacheTags()` использует `.cacheTag()` и `.clearsCacheTag()` из
  contract;
- `batching()` отправляет несколько calls в batch endpoint сервера.

В web app этот client создаётся рядом с auth session:

```ts
export async function getApiClient(options: ApiClientOptions = {}) {
    const session = await getSessionOrRedirect();
    return createXpenserClient({
        baseUrl: webConfig.apiBaseUrl,
        getToken: () => session.apiToken,
        onUnauthorized: () => {
            redirect(expiredSessionPath);
        },
        retryOnTimeout: options.retryOnTimeout,
        timeoutMs: options.timeoutMs
    });
}
```

Компонентам и Server Actions не нужно руками собирать URL или помнить,
какой shape у response. Они вызывают методы typed client, а contract
остаётся единственным источником правды.

## Формы из схем

Ещё один слой, где schema-first подход хорошо окупается, — формы. В
xpenser есть package `packages/ui`, где зарегистрированы renderers для
`@cleverbrush/react-form`:

```ts
const renderers = {
    string: textRenderer,
    'string:email': (props: FieldRenderProps) =>
        textRenderer({
            ...props,
            fieldProps: { ...props.fieldProps, type: 'email' }
        }),
    'string:password': (props: FieldRenderProps) =>
        textRenderer({
            ...props,
            fieldProps: { ...props.fieldProps, type: 'password' }
        }),
    'string:textarea': textareaRenderer,
    'string:checkbox': checkboxRenderer,
    'string:select': selectRenderer,
    number: numberRenderer,
    'number:select': numberSelectRenderer,
    'boolean:checkbox': checkboxRenderer,
    date: dateTimeRenderer,
    'date:datetime-local': dateTimeRenderer
};

export function XpenserFormProvider({
    children
}: {
    readonly children: React.ReactNode;
}) {
    return (
        <FormSystemProvider renderers={renderers}>
            {children}
        </FormSystemProvider>
    );
}
```

Форма preferences использует ту же `UpdateUserPreferenceBodySchema`,
которая описывает API request body:

```tsx
const form = useSchemaForm(UpdateUserPreferenceBodySchema);
```

А поля привязываются через selectors:

```tsx
<SchemaField
    fieldProps={
        {
            options: sortedCurrencies.map(currency => ({
                label: <CurrencyOption currency={currency} />,
                value: currency.code
            })),
            value: selectedDefaultCurrency
        } satisfies SelectRendererFieldProps
    }
    forProperty={field => field.defaultCurrency}
    form={form}
    label="Default currency"
    variant="select"
/>

<SchemaField
    fieldProps={
        {
            checked: selectedWeeklyEmailReportEnabled,
            description:
                'Sent Monday morning for the previous week.'
        } satisfies CheckboxRendererFieldProps
    }
    forProperty={field => field.weeklyEmailReportEnabled}
    form={form}
    label="Weekly report"
    variant="checkbox"
/>
```

Если поле в схеме переименовать, `field => field.defaultCurrency`
перестанет компилироваться. Это ровно тот же принцип, что и в API routes
или ORM queries: selector вместо строки.

При этом UI не становится «автоматически сгенерированным». Компонент всё
ещё управляет layout, options, local state, loading state и текстами.
Схема отвечает за binding, validation и field metadata.

## Auth и security boundaries

xpenser поддерживает несколько способов доступа:

- email/password;
- Google sign-in;
- web session token;
- durable API keys;
- MCP OAuth;
- Telegram link token.

С точки зрения Cleverbrush endpoint может потребовать principal:

```ts
const apiKeys = endpoint
    .resource('/api/users/me/api-keys')
    .authorize(PrincipalSchema);
```

После этого server-side `.useAuthentication()` и `.useAuthorization()`
становятся общей границей. Handler не парсит заголовки руками. Он
получает `principal`, если request уже прошёл authentication и
authorization.

Для внешних интеграций это особенно важно. API key и MCP OAuth token
должны дать тот же user-scoped доступ, что и web session, но при этом
иметь понятные ограничения, audit trail и отдельные механизмы revoke.

## MCP: тот же домен, новый интерфейс

Отдельная часть xpenser — MCP endpoint для AI agents. Он живёт рядом с
обычным API, но использует тот же database layer, auth и domain services.

Endpoint выглядит так:

```ts
export const McpEndpoint = endpoint
    .post('/api/mcp')
    .inject({
        config: ConfigToken,
        db: DbToken,
        knex: KnexToken,
        logger: LoggerToken
    })
    .summary('MCP server')
    .description('xpenser MCP server for AI agents.')
    .tags('mcp')
    .operationId('xpenserMcp');
```

Handler сначала аутентифицирует MCP principal:

```ts
const principal = await authenticateMcpPrincipal({
    config,
    db,
    headers: context.headers
});

if (!principal) {
    context.response.setHeader(
        'WWW-Authenticate',
        `Bearer resource_metadata="${new URL(
            '/.well-known/oauth-protected-resource/external-api/mcp',
            config.app.url
        ).toString()}"`
    );
    return ActionResult.unauthorized({
        message: 'MCP access requires a xpenser API key or MCP OAuth token.'
    });
}
```

А сами tools описываются через схемы и затем переводятся в JSON Schema:

```ts
import { toJsonSchema } from '@cleverbrush/schema-json';

type XpenserMcpTool = {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly inputSchema: AnyObjectSchema;
    readonly annotations: ToolAnnotations;
    readonly handler: (
        input: Record<string, unknown>
    ) => Promise<CallToolResult>;
};
```

В результате агент может работать с теми же сущностями, что и web app:
categories, vendors, transactions, dashboard, stats. Но доступ идёт через
явные tools с annotations:

- read-only tools для просмотра;
- additive tools для создания;
- destructive tools для удаления;
- open-world hints там, где tool может обратиться к внешним данным,
  например vendor enrichment.

Это важная часть showcase. Cleverbrush schema оказывается полезной не
только для HTTP API, но и для agent-facing интерфейса.

## Telegram bot

Telegram bot в xpenser — ещё один клиент того же API. Он не имеет своего
отдельного доменного слоя. Он импортирует `@xpenser/client` и
`@xpenser/contracts`, а значит использует те же request/response types.

Это помогает держать несколько интерфейсов приложения синхронными:

```text
web app
telegram bot
typed external client
MCP tools
    |
    v
same API contract
    |
    v
same handlers and application services
```

Практический эффект простой: можно добавить новую проверку в schema,
поменять response shape или расширить transaction flow, и TypeScript
покажет, какие поверхности нужно обновить.

## OpenAI и фоновые сценарии

xpenser использует OpenAI в двух местах:

- transaction scans;
- weekly/monthly email reports.

Важно, что эти сценарии не вынесены в отдельный «AI-контур», который
живёт параллельно приложению. Они работают поверх тех же пользователей,
категорий, продавцов, транзакций, настроек и logs/traces.

Например, email report должен:

- выбрать пользователя и его preferences;
- посчитать период;
- получить transactions и category stats;
- сформировать payload для OpenAI;
- провалидировать structured response;
- отправить email;
- записать результат и ошибки в logs/traces.

Это хороший тест для фреймворка: если DI, schema validation, database
layer, logging и tracing неудобно использовать вместе, фоновые workflows
сразу начинают выглядеть как отдельный mini-framework. В xpenser они
остаются обычным application code.

## Tests as architecture guardrails

В xpenser тесты не только проверяют функции. Они защищают архитектурные
договорённости:

- contract authorization tests проверяют, что защищённые endpoints не
  потеряли `.authorize(PrincipalSchema)`;
- endpoint drift tests проверяют, что contract tree, server endpoint tree
  и handler tree не разъехались;
- OpenAPI tests проверяют generated spec;
- client middleware tests проверяют retry, timeout, dedupe, cache tags и
  batching;
- form provider tests проверяют, что schema fields рендерятся нужными UI
  controls;
- config guard tests не дают запуститься с placeholder secrets;
- application tests покрывают транзакции, категории, vendors, reports,
  scans и edge cases.

Это важная часть подхода. Если весь стек держится на одном contract,
нужно тестировать не только отдельные функции, но и сам факт, что разные
деревья приложения остаются одинаковой формы.

## Что получилось хорошо

Главное, что мне понравилось в xpenser как проверке фреймворка: схемы
действительно стали общим языком приложения.

Одна и та же идея повторяется в разных слоях:

```ts
field => field.confirmPassword
field => field.defaultCurrency
route => route.id
transaction => transaction.userId
transaction => transaction.category
```

В первом случае selector указывает на поле validation error. Во втором —
на поле формы. В третьем — на route parameter. В четвёртом — на колонку
таблицы. В пятом — на relation для eager loading.

Это не один и тот же runtime-механизм во всех деталях, но это один и тот
же стиль API: меньше строковых путей, больше выражений, которые видит
TypeScript.

Второе удачное решение — не пытаться спрятать обычные инструменты.
Knex остаётся Knex. Next.js остаётся Next.js. React forms остаются React
forms. OpenTelemetry остаётся OpenTelemetry. Cleverbrush добавляет
typed glue между слоями, но не требует переписать приложение в
нестандартную модель мира.

## Что ещё шероховато

Фреймворк экспериментальный, и xpenser хорошо показывает не только
сильные стороны, но и места, где API ещё можно улучшать.

Например:

- часть endpoint metadata пока довольно многословна;
- формы всё ещё требуют ручной настройки renderers и field props;
- MCP layer молодой и будет меняться вместе с практикой agent tooling;
- миграции в реальном приложении пока handwritten Knex migrations, хотя
  в `@cleverbrush/knex-schema` уже есть snapshot-based генерация;
- документации нужно больше, чем может дать серия статей.

Но именно поэтому мне нужен был xpenser. На маленьком примере легко
сделать красивый API. На приложении с auth, reports, Telegram, MCP,
OpenAI, email, PostgreSQL, observability и web UI компромиссы становятся
видны быстрее.

## Как читать код

Если хотите посмотреть xpenser как reference app, я бы шёл в таком
порядке:

1. `packages/contracts/src/schemas.ts` — доменные схемы и named schemas.
2. `packages/contracts/src/api.ts` — public API contract.
3. `apps/api/src/api/endpoints.ts` — server metadata, DI, OpenAPI tags.
4. `apps/api/src/api/handlers` — handlers, которые используют typed
   endpoint definitions.
5. `apps/api/src/server.ts` — middleware pipeline, auth, OpenAPI, MCP,
   batching.
6. `apps/api/src/db/schemas.ts` — ORM entities and relations.
7. `packages/client/src/index.ts` — typed client middleware stack.
8. `apps/web/components/forms` и `packages/ui/src/forms` — schema-driven
   forms.
9. `apps/api/src/mcp` и `apps/telegram-bot` — альтернативные интерфейсы
   к тому же домену.
10. `docs/cleverbrush-reference.md` — короткая карта проекта для тех, кто
    изучает именно Cleverbrush patterns.

## Итоги

xpenser показывает Cleverbrush Framework в том виде, в котором мне самому
хотелось его проверить:

- не только validation, а schema-first stack;
- не только server, а общий contract для server и client;
- не только OpenAPI, а spec из реальных endpoint definitions;
- не только logging, а logs/traces/SQL spans в одном request context;
- не только ORM, а database layer поверх Knex с escape hatch;
- не только web UI, а web app, API, typed client, Telegram bot и MCP;
- не только демо, а приложение, которым можно пользоваться.

Я не считаю Cleverbrush заменой всем существующим TypeScript frameworks.
Скорее это попытка собрать привычные идеи из .NET/Entity Framework,
schema validation, typed HTTP clients и OpenTelemetry в один TypeScript
стек, где схема является не вспомогательным валидатором, а центральным
описанием границ приложения.

xpenser — финальная точка этой серии и одновременно начало более
практичной проверки фреймворка. Если вам интересно посмотреть на
schema-first приложение целиком, попробовать self-hosted finance tracker
или покритиковать API фреймворка, код открыт.

## Ссылки

xpenser app: [xpenser.cleverbrush.com](https://xpenser.cleverbrush.com)

xpenser GitHub: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser)

Cleverbrush Framework: [github.com/cleverbrush/framework](https://github.com/cleverbrush/framework)

Документация: [docs.cleverbrush.com](https://docs.cleverbrush.com)

Schema docs/playground: [schema.cleverbrush.com](https://schema.cleverbrush.com)

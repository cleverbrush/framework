# Структурированное логирование и трейсинг в Node.js: `@cleverbrush/log` и `@cleverbrush/otel`

Статья о том, как получить наблюдаемость (observability) в  приложении с минимальным кодом, а бонусом получить структурированные логи с типизированными шаблонами, автоматическую корреляцию со спанами OpenTelemetry, всё это с помощью набора библиотек, которые я называю CleverBrush Framework.

Все примеры ниже взяты из [xpenser](https://xpenser.cleverbrush.com) — open-source приложения для учёта личных доходов и расходов. С одной стороны, это демонстратор возможностей Cleverbrush Framework, который я сделал для проверки на практике всей машинерии, которая есть в фреймворке, такой как: контракты, сервер, клиент, auth, логирование и OpenTelemetry. С другой стороны, это полезное приложение, которым я сам пользуюсь каждый день для контроля финансов. Исходный код открыт на GitHub: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser).

Дисклеймер: все описываемые библиотеки носят экспериментальный характер. Несмотря на это, покрытие тестами у них достаточно хорошее.

## Предыстория

В предыдущих статьях ([первая](https://habr.com/ru/articles/1027922/) и [вторая](https://habr.com/ru/articles/1030342/)) я рассказывал о `@cleverbrush/schema` и о том, как на её основе построены `@cleverbrush/server` и `@cleverbrush/client`. Сегодня речь пойдёт об ещё двух элементах того же монорепозитория: `@cleverbrush/log` — библиотека структурированного логирования, и `@cleverbrush/otel` — тонкая обёртка над OpenTelemetry SDK.

Оба пакета изначально проектировались как дополнение к серверу, но могут использоваться независимо — в любом Node.js-приложении. В xpenser они используются сразу в нескольких процессах: API, Next.js web app и Telegram bot.

## `@cleverbrush/log`: структурированное логирование

Идея библиотеки пришла из экосистемы .NET: там есть Serilog с его message templates. Идея заключается в том чтобы вместо форматирования строки в момент записи вы описываете шаблон с именованными плейсхолдерами, а все значения хранятся отдельно как структурированные свойства. Это позволяет запрашивать логи в базе данных по конкретным значениям — например, найти все события по `TransactionId` или `UserId`.

Например, событие создания транзакции в xpenser удобно описать
типизированным строковым шаблоном:

```ts
import { number, object, parseString } from '@cleverbrush/schema';

const TransactionCreated = parseString(
    object({ TransactionId: number(), UserId: number() }),
    $t =>
        $t`Transaction ${t => t.TransactionId} created by ${t => t.UserId}`
);

logger.info(TransactionCreated, {
    TransactionId: transaction.id,
    UserId: principal.userId
});
```

Свойства `{TransactionId}` и `{UserId}` сохраняются отдельно от текста
сообщения, а сам шаблон остаётся стабильным:
`Transaction {TransactionId} created by {UserId}`. В SigNoz, Clickstack
или любой другой системе, поддерживающей CLEF-формат, эти
поля можно фильтровать и агрегировать как нормальные колонки.

Доступные уровни: trace, debug, info, warn, error, fatal. Методы `logger.error()` принимают опциональный объект `Error` первым аргументом. Например, обработчик MCP transport в xpenser пишет ошибку вместе с идентификатором пользователя:

```ts
transport.onerror = error => {
    logger.error(error, McpTransportError, {
        UserId: apiKeyPrincipal.userId
    });
};
```

![Структурированные логи в SigNoz: свойства TransactionId, UserId доступны как отдельные колонки]()

### Sinks: куда писать логи

Sink — это приёмник лог-событий. Можно подключить несколько одновременно. В xpenser API один и тот же logger пишет в консоль и в OpenTelemetry Logs:

```ts
import {
    consoleSink,
    createLogger,
    hostnameEnricher,
    processIdEnricher
} from '@cleverbrush/log';
import { otelLogSink, traceEnricher } from '@cleverbrush/otel';

const logger = createLogger({
    minimumLevel: config.logLevel,
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [hostnameEnricher(), processIdEnricher(), traceEnricher()],
    handleProcessExit: true
});
```

`consoleSink` выводит события в stdout/stderr с цветовым выделением уровней. `otelLogSink()` отправляет те же события как OTel Log Records в OTLP-коллектор. В результате логи, трейсы и метрики попадают в одну observability-инфраструктуру и могут быть связаны между собой.

Для локального файла или батчинга можно использовать `fileSink` и `BatchingSink`, но в xpenser основной продакшен-сценарий — console + OTLP, потому что приложение запускается в контейнерах.

### Enrichers: автоматически добавляемые свойства

Enricher — функция, которая добавляет одинаковые свойства ко всем лог-событиям. Вместо того чтобы в каждом вызове `logger.info(...)` передавать PID, имя хоста или trace id, их добавляет enricher.

В API xpenser подключены hostname, process id и trace/span correlation:

```ts
const logger = createLogger({
    minimumLevel: config.logLevel,
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [hostnameEnricher(), processIdEnricher(), traceEnricher()]
});
```

`traceEnricher()` работает совместно с активным OpenTelemetry-контекстом: если лог записан внутри HTTP-запроса, клиентского запроса или пользовательского спана, событие получает `TraceId` и `SpanId`.

Для HTTP correlation id используется `useLogging()` из `@cleverbrush/log`. В xpenser API middleware подключается к `@cleverbrush/server` так:

```ts
const [correlationMiddleware, requestLogMiddleware] = useLogging(logger, {
    excludePaths: ['/health'],
    correlationResponseHeader: false
});
```

CorrelationId полезен в распределённых системах, где один пользовательский запрос проходит через несколько сервисов. Один и тот же идентификатор, переданный через HTTP-заголовок, позволяет собрать все логи этого запроса — от web app до API и базы данных — по одному полю.

### Контекстные логгеры

Метод `forContext()` создаёт дочерний логгер с дополнительными свойствами, не меняя оригинал. В Next.js части xpenser есть helper `loggerFor()`:

```ts
export function loggerFor(sourceContext: string): Logger {
    return logger.forContext('SourceContext', sourceContext);
}
```

Auth.js использует его, чтобы отделить auth-события от остальных логов:

```ts
const authLogger = loggerFor('Auth.js');

authLogger.error(error, AuthErrorLogged, {
    AuthErrorType: authErrorType(error),
    AuthErrorMessage: error.message
});
```

Все события такого логгера будут содержать `SourceContext: 'Auth.js'`. Это удобно для фильтрации логов по компонентам приложения: API handlers, Auth.js, MCP server, Telegram bot.

### Типизированные шаблоны через `@cleverbrush/schema`

Одна из самых интересных особенностей: message templates можно сделать типизированными, используя `parseString()` из `@cleverbrush/schema`. Это даёт полную проверку типов в момент вызова `logger.info()`.

В xpenser структурированные события вынесены в небольшие модули с log templates
и типизированы той же схемной системой, на которой построены API-контракты:

```ts
import { number, object, parseString } from '@cleverbrush/schema';

const TransactionCreated = parseString(
    object({ TransactionId: number(), UserId: number() }),
    $t =>
        $t`Transaction ${t => t.TransactionId} created by ${t => t.UserId}`
);

logger.info(TransactionCreated, {
    TransactionId: transaction.id,
    UserId: principal.userId
});
```

Если пропустить поле или передать неправильный тип, TypeScript покажет ошибку ещё до запуска приложения. Такой подход особенно удобен для событий, которые потом используются в алертах, дашбордах или поиске инцидентов.

### Интеграция с `@cleverbrush/server`

Для подключения логирования к серверу достаточно одной функции. В xpenser API это выглядит так:

```ts
import type { Logger } from '@cleverbrush/log';
import { useLogging } from '@cleverbrush/log';
import { tracingMiddleware } from '@cleverbrush/otel';
import { createServer } from '@cleverbrush/server';

export function buildServer(
    config: Config,
    logger: Logger,
    resources: DbResources
) {
    const [correlationMiddleware, requestLogMiddleware] = useLogging(logger, {
        excludePaths: ['/health'],
        correlationResponseHeader: false
    });

    return createServer({ maxBodySize: 1024 * 1024 })
        .use(tracingMiddleware({ excludePaths: ['/health'] }))
        .use(corsMiddleware(config))
        .use(correlationMiddleware)
        .use(requestLogMiddleware)
        .services(services => configureDI(services, config, logger, resources));
}
```

`useLogging()` возвращает два middleware: первый устанавливает correlation context для запроса, второй логирует завершение каждого HTTP-запроса с методом, путём, статус-кодом и временем выполнения.

Запись в лог внутри handler — через инъекцию логгера:

```ts
export const createTransactionHandler: Handler<
    typeof CreateTransactionEndpoint
> = async ({ body, principal }, { db, config, logger }) => {
    const transaction = await createTransaction(
        db,
        config,
        principal.userId,
        body
    );
    logger.info(TransactionCreated, {
        TransactionId: transaction.id,
        UserId: principal.userId
    });
    return ActionResult.created(
        transaction,
        `/api/transactions/${transaction.id}`
    );
};
```

## `@cleverbrush/otel`: OpenTelemetry без бойлерплейта

Пакет `@cleverbrush/otel` решает две задачи: запустить OpenTelemetry SDK одной функцией и предоставить удобные интеграции для серверного и клиентского кода Cleverbrush.

### Инициализация SDK

`setupOtel()` запускает NodeSDK с OTLP/HTTP-экспортёрами для трейсов, метрик и логов. В xpenser API это вынесено в `telemetry.ts`:

```ts
import { setupOtel } from '@cleverbrush/otel';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

const endpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otel-collector:4318';

export const otel = setupOtel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'xpenser-api',
    serviceVersion: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    otlpEndpoint: endpoint,
    instrumentations: [
        new HttpInstrumentation({
            ignoreIncomingRequestHook: request => isHealthPath(request.url)
        }),
        new UndiciInstrumentation(),
        new RuntimeNodeInstrumentation()
    ]
});
```

Этот модуль должен быть импортирован до кода, который нужно автоинструментировать. В xpenser API entrypoint импортирует `otel` из `./telemetry.js`, а при shutdown корректно вызывает `otel.shutdown()`.

В Next.js приложении xpenser используется похожая схема, но с другим именем сервиса:

```ts
export const otel =
    existingOtel ??
    setupOtel({
        serviceName: process.env.WEB_OTEL_SERVICE_NAME ?? 'xpenser-web',
        serviceVersion: process.env.npm_package_version,
        environment: process.env.NODE_ENV,
        otlpEndpoint: endpoint
    });
```

В итоге в SigNoz видно два сервиса: `xpenser-web` и `xpenser-api`.

### Пользовательские спаны

Автоматическое инструментирование покрывает HTTP и SQL вызовы, но бизнес-логика иногда требует своих спанов. В xpenser такой пример есть в Telegram bot: входящие Telegram updates не являются обычными HTTP-запросами приложения, поэтому для них создаётся consumer span вручную.

```ts
const tracer = trace.getTracer('xpenser.telegram-bot');

export async function traceTelegramUpdate<T>(
    info: TelegramUpdateSpanInfo,
    handler: () => Promise<T>
): Promise<T> {
    return tracer.startActiveSpan(
        telegramSpanName(info),
        {
            kind: SpanKind.CONSUMER,
            attributes: telegramSpanAttributes(info)
        },
        async span => {
            try {
                const result = await handler();
                span.setAttribute('telegram.update.success', true);
                span.setStatus({ code: SpanStatusCode.OK });
                return result;
            } catch (err) {
                span.setAttribute('telegram.update.success', false);
                span.recordException(
                    err instanceof Error ? err : errorMessage(err)
                );
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: errorMessage(err)
                });
                throw err;
            } finally {
                span.end();
            }
        }
    );
}
```

Такой span получает атрибуты вроде `messaging.system`, `telegram.update.type`, `telegram.command` или `telegram.callback.action`. Если команда падает, исключение попадает в trace, а статус спана становится `ERROR`.

### Трейсинг HTTP-запросов

`tracingMiddleware()` из `@cleverbrush/otel` автоматически создаёт спан для каждого HTTP-запроса к `@cleverbrush/server`. Спан получает стандартные OTel HTTP-атрибуты: метод, путь, статус-код, user-agent.

В xpenser middleware стоит первым в серверной цепочке:

```ts
const server = createServer({ maxBodySize: 1024 * 1024 })
    .use(tracingMiddleware({ excludePaths: ['/health'] }))
    .use(corsMiddleware(config))
    .use(correlationMiddleware)
    .use(requestLogMiddleware);
```

Важно, что CORS разрешает propagation-заголовки:

```ts
ctx.response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-API-Key, Mcp-Protocol-Version, Mcp-Session-Id, traceparent, tracestate, baggage'
);
```

Благодаря `traceparent`, `tracestate` и `baggage` trace context может пройти от web app к API.

### Трейсинг клиентских запросов

xpenser использует `@cleverbrush/client`, сгенерированный из общего API-контракта. Чтобы запросы клиента попадали в тот же distributed trace, в клиентскую цепочку добавлен `clientTracingMiddleware()`:

```ts
import { createClient } from '@cleverbrush/client';
import { clientTracingMiddleware } from '@cleverbrush/otel/client';
import { api } from '@xpenser/contracts';

export function createXpenserClient(options: XpenserClientOptions) {
    return createClient(api, {
        baseUrl: options.baseUrl,
        getToken: options.getToken,
        headers: options.headers,
        onUnauthorized: options.onUnauthorized,
        fetch: options.fetch,
        middlewares: [
            clientTracingMiddleware(),
            retry({ limit: 2, retryOnTimeout: true }),
            timeout({ timeout: 10_000 }),
            dedupe(),
            cacheTags({
                defaultTtl: 5_000,
                ttlByTag: {
                    currencies: 24 * 60 * 60 * 1_000,
                    dashboard: 60_000,
                    transactions: 30_000,
                    categories: 30_000,
                    'user-profile': 30_000
                }
            })
        ]
    });
}
```

Если пользователь открывает dashboard, Next.js server code вызывает API через typed client, а SigNoz показывает связку `xpenser-web -> xpenser-api -> PostgreSQL` в одном trace.

### Трейсинг SQL-запросов

`instrumentKnex()` оборачивает Knex-инстанс так, что каждый SQL-запрос становится дочерним спаном (CLIENT span) в текущем активном трейсе.

В xpenser база создаётся через `@cleverbrush/orm` (речь о ней пойдёт в следующей статье), а Knex соединение предварительно инструментируется:

```ts
import { createDb } from '@cleverbrush/orm';
import { instrumentKnex } from '@cleverbrush/otel';
import knex from 'knex';

export function createDbResources(config: Config, logger: Logger): DbResources {
    const connection = instrumentKnex(
        knex({
            client: 'pg',
            connection: config.db.connectionString,
            pool: { min: 2, max: 10 },
            acquireConnectionTimeout: 10_000
        })
    );
    logger.debug('Configured application database connection pool', {});
    return {
        knex: connection,
        db: createDb(connection, entityMap)
    };
}
```

После этого в trace-просмотрщике каждый SQL-запрос виден как отдельный span с текстом запроса и длительностью.

![Трейс запроса dashboard в SigNoz: web span, API span и дочерние SQL spans]()

### Связь логов и трейсов

Самая полезная комбинация: `traceEnricher()` добавляет `TraceId` и `SpanId` активного спана к каждому лог-событию, а `otelLogSink()` отправляет эти события в тот же OTLP-коллектор.

В API и web app xpenser это выглядит одинаково:

```ts
const logger = createLogger({
    minimumLevel: config.logLevel,
    sinks: [consoleSink({ theme: 'dark' }), otelLogSink()],
    enrichers: [hostnameEnricher(), processIdEnricher(), traceEnricher()]
});
```

Теперь лог внутри HTTP handler:

```ts
logger.info(McpToolCalled, {
    ToolName: toolName,
    UserId: context.principal.userId,
    ApiKeyId: context.principal.apiKeyId
});
```

оказывается связан с trace, в котором этот MCP-запрос обрабатывался. В observability-бэкенде можно начать с ошибки в логах, перейти к trace и увидеть HTTP middleware, handler, обращения к базе и исходящие запросы.

## Полная картина: как всё складывается вместе

В xpenser наблюдаемость складывается из нескольких небольших частей:

- `setupOtel()` запускается в `xpenser-web`, `xpenser-api` и `xpenser-telegram-bot`
- `otelLogSink()` отправляет структурированные логи как OTel Log Records
- `traceEnricher()` добавляет `TraceId` и `SpanId` в каждое лог-событие
- `tracingMiddleware()` создаёт server span для каждого API-запроса
- `clientTracingMiddleware()` связывает web requests с API calls
- `instrumentKnex()` превращает SQL-запросы в дочерние spans
- Telegram bot создаёт custom spans для команд, сообщений и callback queries

### Куда же без LLM?

Я выбрал SigNoz в качестве observability-бэкенда, в том числе и потому что он имеет встроенный MCP сервер. Это позволяет AI агенту, который работает над задачей делать следующее:
- после push в GitHub, разворачиватся ephemeral среда, в которой сервисы будут иметь имена типа `xpenser-api-pr-123`, `xpenser-web-pr-123`
- LLM агент тестирует новый код с помощью Playwright или интеграционных тестов, которы дергают API и web UI
- MCP endpoint в SigNoz анализирует трейсы и логи на предмет ошибок, медленных запросов или других аномалий, которые могли появиться из-за изменений в коде. Если что-то пошло не так.

Локально всё это можно поднять через Docker Compose в репозитории xpenser:

```bash
docker compose up --build
```

Этот стек запускает web app, API, PostgreSQL, Swagger UI и observability-сервисы из `docker-compose.yml`. Запросы, которые начинаются в web app и идут в API, появляются в SigNoz как один distributed trace со spans от обоих сервисов. В продакшене otel-collector и SigNoz у вас скорее всего будут отдельными сервисами, но локально для удобства они живут в одном docker-compose файле, для удобства развертывания всего стека одной командой.

Локальные URL:

- Web app: `http://localhost:3000`
- External API proxy: `http://localhost:3000/external-api`
- Swagger UI: `http://localhost:8090`
- SigNoz: `http://localhost:8080`

Продакшен-версия доступна здесь: [xpenser.cleverbrush.com](https://xpenser.cleverbrush.com). Код — здесь: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser).

![Общий вид xpenser в SigNoz: дашборд трейсов, логов и метрик]()

## Итоги

`@cleverbrush/log` и `@cleverbrush/otel` — не самостоятельные революционные продукты, а продуманный клей между серверным фреймворком и observability-инфраструктурой. Их главная ценность — в интеграции:

- структурированные message templates превращают важные значения в поля для поиска и агрегации
- `traceEnricher()` связывает каждое лог-событие с активным OTel-трейсом
- `otelLogSink()` отправляет логи в тот же OTLP pipeline, что трейсы и метрики
- `clientTracingMiddleware()` сохраняет distributed trace между web app и API
- `instrumentKnex()` даёт SQL-spans без изменений в query-коде
- `useLogging()` подключает request logging к серверу двумя middleware

xpenser показывает эту связку на рабочем приложении, а не на искусственном примере: пользовательский web UI, typed API client, schema-first server, Postgres, MCP endpoint, Telegram bot и self-hosted observability живут в одном репозитории.

В следующей статье — как превратить TypeScript-схему в единый источник истины для работы с базой данных: `@cleverbrush/knex-schema` и `@cleverbrush/orm`. Schema-driven ORM с типизированным query builder, авто-DDL и unit-of-work.

## Ссылки

Cleverbrush Framework: [github.com/cleverbrush/framework](https://github.com/cleverbrush/framework)

xpenser app: [xpenser.cleverbrush.com](https://xpenser.cleverbrush.com)

xpenser GitHub: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser)

Документация и playground: [docs.cleverbrush.com](https://docs.cleverbrush.com)

### npm

```bash
npm install @cleverbrush/log
npm install @cleverbrush/otel
```

Буду рад любой обратной связи — по API, документации, пропущенным фичам. Issues и PR приветствуются.

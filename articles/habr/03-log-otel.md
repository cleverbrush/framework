# Структурированное логирование и трейсинг в Node.js: @cleverbrush/log и @cleverbrush/otel


Статья о том, как получить наблюдаемость приложения (observability) с минимальным кодом: структурированные логи с типизированными шаблонами, автоматическая корреляция со спанами OpenTelemetry и интеграция с @cleverbrush/server.

Дисклеймер: все описываемые библиотеки носят экспериментальный характер — они созданы в рамках эксперимента. Несмотря на это, покрытие тестами у них достаточно хорошее.


Предыстория

В предыдущих статьях я рассказывал о @cleverbrush/schema и о том, как на её основе построены @cleverbrush/server и @cleverbrush/client. Сегодня речь пойдёт об ещё двух элементах того же монорепозитория: @cleverbrush/log — библиотека структурированного логирования, и @cleverbrush/otel — тонкая обёртка над OpenTelemetry SDK.

Оба пакета изначально проектировались как дополнение к серверу, но могут использоваться независимо — в любом Node.js-приложении.


@cleverbrush/log: структурированное логирование

Идея библиотеки пришла из экосистемы .NET: там есть Serilog с его message templates. Вместо того чтобы форматировать строку в момент записи, вы описываете шаблон с именованными плейсхолдерами, а все значения хранятся отдельно как структурированные свойства. Это позволяет запрашивать логи в базе данных по конкретным значениям — например, найти все события по TodoId = 42.

    import { createLogger, consoleSink } from '@cleverbrush/log';

    const logger = createLogger({
        minimumLevel: 'information',
        sinks: [consoleSink({ theme: 'dark' })]
    });

    logger.info('HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms', {
        Method: 'POST',
        Path: '/api/todos',
        StatusCode: 201,
        Elapsed: 12
    });

Свойства {Method}, {Path}, {StatusCode}, {Elapsed} сохраняются отдельно от текста сообщения. В Seq, ClickHouse или любой другой системе, поддерживающей CLEF-формат, их можно фильтровать и агрегировать как нормальные поля.

Доступные уровни: trace, debug, info, warn, error, fatal. Методы logger.error() принимают опциональный объект Error первым аргументом:

    logger.error(err, 'Failed to process order {OrderId}', { OrderId: orderId });


Sinks: куда писать логи

Sink — это приёмник лог-событий. Можно подключить несколько одновременно.

    import {
        createLogger,
        consoleSink,
        fileSink,
        seqSink,
        BatchingSink
    } from '@cleverbrush/log';

    const logger = createLogger({
        minimumLevel: 'information',
        sinks: [
            consoleSink({ theme: 'dark' }),
            fileSink({ path: 'logs/app.log', maxSizeBytes: 50 * 1024 * 1024 }),
            new BatchingSink({
                inner: seqSink({ serverUrl: 'http://seq:5341' }),
                maxBatchSize: 100,
                flushIntervalMs: 2000
            })
        ]
    });

consoleSink выводит в stdout/stderr с цветовым выделением уровней. fileSink пишет в файл с ротацией по размеру. seqSink отправляет события в Seq — open-source сервер структурированных логов. BatchingSink является обёрткой, которая группирует события перед отправкой во вложенный sink — полезно для уменьшения количества сетевых запросов.


Enrichers: автоматически добавляемые свойства

Enricher — функция, которая добавляет одинаковые свойства ко всем лог-событиям. Вместо того чтобы в каждом вызове logger.info(...) передавать имя хоста или версию приложения, их добавляет enricher.

    import {
        createLogger,
        consoleSink,
        hostnameEnricher,
        applicationEnricher,
        correlationIdEnricher
    } from '@cleverbrush/log';

    const logger = createLogger({
        minimumLevel: 'information',
        sinks: [consoleSink()],
        enrichers: [
            hostnameEnricher(),          // добавляет Host
            applicationEnricher('todo-backend', '1.0.0'), // Application, Version
            correlationIdEnricher()      // добавляет CorrelationId из AsyncLocalStorage
        ]
    });

correlationIdEnricher() работает совместно с correlationIdMiddleware из того же пакета: middleware генерирует идентификатор запроса и помещает его в AsyncLocalStorage, а enricher подхватывает его для каждого лог-события внутри этого запроса.


Контекстные логгеры

Метод forContext() создаёт дочерний логгер с дополнительными свойствами, не меняя оригинал:

    const serviceLogger = logger.forContext('SourceContext', 'TodoService');
    serviceLogger.info('Todo created {TodoId}', { TodoId: 1 });
    // Все события этого логгера будут содержать SourceContext: 'TodoService'

Это удобно для разделения логов по сервисам и компонентам приложения.


Типизированные шаблоны через @cleverbrush/schema

Одна из самых интересных особенностей: message templates можно сделать типизированными, используя parseString() из @cleverbrush/schema. Это даёт полную проверку типов в момент вызова logger.info().

    import { number, object, string, parseString } from '@cleverbrush/schema';

    // Определяем шаблон один раз
    const TodoCreated = parseString(
        object({ TodoId: number(), Title: string(), UserId: number() }),
        $t => $t`Todo created: #${t => t.TodoId} "${t => t.Title}" by user ${t => t.UserId}`
    );

    // Используем в хендлере — TypeScript проверяет все поля
    logger.info(TodoCreated, {
        TodoId: todo.id,    // number — обязательно
        Title: body.title,  // string — обязательно
        UserId: principal.userId  // number — обязательно
        // Пропустить поле или написать неправильный тип = ошибка компиляции
    });

Шаблоны удобно вынести в отдельный файл logTemplates.ts. Тогда все сообщения приложения оказываются в одном месте, типизированы и легко находятся в IDE по ссылкам. При рефакторинге — переименовании поля в схеме — TypeScript немедленно покажет все места, где нужно обновить вызовы логгера.


Интеграция с @cleverbrush/server

Для подключения логирования к серверу достаточно одной функции:

    import { createServer } from '@cleverbrush/server';
    import { useLogging } from '@cleverbrush/log';

    const [correlationMiddleware, requestLogMiddleware] = useLogging(logger, {
        excludePaths: ['/health'],
        getLevel: (status) => status >= 500 ? 'error' : 'information'
    });

    const server = createServer()
        .use(correlationMiddleware)
        .use(requestLogMiddleware)
        // ...остальная конфигурация
        .listen(3000);

useLogging() возвращает два middleware: первый устанавливает CorrelationId для запроса, второй логирует завершение каждого HTTP-запроса с методом, путём, статус-кодом и временем выполнения.

Запись в лог внутри хендлера — через инъекцию логгера:

    export const createTodoHandler: Handler<typeof CreateTodoEndpoint> = async (
        { body, principal },
        { db, logger }
    ) => {
        const todo = await db.todos.insert({ ... });
        logger.info(TodoCreated, {
            TodoId: todo.id,
            Title: body.title,
            UserId: principal.userId
        });
        return ActionResult.created(todo, `/api/todos/${todo.id}`);
    };


@cleverbrush/otel: OpenTelemetry без бойлерплейта

Пакет @cleverbrush/otel решает две задачи: запустить OpenTelemetry SDK одной функцией и предоставить удобные обёртки для создания пользовательских спанов.


Инициализация SDK

setupOtel() запускает NodeSDK с OTLP/HTTP-экспортёрами для трейсов, метрик и логов. Достаточно указать имя сервиса и endpoint коллектора.

    import { setupOtel } from '@cleverbrush/otel';
    import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

    setupOtel({
        serviceName: 'todo-backend',
        serviceVersion: '1.0.0',
        environment: process.env.NODE_ENV,
        otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        instrumentations: [
            new HttpInstrumentation()
        ]
    });

Этот вызов должен быть первым в точке входа приложения — до любых других импортов, — чтобы auto-instrumentation успела пропатчить зависимости.


Пользовательские спаны

Для создания спана есть две формы: callback и disposable.

Callback-форма (рекомендуется) активирует спан в OTel-контексте, поэтому дочерние спаны (например, от instrumentKnex) автоматически вкладываются в него:

    import { withSpan } from '@cleverbrush/otel';

    const result = await withSpan('todo.process', async span => {
        span.setAttribute('todo.id', todoId);
        const todo = await db.todos.find(todoId); // DB-спан вложится под 'todo.process'
        return todo;
    });

Disposable-форма с await using удобна, когда логика не умещается в одну функцию. Важно: этот спан не активируется в контексте, поэтому дочерние спаны не будут автоматически вложены.

    await using handle = withSpan('todo.create', {
        attributes: { 'todo.user_id': principal.userId }
    });
    try {
        const todo = await db.todos.insert({ title: body.title, ... });
        handle.span.setAttribute('todo.id', todo.id);
    } catch (err) {
        handle.fail(err); // записывает исключение и ставит статус ERROR
        throw err;
    }
    // span.end() вызывается автоматически при выходе из блока


Трейсинг HTTP-запросов

tracingMiddleware() из @cleverbrush/otel автоматически создаёт спан для каждого HTTP-запроса к @cleverbrush/server. Спан получает все стандартные OTel HTTP-атрибуты: метод, путь, статус-код, user-agent.

    import { tracingMiddleware } from '@cleverbrush/otel';

    const server = createServer()
        .use(tracingMiddleware({ excludePaths: ['/health'] }))
        // ...остальные middleware


Трейсинг SQL-запросов

instrumentKnex() оборачивает Knex-инстанс так, что каждый SQL-запрос становится дочерним спаном (CLIENT span) в текущем активном трейсе:

    import { instrumentKnex } from '@cleverbrush/otel';
    import knex from 'knex';

    const db = instrumentKnex(
        knex({ client: 'pg', connection: config.db.connectionString })
    );

После этого в трейс-просмотрщике (SigNoz, Jaeger, Tempo) каждый SQL-запрос будет виден как отдельный спан с текстом запроса и длительностью.


Связь логов и трейсов

Самая полезная комбинация: traceEnricher() из @cleverbrush/otel добавляет TraceId и SpanId активного спана к каждому лог-событию. Это позволяет из любого лог-сообщения перейти к соответствующему трейсу в Jaeger или SigNoz.

    import { createLogger, consoleSink } from '@cleverbrush/log';
    import { traceEnricher } from '@cleverbrush/otel';

    const logger = createLogger({
        minimumLevel: 'information',
        sinks: [consoleSink()],
        enrichers: [
            correlationIdEnricher(),
            traceEnricher()  // добавляет TraceId, SpanId ко всем событиям
        ]
    });

Теперь при логировании внутри HTTP-запроса каждая строчка лога будет содержать поля TraceId и SpanId — можно построить прямую ссылку на трейс прямо из лог-системы.

Для отправки логов через OTel Logs API (вместо или вместе с прямой отправкой в Seq) используется otelLogSink():

    import { otelLogSink } from '@cleverbrush/otel';

    const logger = createLogger({
        sinks: [
            consoleSink(),
            otelLogSink({ loggerName: 'todo-backend' })
        ],
        enrichers: [traceEnricher()]
    });

Тогда логи, трейсы и метрики уходят в одну точку — OTLP-коллектор — и в observability-бэкенде (SigNoz, Grafana) автоматически коррелируются между собой.


Полная картина: как всё складывается вместе

В реальном приложении инициализация выглядит так:

    // telemetry.ts — должен быть первым импортом
    import { setupOtel } from '@cleverbrush/otel';
    import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

    setupOtel({
        serviceName: 'my-service',
        otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    });

    // index.ts
    import './telemetry.js'; // первым
    import { createLogger, consoleSink, correlationIdEnricher } from '@cleverbrush/log';
    import { traceEnricher, instrumentKnex } from '@cleverbrush/otel';
    import { createServer } from '@cleverbrush/server';
    import { useLogging } from '@cleverbrush/log';
    import { tracingMiddleware } from '@cleverbrush/otel';

    const logger = createLogger({
        minimumLevel: 'information',
        sinks: [consoleSink()],
        enrichers: [correlationIdEnricher(), traceEnricher()]
    });

    const server = createServer()
        .use(tracingMiddleware({ excludePaths: ['/health'] }))
        .use(...useLogging(logger, { excludePaths: ['/health'] }))
        .services(svc => {
            configureLogging(svc, logger);
            // ... остальные сервисы
        });

Результат: каждый HTTP-запрос — это трейс с вложенными SQL-спанами, и каждое лог-событие содержит TraceId, CorrelationId, имя хоста и версию приложения. Всё это без ручного прокидывания контекста через параметры функций — AsyncLocalStorage делает это автоматически.


Итоги

@cleverbrush/log и @cleverbrush/otel — не самостоятельные революционные продукты, а продуманные клей между серверным фреймворком и observability-инфраструктурой. Их главная ценность — в интеграции:

- Типизированные шаблоны из @cleverbrush/schema защищают от опечаток в именах свойств
- traceEnricher() связывает каждое лог-событие с активным OTel-трейсом
- instrumentKnex() даёт SQL-спаны без изменений в query-коде
- useLogging() подключает всё к серверу двумя строками


Ссылки

GitHub: github.com/cleverbrush/framework

Документация и playground: docs.cleverbrush.com

npm:
    npm install @cleverbrush/log
    npm install @cleverbrush/otel

Буду рад любой обратной связи — по API, документации, пропущенным фичам. Issues и PR приветствуются.

# Schema-driven ORM для TypeScript: `@cleverbrush/knex-schema` и `@cleverbrush/orm`

Статья о том, как превратить TypeScript-схему в единый источник
истины для работы с базой данных: из одного определения получить типы
строк, имена таблиц и колонок, типизированные запросы, связи, миграции
и unit-of-work поверх Knex.

Все примеры ниже взяты из
[xpenser](https://xpenser.cleverbrush.com) — open-source приложения для
учёта личных доходов и расходов. Это одновременно полезное приложение,
которым я сам пользуюсь, и референсная реализация Cleverbrush Framework:
контракты, сервер, клиент, формы, auth, observability, PostgreSQL,
Telegram bot и MCP endpoint живут в одном репозитории. Код открыт:
[github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser).

Дисклеймер: все описываемые библиотеки носят экспериментальный характер.
Несмотря на это, покрытие тестами у них достаточно хорошее.

## Предыстория

В предыдущих статьях я рассказывал о
[`@cleverbrush/schema`](https://habr.com/ru/articles/1023038/),
о типизированном HTTP API через
[`@cleverbrush/server` и `@cleverbrush/client`](https://habr.com/ru/articles/1030342/),
а затем о
[`@cleverbrush/log` и `@cleverbrush/otel`](https://habr.com/ru/articles/1040714/).

Общая идея у всех этих пакетов одна: схема должна быть не просто
валидатором, а источником структурной информации. Если схема уже знает,
что у объекта есть поле `userId`, что это число, что оно обязательно, и
что для него можно получить PropertyDescriptor через `t => t.userId`, то
возникает естественный вопрос: почему бы не использовать это же знание
для SQL?

Небольшое отступление для тех, кто не работал с Knex.
[Knex](https://knexjs.org) — это query builder для Node.js: он позволяет
писать SQL-запросы цепочками методов вместо ручной сборки строк, умеет
работать с PostgreSQL, MySQL, SQLite и другими SQL-базами, поддерживает
транзакции, connection pool, migrations и schema builder.

Люди часто выбирают Knex, когда хотят оставаться близко к SQL, но не
хотят каждый раз руками собирать `SELECT ... WHERE ...` и следить за
плейсхолдерами. Это хороший промежуточный слой между raw SQL и тяжёлой
ORM: меньше магии, проще предсказать итоговый запрос, легко упасть на
обычный SQL там, где query builder мешает.

Но у Knex есть естественный предел. TypeScript может помочь с типом
строки через `knex<User>('users')`, но имена таблиц и колонок всё равно
часто остаются строками: `'users'`, `'user_id'`, `'created_at'`. Если в
коде доменная модель живёт в camelCase, база в snake_case, а рядом ещё
есть API-контракты и валидация, появляется риск рассинхронизации. Именно
этот зазор я и хотел закрыть schema-driven слоем поверх Knex.

Второй источник вдохновения — Entity Framework. В первой статье я уже
писал, что идея PropertyDescriptors выросла из желания получить что-то
похожее на expression trees из .NET: не строку вида
`'user.address.city'`, а выражение `t => t.user.address.city`, которое
проверяется компилятором. В database layer эта аналогия стала ещё
заметнее: `t => t.userId` в `where`, `t => t.category` в `include`,
`l => l.categoryId` в relation mapping — это тот же подход, только
применённый к SQL-запросам и связям между таблицами.

Так появились два пакета:

- `@cleverbrush/knex-schema` — schema-aware слой поверх Knex: имена
  таблиц и колонок, DDL-метаданные, типизированный query builder,
  projections, scopes, eager loading.
- `@cleverbrush/orm` — более высокий уровень: `defineEntity()`,
  `DbContext`, `DbSet`, relations, транзакции, save graph и tracking
  context.

Knex при этом никуда не исчезает. Это не попытка заменить SQL
полностью. Скорее наоборот: Knex остаётся нижним уровнем и escape hatch,
а схема добавляет к нему типы и договорённости, которых обычно не хватает
в большом приложении.

## С чего начинается таблица

В xpenser таблицы описаны в `apps/api/src/db/schemas.ts`. Импорт идёт из
`@cleverbrush/orm`, потому что ORM реэкспортирует все schema builders из
`@cleverbrush/knex-schema`:

```ts
import {
    boolean,
    type DbContext,
    date,
    defineEntity,
    number,
    object,
    string
} from '@cleverbrush/orm';
```

Начнём с простой, но реальной схемы пользователя:

```ts
export const UserDbSchema = object({
    id: number().primaryKey(),
    email: string(),
    passwordHash: string().optional().hasColumnName('password_hash'),
    emailVerified: boolean().hasColumnName('email_verified').defaultTo(false),
    role: string(),
    authProvider: string().hasColumnName('auth_provider'),
    defaultCurrency: string().hasColumnName('default_currency'),
    countryCode: string().hasColumnName('country_code').defaultTo('US'),
    timezone: string().defaultTo('UTC'),
    createdAt: date().hasColumnName('created_at').defaultTo('now'),
    updatedAt: date().hasColumnName('updated_at').defaultTo('now')
})
    .hasTableName('users')
    .projection(
        'public',
        'id',
        'email',
        'emailVerified',
        'role',
        'authProvider',
        'defaultCurrency',
        'countryCode',
        'timezone',
        'createdAt',
        'updatedAt'
    )
    .projection(
        'auth',
        'id',
        'email',
        'passwordHash',
        'emailVerified',
        'role',
        'authProvider',
        'defaultCurrency',
        'countryCode',
        'timezone'
    );
```

Здесь обычная schema-валидация дополняется DB-метаданными:

- `.hasTableName('users')` задаёт имя таблицы.
- `.hasColumnName('password_hash')` связывает camelCase-поле в
  TypeScript со snake_case-колонкой в SQL.
- `.primaryKey()` помечает первичный ключ.
- `.defaultTo(false)` и `.defaultTo('now')` описывают значения по
  умолчанию на уровне DDL.
- `.projection('auth', ...)` задаёт именованный набор колонок для
  выборки.

В обычном Knex можно передать generic-типы в `knex<User>('users')`, но
имена колонок всё равно остаются строками. Здесь TypeScript-свойство и
SQL-колонка связаны один раз в схеме, а дальше query builder сам
переводит `passwordHash` в `password_hash`.

## Projections: типизированный SELECT

В xpenser projections используются там, где нельзя случайно достать
лишнее поле. Например, при логине нужен `passwordHash`, но публичные
ответы API не должны его видеть:

```ts
const user = await db.users
    .projected('auth')
    .where(candidate => candidate.email, email)
    .first();
```

`projected('auth')` делает две вещи одновременно:

- в SQL уходит только набор колонок из `.projection('auth', ...)`;
- TypeScript-тип результата сужается до этих полей.

Если выбрать `projected('public')`, то обратиться к `user.passwordHash`
уже не получится на этапе компиляции. Это именно та мелочь, ради которой
и хочется держать схему как источник правды, а не как отдельный файл с
типами рядом с SQL.

## Foreign keys и индексы

Теперь посмотрим на доменную часть xpenser. Пользователь создаёт
категории, продавцов и транзакции. Транзакция принадлежит пользователю,
имеет категорию, опционального продавца, валюту, сумму, дату операции и
рассчитанную сумму в валюте пользователя:

```ts
export const TransactionDbSchema = object({
    id: number().primaryKey(),
    userId: number()
        .hasColumnName('user_id')
        .references('users', 'id')
        .onDelete('CASCADE')
        .index('idx_transactions_user_id'),
    categoryId: number()
        .hasColumnName('category_id')
        .references('categories', 'id')
        .onDelete('RESTRICT')
        .index('idx_transactions_category_id'),
    vendorId: number()
        .hasColumnName('vendor_id')
        .references('vendors', 'id')
        .onDelete('SET NULL')
        .index('idx_transactions_vendor_id')
        .optional(),
    type: string(),
    amount: number(),
    currency: string(),
    defaultCurrencyAmount: number().hasColumnName('default_currency_amount'),
    defaultCurrency: string().hasColumnName('default_currency'),
    exchangeRate: number().hasColumnName('exchange_rate'),
    exchangeRateDate: string().hasColumnName('exchange_rate_date'),
    occurredAt: date().hasColumnName('occurred_at'),
    note: string().optional(),
    createdAt: date().hasColumnName('created_at').defaultTo('now'),
    updatedAt: date().hasColumnName('updated_at').defaultTo('now'),
    category: CategoryDbSchema.optional()
}).hasTableName('transactions');
```

Методы `.references()`, `.onDelete()` и `.index()` нужны не только для
читабельности. Они сохраняются в introspection metadata схемы, а значит
их можно использовать для генерации DDL, сравнения схем и построения
миграций.

Обратите внимание на `category: CategoryDbSchema.optional()`. Это
навигационное свойство: оно нужно ORM, чтобы результат `.include(...)`
был типизированным. Сама связь объявляется отдельно, на уровне entity.

## Entity и relations

Схема описывает форму строки и DB-метаданные. Entity добавляет связи:

```ts
export const CategoryEntity = defineEntity(CategoryDbSchema);
export const VendorEntity = defineEntity(VendorDbSchema);

export const TransactionEntity = defineEntity(TransactionDbSchema).belongsTo(
    t => t.category,
    l => l.categoryId,
    r => r.id
);
```

В этом примере:

- `t => t.category` — навигационное свойство в результате;
- `l => l.categoryId` — FK на таблице `transactions`;
- `r => r.id` — PK на таблице `categories`.

Все три выражения типизированы. Если переименовать `categoryId` или
попытаться связать число со строкой, TypeScript покажет ошибку до
запуска приложения.

Для других случаев есть `.hasOne()`, `.hasMany()` и `.belongsToMany()`.
В xpenser пока хватает `belongsTo`, но в тестах ORM покрыты и более
сложные графы: сохранение дерева объектов, many-to-many через pivot
таблицу, composite primary keys и polymorphic variants.

## DbContext: карта всех таблиц

После объявления entity собираются в обычный объект:

```ts
export const entityMap = {
    users: UserEntity,
    categories: CategoryEntity,
    vendors: VendorEntity,
    transactions: TransactionEntity,
    transactionScans: TransactionScanEntity,
    transactionScanItems: TransactionScanItemEntity,
    transactionScanImages: TransactionScanImageEntity,
    exchangeRates: ExchangeRateEntity
};

export type AppEntityMap = typeof entityMap;
export type AppDb = DbContext<AppEntityMap>;
```

На старте API создаётся `DbContext`:

```ts
import { createDb } from '@cleverbrush/orm';
import { instrumentKnex } from '@cleverbrush/otel';
import knex from 'knex';
import { entityMap } from '../db/schemas.js';

const connection = instrumentKnex(
    knex({
        client: 'pg',
        connection: config.db.connectionString,
        pool: { min: 2, max: 10 },
        acquireConnectionTimeout: 10_000
    }),
    { sanitizeStatement: () => '<redacted>' }
);

const db = createDb(connection, entityMap);
```

На выходе `db.users`, `db.categories`, `db.transactions` и остальные
поля становятся типизированными `DbSet`. Это похоже на `DbContext` из
Entity Framework не случайно: именно EF был для меня референсом по
ощущению API. Отличие в том, что вместо expression trees рантайма здесь
используются schema PropertyDescriptors, а вместо декораторов, reflection
metadata и кодогенерации — обычные TypeScript-объекты.

## Запросы: от простого к реальному

Самый простой запрос выглядит так:

```ts
const categories = await db.categories.where(
    category => category.userId,
    userId
);
```

Колонка выбирается через selector. В TypeScript это поле называется
`userId`, а в SQL уйдёт `user_id`.

Можно загрузить одну транзакцию вместе с категорией:

```ts
const row = await db.transactions
    .include(transaction => transaction.category)
    .where(transaction => transaction.id, transactionId)
    .where(transaction => transaction.userId, userId)
    .first();
```

`include(transaction => transaction.category)` доступен только потому,
что связь была объявлена в `TransactionEntity`. Результат знает о поле
`category`, и это поле имеет тип категории, а не `unknown`.

В реальном списке транзакций запрос постепенно собирается из фильтров:

```ts
let builder = db.transactions
    .include(transaction => transaction.category)
    .where(transaction => transaction.userId, userId);

if (query.categoryId) {
    builder = builder.where(
        transaction => transaction.categoryId,
        query.categoryId
    );
}

if (query.from) {
    builder = builder.where(
        transaction => transaction.occurredAt,
        '>=',
        query.from
    );
}

if (query.to) {
    builder = builder.where(
        transaction => transaction.occurredAt,
        '<=',
        query.to
    );
}

const rows = await builder
    .orderBy(transaction => transaction.occurredAt, 'desc')
    .orderBy(transaction => transaction.id, 'desc');
```

Это всё ещё Knex-подобный fluent API, но без строковых имён колонок в
основном пути.

## Вставка, обновление, удаление

Создание транзакции в xpenser выглядит так:

```ts
const created = await db.transactions.insert({
    userId,
    categoryId: body.categoryId,
    vendorId: body.vendorId ?? undefined,
    type: category.type,
    amount: body.amount,
    currency: body.currency,
    defaultCurrencyAmount: convertAmount(body.amount, exchange.rate),
    defaultCurrency: user.defaultCurrency,
    exchangeRate: exchange.rate,
    exchangeRateDate: exchange.rateDate,
    occurredAt: body.occurredAt,
    note: body.note ?? undefined
});
```

Тип payload выводится из схемы. Нельзя передать строку в `amount`,
нельзя забыть обязательный `categoryId`, нельзя случайно написать
`default_currency_amount` вместо `defaultCurrencyAmount`.

Обновление:

```ts
await db.transactions
    .where(transaction => transaction.id, transactionId)
    .where(transaction => transaction.userId, userId)
    .update({
        categoryId: next.categoryId,
        vendorId: (next.vendorId ?? null) as never,
        type: category.type,
        amount: next.amount,
        currency: next.currency,
        defaultCurrencyAmount: convertAmount(next.amount, exchange.rate),
        defaultCurrency: user.defaultCurrency,
        exchangeRate: exchange.rate,
        exchangeRateDate: exchange.rateDate,
        occurredAt: next.occurredAt,
        note: next.note ?? undefined,
        updatedAt: new Date()
    });
```

Удаление:

```ts
const deleted = await db.transactions
    .where(transaction => transaction.id, transactionId)
    .where(transaction => transaction.userId, userId)
    .delete();

if (deleted === 0) {
    throw new TransactionNotFoundError('Transaction was not found.');
}
```

При этом escape hatch остаётся. В xpenser есть запросы, где проще взять
чистый Knex: например, когда нужна ручная выборка из нескольких таблиц,
специальные aliases или SQL, который не хочется прятать за ORM API. Это
нормально: ORM не должен мешать писать SQL там, где SQL очевиднее.

## Транзакции

`DbContext` поддерживает callback-форму транзакций:

```ts
await db.transaction(async trx => {
    await trx.telegramLinkTokens
        .where(candidate => candidate.userId, userId)
        .delete();

    await trx.telegramLinkTokens.insert({
        userId,
        tokenHash: hashTelegramLinkToken(token),
        expiresAt,
        consumedAt: undefined
    });
});
```

Если callback бросит исключение, Knex откатит транзакцию. Внутри callback
вы получаете тот же `DbContext`, но привязанный к `trx`, поэтому
`trx.users`, `trx.transactions`, `trx.telegramLinkTokens` остаются
типизированными `DbSet`.

Пример посложнее: перед удалением категории xpenser переносит все её
транзакции в replacement-категорию и только после этого удаляет старую:

```ts
await db.transaction(async trx => {
    await trx.transactions
        .where(transaction => transaction.userId, userId)
        .where(transaction => transaction.categoryId, categoryId)
        .update({
            categoryId: replacement.id,
            type: replacement.type,
            updatedAt: now
        });

    await trx.categories
        .where(candidate => candidate.id, categoryId)
        .where(candidate => candidate.userId, userId)
        .delete();
});
```

Транзакционная граница видна сразу, а типизация никуда не пропадает.

## Миграции

У `@cleverbrush/knex-schema` есть snapshot-based генератор миграций:

```ts
import {
    generateMigrationsForContext,
    loadSnapshot,
    writeSnapshot
} from '@cleverbrush/knex-schema';

const prev = loadSnapshot('./migrations/snapshot.json');
const result = generateMigrationsForContext(
    Object.values(entityMap),
    prev
);

if (!result.isEmpty) {
    await fs.promises.writeFile(
        './migrations/20260611000000_changes.ts',
        result.full
    );
    writeSnapshot('./migrations/snapshot.json', result.nextSnapshot);
}
```

Функция сравнивает текущие entity-схемы с сериализованным снимком
предыдущего состояния:

- для новых таблиц генерирует `CREATE TABLE`;
- для изменённых таблиц генерирует `ALTER TABLE`;
- для удалённых entity генерирует `DROP TABLE`;
- сортирует таблицы по FK-зависимостям, чтобы родительские таблицы
  создавались раньше дочерних.

Важная оговорка: xpenser сейчас использует обычные handwritten Knex
migrations и запускает их через `knex.migrate.latest(...)`:

```ts
export async function runMigrations(knex: Knex): Promise<void> {
    await knex.migrate.latest({
        directory: migrationsDirectory,
        tableName: 'knex_migrations',
        loadExtensions: ['.ts', '.js']
    });
}
```

То есть генератор миграций — возможность framework-пакета, а не
обязательный путь. Мне нравится иметь оба варианта: простые изменения
можно получать из diff схем, а сложные data migrations всё равно писать
руками на Knex.

## Нижний уровень: `query(knex, schema)`

`@cleverbrush/orm` — не единственный вход. Если не нужен `DbContext`,
можно работать прямо со схемой:

```ts
import { query } from '@cleverbrush/knex-schema';

const users = await query(knex, UserDbSchema)
    .where(user => user.emailVerified, true)
    .projected('public');
```

Этот слой даёт тот же перевод имён колонок, projections, scopes,
pagination, insert/update/delete, `joinOne`, `joinMany`, raw escape
hatches и DDL helpers. ORM просто добавляет поверх него entity map,
relations, `DbSet`, транзакционный контекст и tracking.

## Tracking context и unit-of-work

Для сценариев в стиле «загрузить объект, поменять несколько свойств,
сохранить изменения» есть tracking mode:

```ts
await using db = createDb(knex, entityMap, { tracking: true });

const user = await db.users.findOrFail(userId);
user.defaultCurrency = 'EUR';
user.updatedAt = new Date();

const result = await db.saveChanges();
```

Tracking context поддерживает identity map: если один и тот же primary
key загружен дважды, вы получите один и тот же object reference. При
`saveChanges()` ORM сравнит текущие значения со snapshot и отправит в БД
только изменённые поля.

Доступны и более явные операции:

```ts
db.attach('users', existingUser);

const entry = db.entry(existingUser);
entry.isModified('defaultCurrency');

db.remove(existingUser);
await db.saveChanges();
```

Перед сохранением можно повесить hook, например для audit-полей:

```ts
db.onSavingChanges(entry => {
    if (entry.state === 'Modified' && 'updatedAt' in entry.entity) {
        (entry.entity as { updatedAt: Date }).updatedAt = new Date();
    }
});
```

`await using` здесь работает как runtime guard. При выходе из блока
вызывается `[Symbol.asyncDispose]()`: если остались несохранённые
изменения, будет брошен `PendingChangesError`. Это не магия компилятора,
а практичная защита от тихой потери изменений.

## Row versioning и конкурентные обновления

Если у сущности есть версия строки, её можно явно отметить:

```ts
const OrderSchema = object({
    id: number().primaryKey(),
    status: string(),
    version: number().rowVersion()
}).hasTableName('orders');
```

При `saveChanges()` ORM добавит условие вида `AND version = <snapshot>`.
Если другая транзакция уже обновила строку и версия изменилась,
`UPDATE` не затронет ни одной строки, а ORM бросит `ConcurrencyError`.

В xpenser эта возможность пока не нужна, но для систем с совместным
редактированием она закрывает типичный optimistic concurrency сценарий.

## Что получилось

Если собрать всё вместе, цепочка выглядит так:

```text
@cleverbrush/schema
    -> runtime validation
    -> TypeScript inference
    -> PropertyDescriptors
    -> DB metadata via @cleverbrush/knex-schema
    -> typed queries and DDL helpers
    -> DbContext / DbSet via @cleverbrush/orm
```

Главная ценность здесь не в том, что можно написать меньше SQL. SQL всё
равно остаётся важным, а Knex остаётся доступным. Ценность в том, что
границы приложения начинают проверяться компилятором:

- поле переименовано в схеме — selectors в запросах перестают
  компилироваться;
- колонка называется `default_currency_amount`, но в коде используется
  `defaultCurrencyAmount`;
- projection сужает не только SQL `SELECT`, но и TypeScript-тип;
- relation объявлена один раз и дальше используется через
  `.include(t => t.category)`;
- транзакционный `DbContext` сохраняет тот же API внутри `trx`.

## Чего здесь нет

Это не замена Prisma, TypeORM или Drizzle. У этих инструментов свои
сильные стороны: зрелая экосистема, schema language, studio, generators,
адаптеры, документация, привычные паттерны.

`@cleverbrush/orm` интересен в другом случае: когда у вас уже есть
schema-first стек, и вы хотите, чтобы HTTP-контракты, валидация,
формы, логирование и database layer говорили на одном языке.

В xpenser это оказалось удобным компромиссом. Большая часть CRUD и
domain queries живёт на `DbSet`, а нестандартные запросы остаются на
обычном Knex. При этом OpenTelemetry-инструментация видит и то, и другое,
потому что внизу один и тот же Knex connection pool.

## Итоги

`@cleverbrush/knex-schema` и `@cleverbrush/orm` добавляют к Knex
schema-driven слой:

- схемы описывают TypeScript-тип, DB-имена, defaults, indexes и foreign
  keys;
- selectors вида `t => t.userId` заменяют строковые имена колонок;
- projections сужают и SQL, и TypeScript-тип результата;
- `defineEntity()` добавляет relations и typed eager loading;
- `createDb()` превращает entity map в `DbContext` с `DbSet`;
- транзакции сохраняют тот же типизированный API;
- tracking context даёт identity map, `saveChanges()` и runtime guard от
  забытых изменений;
- Knex остаётся доступным для raw SQL и сложных запросов.

xpenser показывает эту идею на рабочем приложении, а не на искусственном
todo-примере: пользователи, категории, продавцы, транзакции, курсы валют,
сканы чеков, API keys, Telegram linking и MCP OAuth живут в одной
PostgreSQL-модели.

В следующей статье хочу уже подробно разобрать сам xpenser: как устроено
приложение целиком, почему я сделал его как open-source personal finance
tracker, как в нём связаны web app, API, Telegram bot, MCP endpoint,
contracts, typed client, observability и database layer.

## Ссылки

Cleverbrush Framework: [github.com/cleverbrush/framework](https://github.com/cleverbrush/framework)

xpenser app: [xpenser.cleverbrush.com](https://xpenser.cleverbrush.com)

xpenser GitHub: [github.com/cleverbrush/xpenser](https://github.com/cleverbrush/xpenser)

Документация и playground: [docs.cleverbrush.com](https://docs.cleverbrush.com)

Knex: [knexjs.org](https://knexjs.org)

### npm

```bash
npm install @cleverbrush/knex-schema
npm install @cleverbrush/orm knex pg
```

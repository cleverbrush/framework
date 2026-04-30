# Schema-driven ORM для TypeScript: @cleverbrush/knex-schema и @cleverbrush/orm


Статья о том, как превратить TypeScript-схему в единый источник истины: из одного определения получить типы данных, DDL-миграции, типизированный query builder и unit-of-work с автоматическим отслеживанием изменений.

Дисклеймер: все описываемые библиотеки носят экспериментальный характер — они созданы в рамках эксперимента. Несмотря на это, покрытие тестами у них достаточно хорошее.


Предыстория

В предыдущих статьях я описывал @cleverbrush/schema как краеугольный камень всей экосистемы: на её основе строятся HTTP-сервер, клиент, логирование. Естественным продолжением стало создание слоя работы с базой данных, который тоже опирается на те же самые схемы.

Идея проста: вы описываете структуру таблицы один раз в виде объектной схемы. Из этого описания автоматически выводятся TypeScript-типы для строк, генерируются CREATE TABLE / ALTER TABLE для миграций, работает типизированный query builder.

Два пакета отвечают за разные уровни абстракции: @cleverbrush/knex-schema — за маппинг схем на SQL и построение запросов через Knex, @cleverbrush/orm — за более высокоуровневый unit-of-work с отслеживанием изменений.


@cleverbrush/knex-schema: схема как DDL

Пакет расширяет билдеры из @cleverbrush/schema DB-специфичными методами. Удобнее всего импортировать всё из @cleverbrush/orm, который реэкспортирует все нужные примитивы:

    import { object, number, string, boolean, date, array, defineEntity }
        from '@cleverbrush/orm';


Определение схемы таблицы

Метаданные для базы данных добавляются прямо на схему через цепочку вызовов. Каждый метод возвращает новый экземпляр — схемы неизменяемы.

    const UserSchema = object({
        id: number().primaryKey(),
        email: string(),
        role: string(),
        passwordHash: string().optional().hasColumnName('password_hash'),
        authProvider: string().hasColumnName('auth_provider'),
        createdAt: date().hasColumnName('created_at').defaultTo('now')
    })
        .hasTableName('users')
        .projection('public', 'id', 'email', 'role', 'authProvider', 'createdAt')
        .projection('summary', 'id', 'email');

Что здесь происходит:

- .primaryKey() — помечает колонку как первичный ключ
- .hasColumnName('snake_case') — задаёт имя колонки в БД; в TypeScript свойство
  называется как обычно (camelCase), запросы и маппинг перевода делают автоматически
- .defaultTo('now') — default значение; 'now' → knex.fn.now(), можно передать
  литерал или { raw: 'expression' }
- .hasTableName('users') — имя таблицы
- .projection('public', ...) — именованный набор колонок для выборки

Для связей между таблицами:

    const TodoSchema = object({
        id: number().primaryKey(),
        title: string(),
        description: string().optional(),
        completed: boolean().defaultTo(false),
        userId: number()
            .hasColumnName('user_id')
            .references('users', 'id')
            .onDelete('CASCADE')
            .index('idx_todos_user_id'),
        createdAt: date().hasColumnName('created_at'),
        updatedAt: date().hasColumnName('updated_at'),
        // поля для навигационных свойств (заполняются через .include())
        author: UserSchema.optional(),
    })
        .hasTableName('todos')
        .hasTimestamps({ createdAt: 'created_at', updatedAt: 'updated_at' })
        .softDelete({ column: 'deleted_at' })
        .projection('response', 'id', 'title', 'description', 'completed',
            'userId', 'createdAt', 'updatedAt')
        .scope(
            'recentFirst',
            q => q.orderBy('created_at', 'desc')
        );

- .references('users', 'id') — FK-ссылка на таблицу users
- .onDelete('CASCADE') — CASCADE при удалении родителя
- .index('idx_todos_user_id') — индекс по колонке
- .hasTimestamps(...) — автоматически обновляет updated_at при UPDATE
- .softDelete({ column: 'deleted_at' }) — мягкое удаление: DELETE превращается
  в UPDATE deleted_at = NOW(), а SELECT автоматически фильтрует удалённые строки
- .scope('name', fn) — именованное условие WHERE для переиспользования


Определение сущности и отношений

Схема описывает структуру таблицы; Entity оборачивает схему и объявляет отношения:

    const UserEntity = defineEntity(UserSchema);

    const TodoEntity = defineEntity(TodoSchema)
        .belongsTo(
            t => t.author,   // навигационное свойство в схеме
            l => l.userId,   // FK в 'todos'
            r => r.id        // PK в 'users'
        );

TypeScript вычисляет типы FK и PK статически — если передать колонку неправильного типа, это ошибка компиляции. Кроме .belongsTo() доступны .hasMany(), .hasOne().


Типизированный query builder

Для запросов используется SchemaQueryBuilder:

    import { query } from '@cleverbrush/knex-schema';

    // Получить всех пользователей
    const users = await query(knex, UserSchema).toArray();

    // Фильтр, сортировка, пагинация
    const page = await query(knex, TodoSchema)
        .where(t => t.completed, false)
        .scoped('recentFirst')
        .paginate({ page: 1, pageSize: 20 });
    // page.items: массив Todo, page.total: общее число записей

    // Eager loading связанной сущности
    const todosWithAuthor = await query(knex, TodoSchema)
        .include('author')
        .toArray();
    // todosWithAuthor[0].author — типизировано как UserSchema | undefined

    // Только нужные колонки через projection
    const summaries = await query(knex, TodoSchema)
        .projected('response')   // только колонки из .projection('response', ...)
        .toArray();

Метод .where() принимает либо колонку по ссылке на свойство схемы (что даёт автодополнение), либо raw Knex-выражение. Имена колонок транслируются автоматически — пишем t => t.userId, в SQL уходит user_id.

Для создания запросов лучше использовать DbSet из @cleverbrush/orm (об этом ниже), но SchemaQueryBuilder доступен и напрямую через query().


Генерация миграций

Вместо того чтобы вручную писать ALTER TABLE, достаточно вызвать generateMigrationsForContext(). Функция сравнивает текущие Entity-схемы со снимком предыдущего состояния и генерирует up/down-файл миграции.

    import { generateMigrationsForContext } from '@cleverbrush/knex-schema';
    import fs from 'fs';

    // При первом запуске prevSnapshot = {}
    const prevSnapshot = JSON.parse(
        fs.existsSync('./migrations/snapshot.json')
            ? fs.readFileSync('./migrations/snapshot.json', 'utf8')
            : '{}'
    );

    const result = generateMigrationsForContext(
        [TodoEntity, UserEntity],
        prevSnapshot
    );

    if (!result.isEmpty) {
        const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
        fs.writeFileSync(`./migrations/${ts}_changes.ts`, result.full);
        fs.writeFileSync('./migrations/snapshot.json',
            JSON.stringify(result.nextSnapshot, null, 2));
    }

Функция понимает топологический порядок: таблицы с FK создаются после таблиц, на которые они ссылаются. При удалении сущности из Entity Map генерируется DROP TABLE.

Для управления миграциями через командную строку есть отдельный пакет @cleverbrush/orm-cli.


@cleverbrush/orm: unit-of-work поверх query layer

@cleverbrush/orm добавляет более высокоуровневый API: типизированный DbContext с DbSet-ами для каждой сущности, а также TrackedDbContext с отслеживанием изменений.


Создание DbContext

    import { createDb } from '@cleverbrush/orm';
    import knex from 'knex';

    const db = createDb(knex({ client: 'pg', connection: '...' }), {
        todos: TodoEntity,
        users: UserEntity
    });

    // db.todos, db.users — типизированные DbSet<TEntity>

Теперь db.todos — это типизированный DbSet, а все запросы и мутации строго типизированы. TypeScript знает типы всех полей, включая которые обязательны при вставке, а которые опциональны.


Запросы через DbSet

DbSet поддерживает тот же интерфейс, что SchemaQueryBuilder, плюс несколько дополнительных методов:

    // Поиск по первичному ключу
    const todo = await db.todos.find(42);
    // todo: Todo | undefined

    const user = await db.users.findOrFail(userId);
    // Бросает EntityNotFoundError, если не найдено

    // Запрос с фильтром и связанной сущностью
    const todos = await db.todos
        .where(t => t.userId, userId)
        .include(t => t.author)   // типизированный eager load
        .scoped('recentFirst')
        .paginate({ page, pageSize });

    // Вставка
    const newTodo = await db.todos.insert({
        title: 'Buy milk',
        completed: false,
        userId: principal.userId,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    // newTodo.id заполнен автоматически из RETURNING

    // Обновление
    await db.todos
        .where(t => t.id, todoId)
        .update({ completed: true, updatedAt: new Date() });

    // Удаление (с softDelete — это UPDATE deleted_at = NOW())
    await db.todos
        .where(t => t.id, todoId)
        .delete();

При вставке TypeScript проверяет типы всех полей: нельзя передать строку туда, где ожидается число, нельзя пропустить обязательное поле. Ошибки отловятся при компиляции, а не в рантайме.


Транзакции

    // Вариант 1: колбэк-форма
    await db.transaction(async tx => {
        const todo = await tx.todos.insert({ title, userId, ... });
        await tx.users
            .where(u => u.id, userId)
            .update({ updatedAt: new Date() });
        // Rollback произойдёт автоматически, если колбэк бросит исключение
    });

    // Вариант 2: ручная транзакция
    const trx = await knex.transaction();
    try {
        const txDb = db.withTransaction(trx);
        const todo = await txDb.todos.insert({ title, userId, ... });
        await trx.commit();
    } catch (err) {
        await trx.rollback();
        throw err;
    }


TrackedDbContext: отслеживание изменений

Для сценариев вида «загрузить объект, изменить несколько полей, сохранить» удобен TrackedDbContext. Передайте { tracking: true } в createDb():

    // Обычно создаётся как transient-зависимость (каждый раз новый экземпляр)
    await using db = createDb(knex, entityMap, { tracking: true });

    const todo = await db.todos.findOrFail(todoId);
    // todo теперь отслеживается identity map'ом

    todo.completed = true;
    todo.updatedAt = new Date();
    // Мутируем объект напрямую

    const { updated } = await db.saveChanges();
    // Эмитирует минимальный UPDATE только для изменённых колонок:
    // UPDATE todos SET completed = true, updated_at = '...' WHERE id = 42

Оператор await using гарантирует вызов [Symbol.asyncDispose]() при выходе из блока. Если в этот момент есть несохранённые изменения, будет брошен PendingChangesError — так случайная потеря данных превращается в ошибку компиляции/рантайма, а не в тихую пропажу.

Контекст отслеживания можно настроить через onSavingChanges() — например, автоматически проставлять аудит-поля перед каждым saveChanges():

    db.onSavingChanges(entry => {
        if (entry.state === 'Modified' && 'updatedAt' in entry.entity) {
            (entry.entity as any).updatedAt = new Date();
        }
    });

Другие методы TrackedDbContext:

- attach(entitySetKey, entity) — начать отслеживать объект, полученный не через DbSet
- detach(entity) — прекратить отслеживание
- remove(entity) — пометить для удаления; DELETE произойдёт при saveChanges()
- discardChanges() — откатить все несохранённые изменения в памяти
- reload(entity) — перечитать актуальные данные из БД


Единый источник истины

Всё вместе: схема, из которой выводятся TypeScript-типы, DDL, query builder и tracking — это и есть идея единого источника истины. Добавили новое поле в схему — TypeScript моментально укажет на все места, где это поле нужно обработать. Переименовали колонку — generateMigrationsForContext() сгенерирует ALTER TABLE RENAME COLUMN. Сделали поле обязательным — все INSERT-вызовы без этого поля станут ошибкой компиляции.

Для сравнения: в классическом подходе типы, DDL и запросы существуют независимо, и рассинхронизация между ними обнаруживается только в рантайме.


Итоги

@cleverbrush/knex-schema и @cleverbrush/orm — небольшой, но функциональный ORM-стек поверх Knex. Главные идеи:

- Единое определение схемы → TypeScript-типы + DDL + query builder
- Типизированные ссылки на колонки защищают от опечаток в строках
- generateMigrationsForContext() генерирует миграции из diff схем без ручного DDL
- TrackedDbContext + saveChanges() + await using = safe unit-of-work по умолчанию
- softDelete, hasTimestamps — декларативные паттерны без бойлерплейта


Ссылки

GitHub: github.com/cleverbrush/framework

Документация и playground: docs.cleverbrush.com

npm:
    npm install @cleverbrush/knex-schema
    npm install @cleverbrush/orm

Буду рад любой обратной связи — по API, документации, пропущенным фичам. Issues и PR приветствуются.

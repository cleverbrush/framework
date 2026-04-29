# Как я написал свою библиотеку валидации схем и создал свою альтернативу Zod


Статья о том, как попытка разобраться в валидации объектов привела к созданию библиотеки валидации схем с runtime-интроспекцией, а на её основе — отдельных библиотек для type-safe маппинга объектов и генерации форм.

Предыстория: большие объекты без TypeScript

Несколько лет назад в одном из моих проектов на чистом JavaScript возникла задача: валидировать большие вложенные объекты со сложной структурой. Объекты содержали различные подобъекты, к каждому из которых применялись свои правила валидации в зависимости от типа.

Задача усложнялась двумя дополнительными требованиями:





Вывод типов. Проект был без TypeScript, поэтому единственным способом добавить типизацию были JSDoc-комментарии. Мне нужно было, чтобы из определения схемы автоматически выводился тип объекта — и чтобы этот тип подхватывался IDE.



Сохранение JSDoc-комментариев. Когда из схемы выводится тип, важно, чтобы описания полей (те самые JSDoc-комментарии) сохранялись и были видны в тултипах IDE. Это было критично, где документация в коде — неплохой способ передачи и сохранения знаний.

Времени было достаточно и я начал строить что-то своё. Fluent API, цепочки вызовов, валидаторы, вывод типов через дженерики — всё как положено.

«Подождите, это же Zod»

Когда я был уже глубоко в разработке, я случайно наткнулся на Zod. Я помню момент, когда увидел его API и подумал: «Это буквально то, что я сейчас пишу». Fluent builder, вывод типов из схемы, валидация — всё один в один.

Но я решил не бросать свой проект. К тому моменту у меня уже было глубокое понимание внутренностей, и я видел конкретные вещи, которые хотел сделать иначе. Плюс, моя реализация уже работала в нескольких внутренних проектах, и я мог контролировать каждый аспект поведения — от того, как работает валидация, до того, как извлекаются ошибки.

Проблема строковых констант

Одна из вещей, которая меня всегда раздражала в различных библиотеках — это извлечение ошибок по строковым путям:

// Типичный подход — строковые константы
const errors = result.getErrors('user.address.city');


Что здесь не так? Если я переименую address в residenceAddress, код продолжит компилироваться, но ошибки перестанут извлекаться. Строковые пути — это пути к runtime-багам. Конечно вы скажете что реальный тип параметра getErrors можно сделать чем-то вроде 'user' | 'user.address' | 'user.address.city', это так и вы будете правы, но мне в целом не нравится идея того что мы работаем со строками.

Мне хотелось чего-то похожего на expression trees из C#. У меня большой бэкграунд в C#, и там давно есть паттерн, когда вместо строки вы передаёте лямбду, а компилятор проверяет, что путь существует:

// Что я хотел — type-safe селекторы
const errors = result.getErrorsFor(t => t.user.address.city);


Здесь t — это типизированное дерево свойств схемы. Если я переименую address, TypeScript выдаст ошибку компиляции. А IDE предоставит автодополнение вплоть до вложенных полей.

Именно из этого требования выросла ключевая архитектурная идея библиотеки — PropertyDescriptors.

PropertyDescriptors: схема как дерево дескрипторов свойств

Каждая схема в @cleverbrush/schema эмитирует не просто функцию-валидатор, а структурированное дерево дескрипторов свойств. Каждый узел этого дерева знает:





Какому свойству он соответствует



Какая схема к нему привязана



Как получить значение из объекта по этому пути



Как установить значение



Кто его родительский узел

Это позволяет писать type-safe селекторы, которые работают на произвольной глубине вложенности:

import { object, string, number, InferType } from '@cleverbrush/schema';

const OrderSchema = object({
    id: string(),
    customer: object({
        name: string().minLength(2),
        email: string().email(),
        address: object({
            city: string().required('Город обязателен'),
            zip: number()
        })
    }),
    total: number().min(0)
});

// InferType выводит тип автоматически
type Order = InferType<typeof OrderSchema>;

// т.к. в моём случае это был JS, то я делал так
// /** @type {InferType<typeof OrderSchema>} */
// const order = ....

const result = OrderSchema.validate({
    id: '123',
    customer: {
        name: 'A', // слишком короткое
        email: 'not-an-email',
        address: {
            // city отсутствует
            zip: -1
        }
    },
    total: -5
});

if (!result.valid) {
    // Type-safe селекторы — IDE подсказывает все поля
    const nameErrors = result.getErrorsFor(t => t.customer.name);
    // { isValid: false, errors: ['минимум 2 символа'], seenValue: 'A' }

    const cityErrors = result.getErrorsFor(t => t.customer.address.city);
    // { isValid: false, errors: ['Город обязателен'], seenValue: undefined }

    // Переименуете address → residenceAddress?
    // TypeScript немедленно покажет ошибку здесь ↑
}


Иммутабельность и fluent API

Каждый вызов метода на схеме возвращает новый экземпляр билдера. Оригинальная схема никогда не мутируется:

const base = string().minLength(2);
const withMax = base.maxLength(100);    // новый экземпляр
const optional = base.optional();        // ещё один новый экземпляр

// base, withMax и optional — три независимых схемы


Это позволяет безопасно композировать схемы, переиспользовать их как «базовые блоки» и передавать между модулями без страха побочных эффектов.

Какие билдеры есть

Библиотека предоставляет 14 типов билдеров:









Билдер



Описание



Пример





string()



Строки с minLength, maxLength, matches, email, url, uuid



string().email().minLength(5)





number()



Числа с min, max, positive, negative, finite, multipleOf



number().min(0).max(100)





boolean()



Булевы значения



boolean().required()





date()



Даты с minDate, maxDate



date().minDate(new Date())





object()



Объекты с именованными свойствами



object({ name: string() })





array()



Массивы с типизированными элементами



array(string()).nonempty()





union()



Объединения типов, дискриминируемые



union(string()).or(number())





tuple()



Кортежи фиксированной длины



tuple([string(), number()])





record()



Записи с динамическими ключами



record(string(), number())





func()



Функции с типизацией



func()





any()



Произвольные значения



any().hasType<Map>()





nul()



null



nul()





lazy()



Ленивые (рекурсивные) схемы



lazy(() => TreeSchema)





extern()



Обёртка чужих Standard Schema v1 схем



extern(zodSchema)

Каждый билдер наследуется от базового SchemaBuilder, который предоставляет общие методы:

schema
    .optional()                    // принимает undefined
    .required('обязательное поле') // не принимает undefined
    .nullable()                    // принимает null
    .default('fallback')           // значение по умолчанию при undefined
    .catch('safe')                 // значение при любой ошибке валидации
    .readonly()                    // на уровне типов: Readonly<T>
    .brand<'UserId'>()             // branded type
    .describe('Описание поля')     // текстовое описание (сохраняется в схеме и может быть извлечено через интроспекцию)
    .addValidator(fn)              // пользовательский валидатор
    .addPreprocessor(fn)           // трансформация перед валидацией
    .introspect()                  // получить метаданные схемы


Runtime-интроспекция: .introspect()

Каждая схема в @cleverbrush/schema — это не чёрный ящик. Метод .introspect() возвращает полное описание схемы в виде обычного объекта: тип, ограничения, флаги, описания, метаданные расширений. Всё, что вы задали через fluent API, можно прочитать обратно в рантайме:

import { string, number, object } from '@cleverbrush/schema';

const Name = string()
    .minLength(2)
    .maxLength(100)
    .describe('Имя пользователя')
    .optional();

const info = Name.introspect();
info.type;          // 'string'
info.isRequired;    // false (потому что .optional())
info.isNullable;    // false
info.minLength;     // 2
info.maxLength;     // 100
info.description;   // 'Имя пользователя'
info.extensions;    // {}

const Age = number().min(18).default(25);
const ageInfo = Age.introspect();
ageInfo.type;         // 'number'
ageInfo.hasDefault;   // true
ageInfo.defaultValue; // 25


Каждый тип билдера расширяет базовый introspect() своими полями: StringSchemaBuilder добавляет minLength, maxLength, NumberSchemaBuilder — min, max и т.д.

Зачем это нужно? Именно на introspect() опирается @cleverbrush/schema-json для двунаправленной конвертации в JSON Schema, @cleverbrush/react-form для выбора рендерера по типу поля, и любой пользовательский инструмент, которому нужно «заглянуть внутрь» схемы.

Система расширений

Вместо того чтобы делать один гигантский билдер со всеми возможными валидаторами, ядро библиотеки предоставляет минимальный набор методов. Всё остальное — расширения.

Расширения — это не «чёрные ящики» вроде .refine() в Zod. Они типизированы, интроспектируемы и компонуемы:

import { defineExtension, withExtensions, StringSchemaBuilder, NumberSchemaBuilder } from '@cleverbrush/schema';

// Расширение для строк — HEX-цвет
const hexColorExt = defineExtension({
    string: {
        hexColor(this: StringSchemaBuilder) {
            return this.addValidator((v) => {
                const valid = /^#[0-9a-f]{6}$/i.test(v as string);
                return {
                    valid,
                    errors: valid ? [] : [{ message: 'Должен быть HEX-цвет' }]
                };
            });
        }
    }
});

// Расширение для чисел — порт
const portExt = defineExtension({
    number: {
        port(this: NumberSchemaBuilder) {
            return this.isInteger().min(1).max(65535);
        }
    }
});

// Применяем оба расширения сразу — получаем расширенные фабрики
const s = withExtensions(hexColorExt, portExt);

// .hexColor() доступен на строках, .port() — на числах
const colorSchema = s.string().hexColor();
const portSchema = s.number().port();

// Расширения видны через интроспекцию
colorSchema.introspect().extensions; // { hexColor: true }
portSchema.introspect().extensions;  // { port: true }

// Можно использовать в объектных схемах
const ServerConfig = s.object({
    themeColor: s.string().hexColor(),
    port: s.number().port(),
    name: s.string().minLength(1)
});


Встроенные расширения (email, url, uuid, positive, nonempty, oneOf и другие) реализованы тем же механизмом — они не входят в ядро библиотеки.

Standard Schema v1: совместимость с экосистемой

Библиотека реализует Standard Schema v1. Это значит, что @cleverbrush/schema работает из коробки с tRPC, TanStack Form, React Hook Form, T3 Env, Hono и 50+ другими инструментами — везде, где принимается Standard Schema:

const UserSchema = object({
    name: string().minLength(2),
    email: string().email()
});

// Передаём напрямую в tRPC, TanStack Form и т.д.
const standardSchema = UserSchema['~standard'];


А extern() работает в обратную сторону — оборачивает чужие Standard Schema библиотеки (Zod, Valibot, ArkType) в билдер @cleverbrush/schema:

import { z } from 'zod';
import { extern, object, string } from '@cleverbrush/schema';

// Оборачиваем Zod-схему
const zodAddress = z.object({
    city: z.string(),
    zip: z.number()
});

// Используем вместе с нативными схемами
const UserSchema = object({
    name: string(),
    address: extern(zodAddress)
});

// getErrorsFor работает даже для свойств Zod-схемы
const result = UserSchema.validate({ name: 'Alice', address: {} });
const cityErrors = result.getErrorsFor(t => t.address.city);


Применение PropertyDescriptors: маппер

PropertyDescriptors — это не абстрактная фича. Они лежат в основе конкретных инструментов. Первый из них — @cleverbrush/mapper.

В .NET есть AutoMapper — библиотека, которая маппит объекты одного типа в другой, автоматически сопоставляя свойства по имени. Мне хотелось чего-то подобного, но для схем: чтобы маппинг был type-safe, чтобы компилятор проверял полноту, и чтобы селекторы свойств были теми же PropertyDescriptors. Так появился @cleverbrush/mapper.

С маппером определение маппинга type-safe:

import { object, string, number } from '@cleverbrush/schema';
import { mapper } from '@cleverbrush/mapper';

// --- Схемы адресов ---
const ApiAddress = object({
    city: string(),
    house_nr: number()
});

const DomainAddress = object({
    city: string(),
    houseNr: number()
});

// --- Схемы пользователей ---
const ApiUser = object({
    id: string(),
    first_name: string(),
    last_name: string(),
    birth_year: number(),
    address: ApiAddress
});

const DomainUser = object({
    id: string(),
    fullName: string(),
    age: number(),
    address: DomainAddress
});

const registry = mapper()
    // Сначала регистрируем маппинг адресов
    .configure(ApiAddress, DomainAddress, m =>
        m
            // city → city — автомаппинг (одинаковое имя и тип)
            .for(t => t.houseNr).from(f => f.house_nr)
    )
    // Теперь маппинг пользователей
    .configure(ApiUser, DomainUser, m =>
        m
            // id → id — автомаппинг (одинаковое имя и тип)
            // address → address — автомаппинг (маппинг уже зарегистрирован выше!)
            .for(t => t.fullName)
                .compute(src => `${src.first_name} ${src.last_name}`)
            .for(t => t.age)
                .compute(src => new Date().getFullYear() - src.birth_year)
    );

const mapFn = registry.getMapper(ApiUser, DomainUser);
const user = await mapFn({
    id: 'u-42',
    first_name: 'Иван',
    last_name: 'Петров',
    birth_year: 1990,
    address: { city: 'Москва', house_nr: 15 }
});
// { id: 'u-42', fullName: 'Иван Петров', age: 36, address: { city: 'Москва', houseNr: 15 } }


Что здесь важно:





Автомаппинг: свойства с одинаковым именем и совместимым типом маппятся автоматически — вы конфигурируете только то, что отличается.



Compile-time полнота: если вы забыли замапить свойство целевой схемы, TypeScript выдаст ошибку на этапе компиляции.



Type-safe селекторы: и .for(), и .from() — это те же PropertyDescriptor-селекторы. Переименовали поле? TypeScript покажет.



Несовместимые типы: если вы пытаетесь .from() число в строку, компилятор ругнётся и вы поймёте что надо сделать через .compute().

Применение PropertyDescriptors: React-формы

Второй инструмент — @cleverbrush/react-form. Headless библиотека для работы с формами в React.

Проблема всех популярных React-библиотек для форм (которые я видел) — React Hook Form, Formik, React Final Form — в том, что поля привязываются по строковым именам: register("email"), <Field name="address.city" />. Переименовали свойство — компилятор молчит, форма ломается в рантайме.

@cleverbrush/react-form привязывает поля через те же PropertyDescriptor-селекторы: (t) => t.address.city. Переименовали — ошибка компиляции. Опечатались — ошибка компиляции. Плюс, схема одновременно является и типом, и валидацией, и конфигурацией полей формы.

Отдельно — система рендереров. Вы определяете рендереры для каждого типа схемы один раз на уровне приложения через провайдер. Компонент Field сам находит нужный рендерер по типу схемы поля:

import { object, string, number } from '@cleverbrush/schema';
import { useSchemaForm, FormSystemProvider, Field } from '@cleverbrush/react-form';

// Определяем рендереры один раз
const renderers = {
    string: ({ value, onChange, onBlur, error, touched, label }) => (
        <div>
            <label>{label}</label>
            <input
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    ),
    number: ({ value, onChange, onBlur, error, touched, label }) => (
        <div>
            <label>{label}</label>
            <input
                type="number"
                value={value ?? ''}
                onChange={e => onChange(Number(e.target.value))}
                onBlur={onBlur}
            />
            {touched && error && <span className="error">{error}</span>}
        </div>
    )
};

// Схема — единственный источник истины
const ContactSchema = object({
    name: string().required('Имя обязательно').minLength(2),
    email: string().required('Email обязателен').email(),
    age: number().min(18, 'Минимум 18 лет')
});

function ContactForm() {
    const form = useSchemaForm(ContactSchema);

    const handleSubmit = async () => {
        const result = await form.submit();
        if (result.valid) {
            console.log('Данные:', result.object);
        }
    };

    return (
        <FormSystemProvider renderers={renderers}>
            {/* Type-safe привязка — IDE подсказывает поля */}
            <Field forProperty={t => t.name} form={form} label="Имя" />
            <Field forProperty={t => t.email} form={form} label="Email" />
            <Field forProperty={t => t.age} form={form} label="Возраст" />
            <button onClick={handleSubmit}>Отправить</button>
        </FormSystemProvider>
    );
}


Библиотека headless — она не навязывает UI. Хотите Material UI? Замените рендереры. Хотите Ant Design? Тоже. Можно вложить FormSystemProvider друг в друга, переопределяя рендереры для отдельных секций.

Для тонкого контроля есть useField:

function CustomNameField() {
    const form = useSchemaForm(ContactSchema);
    const field = form.useField(t => t.name);

    return (
        <div>
            <input
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value)}
                onBlur={field.onBlur}
            />
            <p>Dirty: {String(field.dirty)}</p>
            <p>Touched: {String(field.touched)}</p>
            {field.error && <p className="error">{field.error}</p>}
        </div>
    );
}


Типы и тесты типов

Отдельная история — это типизация. Одни из самых сложных и интересных задач, которые мне приходилось решать в TypeScript, были связаны с mapped types, conditional types и выводом типов из вложенных схем.

Несколько примеров:





InferType<typeof schema> выводит полный TypeScript-тип из определения схемы, включая optional, nullable, readonly и брендированные типы.



PropertyDescriptor tree — рекурсивный дженерик, который строит типизированное дерево свойств произвольной глубины.



Маппер использует conditional types, чтобы на этапе компиляции проверить, что все свойства целевой схемы замаплены.

Для тестирования типов я использую expectTypeOf из Vitest — это позволяет писать утверждения на уровне типов, которые ломаются при изменении сигнатур:

import { expectTypeOf } from 'vitest';

const schema = object({
    name: string(),
    age: number().optional()
});

type T = InferType<typeof schema>;
expectTypeOf<T>().toEqualTypeOf<{
    name: string;
    age?: number;
}>();


Естественно весь основной код покрыт тестами логики, а тесты типов обеспечивают сохранение контрактов типов при рефакторинге. Тестовое покрытие по всему монорепозиторию — 97.9%.

Производительность

Раз уж мы сравниваемся с Zod — вот результаты бенчмарков (Vitest bench, Zod v4, одна машина):









Бенчмарк



@cleverbrush/schema



Zod v4



Разница





Массив 100 объектов (valid)



35,228 ops/s



13,277 ops/s



2.65× быстрее





Массив 100 объектов (invalid)



899,329 ops/s



4,396 ops/s



204× быстрее





Сложный объект - несколько уровней (valid)



198,988 ops/s



136,090 ops/s



1.46× быстрее





Вложенный объект (valid)



690,556 ops/s



368,893 ops/s



1.87× быстрее





Вложенный объект (invalid)



2,739,319 ops/s



87,245 ops/s



31.4× быстрее





Union (последняя ветка)



676,107 ops/s



732,682 ops/s



Zod ~8% быстрее

Единственный бенчмарк, где Zod быстрее — union match по последней ветке (~8%). Считаю это паритетом.

Размер бандла









Бандл



Gzipped





@cleverbrush/schema (полный)



14 KB





@cleverbrush/schema/string (subpath)



3.8 KB





Zod v3 (полный)



14.4 KB





Zod v4 (полный)



41 KB

В 3 раза меньше Zod v4. Sub-path экспорты (/string, /number, /object и т.д.) позволяют подключать только нужные билдеры.

Ноль runtime-зависимостей

Все пакеты монорепозитория — zero runtime dependencies. Strict TypeScript, Biome для линтинга, Vitest для тестов, tsup для сборки.

Итоги

Я не утверждаю, что это «убийца Zod». Zod — отличная библиотека с огромной экосистемой. Но если вам важны runtime-интроспекция схем, type-safe извлечение ошибок без строковых констант и возможность из одного определения схемы получить валидацию, маппинг и формы — посмотрите на @cleverbrush/schema.

Ссылки





Документация и playground: docs.cleverbrush.com



GitHub: github.com/cleverbrush/framework



npm: npm install @cleverbrush/schema

Буду рад любой обратной связи — по API, документации, пропущенным фичам. Issues и PR приветствуются.


import { highlightTS } from '@/lib/highlight';

export default function DiscriminatedUnionsSection() {
    return (
        <>
            <div className="card">
                <h2>Discriminated Unions</h2>
                <a
                    href="/playground/discriminated-unions"
                    className="playground-link"
                >
                    ▶ Open in Playground
                </a>
                <p>
                    Some libraries ship a dedicated{' '}
                    <code>.discriminator()</code> API for tagged unions. With{' '}
                    <code>@cleverbrush/schema</code> you don&apos;t need one —{' '}
                    <code>union()</code> combined with{' '}
                    <strong>string-literal schemas</strong> gives you the same
                    pattern naturally, with full type inference.
                </p>
                <p>
                    The trick is simple: use{' '}
                    <code>string(&apos;literal&apos;)</code> for the
                    discriminator field. Each branch of the union gets its own
                    object schema whose discriminator can only match one exact
                    value. TypeScript narrows the inferred type automatically.
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, union, type InferType } from '@cleverbrush/schema';

// Each variant has a literal "type" field acting as the discriminator
const Circle = object({
  type:   string('circle'),
  radius: number().min(0)
});

const Rectangle = object({
  type:   string('rectangle'),
  width:  number().min(0),
  height: number().min(0)
});

const Triangle = object({
  type:   string('triangle'),
  base:   number().min(0),
  height: number().min(0)
});

// Combine with union() — no special .discriminator() call needed
const ShapeSchema = union(Circle).or(Rectangle).or(Triangle);

type Shape = InferType<typeof ShapeSchema>;
// Shape is automatically:
//   | { type: 'circle';    radius: number }
//   | { type: 'rectangle'; width: number; height: number }
//   | { type: 'triangle';  base: number;  height: number }

// Validation picks the matching branch by the literal field
const result = ShapeSchema.validate({ type: 'circle', radius: 5 });`)
                        }}
                    />
                </pre>

                <h3>Real-World Example: Job Scheduler</h3>
                <p>
                    The <code>@cleverbrush/scheduler</code> library uses this
                    exact pattern to validate job schedules. The{' '}
                    <code>every</code> field acts as the discriminator, and each
                    variant adds its own set of allowed properties:
                </p>
                <pre>
                    <code
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: allow here
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { object, string, number, array, union, type InferType } from '@cleverbrush/schema';

// Shared base with common schedule fields
const ScheduleBase = object({
  interval: number().min(1).max(356),
  hour:     number().min(0).max(23).optional(),
  minute:   number().min(0).max(59).optional(),
  startsOn: date().acceptJsonString().optional(),
  endsOn:   date().acceptJsonString().optional()
});

// Minute schedule — omit hour/minute (they don't apply)
const EveryMinute = ScheduleBase
  .omit('hour').omit('minute')
  .addProps({ every: string('minute') });

// Day schedule
const EveryDay = ScheduleBase
  .addProps({ every: string('day') });

// Week schedule — adds dayOfWeek array
const EveryWeek = ScheduleBase.addProps({
  every:     string('week'),
  dayOfWeek: array().of(number().min(1).max(7)).minLength(1).maxLength(7)
});

// Month schedule — adds day (number or 'last')
const EveryMonth = ScheduleBase.addProps({
  every: string('month'),
  day:   union(string('last')).or(number().min(1).max(28))
});

// Combine all variants in a single union
const ScheduleSchema = union(EveryMinute)
  .or(EveryDay)
  .or(EveryWeek)
  .or(EveryMonth);

type Schedule = InferType<typeof ScheduleSchema>;
// TypeScript infers a proper discriminated union on "every"`)
                        }}
                    />
                </pre>
                <p>
                    Because each branch uses a string literal (
                    <code>string(&apos;minute&apos;)</code>,{' '}
                    <code>string(&apos;day&apos;)</code>, etc.) for the{' '}
                    <code>every</code> field, TypeScript can narrow the full
                    union based on that single property — exactly like
                    zod&apos;s <code>z.discriminatedUnion()</code>, but without
                    any extra API surface.
                </p>
            </div>
        </>
    );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
    AsciiHero,
    BeforeAfter,
    Button,
    CommunityBadge,
    EyebrowPill,
    FloatingSparkles,
    GlassCard,
    GradientText,
    LogoMarquee,
    MockIDE,
    NodeGraphBackground,
    StatCounter,
    WordRoll
} from 'performative-ui';
import type { ButtonVariant, IdeToken } from 'performative-ui';

export interface PerformativeAction {
    href: string;
    label: string;
    external?: boolean;
    variant?: ButtonVariant;
}

export interface PerformativeMetric {
    label: string;
    value?: string;
    target?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
}

export interface PerformativeCodeSample {
    filename: string;
    code: string;
    thinkingLabel?: ReactNode | false;
}

export interface PerformativeHeroProps {
    eyebrow: string;
    headline: string;
    rotatingWords: string[];
    body: ReactNode;
    actions: PerformativeAction[];
    metrics?: PerformativeMetric[];
    badges?: string[];
    code?: PerformativeCodeSample;
    wordDirection?: 'up' | 'down';
}

export interface PerformativeFeature {
    title: string;
    body: ReactNode;
    icon?: ReactNode;
    href?: string;
    external?: boolean;
    linkLabel?: string;
}

export interface PerformativeProofItem {
    title: ReactNode;
    subtitle: ReactNode;
    href: string;
    icon?: ReactNode;
}

export interface PerformativeMarqueeItem {
    label: string;
    tone?: 'serif' | 'mono' | 'strong';
}

const keywordPattern =
    /\b(import|from|const|type|export|return|await|async|if|else|new)\b/g;

const HERO_CODE_CHAR_MS: [number, number] = [1, 8];
const CODE_STAGE_CHAR_MS: [number, number] = [1, 6];

function tokenizeLine(line: string): IdeToken[] {
    const tokens: IdeToken[] = [];
    let cursor = 0;
    const matches = Array.from(line.matchAll(keywordPattern));

    for (const match of matches) {
        const index = match.index ?? 0;
        if (index > cursor) {
            tokens.push(...tokenizePlain(line.slice(cursor, index)));
        }
        tokens.push({ c: match[0], cls: 'key' });
        cursor = index + match[0].length;
    }

    if (cursor < line.length) {
        tokens.push(...tokenizePlain(line.slice(cursor)));
    }

    tokens.push({ c: '\n' });
    return tokens;
}

function tokenizePlain(source: string): IdeToken[] {
    const tokens: IdeToken[] = [];
    const pattern =
        /('[^']*'|"[^"]*"|`[^`]*`|\b\d+(?:\.\d+)?\b|\/\/.*$)/g;
    let cursor = 0;
    const matches = Array.from(source.matchAll(pattern));

    for (const match of matches) {
        const index = match.index ?? 0;
        if (index > cursor) {
            tokens.push({ c: source.slice(cursor, index) });
        }
        const value = match[0];
        const cls = value.startsWith('//')
            ? 'com'
            : /^\d/.test(value)
              ? 'num'
              : 'str';
        tokens.push({ c: value, cls });
        cursor = index + value.length;
    }

    if (cursor < source.length) {
        tokens.push({ c: source.slice(cursor) });
    }

    return tokens;
}

function tokenizeCode(code: string): IdeToken[] {
    return code.split('\n').flatMap(tokenizeLine);
}

function useMounted() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return mounted;
}

function ClientOnlySparkles() {
    const mounted = useMounted();

    if (!mounted) {
        return <div aria-hidden="true" className="cb-pui-hero__sparkles" />;
    }

    return (
        <FloatingSparkles
            className="cb-pui-hero__sparkles"
            count={18}
            glyphs={['+', '*', '.', '/']}
            durationS={[16, 28]}
            sizeRange={[8, 14]}
        />
    );
}

function ActionButton({ action }: { action: PerformativeAction }) {
    const variant = action.variant ?? 'ghost';

    if (action.external) {
        return (
            <Button
                as="a"
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                variant={variant}
                size="lg"
            >
                {action.label}
            </Button>
        );
    }

    return (
        <Button as={Link} href={action.href} variant={variant} size="lg">
            {action.label}
        </Button>
    );
}

function StableWordRoll({
    words,
    direction
}: {
    words: string[];
    direction: 'up' | 'down';
}) {
    const longestWord =
        words.reduce(
            (longest, word) =>
                word.length > longest.length ? word : longest,
            ''
        ) || words[0];

    return (
        <span className="cb-pui-word-roll">
            <span className="cb-pui-word-roll__sizer" aria-hidden="true">
                {longestWord}
            </span>
            <WordRoll
                className="cb-pui-word-roll__roll"
                words={words}
                direction={direction}
                gradient
            />
        </span>
    );
}

function renderTypedTokens(tokens: IdeToken[], visibleChars: number) {
    const rendered: ReactNode[] = [];
    let remaining = visibleChars;

    for (let index = 0; index < tokens.length; index++) {
        if (remaining <= 0) {
            break;
        }

        const token = tokens[index];
        const text = token.c.slice(0, remaining);

        if (text.length === 0) {
            continue;
        }

        rendered.push(
            token.cls ? (
                <span className={`pui-tok-${token.cls}`} key={index}>
                    {text}
                </span>
            ) : (
                text
            )
        );
        remaining -= text.length;
    }

    return rendered;
}

function OneShotIdeBody({
    tokens,
    charMs
}: {
    tokens: IdeToken[];
    charMs: [number, number];
}) {
    const [visibleChars, setVisibleChars] = useState(0);
    const [complete, setComplete] = useState(false);
    const fullText = useMemo(
        () => tokens.map(token => token.c).join(''),
        [tokens]
    );

    useEffect(() => {
        let cancelled = false;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let current = 0;

        setVisibleChars(0);
        setComplete(false);

        const tick = () => {
            if (cancelled) {
                return;
            }

            if (current >= fullText.length) {
                setComplete(true);
                return;
            }

            current += 1;
            setVisibleChars(current);

            const [min, max] = charMs;
            const typedChar = fullText[current - 1];
            const delay =
                min +
                Math.random() * (max - min) +
                (typedChar === '\n' ? 120 : 0);

            timeout = setTimeout(tick, delay);
        };

        timeout = setTimeout(tick, charMs[0]);

        return () => {
            cancelled = true;
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [charMs, fullText]);

    return (
        <pre className="pui-ide__body">
            {renderTypedTokens(tokens, visibleChars)}
            {!complete && <span className="pui-caret" />}
        </pre>
    );
}

function OneShotMockIDE({
    sample,
    charMs
}: {
    sample: PerformativeCodeSample;
    charMs: [number, number];
}) {
    const tokens = useMemo(() => tokenizeCode(sample.code), [sample.code]);

    return (
        <MockIDE>
            <MockIDE.Chrome
                filename={sample.filename}
                thinking={sample.thinkingLabel ?? false}
            />
            <OneShotIdeBody tokens={tokens} charMs={charMs} />
        </MockIDE>
    );
}

export function PerformativeMetricStrip({
    metrics,
    className = ''
}: {
    metrics: PerformativeMetric[];
    className?: string;
}) {
    return (
        <div className={`cb-pui-metrics ${className}`}>
            {metrics.map(metric => (
                <div className="cb-pui-metric" key={metric.label}>
                    <strong>
                        {metric.prefix}
                        {typeof metric.target === 'number' ? (
                            <StatCounter
                                target={metric.target}
                                format={value =>
                                    value.toLocaleString(undefined, {
                                        maximumFractionDigits:
                                            metric.decimals ?? 0,
                                        minimumFractionDigits:
                                            metric.decimals ?? 0
                                    })
                                }
                            />
                        ) : (
                            metric.value
                        )}
                        {metric.suffix}
                    </strong>
                    <span>{metric.label}</span>
                </div>
            ))}
        </div>
    );
}

export function PerformativeHero({
    eyebrow,
    headline,
    rotatingWords,
    body,
    actions,
    metrics = [],
    badges = [],
    code,
    wordDirection = 'up'
}: PerformativeHeroProps) {
    return (
        <section className="cb-pui-hero">
            <NodeGraphBackground
                className="cb-pui-hero__nodes"
                density={52}
                speed={0.22}
                linkDistance={130}
                hoverDistance={180}
                hoverGravity={0.003}
                baseOpacity={0.22}
                colors={['#22d3ee', '#34d399', '#f59e0b', '#f472b6']}
                linkColor="rgba(148, 163, 184, 0.22)"
            />
            <AsciiHero
                className="cb-pui-hero__ascii"
                variant="bare"
                colorful
                baseOpacity={0.08}
                spotlightOpacity={0.45}
                spotlightRadius={8}
                reactive
                fontSize={10}
            />
            <ClientOnlySparkles />
            <div className="container cb-pui-hero__inner">
                <div className="cb-pui-hero__copy">
                    <EyebrowPill>{eyebrow}</EyebrowPill>
                    <h1>
                        {headline}{' '}
                        <StableWordRoll
                            words={rotatingWords}
                            direction={wordDirection}
                        />
                    </h1>
                    <p className="cb-pui-hero__body">{body}</p>
                    <div className="cb-pui-hero__actions">
                        {actions.map(action => (
                            <ActionButton action={action} key={action.href} />
                        ))}
                    </div>
                    {badges.length > 0 && (
                        <div className="cb-pui-badges">
                            {badges.map(badge => (
                                <span key={badge}>{badge}</span>
                            ))}
                        </div>
                    )}
                </div>
                {code && (
                    <div className="cb-pui-hero__stage">
                        <OneShotMockIDE
                            sample={code}
                            charMs={HERO_CODE_CHAR_MS}
                        />
                    </div>
                )}
            </div>
            {metrics.length > 0 && (
                <div className="container">
                    <PerformativeMetricStrip metrics={metrics} />
                </div>
            )}
        </section>
    );
}

export function PerformativeGlassGrid({
    items,
    className = ''
}: {
    items: PerformativeFeature[];
    className?: string;
}) {
    return (
        <div className={`cb-pui-glass-grid ${className}`}>
            {items.map(item => (
                <GlassCard
                    key={item.title}
                    glowOnHover
                    className="cb-pui-glass-card"
                >
                    {item.icon && <GlassCard.Icon>{item.icon}</GlassCard.Icon>}
                    <GlassCard.Title>{item.title}</GlassCard.Title>
                    <GlassCard.Body>{item.body}</GlassCard.Body>
                    {item.href && item.linkLabel && (
                        <GlassCard.Link
                            href={item.href}
                            target={item.external ? '_blank' : undefined}
                            rel={
                                item.external
                                    ? 'noopener noreferrer'
                                    : undefined
                            }
                        >
                            {item.linkLabel}
                        </GlassCard.Link>
                    )}
                </GlassCard>
            ))}
        </div>
    );
}

export function PerformativeBeforeAfter({
    before,
    after,
    brand,
    beforeLabel = 'Before',
    afterLabel = 'After',
    className = ''
}: {
    before: ReactNode[];
    after: ReactNode[];
    brand: ReactNode;
    beforeLabel?: ReactNode;
    afterLabel?: ReactNode;
    className?: string;
}) {
    return (
        <div className={`cb-pui-before-after ${className}`}>
            <BeforeAfter
                before={before}
                after={after}
                brand={brand}
                beforeLabel={beforeLabel}
                afterLabel={afterLabel}
            />
        </div>
    );
}

export function PerformativeCodeStage({
    sample,
    className = ''
}: {
    sample: PerformativeCodeSample;
    className?: string;
}) {
    return (
        <div className={`cb-pui-code-stage ${className}`}>
            <OneShotMockIDE sample={sample} charMs={CODE_STAGE_CHAR_MS} />
        </div>
    );
}

export function PerformativeProofRow({
    items,
    marquee = [],
    className = ''
}: {
    items?: PerformativeProofItem[];
    marquee?: PerformativeMarqueeItem[];
    className?: string;
}) {
    return (
        <div className={`cb-pui-proof ${className}`}>
            {marquee.length > 0 && (
                <LogoMarquee
                    fade
                    pauseOnHover
                    speed={34}
                    logos={marquee.map(item => ({
                        kind: 'node',
                        key: item.label,
                        node: (
                            <span
                                className={`cb-pui-logo cb-pui-logo--${
                                    item.tone ?? 'strong'
                                }`}
                            >
                                {item.label}
                            </span>
                        )
                    }))}
                />
            )}
            {items && items.length > 0 && (
                <div className="cb-pui-community-grid">
                    {items.map(item => (
                        <CommunityBadge
                            key={item.href}
                            href={item.href}
                            title={item.title}
                            subtitle={item.subtitle}
                            iconNode={item.icon}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function PerformativeSlippyWords({
    words,
    gradient = false,
    className = ''
}: {
    words: string[];
    gradient?: boolean;
    className?: string;
}) {
    return (
        <div className={`cb-pui-slippy ${className}`}>
            <div className="cb-pui-slippy__track">
                {words.map(word => (
                    <span
                        className={
                            gradient
                                ? 'cb-pui-slippy__word is-gradient'
                                : 'cb-pui-slippy__word'
                        }
                        key={word}
                    >
                        {word}
                    </span>
                ))}
            </div>
        </div>
    );
}

export function PerformativeGradientText({
    children
}: {
    children: ReactNode;
}) {
    return <GradientText>{children}</GradientText>;
}

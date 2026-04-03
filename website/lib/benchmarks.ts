import fs from 'fs';
import path from 'path';

export interface BenchmarkEntry {
    name: string;
    hz: number;
    rank: number;
}

export interface BenchmarkGroup {
    label: string;
    entries: BenchmarkEntry[];
}

/**
 * Short display labels for benchmark groups.
 * Keys are substring-matched against the group's fullName.
 */
const GROUP_LABELS: Record<string, string> = {
    'String validation (valid input)': 'String (valid)',
    'Flat object validation (valid input)': 'Flat object (valid)',
    'Nested object validation (valid input)': 'Nested object (valid)',
    'Complex "Create Order" (valid input)': 'Complex object (valid)',
    'Array of 100 objects (valid input)': 'Array of 100 (valid)',
    'String validation (invalid input)': 'String (invalid)',
    'Flat object validation (invalid input)': 'Flat object (invalid)',
    'Nested object validation (invalid input)': 'Nested object (invalid)',
    'Complex "Create Order" (invalid input)': 'Complex object (invalid)',
    'Array of 100 objects (invalid input)': 'Array of 100 (invalid)'
};

/** Precomputed map from display label to its sort index for O(1) lookups */
const LABEL_ORDER: Map<string, number> = new Map(
    Object.values(GROUP_LABELS).map((label, i) => [label, i])
);

/** Module-level cache — populated on first call, reused on all subsequent calls */
let cachedBenchmarks: BenchmarkGroup[] | null = null;

export function loadBenchmarks(): BenchmarkGroup[] {
    if (cachedBenchmarks !== null) {
        return cachedBenchmarks;
    }

    const jsonPath = path.resolve(process.cwd(), '..', 'bench-results.json');

    let raw: unknown;
    try {
        raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (err) {
        console.error(
            '[loadBenchmarks] Failed to read bench-results.json:',
            err
        );
        cachedBenchmarks = [];
        return cachedBenchmarks;
    }

    if (
        !raw ||
        typeof raw !== 'object' ||
        !('files' in raw) ||
        !Array.isArray((raw as { files: unknown }).files)
    ) {
        cachedBenchmarks = [];
        return cachedBenchmarks;
    }

    const groups: BenchmarkGroup[] = [];

    for (const file of (raw as { files: unknown[] }).files) {
        if (
            !file ||
            typeof file !== 'object' ||
            !Array.isArray((file as { groups: unknown }).groups)
        ) {
            continue;
        }

        for (const group of (file as { groups: unknown[] }).groups) {
            if (
                !group ||
                typeof group !== 'object' ||
                typeof (group as { fullName: unknown }).fullName !== 'string' ||
                !Array.isArray((group as { benchmarks: unknown }).benchmarks)
            ) {
                continue;
            }

            const fullName = (group as { fullName: string }).fullName;
            const matchedKey = Object.keys(GROUP_LABELS).find(k =>
                fullName.includes(k)
            );
            if (!matchedKey) continue;

            groups.push({
                label: GROUP_LABELS[matchedKey],
                entries: (
                    group as { benchmarks: BenchmarkEntry[] }
                ).benchmarks.map(b => ({
                    name: b.name,
                    hz: b.hz,
                    rank: b.rank
                }))
            });
        }
    }

    // Sort by the intended display order using the precomputed index map
    groups.sort(
        (a, b) =>
            (LABEL_ORDER.get(a.label) ?? Infinity) -
            (LABEL_ORDER.get(b.label) ?? Infinity)
    );

    cachedBenchmarks = groups;
    return cachedBenchmarks;
}

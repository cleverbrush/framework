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

/** Order in which groups should appear */
const GROUP_ORDER = Object.keys(GROUP_LABELS);

export function loadBenchmarks(): BenchmarkGroup[] {
    const jsonPath = path.resolve(process.cwd(), '..', 'bench-results.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    const groups: BenchmarkGroup[] = [];

    for (const file of raw.files) {
        for (const group of file.groups) {
            const fullName: string = group.fullName;
            const matchedKey = Object.keys(GROUP_LABELS).find(k =>
                fullName.includes(k)
            );
            if (!matchedKey) continue;

            groups.push({
                label: GROUP_LABELS[matchedKey],
                entries: group.benchmarks.map(
                    (b: { name: string; hz: number; rank: number }) => ({
                        name: b.name,
                        hz: b.hz,
                        rank: b.rank
                    })
                )
            });
        }
    }

    // Sort by the intended display order
    groups.sort(
        (a, b) =>
            GROUP_ORDER.indexOf(
                Object.keys(GROUP_LABELS).find(
                    k => GROUP_LABELS[k] === a.label
                )!
            ) -
            GROUP_ORDER.indexOf(
                Object.keys(GROUP_LABELS).find(
                    k => GROUP_LABELS[k] === b.label
                )!
            )
    );

    return groups;
}

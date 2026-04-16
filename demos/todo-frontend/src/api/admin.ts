// Admin API: NDJSON streaming activity log
export type ActivityEntry = {
    timestamp: string;
    action: string;
    userId: number;
    detail: string;
};

export async function streamActivity(
    onEntry: (entry: ActivityEntry) => void,
    signal?: AbortSignal
): Promise<void> {
    const token = localStorage.getItem('auth_token');
    const resp = await fetch('/api/admin/activity', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal
    });

    if (!resp.ok || !resp.body) {
        throw new Error(`Failed to stream activity: HTTP ${resp.status}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                onEntry(JSON.parse(trimmed) as ActivityEntry);
            } catch {
                // skip malformed lines
            }
        }
    }
}

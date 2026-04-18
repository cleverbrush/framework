// Admin API: NDJSON streaming activity log via typed client
import { client } from './client';

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
    for await (const line of client.admin.activityLog.stream({ signal })) {
        try {
            onEntry(JSON.parse(line) as ActivityEntry);
        } catch {
            // skip malformed lines
        }
    }
}

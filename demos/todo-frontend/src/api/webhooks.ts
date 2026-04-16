import { http } from '../lib/http-client';

export type WebhookSubscription = {
    id: string;
    callbackUrl: string;
    events: string[];
    createdAt: string;
};

export function subscribe(body: { callbackUrl: string; events: string[] }) {
    return http.post<WebhookSubscription>('/api/webhooks/subscribe', body);
}

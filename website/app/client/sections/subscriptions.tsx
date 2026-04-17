/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: it is intentional */
import { highlightTS } from '@/lib/highlight';

export default function SubscriptionsSection() {
    return (
        <>
            <div className="section-header">
                <h1>WebSocket Subscriptions</h1>
                <p className="subtitle">
                    Real-time communication over WebSocket — server push,
                    bidirectional messaging, and a React hook for managing
                    subscription lifecycle.
                </p>
            </div>

            {/* ── Why ──────────────────────────────────────────── */}
            <div className="why-box">
                <h2>Why Subscriptions?</h2>

                <h3>The Problem</h3>
                <p>
                    Building real-time features typically requires setting up a
                    separate WebSocket server, managing connection lifecycle,
                    serializing messages, and keeping everything type-safe. In
                    React, you also need to handle mount/unmount cleanup and
                    state synchronization.
                </p>

                <h3>The Solution</h3>
                <p>
                    Subscription endpoints are defined alongside regular HTTP
                    endpoints in your API contract using{' '}
                    <code>endpoint.subscription()</code>. The typed client
                    automatically detects them and returns a{' '}
                    <code>Subscription</code> handle instead of a Promise. The{' '}
                    <code>useSubscription</code> React hook manages the full
                    lifecycle — connect on mount, disconnect on unmount,
                    accumulate events, expose connection state.
                </p>
            </div>

            {/* ── Basic Usage ──────────────────────────────────── */}
            <div className="card">
                <h2>Basic Usage</h2>
                <p>
                    Subscription endpoints return a <code>Subscription</code>{' '}
                    handle that is both an <code>AsyncIterable</code> and
                    provides <code>send()</code> / <code>close()</code> methods:
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`// Server-push — consume events
const sub = client.live.events();

for await (const event of sub) {
    console.log(event.action, event.id);
}

// Bidirectional — send and receive
const chat = client.live.chat();
chat.send({ text: 'Hello!' });

for await (const msg of chat) {
    console.log(\`\${msg.user}: \${msg.text}\`);
}`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Connection State ─────────────────────────────── */}
            <div className="card">
                <h2>Connection State</h2>
                <p>
                    The <code>state</code> property reflects the current
                    WebSocket connection status:
                </p>
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>State</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>connecting</code>
                            </td>
                            <td>WebSocket is being established</td>
                        </tr>
                        <tr>
                            <td>
                                <code>connected</code>
                            </td>
                            <td>Connection is open and receiving events</td>
                        </tr>
                        <tr>
                            <td>
                                <code>reconnecting</code>
                            </td>
                            <td>Attempting to re-establish after a drop</td>
                        </tr>
                        <tr>
                            <td>
                                <code>closed</code>
                            </td>
                            <td>Connection is closed</td>
                        </tr>
                    </tbody>
                </table>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const sub = client.live.events();
console.log(sub.state); // 'connecting'

// Close manually
sub.close();

// Or via AbortSignal
const ac = new AbortController();
const sub2 = client.live.events({ signal: ac.signal });
ac.abort(); // closes the WebSocket`)
                        }}
                    />
                </pre>
            </div>

            {/* ── Authentication ───────────────────────────────── */}
            <div className="card">
                <h2>Authentication</h2>
                <p>
                    The browser WebSocket API does not support custom headers.
                    Auth tokens are automatically appended as a{' '}
                    <code>?token=</code> query parameter:
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`const client = createClient(api, {
    baseUrl: 'https://api.example.com',
    getToken: () => localStorage.getItem('token'),
});

// Connects to: wss://api.example.com/ws/events?token=<jwt>
const sub = client.live.events();`)
                        }}
                    />
                </pre>
            </div>

            {/* ── React Hook ──────────────────────────────────── */}
            <div className="card">
                <h2>React — useSubscription</h2>
                <p>
                    The <code>useSubscription</code> hook manages the full
                    subscription lifecycle: connects on mount, disconnects on
                    unmount, and provides reactive state.
                </p>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`import { useSubscription } from '@cleverbrush/client/react';

function LiveFeed() {
    const { events, state, send, close, error } = useSubscription(
        () => client.live.events(),
        { maxEvents: 100 }
    );

    return (
        <div>
            <span>{state}</span>
            {events.map((e, i) => (
                <div key={i}>{e.action} — #{e.id}</div>
            ))}
            <button onClick={close}>Disconnect</button>
        </div>
    );
}`)
                        }}
                    />
                </pre>

                <h3>Return Value</h3>
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Property</th>
                            <th>Type</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>lastEvent</code>
                            </td>
                            <td>
                                <code>T | undefined</code>
                            </td>
                            <td>Most recently received event</td>
                        </tr>
                        <tr>
                            <td>
                                <code>events</code>
                            </td>
                            <td>
                                <code>T[]</code>
                            </td>
                            <td>Accumulated events (newest last)</td>
                        </tr>
                        <tr>
                            <td>
                                <code>state</code>
                            </td>
                            <td>
                                <code>string</code>
                            </td>
                            <td>Connection state</td>
                        </tr>
                        <tr>
                            <td>
                                <code>send</code>
                            </td>
                            <td>
                                <code>(msg) =&gt; void</code>
                            </td>
                            <td>Send a message to the server</td>
                        </tr>
                        <tr>
                            <td>
                                <code>close</code>
                            </td>
                            <td>
                                <code>() =&gt; void</code>
                            </td>
                            <td>Close the subscription</td>
                        </tr>
                        <tr>
                            <td>
                                <code>error</code>
                            </td>
                            <td>
                                <code>Error | undefined</code>
                            </td>
                            <td>Last error, if any</td>
                        </tr>
                    </tbody>
                </table>

                <h3>Options</h3>
                <table className="api-table">
                    <thead>
                        <tr>
                            <th>Option</th>
                            <th>Type</th>
                            <th>Default</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <code>enabled</code>
                            </td>
                            <td>
                                <code>boolean</code>
                            </td>
                            <td>
                                <code>true</code>
                            </td>
                            <td>Toggle the subscription on/off</td>
                        </tr>
                        <tr>
                            <td>
                                <code>maxEvents</code>
                            </td>
                            <td>
                                <code>number</code>
                            </td>
                            <td>unlimited</td>
                            <td>
                                Max events kept in the <code>events</code> array
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Bidirectional Example ─────────────────────────── */}
            <div className="card">
                <h2>Bidirectional Example — Chat</h2>
                <pre>
                    <code
                        dangerouslySetInnerHTML={{
                            __html: highlightTS(`function ChatRoom() {
    const [input, setInput] = useState('');
    const { events, state, send } = useSubscription(
        () => client.live.chat(),
        { maxEvents: 200 }
    );

    const handleSend = () => {
        if (!input.trim()) return;
        send({ text: input });
        setInput('');
    };

    return (
        <div>
            <p>Status: {state}</p>
            <div>
                {events.map((msg, i) => (
                    <p key={i}><b>{msg.user}:</b> {msg.text}</p>
                ))}
            </div>
            <input value={input} onChange={e => setInput(e.target.value)} />
            <button onClick={handleSend} disabled={state !== 'connected'}>
                Send
            </button>
        </div>
    );
}`)
                        }}
                    />
                </pre>
            </div>
        </>
    );
}

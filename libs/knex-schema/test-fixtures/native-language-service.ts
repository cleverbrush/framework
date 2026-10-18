import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { typescriptCli } from '../../../scripts/typescript-cli.mjs';

export type Position = { line: number; character: number };
export type Location = {
    uri: string;
    range: { start: Position; end: Position };
};

/** UTF-16 positions, as used by LSP and JavaScript string offsets. */
export function positionAt(text: string, offset: number): Position {
    const lines = text.slice(0, offset).split('\n');
    return { line: lines.length - 1, character: lines.at(-1)!.length };
}

/** Minimal stdio client for the native compiler's editor regression tests. */
export class NativeLanguageService {
    private child = spawn(
        process.execPath,
        [typescriptCli(), '--lsp', '--stdio'],
        { stdio: ['pipe', 'pipe', 'pipe'] }
    );
    private buffer = Buffer.alloc(0);
    private stderr = '';
    private nextId = 0;
    private pending = new Map<
        number,
        {
            resolve: (value: any) => void;
            reject: (error: Error) => void;
            timer: ReturnType<typeof setTimeout>;
        }
    >();

    constructor() {
        this.child.stdout.on('data', chunk => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            while (true) {
                const headerEnd = this.buffer.indexOf('\r\n\r\n');
                if (headerEnd < 0) break;
                const header = this.buffer.subarray(0, headerEnd).toString();
                const length = Number(
                    /Content-Length: (\d+)/i.exec(header)?.[1]
                );
                if (!Number.isFinite(length)) {
                    this.fail(new Error('Invalid language server frame'));
                    this.child.kill();
                    break;
                }
                const end = headerEnd + 4 + length;
                if (this.buffer.length < end) break;
                const message = JSON.parse(
                    this.buffer.subarray(headerEnd + 4, end).toString()
                );
                this.buffer = this.buffer.subarray(end);
                if (message.method && message.id !== undefined) {
                    // This client requests no dynamic registration or configuration.
                    this.send({ jsonrpc: '2.0', id: message.id, result: null });
                } else if (message.id !== undefined) {
                    const pending = this.pending.get(message.id);
                    if (!pending) continue;
                    clearTimeout(pending.timer);
                    this.pending.delete(message.id);
                    if (message.error)
                        pending.reject(
                            new Error(JSON.stringify(message.error))
                        );
                    else pending.resolve(message.result);
                }
            }
        });
        this.child.stderr.on('data', chunk => {
            this.stderr += chunk;
        });
        this.child.on('error', error => this.fail(error));
        this.child.on('exit', code =>
            this.fail(
                new Error(`Language server exited (${code}): ${this.stderr}`)
            )
        );
    }

    private fail(error: Error) {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
    }

    private send(message: object) {
        const body = JSON.stringify(message);
        this.child.stdin.write(
            `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`
        );
    }

    request<T>(method: string, params: unknown): Promise<T> {
        const id = ++this.nextId;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Language server timed out: ${method}`));
            }, 30_000);
            this.pending.set(id, { resolve, reject, timer });
            this.send({ jsonrpc: '2.0', id, method, params });
        });
    }

    async open(directory: string, sources: Map<string, string>) {
        await this.request('initialize', {
            processId: process.pid,
            rootUri: pathToFileURL(directory).href,
            capabilities: {
                textDocument: {
                    hover: {
                        contentFormat: ['markdown']
                    }
                }
            }
        });
        this.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
        for (const [file, text] of sources) {
            this.send({
                jsonrpc: '2.0',
                method: 'textDocument/didOpen',
                params: {
                    textDocument: {
                        uri: pathToFileURL(file).href,
                        languageId: file.endsWith('.ts')
                            ? 'typescript'
                            : 'javascript',
                        version: 1,
                        text
                    }
                }
            });
        }
    }

    async close() {
        if (this.child.exitCode !== null || this.child.signalCode !== null)
            return;
        const exited = once(this.child, 'exit');
        try {
            await this.request('shutdown', undefined);
            this.send({ jsonrpc: '2.0', method: 'exit' });
        } finally {
            this.child.stdin.end();
            this.child.kill();
            await exited;
        }
    }
}

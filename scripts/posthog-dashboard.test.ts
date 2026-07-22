import { execFile } from 'node:child_process';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * The dashboard script talks to a live PostHog, so the only honest way to test it
 * is to be PostHog: stand up a stub API, run the real script against it, and assert
 * on the calls it made. This exists because a `?dashboards=842020` that should have
 * read `?dashboards=[842020]` reached a creator's repo and answered 500 there.
 */

const SCRIPT = resolve(process.cwd(), 'scripts/posthog-dashboard.mjs');
const INSIGHT_COUNT = 8;
const execFileAsync = promisify(execFile);

type Call = { method: string; url: URL; body: Record<string, unknown> | undefined };

/** A stub PostHog. `dashboards` is what GET /dashboards/ answers with. */
const stubPostHog = async (
  dashboards: Array<Record<string, unknown>>,
  insights: Array<Record<string, unknown>>,
) => {
  const calls: Call[] = [];
  let nextId = 900;

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const url = new URL(req.url ?? '/', 'http://stub');
      calls.push({ method: req.method ?? '', url, body: raw ? JSON.parse(raw) : undefined });

      // Mirror PostHog: `dashboards` is a JSON array. A bare number parses fine and
      // then explodes on iteration, which is exactly how it fails in production.
      const filter = url.searchParams.get('dashboards');
      if (filter !== null && !Array.isArray(JSON.parse(filter))) {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ type: 'server_error', detail: 'A server error occurred.' }));
        return;
      }

      res.writeHead(200, { 'content-type': 'application/json' });
      if (url.pathname.endsWith('/dashboards/') && req.method === 'GET') {
        res.end(JSON.stringify({ results: dashboards }));
      } else if (url.pathname.endsWith('/insights/') && req.method === 'GET') {
        res.end(JSON.stringify({ results: insights }));
      } else {
        res.end(JSON.stringify({ id: nextId++ }));
      }
    });
  };

  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as { port: number };
  return { server, calls, host: `http://127.0.0.1:${port}` };
};

const run = async (host: string): Promise<{ code: number; out: string }> => {
  const env = {
    ...process.env,
    POSTHOG_PERSONAL_API_KEY: 'phx_test',
    POSTHOG_PROJECT_ID: '4242',
    POSTHOG_HOST: host,
  };
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [SCRIPT], { env });
    return { code: 0, out: stdout + stderr };
  } catch (thrown) {
    const err = thrown as { code?: number; stdout?: string; stderr?: string };
    return { code: err.code ?? 1, out: (err.stdout ?? '') + (err.stderr ?? '') };
  }
};

let open: Server | undefined;
afterEach(() => open?.close());

describe('posthog-dashboard script', () => {
  it('creates the dashboard and every insight on a fresh project', async () => {
    const stub = await stubPostHog([], []);
    open = stub.server;

    const { code, out } = await run(stub.host);

    expect(code, out).toBe(0);
    const created = stub.calls.filter((c) => c.method === 'POST');
    expect(created.filter((c) => c.url.pathname.endsWith('/dashboards/'))).toHaveLength(1);
    expect(created.filter((c) => c.url.pathname.endsWith('/insights/'))).toHaveLength(
      INSIGHT_COUNT,
    );
    // Nothing can be on a dashboard made a moment ago, so don't go looking.
    expect(
      stub.calls.some((c) => c.method === 'GET' && c.url.pathname.endsWith('/insights/')),
    ).toBe(false);
  });

  it("asks for a dashboard's insights with a JSON array, not a bare id", async () => {
    const stub = await stubPostHog(
      [{ id: 7, name: 'Chai Analytics ☕', tags: ['buy-me-a-chai'] }],
      [],
    );
    open = stub.server;

    const { code, out } = await run(stub.host);

    expect(code, out).toBe(0);
    const lookup = stub.calls.find(
      (c) => c.method === 'GET' && c.url.pathname.endsWith('/insights/'),
    );
    expect(lookup?.url.searchParams.get('dashboards')).toBe('[7]');
    expect(JSON.parse(lookup?.url.searchParams.get('dashboards') ?? 'null')).toEqual([7]);
  });

  it('updates an insight it already made instead of duplicating it', async () => {
    const stub = await stubPostHog(
      [{ id: 7, name: 'Chai Analytics ☕', tags: ['buy-me-a-chai'] }],
      [{ id: 31, name: 'Visitors (unique)' }],
    );
    open = stub.server;

    const { code, out } = await run(stub.host);

    expect(code, out).toBe(0);
    expect(stub.calls.filter((c) => c.method === 'PATCH').map((c) => c.url.pathname)).toEqual([
      '/api/projects/4242/insights/31/',
    ]);
    expect(stub.calls.filter((c) => c.method === 'POST')).toHaveLength(INSIGHT_COUNT - 1);
  });

  it('fails loudly when PostHog rejects a call', async () => {
    const stub = await stubPostHog([], []);
    open = stub.server;
    stub.server.removeAllListeners('request');
    stub.server.on('request', (_req, res) => {
      res.writeHead(403, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ detail: 'Permission denied' }));
    });

    const { code, out } = await run(stub.host);

    expect(code).toBe(1);
    expect(out).toContain('403');
    expect(out).toContain('dashboard:write');
  });
});

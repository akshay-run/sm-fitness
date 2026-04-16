/**
 * Polyfills that must run BEFORE any other setup.
 * Loaded via jest.config.ts `setupFiles` (runs before `setupFilesAfterEnv`).
 *
 * Uses Node.js built-in APIs to fill gaps in jsdom, then loads undici
 * for Request/Response/Headers/fetch.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const util = require("node:util");

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = util.TextEncoder;
}
if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = util.TextDecoder;
}

// ReadableStream / WritableStream etc. from node:stream/web
const webStreams = require("node:stream/web");
const g = globalThis as Record<string, unknown>;
const ws = webStreams as Record<string, unknown>;
for (const key of [
  "ReadableStream",
  "WritableStream",
  "TransformStream",
  "ByteLengthQueuingStrategy",
  "CountQueuingStrategy",
]) {
  if (!g[key] && ws[key]) {
    g[key] = ws[key];
  }
}

// MessagePort, MessageChannel, BroadcastChannel from node:worker_threads
try {
  const wt = require("node:worker_threads");
  if (!globalThis.MessagePort) globalThis.MessagePort = wt.MessagePort;
  if (!globalThis.MessageChannel) globalThis.MessageChannel = wt.MessageChannel;
  if (!globalThis.BroadcastChannel) globalThis.BroadcastChannel = wt.BroadcastChannel;
} catch {
  // not critical
}

// setImmediate / clearImmediate (needed by undici timers)
if (!globalThis.setImmediate) {
  globalThis.setImmediate = ((fn: (...args: unknown[]) => void, ...args: unknown[]) =>
    setTimeout(fn, 0, ...args)) as unknown as typeof setImmediate;
}
if (!globalThis.clearImmediate) {
  globalThis.clearImmediate = ((id: ReturnType<typeof setTimeout>) =>
    clearTimeout(id)) as unknown as typeof clearImmediate;
}

// structuredClone
if (!globalThis.structuredClone) {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

// performance.markResourceTiming stub (undici's fetch calls this)
if (typeof globalThis.performance !== "undefined") {
  const perf = globalThis.performance as unknown as Record<string, unknown>;
  if (!perf.markResourceTiming) {
    perf.markResourceTiming = () => {};
  }
}

// Request, Response, Headers, fetch – use undici NOW that all deps exist
const undici = require("undici");
if (!globalThis.Request) globalThis.Request = undici.Request;
if (!globalThis.Response) globalThis.Response = undici.Response;
if (!globalThis.Headers) globalThis.Headers = undici.Headers;
if (!globalThis.fetch) globalThis.fetch = undici.fetch;
if (!globalThis.FormData) globalThis.FormData = undici.FormData;

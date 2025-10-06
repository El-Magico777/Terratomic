// tests/perf/ws_perf_harness.ts
// Minimal, self-contained WebSocket broadcast benchmark.
// Usage examples:
//   npx tsx tests/perf/ws_perf_harness.ts --impl=ws --clients=500 --rate=20 --size=256 --duration=30
//   WS_IMPL=ultimate npx tsx tests/perf/ws_perf_harness.ts --clients=500
//
// NOTE: This does NOT hit the Terratomic game server or its auth; it's an isolated WS-only benchmark
// to compare library overhead (ws vs ultimate-ws) apples-to-apples.

import http from "http";
import { setTimeout as delay } from "timers/promises";

// ---- CLI args ----
type Args = {
  impl: "ws" | "ultimate";
  port: number;
  clients: number;
  rate: number; // messages per second broadcast
  size: number; // bytes per payload
  duration: number; // seconds of measurement (excludes warmup)
  warmup: number; // seconds
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const asMap = new Map<string, string>();
  for (const a of argv) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) asMap.set(m[1], m[2]);
  }
  const envImpl = process.env.WS_IMPL as "ws" | "ultimate" | undefined;
  const impl = (asMap.get("impl") ?? envImpl ?? "ws") as "ws" | "ultimate";
  return {
    impl,
    port: parseInt(asMap.get("port") ?? "19090", 10),
    clients: parseInt(asMap.get("clients") ?? "300", 10),
    rate: parseInt(asMap.get("rate") ?? "20", 10),
    size: parseInt(asMap.get("size") ?? "256", 10),
    duration: parseInt(asMap.get("duration") ?? "20", 10),
    warmup: parseInt(asMap.get("warmup") ?? "5", 10),
  };
}

// ---- Server factory (ws | ultimate-ws) ----
type ServerBundle = {
  server: http.Server;
  wss: any; // WebSocketServer
  broadcast: (payload: string) => void;
  close: () => Promise<void>;
};

async function makeServer(
  impl: "ws" | "ultimate",
  port: number,
): Promise<ServerBundle> {
  const server = http.createServer();
  let WebSocketServerCtor: any;

  if (impl === "ws") {
    const { WebSocketServer } = await import("ws");
    WebSocketServerCtor = WebSocketServer;
  } else {
    // ultimate-ws is optional; if not installed, fail with a clear message
    try {
      // @ts-expect-error ultimate-ws is an optional dependency
      const { WebSocketServer } = await import("ultimate-ws");
      WebSocketServerCtor = WebSocketServer;
    } catch (e) {
      console.error(
        "ultimate-ws not found. Install it first: npm i ultimate-ws",
      );
      process.exit(1);
    }
  }

  const wss = new WebSocketServerCtor({ server });
  const sockets = new Set<any>();
  wss.on("connection", (ws: any) => {
    sockets.add(ws);
    ws.on("close", () => sockets.delete(ws));
    ws.on("error", () => sockets.delete(ws));
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));

  return {
    server,
    wss,
    broadcast: (payload: string) => {
      for (const ws of sockets) {
        if (ws.readyState === 1 /* OPEN */) {
          ws.send(payload);
        }
      }
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

// ---- Client factory ----
async function spawnClients(count: number, port: number) {
  const { default: WebSocket } = await import("ws"); // browser-like client for both impls
  const all: any[] = [];
  const connected: any[] = [];

  await Promise.all(
    Array.from({ length: count }, async (_, i) => {
      await delay(Math.floor(Math.random() * 5)); // small jitter
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      all.push(ws);
      await new Promise<void>((resolve) => {
        ws.on("open", () => {
          connected.push(ws);
          resolve();
        });
        ws.on("error", () => resolve()); // ignore
      });
    }),
  );

  return { all, connected };
}

// ---- Metrics helpers ----
function hrtimeNs(): bigint {
  const [s, ns] = process.hrtime();
  return BigInt(s) * 1_000_000_000n + BigInt(ns);
}

function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

// ---- Main ----
(async () => {
  const args = parseArgs();
  const payloadBody = "x".repeat(Math.max(0, args.size - 16)); // reserve for timestamp/meta
  const server = await makeServer(args.impl, args.port);

  // Spawn clients
  const { connected } = await spawnClients(args.clients, args.port);

  // Each client measures receive latency (server-stamped ts)
  const latencies: number[] = [];
  let delivered = 0;

  const onMsg = (data: any) => {
    try {
      const str = typeof data === "string" ? data : data.toString();
      const ts = Number(str.slice(0, 13)); // ms timestamp in first 13 chars
      const now = Date.now();
      if (!Number.isNaN(ts)) {
        latencies.push(now - ts);
      }
      delivered++;
    } catch {
      // ignore
    }
  };
  for (const ws of connected) ws.on("message", onMsg);

  // Warmup
  const warmupEnd = Date.now() + args.warmup * 1000;
  const warmupPayload = () => `${Date.now()}${payloadBody}`;
  while (Date.now() < warmupEnd) {
    server.broadcast(warmupPayload());
    await delay(1000 / Math.max(1, args.rate));
  }

  // Measure
  const cpuStart = process.cpuUsage();
  const rssStart = process.memoryUsage().rss;
  const end = Date.now() + args.duration * 1000;
  const tickDelay = 1000 / Math.max(1, args.rate);
  while (Date.now() < end) {
    server.broadcast(`${Date.now()}${payloadBody}`);
    await delay(tickDelay);
  }
  const cpuEnd = process.cpuUsage(cpuStart);
  const rssEnd = process.memoryUsage().rss;

  // Cleanup
  for (const ws of connected) {
    try {
      ws.close();
    } catch {
      // ignore
    }
  }
  await server.close();

  // Results
  const avgLatency = latencies.length
    ? latencies.reduce((a, b) => a + b, 0) / latencies.length
    : 0;
  const result = {
    impl: args.impl,
    clients: args.clients,
    rate: args.rate,
    size: args.size,
    duration_s: args.duration,
    delivered_msgs: delivered,
    delivered_msgs_per_sec: Math.round(delivered / args.duration),
    avg_latency_ms: Number(avgLatency.toFixed(2)),
    p95_latency_ms: Number(p95(latencies).toFixed(2)),
    cpu_user_ms: Math.round(cpuEnd.user / 1000),
    cpu_system_ms: Math.round(cpuEnd.system / 1000),
    rss_delta_mb: Number(((rssEnd - rssStart) / (1024 * 1024)).toFixed(2)),
    node: process.version,
  };

  console.log(JSON.stringify(result));
})();

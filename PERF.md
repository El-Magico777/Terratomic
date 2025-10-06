# Terratomic WebSocket Perf Notes

## How to run (baseline with `ws`)

```bash
npm run perf:ws-baseline
# or push harder:
npm run perf:ws-heavy
```

Paste JSON outputs here:

```
<!-- baseline outputs go here -->
```

## After migration to `ultimate-ws`

Install and rerun same scenarios:

```bash
npm i ultimate-ws
npm run perf:ultimate-same
```

Paste JSON outputs for A/B comparison:

```
<!-- ultimate outputs go here -->
```

## Suggested quick compare fields

- `delivered_msgs_per_sec`
- `avg_latency_ms`, `p95_latency_ms`
- `cpu_user_ms + cpu_system_ms`
- `rss_delta_mb`

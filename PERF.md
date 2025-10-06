# Terratomic WebSocket Perf Notes

## How to run (baseline with `ws`)

```bash
npm run perf:ws-baseline
# or push harder:
npm run perf:ws-heavy
```

Paste JSON outputs here:

```
{"impl":"ws","clients":300,"rate":20,"size":256,"duration_s":20,"delivered_msgs":105560,"delivered_msgs_per_sec":5278,"avg_latency_ms":5.59,"p95_latency_ms":8,"cpu_user_ms":766,"cpu_system_ms":1375,"rss_delta_mb":-2.35,"node":"v22.16.0"}
{"impl":"ws","clients":800,"rate":30,"size":256,"duration_s":30,"delivered_msgs":200112,"delivered_msgs_per_sec":6670,"avg_latency_ms":5.31,"p95_latency_ms":7,"cpu_user_ms":2047,"cpu_system_ms":2359,"rss_delta_mb":-3.49,"node":"v22.16.0"}
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

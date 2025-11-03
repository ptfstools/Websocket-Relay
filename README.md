# 🛰️ Data Relay Server

A **WebSocket relay server** that connects local clients to an **upstream WebSocket feed**.  
It includes built-in **rate limiting**, **auto-reconnect**, and **keep-alive** mechanisms to ensure stable, controlled communication between clients and the upstream data source.

---

## 🚀 Features

✅ **Local WebSocket relay** — runs on `ws://localhost:80` by default.  
✅ **Upstream bridge** — connects to `wss://24data.ptfs.app/wss`.  
✅ **Rate limiting** — prevents spam (max 5 requests per 10 seconds).  
✅ **Auto-reconnect** — exponentially retries upstream connection when lost.  
✅ **Keep-alive (ping/pong)** — monitors both client and upstream connection health.  
✅ **Broadcasting** — forwards all upstream messages to connected local clients.

---

## ⚙️ Installation

1. Make sure you have **Node.js v16+** installed.  
2. Clone or download this repository:
   ```bash
   git clone https://github.com/ptfstools/Websocket-Relay.git
   cd Websocket-Relay
   ```
3. Install dependencies:
   ```bash
   npm i
   ```
4. Run the relay server:
   ```bash
   node index.js
   ```

---

## 🌐 Default Configuration

| Setting | Description | Default |
|----------|--------------|----------|
| `UPSTREAM_URL` | The upstream WebSocket server URL | `wss://24data.ptfs.app/wss` |
| `LOCAL_PORT` | The local WebSocket server port | `80` |
| `MAX_REQUESTS` | Max messages per time window | `5` |
| `WINDOW_MS` | Rate limit window duration (ms) | `10000` |
| `KEEPALIVE_INTERVAL` | Ping interval for connection health | `20000` |
| `MAX_RECONNECT_DELAY` | Max time before retry (ms) | `30000` |

You can modify these constants at the top of the file to suit your setup.

---

## 📡 How It Works

### 🧩 Architecture

```
[Local Clients] ⇄ [Local Relay Server] ⇄ [Upstream Server]
```

1. Clients connect to the relay server at `ws://localhost:80`.  
2. The relay connects to a upstream websocket server.  
3. Incoming upstream messages are **broadcast** to all connected local clients.  
4. Client messages are **rate-limited** and sent upstream.  
5. Connection health is maintained via periodic pings and automatic reconnections.

---

## 🔁 Auto Reconnect Logic

If the upstream connection closes or fails:
- The server waits 1s before reconnecting.
- On repeated failures, the delay doubles (up to 30s max).
- Once reconnected, delay resets to 1s.

---

## 🧱 Dependencies

- [`ws`](https://www.npmjs.com/package/ws) — WebSocket client and server for Node.js.

Install it with:
```bash
npm i
```

---

## 🧰 Troubleshooting

| Issue | Cause | Solution |
|--------|--------|-----------|
| `EADDRINUSE` | Port 80 already in use | Change `LOCAL_PORT` to another port (e.g. 8080) |
| “Upstream not responding” | Upstream server down or unreachable | Wait for auto-reconnect or check upstream availability |
| Messages dropped | Upstream not connected | Ensure connection established before sending data |

---

I generated This README using ChatGPT

MIT License © 2025 — Created by **awdevSoftware**  
Feel free to modify and distribute with attribution.

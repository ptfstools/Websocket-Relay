const WebSocket = require("ws");
const { WebSocketServer } = require("ws");

const UPSTREAM_URL = "wss://24data.ptfs.app/wss";
const LOCAL_PORT = 80;

const MAX_REQUESTS = 5; // per 10s
const WINDOW_MS = 10000;
const KEEPALIVE_INTERVAL = 20000;
const MAX_RECONNECT_DELAY = 30000;

class RateLimiter {
  constructor(limit = 5, interval = 10000) {
    this.limit = limit;
    this.interval = interval;
    this.queue = [];
    this.active = 0;
    setInterval(() => {
      this.active = 0;
      this.processQueue();
    }, this.interval);
  }
  processQueue() {
    while (this.queue.length > 0 && this.active < this.limit) {
      const next = this.queue.shift();
      this.active++;
      next();
    }
  }
  enqueue(task) {
    this.queue.push(task);
    this.processQueue();
  }
  async exec(fn) {
    return new Promise((resolve, reject) => {
      this.enqueue(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

const limiter = new RateLimiter(MAX_REQUESTS, WINDOW_MS);

const wss = new WebSocketServer({ port: LOCAL_PORT });
console.log(`✅ Relay server running on ws://localhost:${LOCAL_PORT}`);

let upstream = null;
let reconnectDelay = 1000;
let reconnecting = false;

function connectUpstream() {
  if (upstream && upstream.readyState === WebSocket.OPEN) return;
  if (reconnecting) return;
  reconnecting = true;

  console.log(`🔌 Connecting to upstream: ${UPSTREAM_URL}`);
  const ws = new WebSocket(UPSTREAM_URL);
  upstream = ws;

  let alive = true;

  ws.on("open", () => {
    console.log("🟢 Connected to upstream WebSocket");
    reconnecting = false;
    reconnectDelay = 1000;

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        if (!alive) {
          console.warn("⚠️ Upstream not responding, reconnecting...");
          ws.terminate();
          clearInterval(pingInterval);
          return;
        }
        alive = false;
        ws.ping();
      } else clearInterval(pingInterval);
    }, KEEPALIVE_INTERVAL);
  });

  ws.on("pong", () => (alive = true));

  ws.on("message", (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });

  ws.on("close", () => {
    console.warn("⚠️ Upstream connection closed.");
    scheduleReconnect();
  });

  ws.on("error", (err) => {
    console.error("❌ Upstream error:", err.message);
    try {
      ws.close();
    } catch {}
  });
}

function scheduleReconnect() {
  if (reconnecting) return;
  reconnecting = true;
  console.log(`⏳ Reconnecting in ${reconnectDelay / 1000}s...`);
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    reconnecting = false;
    connectUpstream();
  }, reconnectDelay);
}

wss.on("connection", (client, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`🔗 New client connected from ${ip}`);

  let alive = true;
  const interval = setInterval(() => {
    if (client.readyState === WebSocket.OPEN) {
      if (!alive) {
        console.warn(`⚠️ Client ${ip} did not respond to ping, closing`);
        client.terminate();
        clearInterval(interval);
        return;
      }
      alive = false;
      client.ping();
    } else clearInterval(interval);
  }, KEEPALIVE_INTERVAL);

  client.on("pong", () => (alive = true));

  client.on("message", async (msg) => {
    if (upstream && upstream.readyState === WebSocket.OPEN) {
      await limiter.exec(() => {
        upstream.send(msg.toString());
        console.log(`📤 Sent upstream (rate-limited)`);
      });
    } else {
      console.warn("⚠️ Upstream not connected — message dropped.");
    }
  });

  client.on("close", () => console.log(`❌ Client ${ip} disconnected`));
});

setInterval(() => {
  if (!upstream || upstream.readyState === WebSocket.CLOSED) connectUpstream();
}, 5000);

connectUpstream();

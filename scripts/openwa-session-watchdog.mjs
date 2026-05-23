import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const loadDotEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((accumulator, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return accumulator;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (key && !(key in accumulator)) {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});
};

const fileEnv = loadDotEnvFile(".dev.vars");
const env = {
  ...fileEnv,
  ...process.env,
};

const normalizeString = (value, maxLength = 1000) =>
  typeof value === "string"
    ? value
        .trim()
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, maxLength)
    : "";

const adminApiKeyPath = join(process.cwd(), "external", "openwa", "data", ".api-key");
const resolvedAdminApiKey =
  normalizeString(env.OPENWA_ADMIN_API_KEY || env.OPENWA_LOCAL_ADMIN_API_KEY, 200) ||
  (existsSync(adminApiKeyPath) ? normalizeString(readFileSync(adminApiKeyPath, "utf8"), 200) : "");

const openWaBaseUrl = normalizeString(env.OPENWA_LOCAL_BASE_URL || "http://127.0.0.1:2785", 300).replace(/\/$/, "");
const sessionId = normalizeString(env.OPENWA_SESSION_ID || env.OPENWA_LOCAL_SESSION_ID, 120);
const pollIntervalMs = Math.max(Number(env.OPENWA_WATCHDOG_INTERVAL_MS || "60000"), 15000);
const retryCooldownMs = Math.max(Number(env.OPENWA_WATCHDOG_RESTART_COOLDOWN_MS || "120000"), 30000);
const sessionApiPath = `${openWaBaseUrl}/api/sessions/${sessionId}`;

if (!resolvedAdminApiKey || !sessionId || !openWaBaseUrl) {
  throw new Error("Missing OPENWA session watchdog configuration");
}

let lastRestartAttemptAt = 0;
let lastObservedStatus = "";

const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": resolvedAdminApiKey,
      ...(options.headers || {}),
    },
  });

  const text = await response.text().catch(() => "");
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch (error) {
      body = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
};

const inspectSession = async () => {
  const response = await fetchJson(sessionApiPath);

  if (!response.ok) {
    throw new Error(`Session lookup failed: ${response.status}`);
  }

  return response.body;
};

const startSession = async () => {
  const response = await fetchJson(`${sessionApiPath}/start`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: "{}",
  });

  if (!response.ok && response.body?.message !== "Session is already started") {
    throw new Error(`Session start failed: ${response.status}`);
  }
};

const tick = async () => {
  try {
    const session = await inspectSession();
    const status = normalizeString(session?.status, 80).toLowerCase();

    if (status && status !== lastObservedStatus) {
      log(`Session ${sessionId} status: ${status}`);
      lastObservedStatus = status;
    }

    if (status === "disconnected") {
      const now = Date.now();

      if (now - lastRestartAttemptAt >= retryCooldownMs) {
        lastRestartAttemptAt = now;
        log(`Session ${sessionId} disconnected. Attempting restart.`);
        await startSession();
      }
    } else if (status === "qr_ready") {
      log(`Session ${sessionId} needs a QR re-link to continue.`);
    }
  } catch (error) {
    log(`Watchdog check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

log(`OpenWA watchdog started for session ${sessionId}`);
await tick();
setInterval(() => {
  void tick();
}, pollIntervalMs);

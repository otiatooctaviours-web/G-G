import http from "node:http";
import { existsSync, readFileSync } from "node:fs";

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

const bridgeToken = env.OPENWA_BRIDGE_TOKEN || env.OPENWA_BRIDGE_SECRET || "";
const openWaBaseUrl = (env.OPENWA_LOCAL_BASE_URL || env.OPENWA_BASE_URL || "http://127.0.0.1:2785").replace(/\/$/, "");
const openWaApiKey = env.OPENWA_LOCAL_API_KEY || env.OPENWA_API_KEY || "";
const defaultSessionId = env.OPENWA_LOCAL_SESSION_ID || env.OPENWA_SESSION_ID || "";
const listenHost = env.OPENWA_BRIDGE_HOST || "127.0.0.1";
const listenPort = Number(env.OPENWA_BRIDGE_PORT || "8789");

if (!bridgeToken || !openWaApiKey || !defaultSessionId) {
  throw new Error("Missing OPENWA_BRIDGE_TOKEN, OPENWA_API_KEY, or OPENWA_SESSION_ID for the OpenWA bridge");
}

const normalizeString = (value, maxLength = 1000) =>
  typeof value === "string"
    ? value
        .trim()
        .replace(/[\u0000-\u001f\u007f]+/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, maxLength)
    : "";

const json = (res, statusCode, body) => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
};

const hasExactMatch = (firstValue, secondValue) => {
  if (typeof firstValue !== "string" || typeof secondValue !== "string" || firstValue.length !== secondValue.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < firstValue.length; index += 1) {
    mismatch |= firstValue.charCodeAt(index) ^ secondValue.charCodeAt(index);
  }

  return mismatch === 0;
};

const readRequestBody = async (req, maxBytes = 8 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "POST" || req.url !== "/send-text") {
      json(res, 404, { error: "Not Found" });
      return;
    }

    const providedToken = normalizeString(req.headers["x-openwa-bridge-token"], 200);

    if (!hasExactMatch(providedToken, bridgeToken)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const contentType = normalizeString(req.headers["content-type"], 120).toLowerCase();

    if (!contentType.includes("application/json")) {
      json(res, 415, { error: "Content-Type must be application/json" });
      return;
    }

    const rawBody = await readRequestBody(req);
    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      json(res, 400, { error: "Invalid JSON payload" });
      return;
    }

    const chatId = normalizeString(payload?.chatId, 120);
    const text = normalizeString(payload?.text, 3500);
    const sessionId = normalizeString(payload?.sessionId, 120) || defaultSessionId;

    if (!chatId || !text || !sessionId) {
      json(res, 400, { error: "Missing chatId, text, or sessionId" });
      return;
    }

    const response = await fetch(`${openWaBaseUrl}/api/sessions/${sessionId}/messages/send-text`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": openWaApiKey,
      },
      body: JSON.stringify({ chatId, text }),
    });

    const responseText = await response.text().catch(() => "");
    let responseBody = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (error) {
        responseBody = null;
      }
    }

    if (!response.ok) {
      json(res, 502, { error: "Upstream OpenWA send failed" });
      return;
    }

    json(res, 200, {
      ok: true,
      provider: "openwa-bridge",
      messageId: responseBody?.id || responseBody?.data?.id || null,
    });
  } catch (error) {
    json(res, 500, { error: "Bridge request failed" });
  }
});

server.listen(listenPort, listenHost, () => {
  console.log(`OpenWA bridge listening on http://${listenHost}:${listenPort}`);
});

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";
  const isLocalHost = hostname === "127.0.0.1" || hostname === "localhost";

  const env = context.env || {};
  const textEncoder = new TextEncoder();
  const defaultFormspreeEndpoint = "https://formspree.io/f/xlgwyzwb";
  const defaultAutomationWebhookUrl =
    "https://script.google.com/macros/s/AKfycbzzJmYV5EX5i34Zm5f1aVRiRL4j6hwX6ersysrZ5AaG0YJ54UXYEnCu2fPDhfheG9tm/exec";
  const siteOrigin = (env.SITE_URL || url.origin).replace(/\/$/, "");
  const resolvedSiteOrigin = (() => {
    try {
      return new URL(siteOrigin).origin;
    } catch (error) {
      return url.origin;
    }
  })();

  const base64 = (str) => {
    if (typeof btoa === "function") return btoa(str);
    if (typeof Buffer !== "undefined") return Buffer.from(str).toString("base64");
    throw new Error("No base64 encoder available");
  };

  const json = (body, init = {}) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, private, max-age=0",
        Pragma: "no-cache",
        "Referrer-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        ...(init.headers || {}),
      },
    });

  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const trimString = (value, maxLength = 1000) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";

  const normalizeSingleLine = (value, maxLength = 1000) =>
    trimString(value, maxLength)
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeMultiline = (value, maxLength = 2500) =>
    trimString(value, maxLength)
      .replace(/\r\n/g, "\n")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const isEmailAddress = (value) => /\S+@\S+\.\S+/.test(value);

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

  const sanitizeUrlValue = (value, { maxLength = 500, sameOriginOnly = false, fallback = "" } = {}) => {
    const candidate = normalizeSingleLine(value, maxLength);

    if (!candidate) {
      return fallback;
    }

    try {
      const parsed = new URL(candidate, resolvedSiteOrigin);

      if (!/^https?:$/.test(parsed.protocol)) {
        return fallback;
      }

      if (sameOriginOnly && parsed.origin !== resolvedSiteOrigin) {
        return fallback;
      }

      return parsed.toString();
    } catch (error) {
      return fallback;
    }
  };

  const byteLength = (value) => textEncoder.encode(value).byteLength;

  const parseJsonBody = async (request, { maxBytes = 16 * 1024, requireJson = true } = {}) => {
    const contentType = trimString(request.headers.get("Content-Type"), 120).toLowerCase();

    if (requireJson && !contentType.includes("application/json")) {
      return { error: "Content-Type must be application/json", status: 415 };
    }

    const rawBody = await request.text();

    if (byteLength(rawBody) > maxBytes) {
      return { error: "Payload too large", status: 413 };
    }

    try {
      return {
        value: rawBody ? JSON.parse(rawBody) : {},
        rawBody,
      };
    } catch (error) {
      return { error: "Invalid JSON payload", status: 400 };
    }
  };

  const isTrustedBrowserLeadRequest = (request) => {
    if (isLocalHost) {
      return true;
    }

    const secFetchSite = trimString(request.headers.get("Sec-Fetch-Site"), 40).toLowerCase();

    if (secFetchSite === "cross-site") {
      return false;
    }

    const origin = trimString(request.headers.get("Origin"), 300);

    if (origin) {
      return origin === resolvedSiteOrigin;
    }

    const referer = trimString(request.headers.get("Referer"), 500);

    if (referer) {
      return referer === resolvedSiteOrigin || referer.startsWith(`${resolvedSiteOrigin}/`);
    }

    return false;
  };

  const normalizePhoneNumber = (value) => {
    const digits = trimString(value, 40).replace(/[^\d+]/g, "");
    if (!digits) {
      return "";
    }

    let normalized = digits.startsWith("+") ? digits.slice(1) : digits;

    if (normalized.startsWith("00")) {
      normalized = normalized.slice(2);
    }

    if (/^0\d{9}$/.test(normalized)) {
      return `254${normalized.slice(1)}`;
    }

    if (/^[17]\d{8}$/.test(normalized)) {
      return `254${normalized}`;
    }

    if (/^254\d{9}$/.test(normalized)) {
      return normalized;
    }

    if (/^\d{10,15}$/.test(normalized)) {
      return normalized;
    }

    return "";
  };

  const toWhatsAppChatId = (value) => {
    const normalizedPhone = normalizePhoneNumber(value);
    return normalizedPhone ? `${normalizedPhone}@c.us` : "";
  };

  const resolveWhatsAppProvider = () => trimString(env.WHATSAPP_PROVIDER || "openwa", 40).toLowerCase();

  const resolveNotifyChatId = () => {
    const configured = trimString(env.OPENWA_NOTIFY_CHAT_ID || env.OPENWA_NOTIFY_PHONE, 80);
    if (!configured) {
      return "";
    }

    return configured.includes("@") ? configured : toWhatsAppChatId(configured);
  };

  const normalizeBoolean = (value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      return /^(1|true|yes|y|on)$/i.test(value.trim());
    }

    return false;
  };

  const normalizeKey = (value, maxLength = 80) =>
    trimString(value, maxLength)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const resolveOpsToken = () => trimString(env.WHATSAPP_ADMIN_TOKEN || env.INTERNAL_API_TOKEN, 200);

  const getProvidedOpsToken = (request) => {
    const authorization = trimString(request.headers.get("Authorization"), 300);

    if (authorization.toLowerCase().startsWith("bearer ")) {
      return trimString(authorization.slice(7), 200);
    }

    return trimString(request.headers.get("X-WhatsApp-Admin-Token") || request.headers.get("X-Internal-Api-Token"), 200);
  };

  const isAuthorizedOpsRequest = (request) => {
    const expectedToken = resolveOpsToken();

    if (!expectedToken) {
      return { ok: false, reason: "missing-admin-token-config" };
    }

    const providedToken = getProvidedOpsToken(request);

    if (!providedToken) {
      return { ok: false, reason: "missing-admin-token" };
    }

    return {
      ok: hasExactMatch(providedToken, expectedToken),
      reason: "invalid-admin-token",
    };
  };

  const requireAuthorizedOpsRequest = (request) => {
    const authResult = isAuthorizedOpsRequest(request);

    if (authResult.ok) {
      return null;
    }

    if (authResult.reason === "missing-admin-token-config") {
      return json({ error: "WhatsApp admin token not configured" }, { status: 503 });
    }

    return json({ error: "Unauthorized" }, { status: 401 });
  };

  const createOpenWaSignature = async (payload, secret) => {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      textEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(payload));
    return `sha256=${toHex(signature)}`;
  };

  const getOAuthToken = async () => {
    const consumerKey = env.MPESA_CONSUMER_KEY;
    const consumerSecret = env.MPESA_CONSUMER_SECRET;
    const mpesaEnv = (env.MPESA_ENV || "sandbox").toLowerCase();

    if (!consumerKey || !consumerSecret) {
      throw new Error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in environment");
    }

    const oauthUrl =
      mpesaEnv === "production"
        ? "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        : "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const basic = base64(`${consumerKey}:${consumerSecret}`);
    const tokenRes = await fetch(oauthUrl, {
      headers: {
        Authorization: `Basic ${basic}`,
      },
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => "");
      throw new Error(`OAuth token request failed: ${tokenRes.status} ${text}`);
    }

    const tokenJson = await tokenRes.json();
    return tokenJson.access_token;
  };

  const initiateStkPush = async ({ amount, phone, accountReference = "Subscription", description = "Subscription payment" }) => {
    const mpesaEnv = (env.MPESA_ENV || "sandbox").toLowerCase();
    const passkey = env.MPESA_PASSKEY;
    const businessShortCode = env.MPESA_BUSINESS_SHORTCODE || env.MPESA_PAYBILL || env.MPESA_TILL_CODE;

    if (!passkey || !businessShortCode) {
      throw new Error("Missing MPESA_PASSKEY or MPESA_BUSINESS_SHORTCODE in environment");
    }

    const accessToken = await getOAuthToken();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const password = base64(`${businessShortCode}${passkey}${timestamp}`);

    const stkUrl =
      mpesaEnv === "production"
        ? "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        : "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const callbackUrl = env.MPESA_CALLBACK_URL || `${url.origin}/mpesa/stk-callback`;

    const body = {
      BusinessShortCode: businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Number(amount),
      PartyA: phone,
      PartyB: businessShortCode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: description,
    };

    const stkRes = await fetch(stkUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const stkJson = await stkRes.json().catch(() => ({}));
    return { status: stkRes.status, body: stkJson };
  };

  const sendWhatsAppText = async ({ chatId, text, sessionId }) => {
    const provider = resolveWhatsAppProvider();

    if (!chatId || !text) {
      return { ok: false, skipped: "missing-recipient-or-text" };
    }

    if (provider !== "openwa") {
      return { ok: false, skipped: `unsupported-provider:${provider}` };
    }

    const baseUrl = trimString(env.OPENWA_BASE_URL, 300).replace(/\/$/, "");
    const apiKey = trimString(env.OPENWA_API_KEY, 200);
    const bridgeToken = trimString(env.OPENWA_BRIDGE_TOKEN, 200);
    const resolvedSessionId = trimString(sessionId || env.OPENWA_SESSION_ID, 120);

    if (!baseUrl || !resolvedSessionId || (!bridgeToken && !apiKey)) {
      return { ok: false, skipped: "missing-openwa-config" };
    }

    const usingBridge = Boolean(bridgeToken);
    const response = await fetch(usingBridge ? `${baseUrl}/send-text` : `${baseUrl}/api/sessions/${resolvedSessionId}/messages/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(usingBridge ? { "x-openwa-bridge-token": bridgeToken } : { "x-api-key": apiKey }),
      },
      body: JSON.stringify(
        usingBridge
          ? {
              chatId,
              text,
              sessionId: resolvedSessionId,
            }
          : {
              chatId,
              text,
            }
      ),
    });

    const responseText = await response.text().catch(() => "");
    let responseBody = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (error) {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      const detail =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.message || responseBody?.error || response.statusText;
      throw new Error(`OpenWA send failed: ${response.status} ${detail}`.trim());
    }

    return {
      ok: true,
      provider,
      status: response.status,
      body: responseBody,
    };
  };

  const buildFriendlyRecipientName = ({ recipientName, company, fallback = "there" } = {}) =>
    normalizeSingleLine(recipientName || company, 120) || fallback;

  const buildWarmFollowUpMessage = ({ recipientName, company, stage, service, actionUrl, note }) => {
    const name = buildFriendlyRecipientName({ recipientName, company });
    const normalizedStage = normalizeKey(stage || "new_lead", 80);
    const safeService = normalizeSingleLine(service, 160) || "your project";
    const safeNote = normalizeMultiline(note, 500);
    const safeActionUrl = sanitizeUrlValue(actionUrl, { maxLength: 500, fallback: `${siteOrigin}/#contact` });

    const stageTemplates = {
      new_lead: [
        `Hi ${name}, thanks again for reaching out to G&G Marketing about ${safeService}.`,
        "Checking in to see whether you would like us to recommend the best next step.",
        `You can reply here or use ${safeActionUrl}.`,
      ],
      quote_follow_up: [
        `Hi ${name}, following up on your quote request for ${safeService}.`,
        "If you want, we can turn it into a clear scope and next-step plan for you.",
        `Reply here or use ${safeActionUrl}.`,
      ],
      consultation_reminder: [
        `Hi ${name}, this is a quick reminder from G&G Marketing about your consultation request.`,
        "If you want us to lock in a time, reply here and we will confirm it with you.",
        `You can also review details at ${safeActionUrl}.`,
      ],
      proposal_follow_up: [
        `Hi ${name}, just checking whether you had time to review the proposal for ${safeService}.`,
        "We can adjust the scope, timing, or rollout if needed.",
        `Reply here or continue at ${safeActionUrl}.`,
      ],
      no_reply_nudge: [
        `Hi ${name}, sharing a quick follow-up in case you still need support with ${safeService}.`,
        "We are happy to help when you are ready.",
        `You can reach us directly at ${safeActionUrl}.`,
      ],
    };

    const lines = stageTemplates[normalizedStage] || stageTemplates.new_lead;

    if (safeNote) {
      lines.push(`Note: ${safeNote}`);
    }

    return lines.join("\n");
  };

  const buildTemplateMessage = ({ template, recipientName, company, service, actionUrl, note }) => {
    const name = buildFriendlyRecipientName({ recipientName, company });
    const safeService = normalizeSingleLine(service, 160) || "your project";
    const safeNote = normalizeMultiline(note, 500);
    const safeActionUrl = sanitizeUrlValue(actionUrl, { maxLength: 500, fallback: `${siteOrigin}/#contact` });
    const normalizedTemplate = normalizeKey(template, 80);

    const templates = {
      warm_check_in: [
        `Hi ${name}, just checking in from G&G Marketing about ${safeService}.`,
        "If the timing is right, we can help you move the project forward quickly.",
        `Reply here or continue at ${safeActionUrl}.`,
      ],
      discovery_nudge: [
        `Hi ${name}, if you still want support with ${safeService}, we can help you shape the next step.`,
        "A short discovery conversation is usually the fastest way to move.",
        `You can reply here or use ${safeActionUrl}.`,
      ],
      proposal_follow_up: [
        `Hi ${name}, following up on the proposal for ${safeService}.`,
        "We can refine the scope, priorities, or rollout based on what matters most to you.",
        `Reply here or use ${safeActionUrl}.`,
      ],
      payment_reminder: [
        `Hi ${name}, this is a friendly reminder from G&G Marketing regarding the next step for ${safeService}.`,
        "If you need the invoice or payment details resent, reply here and we will help.",
        `You can also continue at ${safeActionUrl}.`,
      ],
      reengagement: [
        `Hi ${name}, checking whether ${safeService} is still a priority for your team.`,
        "If you are ready, we can pick things up without starting from scratch.",
        `Reply here or use ${safeActionUrl}.`,
      ],
    };

    const lines = templates[normalizedTemplate];

    if (!lines) {
      return "";
    }

    if (safeNote) {
      lines.push(`Note: ${safeNote}`);
    }

    return lines.join("\n");
  };

  const buildClientStatusUpdateMessage = ({ recipientName, company, productName, status, reference, note, actionUrl }) => {
    const name = buildFriendlyRecipientName({ recipientName, company });
    const safeProductName = normalizeSingleLine(productName, 160) || "your service";
    const safeStatus = normalizeSingleLine(status, 120);
    const safeReference = normalizeSingleLine(reference, 120);
    const safeNote = normalizeMultiline(note, 500);
    const safeActionUrl = sanitizeUrlValue(actionUrl, { maxLength: 500, fallback: `${siteOrigin}/#contact` });
    const lines = [
      `Hi ${name}, here is your latest ${safeProductName} update from G&G Marketing.`,
      `Status: ${safeStatus || "Update available"}`,
    ];

    if (safeReference) {
      lines.push(`Reference: ${safeReference}`);
    }

    if (safeNote) {
      lines.push(`Details: ${safeNote}`);
    }

    lines.push(`If you need anything, reply here or use ${safeActionUrl}.`);

    return lines.join("\n");
  };

  const resolveOutboundChatId = (payload) => {
    const directChatId = trimString(payload?.chatId, 120);

    if (directChatId) {
      return directChatId;
    }

    return toWhatsAppChatId(payload?.contact || payload?.phone || payload?.recipient || "");
  };

  const buildAutomationEndpoint = () =>
    sanitizeUrlValue(env.AUTOMATION_WEBHOOK_URL || env.N8N_WEBHOOK_URL || env.CRM_WEBHOOK_URL || defaultAutomationWebhookUrl, {
      maxLength: 500,
      fallback: "",
    });

  const fanOutAutomationEvent = async (eventType, payload) => {
    const endpoint = buildAutomationEndpoint();

    if (!endpoint) {
      return { ok: false, skipped: "missing-automation-webhook" };
    }

    const webhookToken = trimString(env.AUTOMATION_WEBHOOK_TOKEN || env.N8N_WEBHOOK_TOKEN || env.CRM_WEBHOOK_TOKEN, 200);
    const body = {
      event: eventType,
      siteOrigin: resolvedSiteOrigin,
      createdAt: new Date().toISOString(),
      payload,
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text().catch(() => "");
    let responseBody = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (error) {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      const detail =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.message || responseBody?.error || response.statusText;
      throw new Error(`Automation webhook failed: ${response.status} ${detail}`.trim());
    }

    return {
      ok: true,
      status: response.status,
      body: responseBody,
    };
  };

  const buildLeadPayload = (payload) => {
    const rawType = trimString(payload?.type, 40).toLowerCase();
    const type = rawType === "consultation" ? "consultation" : "inquiry";
    const name = normalizeSingleLine(payload?.name, 120);
    const email = normalizeSingleLine(payload?.email, 160).toLowerCase();
    const contact = normalizeSingleLine(payload?.contact, 160);
    const message = normalizeMultiline(payload?.message, 2500);
    const service = normalizeSingleLine(payload?.service, 160);
    const source = normalizeSingleLine(payload?.source, 160) || (type === "consultation" ? "Consultation Modal" : "Inquiry Modal");
    const appointmentDate = normalizeSingleLine(payload?.appointmentDate, 40);
    const appointmentTime = normalizeSingleLine(payload?.appointmentTime, 80);
    const pageUrl = sanitizeUrlValue(payload?.pageUrl, {
      maxLength: 500,
      sameOriginOnly: true,
      fallback: `${resolvedSiteOrigin}${url.pathname}`,
    });
    const referrer = sanitizeUrlValue(payload?.referrer, {
      maxLength: 500,
      fallback: "",
    });
    const phone = normalizePhoneNumber(contact);
    const fallbackEmail = !email && isEmailAddress(contact) ? contact.toLowerCase() : "";
    const spamTrap = normalizeSingleLine(payload?.website || payload?.company || payload?.organization, 160);

    return {
      type,
      name,
      email: email || fallbackEmail,
      contact: contact || email || fallbackEmail,
      phone,
      message,
      service: service || (type === "consultation" ? "Consultation Booking" : "General Inquiry"),
      source,
      appointmentDate,
      appointmentTime,
      pageUrl,
      referrer,
      spamTrap,
      submittedAt: new Date().toISOString(),
    };
  };

  const validateLeadPayload = (lead) => {
    if (!lead.name) {
      return "Please share your name.";
    }

    if (lead.type === "consultation") {
      if (!lead.contact) {
        return "Please share a phone number or email for the consultation.";
      }

      if (!lead.appointmentDate || !lead.appointmentTime) {
        return "Please choose a consultation date and time.";
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(lead.appointmentDate)) {
        return "Please choose a valid consultation date.";
      }

      if (!/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(lead.appointmentTime)) {
        return "Please choose a valid consultation time.";
      }

      return "";
    }

    if (!lead.email || !isEmailAddress(lead.email)) {
      return "Please share a valid email address.";
    }

    if (!lead.message) {
      return "Please tell us about your project goals.";
    }

    return "";
  };

  const buildFormspreeFields = (lead) => {
    const fields = new URLSearchParams();

    fields.set("_subject", lead.type === "consultation" ? "New consultation request from the G&G Marketing website" : "New inquiry from the G&G Marketing website");
    fields.set("request_type", lead.type === "consultation" ? "Consultation Request" : "Website Inquiry");
    fields.set("source", lead.source);
    fields.set("name", lead.name);
    fields.set("email", lead.email);
    fields.set("contact", lead.contact);
    fields.set("phone", lead.phone);
    fields.set("service", lead.service);
    fields.set("message", lead.message);
    fields.set("appointment_date", lead.appointmentDate);
    fields.set("appointment_time", lead.appointmentTime);
    fields.set("page_url", lead.pageUrl);
    fields.set("referrer", lead.referrer);
    fields.set("submitted_at", lead.submittedAt);

    return fields;
  };

  const submitLeadToFormspree = async (lead) => {
    const endpoint = trimString(env.FORMSPREE_ENDPOINT || defaultFormspreeEndpoint, 300);

    if (!endpoint) {
      return { ok: false, skipped: "missing-formspree-endpoint" };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: buildFormspreeFields(lead).toString(),
    });

    const responseText = await response.text().catch(() => "");
    let responseBody = null;

    if (responseText) {
      try {
        responseBody = JSON.parse(responseText);
      } catch (error) {
        responseBody = responseText;
      }
    }

    if (!response.ok) {
      const detail =
        typeof responseBody === "string"
          ? responseBody
          : responseBody?.errors?.map((item) => item.message).join(" ") || responseBody?.error || response.statusText;
      throw new Error(`Formspree submission failed: ${response.status} ${detail}`.trim());
    }

    return {
      ok: true,
      status: response.status,
      body: responseBody,
    };
  };

  const buildInternalLeadAlert = (lead) => {
    const lines = [
      lead.type === "consultation" ? "New consultation request" : "New website inquiry",
      `Name: ${lead.name}`,
      `Service: ${lead.service}`,
      `Source: ${lead.source}`,
    ];

    if (lead.email) {
      lines.push(`Email: ${lead.email}`);
    }

    if (lead.contact) {
      lines.push(`Contact: ${lead.contact}`);
    }

    if (lead.type === "consultation") {
      lines.push(`Appointment: ${lead.appointmentDate} at ${lead.appointmentTime}`);
    }

    if (lead.message) {
      lines.push(`Message: ${lead.message}`);
    }

    if (lead.pageUrl) {
      lines.push(`Page: ${lead.pageUrl}`);
    }

    return lines.join("\n");
  };

  const buildConsultationConfirmation = (lead) => [
    `Hi ${lead.name}, your consultation request for ${lead.appointmentDate} at ${lead.appointmentTime} has been received.`,
    "We will confirm the slot shortly from G&G Marketing.",
    `If you need to update anything, reply here or visit ${siteOrigin}/#contact.`,
  ].join("\n");

  const notifyLeadTeam = async (lead) => {
    const chatId = resolveNotifyChatId();

    if (!chatId) {
      return { ok: false, skipped: "missing-notify-chat" };
    }

    return sendWhatsAppText({
      chatId,
      text: buildInternalLeadAlert(lead),
    });
  };

  const confirmConsultationOnWhatsApp = async (lead) => {
    if (lead.type !== "consultation" || !lead.phone) {
      return { ok: false, skipped: "no-consultation-phone" };
    }

    return sendWhatsAppText({
      chatId: `${lead.phone}@c.us`,
      text: buildConsultationConfirmation(lead),
    });
  };

  const classifyInboundIntent = (messageBody) => {
    const normalized = trimString(messageBody, 500).toLowerCase();

    if (!normalized) {
      return "";
    }

    if (/\b(human|agent|person|someone|call me|talk to someone)\b/.test(normalized)) {
      return "human";
    }

    if (/\b(book|consult|consultation|appointment|meeting)\b/.test(normalized)) {
      return "book";
    }

    if (/\b(price|pricing|quote|cost|budget)\b/.test(normalized)) {
      return "quote";
    }

    if (/\b(service|services|help|offer|marketing)\b/.test(normalized)) {
      return "services";
    }

    return "";
  };

  const buildInboundReply = (intent) => {
    if (intent === "human") {
      return [
        "A human from G&G Marketing will follow up shortly.",
        `In the meantime, you can also book directly at ${siteOrigin}/#contact.`,
      ].join("\n");
    }

    if (intent === "book") {
      return [
        "You can book a consultation from the website in under a minute.",
        `Open ${siteOrigin}/#contact and choose your preferred date and time.`,
      ].join("\n");
    }

    if (intent === "quote") {
      return [
        "We can help with a quote.",
        `Send your goals through ${siteOrigin}/#contact and we will recommend the right package.`,
      ].join("\n");
    }

    if (intent === "services") {
      return [
        "G&G Marketing supports social media marketing, brand strategy, websites, SEO, lead generation, and content strategy.",
        `You can request the right service at ${siteOrigin}/#contact.`,
      ].join("\n");
    }

    return "";
  };

  const shouldAutoReplyToWebhookMessage = (messageData) => {
    if (!messageData || typeof messageData !== "object") {
      return false;
    }

    if (messageData.fromMe || messageData.isGroup) {
      return false;
    }

    const chatId = trimString(messageData.chatId || messageData.from, 120);
    const body = trimString(messageData.body, 500);

    if (!chatId || !body || chatId.endsWith("@g.us") || chatId === "status@broadcast") {
      return false;
    }

    return true;
  };

  const sendHumanHandoffAlert = async (payload, messageData) => {
    const chatId = resolveNotifyChatId();

    if (!chatId) {
      return { ok: false, skipped: "missing-notify-chat" };
    }

    const replyTo = trimString(messageData.from || messageData.chatId, 120);
    const lines = [
      "WhatsApp human handoff requested",
      `Session: ${trimString(payload?.sessionId, 120) || "unknown"}`,
      `Contact: ${replyTo}`,
      `Message: ${trimString(messageData.body, 500)}`,
    ];

    return sendWhatsAppText({
      chatId,
      text: lines.join("\n"),
      sessionId: trimString(payload?.sessionId, 120),
    });
  };

  const handleIncomingWebhook = async (payload) => {
    const event = trimString(payload?.event, 80);

    if (event !== "message.received") {
      return { handled: false };
    }

    const messageData = payload?.data;

    if (!shouldAutoReplyToWebhookMessage(messageData)) {
      return { handled: false, skipped: "not-eligible-for-autoreply" };
    }

    const intent = classifyInboundIntent(messageData.body);
    const replyText = buildInboundReply(intent);

    if (!intent || !replyText) {
      return { handled: false, skipped: "no-keyword-match" };
    }

    const response = {
      intent,
      autoReply: await sendWhatsAppText({
        chatId: trimString(messageData.chatId || messageData.from, 120),
        text: replyText,
        sessionId: trimString(payload?.sessionId, 120),
      }),
    };

    if (intent === "human") {
      try {
        response.handoffAlert = await sendHumanHandoffAlert(payload, messageData);
      } catch (error) {
        console.warn("Failed to send human handoff alert", error);
      }
    }

    return {
      handled: true,
      ...response,
    };
  };

  const validateFollowUpRequest = (payload) => {
    if (!resolveOutboundChatId(payload)) {
      return "Please provide a valid WhatsApp contact or chatId.";
    }

    if (!normalizeSingleLine(payload?.recipientName || payload?.company, 120)) {
      return "Please provide the recipient name or company.";
    }

    return "";
  };

  const validateTemplateSendRequest = (payload) => {
    if (!resolveOutboundChatId(payload)) {
      return "Please provide a valid WhatsApp contact or chatId.";
    }

    if (!buildTemplateMessage(payload)) {
      return "Please choose a supported template.";
    }

    return "";
  };

  const validateStatusUpdateRequest = (payload) => {
    if (!resolveOutboundChatId(payload)) {
      return "Please provide a valid WhatsApp contact or chatId.";
    }

    if (!normalizeBoolean(payload?.optInConfirmed)) {
      return "Opt-in confirmation is required before sending a status update.";
    }

    if (!normalizeSingleLine(payload?.productName, 160)) {
      return "Please provide the product or service name.";
    }

    return "";
  };

  if (url.pathname === "/api/leads") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (!isTrustedBrowserLeadRequest(context.request)) {
      return json({ error: "Request origin not allowed" }, { status: 403 });
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 12 * 1024 });

    if (parsedBody.error) {
      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const payload = parsedBody.value;

    const lead = buildLeadPayload(payload);

    if (lead.spamTrap) {
      return json(
        {
          ok: true,
          leadType: lead.type,
          degraded: false,
          message: lead.type === "consultation" ? "Appointment request received. We will confirm the slot shortly." : "Inquiry sent successfully. We'll get back to you soon.",
        },
        { status: 200 }
      );
    }

    const validationError = validateLeadPayload(lead);

    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const result = {
      leadType: lead.type,
      record: null,
      notify: null,
      confirmation: null,
      automation: null,
      degraded: false,
    };
    const failures = [];

    try {
      result.record = await submitLeadToFormspree(lead);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      console.error("Lead record delivery failed", error);
    }

    try {
      result.notify = await notifyLeadTeam(lead);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      console.error("Lead WhatsApp notification failed", error);
    }

    if (lead.type === "consultation") {
      try {
        result.confirmation = await confirmConsultationOnWhatsApp(lead);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
        console.error("Consultation confirmation failed", error);
      }
    }

    const successfulDeliveries = [result.record, result.notify, result.confirmation].filter((entry) => entry?.ok).length;
    const notificationHealthy = result.notify?.ok === true;
    const recordHealthy = result.record?.ok === true;
    const consultationConfirmationExpected = lead.type === "consultation" && Boolean(lead.phone);
    const consultationConfirmationHealthy = consultationConfirmationExpected ? result.confirmation?.ok === true : true;

    if (successfulDeliveries === 0) {
      return json(
        {
          error: "We could not submit your request right now. Please try again.",
          failures,
        },
        { status: 502 }
      );
    }

    result.degraded = failures.length > 0 || !recordHealthy || !notificationHealthy || !consultationConfirmationHealthy;

    try {
      result.automation = await fanOutAutomationEvent("lead.received", {
        leadType: lead.type,
        source: lead.source,
        name: lead.name,
        email: lead.email,
        contact: lead.contact,
        phone: lead.phone,
        service: lead.service,
        message: lead.message,
        appointmentDate: lead.appointmentDate,
        appointmentTime: lead.appointmentTime,
        pageUrl: lead.pageUrl,
        referrer: lead.referrer,
        submittedAt: lead.submittedAt,
        deliveries: {
          record: result.record?.ok === true,
          notify: result.notify?.ok === true,
          confirmation: result.confirmation?.ok === true,
          degraded: result.degraded,
        },
      });
    } catch (error) {
      console.warn("Lead automation fanout failed", error);
    }

    return json(
      {
        ok: true,
        leadType: result.leadType,
        degraded: result.degraded,
        message:
          lead.type === "consultation"
            ? result.confirmation?.ok
              ? "Appointment request received. We have also sent a WhatsApp confirmation."
              : "Appointment request received. We will confirm the slot shortly."
            : "Inquiry sent successfully. We'll get back to you soon.",
      },
      { status: 200 }
    );
  }

  if (url.pathname === "/api/whatsapp/follow-up") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const authFailure = requireAuthorizedOpsRequest(context.request);

    if (authFailure) {
      return authFailure;
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 12 * 1024 });

    if (parsedBody.error) {
      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const payload = parsedBody.value;
    const validationError = validateFollowUpRequest(payload);

    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const chatId = resolveOutboundChatId(payload);
    const text = buildWarmFollowUpMessage(payload);
    const sessionId = trimString(payload?.sessionId, 120);
    const sendResult = await sendWhatsAppText({ chatId, text, sessionId });
    let automationResult = null;

    try {
      automationResult = await fanOutAutomationEvent("whatsapp.follow_up_sent", {
        chatId,
        recipientName: normalizeSingleLine(payload?.recipientName, 120),
        company: normalizeSingleLine(payload?.company, 160),
        service: normalizeSingleLine(payload?.service, 160),
        stage: normalizeKey(payload?.stage || "new_lead", 80),
        actionUrl: sanitizeUrlValue(payload?.actionUrl, { maxLength: 500, fallback: "" }),
      });
    } catch (error) {
      console.warn("Follow-up automation fanout failed", error);
    }

    return json(
      {
        ok: true,
        message: "WhatsApp follow-up sent.",
        send: sendResult,
        automation: automationResult,
      },
      { status: 200 }
    );
  }

  if (url.pathname === "/api/whatsapp/templates/send") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const authFailure = requireAuthorizedOpsRequest(context.request);

    if (authFailure) {
      return authFailure;
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 12 * 1024 });

    if (parsedBody.error) {
      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const payload = parsedBody.value;
    const validationError = validateTemplateSendRequest(payload);

    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const chatId = resolveOutboundChatId(payload);
    const text = buildTemplateMessage(payload);
    const sessionId = trimString(payload?.sessionId, 120);
    const sendResult = await sendWhatsAppText({ chatId, text, sessionId });
    let automationResult = null;

    try {
      automationResult = await fanOutAutomationEvent("whatsapp.template_sent", {
        template: normalizeKey(payload?.template, 80),
        chatId,
        recipientName: normalizeSingleLine(payload?.recipientName, 120),
        company: normalizeSingleLine(payload?.company, 160),
        service: normalizeSingleLine(payload?.service, 160),
      });
    } catch (error) {
      console.warn("Template automation fanout failed", error);
    }

    return json(
      {
        ok: true,
        message: "WhatsApp template message sent.",
        send: sendResult,
        automation: automationResult,
      },
      { status: 200 }
    );
  }

  if (url.pathname === "/api/whatsapp/status-update") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const authFailure = requireAuthorizedOpsRequest(context.request);

    if (authFailure) {
      return authFailure;
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 12 * 1024 });

    if (parsedBody.error) {
      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const payload = parsedBody.value;
    const validationError = validateStatusUpdateRequest(payload);

    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const chatId = resolveOutboundChatId(payload);
    const text = buildClientStatusUpdateMessage(payload);
    const sessionId = trimString(payload?.sessionId, 120);
    const sendResult = await sendWhatsAppText({ chatId, text, sessionId });
    let automationResult = null;

    try {
      automationResult = await fanOutAutomationEvent("whatsapp.status_update_sent", {
        chatId,
        productName: normalizeSingleLine(payload?.productName, 160),
        status: normalizeSingleLine(payload?.status, 120),
        reference: normalizeSingleLine(payload?.reference, 120),
        recipientName: normalizeSingleLine(payload?.recipientName, 120),
        optInConfirmed: true,
      });
    } catch (error) {
      console.warn("Status update automation fanout failed", error);
    }

    return json(
      {
        ok: true,
        message: "WhatsApp status update sent.",
        send: sendResult,
        automation: automationResult,
      },
      { status: 200 }
    );
  }

  if (url.pathname === "/whatsapp/webhook") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 64 * 1024 });

    if (parsedBody.error) {
      if (parsedBody.status === 400) {
        console.warn("Rejected OpenWA webhook due to invalid JSON");
      }

      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const rawBody = parsedBody.rawBody;
    const providedSignature = context.request.headers.get("X-OpenWA-Signature");
    const webhookSecret = env.OPENWA_WEBHOOK_SECRET;

    if (!webhookSecret && !isLocalHost) {
      console.warn("Rejected OpenWA webhook because OPENWA_WEBHOOK_SECRET is not configured");
      return json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    if (webhookSecret) {
      const expectedSignature = await createOpenWaSignature(rawBody, webhookSecret);

      if (!providedSignature || !hasExactMatch(providedSignature, expectedSignature)) {
        console.warn("Rejected OpenWA webhook due to invalid signature");
        return json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    const payload = parsedBody.value;

    const webhookMeta = {
      event: context.request.headers.get("X-OpenWA-Event") || payload?.event || null,
      deliveryId: context.request.headers.get("X-OpenWA-Delivery-Id") || payload?.deliveryId || null,
      idempotencyKey: context.request.headers.get("X-OpenWA-Idempotency-Key") || payload?.idempotencyKey || null,
      retryCount: context.request.headers.get("X-OpenWA-Retry-Count") || "0",
      sessionId: payload?.sessionId || null,
      timestamp: payload?.timestamp || null,
    };

    console.log("Received OpenWA webhook", webhookMeta);

    let workflowResult = { handled: false };

    try {
      workflowResult = await handleIncomingWebhook(payload);
    } catch (error) {
      console.error("OpenWA webhook workflow failed", error);
    }

    try {
      await fanOutAutomationEvent("whatsapp.webhook_received", {
        webhook: webhookMeta,
        workflow: workflowResult,
        from: trimString(payload?.data?.from || payload?.data?.chatId, 120),
        body: trimString(payload?.data?.body, 500),
      });
    } catch (error) {
      console.warn("Webhook automation fanout failed", error);
    }

    return json({ received: true, handled: workflowResult.handled === true }, { status: 200 });
  }

  if (url.pathname === "/mpesa/stk-push") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const parsedBody = await parseJsonBody(context.request, { maxBytes: 8 * 1024 });

    if (parsedBody.error) {
      return json({ error: parsedBody.error }, { status: parsedBody.status });
    }

    const payload = parsedBody.value;

    const { amount, phone, accountReference, description } = payload;
    if (!amount || !phone) {
      return json({ error: "Missing amount or phone" }, { status: 400 });
    }

    try {
      const result = await initiateStkPush({ amount, phone, accountReference, description });
      console.log("STK push initiated:", result.body);
      return json(result.body, { status: 200 });
    } catch (error) {
      console.error("STK push error:", error);
      return json({ error: error.message || "STK push failed" }, { status: 500 });
    }
  }

  if (url.pathname === "/mpesa/stk-callback" || url.pathname === "/mpesa/standing-order-callback") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const rawBody = await context.request.text();

    if (byteLength(rawBody) > 64 * 1024) {
      return json({ error: "Payload too large" }, { status: 413 });
    }

    let payload = null;

    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch (error) {
      payload = null;
    }

    const callbackMeta = {
      host: hostname,
      path: url.pathname,
      merchantRequestId: payload?.Body?.stkCallback?.MerchantRequestID || payload?.MerchantRequestID || null,
      checkoutRequestId: payload?.Body?.stkCallback?.CheckoutRequestID || payload?.CheckoutRequestID || null,
      resultCode: payload?.Body?.stkCallback?.ResultCode ?? payload?.ResultCode ?? null,
    };

    console.log("Received M-Pesa callback", callbackMeta);

    return json(
      {
        ResultCode: 0,
        ResultDesc: "Accepted",
      },
      { status: 200 }
    );
  }

  if (!isEazzyDomain && url.pathname === "/index.html") {
    url.pathname = "/";
    return Response.redirect(url.toString(), 301);
  }

  if (isEazzyDomain && isHomeRequest) {
    url.pathname = "/eazzy-rent.html";
    return context.next(url.toString());
  }

  return context.next();
}

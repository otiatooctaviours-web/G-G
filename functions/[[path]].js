export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";

  const env = context.env || {};
  const textEncoder = new TextEncoder();
  const defaultFormspreeEndpoint = "https://formspree.io/f/xlgwyzwb";
  const siteOrigin = (env.SITE_URL || url.origin).replace(/\/$/, "");

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
        ...(init.headers || {}),
      },
    });

  const toHex = (buffer) =>
    Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

  const trimString = (value, maxLength = 1000) =>
    typeof value === "string" ? value.trim().slice(0, maxLength) : "";

  const isEmailAddress = (value) => /\S+@\S+\.\S+/.test(value);

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
    const resolvedSessionId = trimString(sessionId || env.OPENWA_SESSION_ID, 120);

    if (!baseUrl || !apiKey || !resolvedSessionId) {
      return { ok: false, skipped: "missing-openwa-config" };
    }

    const response = await fetch(`${baseUrl}/api/sessions/${resolvedSessionId}/messages/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        chatId,
        text,
      }),
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

  const buildLeadPayload = (payload) => {
    const rawType = trimString(payload?.type, 40).toLowerCase();
    const type = rawType === "consultation" ? "consultation" : "inquiry";
    const name = trimString(payload?.name, 120);
    const email = trimString(payload?.email, 160).toLowerCase();
    const contact = trimString(payload?.contact, 160);
    const message = trimString(payload?.message, 2500);
    const service = trimString(payload?.service, 160);
    const source = trimString(payload?.source, 160) || (type === "consultation" ? "Consultation Modal" : "Inquiry Modal");
    const appointmentDate = trimString(payload?.appointmentDate, 40);
    const appointmentTime = trimString(payload?.appointmentTime, 80);
    const pageUrl = trimString(payload?.pageUrl, 500) || `${siteOrigin}${url.pathname}`;
    const referrer = trimString(payload?.referrer, 500);
    const phone = normalizePhoneNumber(contact);
    const fallbackEmail = !email && isEmailAddress(contact) ? contact.toLowerCase() : "";

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

  if (url.pathname === "/api/leads") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await context.request.json();
    } catch (error) {
      return json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const lead = buildLeadPayload(payload);
    const validationError = validateLeadPayload(lead);

    if (validationError) {
      return json({ error: validationError }, { status: 400 });
    }

    const result = {
      leadType: lead.type,
      record: null,
      notify: null,
      confirmation: null,
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

  if (url.pathname === "/whatsapp/webhook") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const rawBody = await context.request.text();
    const providedSignature = context.request.headers.get("X-OpenWA-Signature");
    const webhookSecret = env.OPENWA_WEBHOOK_SECRET;
    const isLocalWebhookHost = hostname === "127.0.0.1" || hostname === "localhost";

    if (!webhookSecret && !isLocalWebhookHost) {
      console.warn("Rejected OpenWA webhook because OPENWA_WEBHOOK_SECRET is not configured");
      return json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    if (webhookSecret) {
      const expectedSignature = await createOpenWaSignature(rawBody, webhookSecret);

      if (!providedSignature || providedSignature !== expectedSignature) {
        console.warn("Rejected OpenWA webhook due to invalid signature");
        return json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    let payload;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      console.warn("Rejected OpenWA webhook due to invalid JSON");
      return json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const webhookMeta = {
      event: context.request.headers.get("X-OpenWA-Event") || payload?.event || null,
      deliveryId: context.request.headers.get("X-OpenWA-Delivery-Id") || payload?.deliveryId || null,
      idempotencyKey: context.request.headers.get("X-OpenWA-Idempotency-Key") || payload?.idempotencyKey || null,
      retryCount: context.request.headers.get("X-OpenWA-Retry-Count") || "0",
      sessionId: payload?.sessionId || null,
      timestamp: payload?.timestamp || null,
    };

    console.log("Received OpenWA webhook", webhookMeta);
    console.log("OpenWA webhook payload:", payload);

    let workflow = null;
    try {
      workflow = await handleIncomingWebhook(payload);
    } catch (error) {
      console.error("OpenWA webhook workflow failed", error);
    }

    return json({ received: true, workflow }, { status: 200 });
  }

  if (url.pathname === "/mpesa/stk-push") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await context.request.json();
    } catch (error) {
      return json({ error: "Invalid JSON payload" }, { status: 400 });
    }

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

    let payloadText = "";
    try {
      const payload = await context.request.json();
      payloadText = JSON.stringify(payload);
    } catch (error) {
      payloadText = await context.request.text();
    }

    console.log("Received M-Pesa callback for host", hostname, "path", url.pathname);
    console.log("Callback body:", payloadText);

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

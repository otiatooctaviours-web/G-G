const EXPECTED_BEARER_TOKEN = "";
const NOTIFICATION_EMAILS = [
  ""
];
const EMAIL_NOTIFICATIONS = {
  leads: true,
  whatsappOps: false,
  inboundMessages: false,
};
const NOTIFICATION_TIMEZONE = "Africa/Nairobi";
const NOTIFICATION_DEDUPE_WINDOW_SECONDS = 600;
const NOTIFICATION_LOG_SHEET = "Notification Log";

const SHEET_NAMES = {
  raw: "Raw Events",
  leads: "Leads",
  ops: "WhatsApp Ops",
  inbound: "Inbound Messages",
};

function doPost(e) {
  try {
    const authHeader = getHeader_(e, "Authorization");

    if (EXPECTED_BEARER_TOKEN) {
      const expectedHeader = "Bearer " + EXPECTED_BEARER_TOKEN;
      if (authHeader !== expectedHeader) {
        return jsonResponse_({ ok: false, error: "Unauthorized" });
      }
    }

    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: "Missing request body" });
    }

    const body = JSON.parse(e.postData.contents);
    const eventName = stringValue_(body.event);
    const payload = body.payload || {};

    appendRawEvent_(body);

    if (eventName === "lead.received") {
      appendLeadEvent_(body, payload);
    } else if (
      eventName === "whatsapp.follow_up_sent" ||
      eventName === "whatsapp.template_sent" ||
      eventName === "whatsapp.status_update_sent"
    ) {
      appendWhatsAppOpEvent_(body, payload);
    } else if (eventName === "whatsapp.webhook_received") {
      appendInboundWebhookEvent_(body, payload);
    }

    maybeSendNotificationEmail_(body, payload, eventName);

    return jsonResponse_({ ok: true, routed: resolveRouteName_(eventName) });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function appendRawEvent_(body) {
  const sheet = getOrCreateSheet_(SHEET_NAMES.raw);
  ensureHeader_(sheet, [
    "receivedAt",
    "event",
    "siteOrigin",
    "createdAt",
    "payloadJson",
    "bodyJson",
  ]);

  sheet.appendRow([
    formatDateTime_(new Date()),
    stringValue_(body.event),
    stringValue_(body.siteOrigin),
    normalizeTimestamp_(body.createdAt),
    safeJson_(body.payload || {}),
    safeJson_(body),
  ]);
}

function appendLeadEvent_(body, payload) {
  const deliveries = payload.deliveries || {};
  const sheet = getOrCreateSheet_(SHEET_NAMES.leads);

  ensureHeader_(sheet, [
    "receivedAt",
    "event",
    "leadType",
    "name",
    "email",
    "contact",
    "phone",
    "service",
    "message",
    "appointmentDate",
    "appointmentTime",
    "source",
    "pageUrl",
    "referrer",
    "submittedAt",
    "recordDelivered",
    "notifyDelivered",
    "confirmationDelivered",
    "degraded",
    "siteOrigin",
  ]);

  sheet.appendRow([
    formatDateTime_(new Date()),
    stringValue_(body.event),
    stringValue_(payload.leadType),
    stringValue_(payload.name),
    stringValue_(payload.email),
    stringValue_(payload.contact),
    stringValue_(payload.phone),
    stringValue_(payload.service),
    stringValue_(payload.message),
    stringValue_(payload.appointmentDate),
    stringValue_(payload.appointmentTime),
    stringValue_(payload.source),
    stringValue_(payload.pageUrl),
    stringValue_(payload.referrer),
    normalizeTimestamp_(payload.submittedAt || body.createdAt),
    boolCell_(deliveries.record),
    boolCell_(deliveries.notify),
    boolCell_(deliveries.confirmation),
    boolCell_(deliveries.degraded),
    stringValue_(body.siteOrigin),
  ]);
}

function appendWhatsAppOpEvent_(body, payload) {
  const sheet = getOrCreateSheet_(SHEET_NAMES.ops);

  ensureHeader_(sheet, [
    "receivedAt",
    "event",
    "chatId",
    "recipientName",
    "company",
    "service",
    "stage",
    "template",
    "productName",
    "status",
    "reference",
    "optInConfirmed",
    "siteOrigin",
    "createdAt",
  ]);

  sheet.appendRow([
    formatDateTime_(new Date()),
    stringValue_(body.event),
    stringValue_(payload.chatId),
    stringValue_(payload.recipientName),
    stringValue_(payload.company),
    stringValue_(payload.service),
    stringValue_(payload.stage),
    stringValue_(payload.template),
    stringValue_(payload.productName),
    stringValue_(payload.status),
    stringValue_(payload.reference),
    boolCell_(payload.optInConfirmed),
    stringValue_(body.siteOrigin),
    normalizeTimestamp_(body.createdAt),
  ]);
}

function appendInboundWebhookEvent_(body, payload) {
  const webhook = payload.webhook || {};
  const workflow = payload.workflow || {};
  const sheet = getOrCreateSheet_(SHEET_NAMES.inbound);

  ensureHeader_(sheet, [
    "receivedAt",
    "event",
    "from",
    "body",
    "workflowHandled",
    "workflowIntent",
    "webhookEvent",
    "deliveryId",
    "idempotencyKey",
    "retryCount",
    "sessionId",
    "webhookTimestamp",
    "siteOrigin",
  ]);

  sheet.appendRow([
    formatDateTime_(new Date()),
    stringValue_(body.event),
    stringValue_(payload.from),
    stringValue_(payload.body),
    boolCell_(workflow.handled),
    stringValue_(workflow.intent),
    stringValue_(webhook.event),
    stringValue_(webhook.deliveryId),
    stringValue_(webhook.idempotencyKey),
    stringValue_(webhook.retryCount),
    stringValue_(webhook.sessionId),
    normalizeTimestamp_(webhook.timestamp),
    stringValue_(body.siteOrigin),
  ]);
}

function maybeSendNotificationEmail_(body, payload, eventName) {
  const recipients = NOTIFICATION_EMAILS
    .map(function(value) { return stringValue_(value).trim(); })
    .filter(function(value) { return value !== ""; });

  if (recipients.length === 0) {
    return;
  }

  if (eventName === "lead.received" && !EMAIL_NOTIFICATIONS.leads) {
    return;
  }

  if (
    (eventName === "whatsapp.follow_up_sent" ||
      eventName === "whatsapp.template_sent" ||
      eventName === "whatsapp.status_update_sent") &&
    !EMAIL_NOTIFICATIONS.whatsappOps
  ) {
    return;
  }

  if (eventName === "whatsapp.webhook_received" && !EMAIL_NOTIFICATIONS.inboundMessages) {
    return;
  }

  const dedupeKey = buildNotificationKey_(body, payload, eventName);
  if (notificationAlreadySent_(dedupeKey)) {
    appendNotificationLog_(eventName, recipients.join(","), "skipped", "Duplicate notification suppressed");
    return;
  }

  const subject = buildNotificationSubject_(payload, eventName);
  const emailBody = buildNotificationBody_(body, payload, eventName);

  try {
    MailApp.sendEmail({
      to: recipients.join(","),
      subject: subject,
      body: emailBody,
    });

    markNotificationSent_(dedupeKey);
    appendNotificationLog_(eventName, recipients.join(","), "sent", subject);
  } catch (error) {
    appendNotificationLog_(
      eventName,
      recipients.join(","),
      "failed",
      error && error.message ? error.message : String(error)
    );
  }
}

function buildNotificationKey_(body, payload, eventName) {
  const candidateParts = [
    eventName,
    stringValue_(body.createdAt),
    stringValue_(payload.submittedAt),
    stringValue_(payload.email),
    stringValue_(payload.contact),
    stringValue_(payload.phone),
    stringValue_(payload.reference),
    stringValue_(payload.chatId),
    stringValue_(payload.from),
    stringValue_(payload.message || payload.body),
  ];

  return candidateParts.join("|");
}

function notificationAlreadySent_(dedupeKey) {
  const cache = CacheService.getScriptCache();
  return cache.get(dedupeKey) === "sent";
}

function markNotificationSent_(dedupeKey) {
  const cache = CacheService.getScriptCache();
  cache.put(dedupeKey, "sent", NOTIFICATION_DEDUPE_WINDOW_SECONDS);
}

function buildNotificationSubject_(payload, eventName) {
  if (eventName === "lead.received") {
    const leadType = stringValue_(payload.leadType || "lead");
    const name = stringValue_(payload.name || payload.contact || "Unknown");
    return "[GG Marketing] New " + leadType + " submission from " + name;
  }

  if (
    eventName === "whatsapp.follow_up_sent" ||
    eventName === "whatsapp.template_sent" ||
    eventName === "whatsapp.status_update_sent"
  ) {
    return "[GG Marketing] WhatsApp operation logged";
  }

  if (eventName === "whatsapp.webhook_received") {
    return "[GG Marketing] Inbound WhatsApp message logged";
  }

  return "[GG Marketing] Automation event logged";
}

function buildNotificationBody_(body, payload, eventName) {
  const lines = [
    "A new automation event has been recorded in Google Sheets.",
    "",
    "Event: " + stringValue_(eventName),
    "Received At: " + formatDateTime_(new Date()),
    "Site Origin: " + stringValue_(body.siteOrigin),
  ];

  if (eventName === "lead.received") {
    const deliveries = payload.deliveries || {};
    lines.push(
      "Lead Type: " + stringValue_(payload.leadType),
      "Name: " + stringValue_(payload.name),
      "Email: " + stringValue_(payload.email),
      "Contact: " + stringValue_(payload.contact || payload.phone),
      "Service: " + stringValue_(payload.service),
      "Appointment Date: " + stringValue_(payload.appointmentDate),
      "Appointment Time: " + stringValue_(payload.appointmentTime),
      "Message: " + stringValue_(payload.message),
      "Source: " + stringValue_(payload.source),
      "Record Delivered: " + boolCell_(deliveries.record),
      "WhatsApp Alert Delivered: " + boolCell_(deliveries.notify),
      "Confirmation Delivered: " + boolCell_(deliveries.confirmation),
      "Degraded: " + boolCell_(deliveries.degraded)
    );
  } else if (
    eventName === "whatsapp.follow_up_sent" ||
    eventName === "whatsapp.template_sent" ||
    eventName === "whatsapp.status_update_sent"
  ) {
    lines.push(
      "Recipient: " + stringValue_(payload.recipientName),
      "Chat ID: " + stringValue_(payload.chatId),
      "Template: " + stringValue_(payload.template),
      "Stage: " + stringValue_(payload.stage),
      "Status: " + stringValue_(payload.status),
      "Reference: " + stringValue_(payload.reference)
    );
  } else if (eventName === "whatsapp.webhook_received") {
    const workflow = payload.workflow || {};
    lines.push(
      "From: " + stringValue_(payload.from),
      "Message: " + stringValue_(payload.body),
      "Workflow Handled: " + boolCell_(workflow.handled),
      "Intent: " + stringValue_(workflow.intent)
    );
  }

  lines.push(
    "",
    "This email was sent by the Google Sheets Apps Script notification layer."
  );

  return lines.join("\n");
}

function appendNotificationLog_(eventName, recipient, status, details) {
  const sheet = getOrCreateSheet_(NOTIFICATION_LOG_SHEET);
  ensureHeader_(sheet, [
    "attemptedAt",
    "event",
    "recipient",
    "status",
    "details",
  ]);

  sheet.appendRow([
    formatDateTime_(new Date()),
    stringValue_(eventName),
    stringValue_(recipient),
    stringValue_(status),
    stringValue_(details),
  ]);
}

function sendNotificationTest() {
  const recipients = NOTIFICATION_EMAILS
    .map(function(value) { return stringValue_(value).trim(); })
    .filter(function(value) { return value !== ""; });

  if (recipients.length === 0) {
    throw new Error("Set NOTIFICATION_EMAILS before running sendNotificationTest().");
  }

  const subject = "[GG Marketing] Google Sheets notification test";
  const body = [
    "This is a test email from the Google Sheets Apps Script notification layer.",
    "",
    "Sent At: " + formatDateTime_(new Date()),
    "Timezone: " + NOTIFICATION_TIMEZONE,
  ].join("\n");

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    body: body,
  });

  appendNotificationLog_("notification.test", recipients.join(","), "sent", subject);
}

function formatDateTime_(value) {
  return Utilities.formatDate(value, NOTIFICATION_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function normalizeTimestamp_(value) {
  if (!value) {
    return "";
  }

  try {
    return formatDateTime_(new Date(value));
  } catch (error) {
    return stringValue_(value);
  }
}

function resolveRouteName_(eventName) {
  if (eventName === "lead.received") {
    return SHEET_NAMES.leads;
  }

  if (
    eventName === "whatsapp.follow_up_sent" ||
    eventName === "whatsapp.template_sent" ||
    eventName === "whatsapp.status_update_sent"
  ) {
    return SHEET_NAMES.ops;
  }

  if (eventName === "whatsapp.webhook_received") {
    return SHEET_NAMES.inbound;
  }

  return SHEET_NAMES.raw;
}

function getOrCreateSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function ensureHeader_(sheet, headerRow) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headerRow);
    sheet.setFrozenRows(1);
    return;
  }

  const existingHeader = sheet.getRange(1, 1, 1, headerRow.length).getValues()[0];
  const matches = headerRow.every(function(header, index) {
    return existingHeader[index] === header;
  });

  if (!matches) {
    sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
    sheet.setFrozenRows(1);
  }
}

function getHeader_(e, headerName) {
  const headers = (e && e.headers) || {};
  const target = String(headerName).toLowerCase();

  for (const key in headers) {
    if (String(key).toLowerCase() === target) {
      return headers[key];
    }
  }

  return "";
}

function stringValue_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function boolCell_(value) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

function safeJson_(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return "";
  }
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

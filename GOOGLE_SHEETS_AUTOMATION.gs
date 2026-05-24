const EXPECTED_BEARER_TOKEN = "";

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
    new Date().toISOString(),
    stringValue_(body.event),
    stringValue_(body.siteOrigin),
    stringValue_(body.createdAt),
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
    new Date().toISOString(),
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
    stringValue_(payload.submittedAt),
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
    new Date().toISOString(),
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
    stringValue_(body.createdAt),
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
    new Date().toISOString(),
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
    stringValue_(webhook.timestamp),
    stringValue_(body.siteOrigin),
  ]);
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

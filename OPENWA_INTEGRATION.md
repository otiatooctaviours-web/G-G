# OpenWA Integration Notes

This repo now includes a local copy of OpenWA at [external/openwa](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/external/openwa>) and a server-side integration layer in [functions/[[path]].js](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/functions/[[path]].js>).

## What Is Live In This Repo

The website now sends leads to a server-side endpoint instead of posting directly from the browser to Formspree:

- `POST /api/leads`

That endpoint now handles:

- website inquiry submissions
- consultation booking submissions
- server-side fanout to Formspree for recordkeeping
- internal WhatsApp lead alerts through OpenWA
- automatic WhatsApp confirmations for consultation requests when a phone number is provided
- optional automation fanout into n8n, a CRM webhook, or a Google Sheets bridge
- same-origin enforcement for browser lead submissions
- honeypot trap fields for low-effort bot submissions
- input size and content-type checks before parsing JSON

The OpenWA webhook receiver remains available at:

- `POST /whatsapp/webhook`

That webhook now supports:

- OpenWA signature verification with `OPENWA_WEBHOOK_SECRET`
- inbound keyword auto-replies for quote, booking, services, and human handoff requests
- optional human handoff alerting back to the internal notify chat
- optional automation fanout for inbound WhatsApp events
- minimal `{"received":true}` responses instead of leaking workflow details
- metadata-only logging instead of full payload logging

## Protected WhatsApp Ops Endpoints

The worker now exposes admin-only routes for outbound WhatsApp workflows:

- `POST /api/whatsapp/follow-up`
- `POST /api/whatsapp/templates/send`
- `POST /api/whatsapp/status-update`

These routes require `WHATSAPP_ADMIN_TOKEN` and are meant for operator or server-to-server use, not for public browser traffic.

Use either:

- `Authorization: Bearer <WHATSAPP_ADMIN_TOKEN>`
- `X-WhatsApp-Admin-Token: <WHATSAPP_ADMIN_TOKEN>`

### Follow-up Stages

- `new_lead`
- `quote_follow_up`
- `consultation_reminder`
- `proposal_follow_up`
- `no_reply_nudge`

### Template Keys

- `warm_check_in`
- `discovery_nudge`
- `proposal_follow_up`
- `payment_reminder`
- `reengagement`

### Follow-up Example

```bash
curl -X POST https://ggmarketing.co.ke/api/whatsapp/follow-up \
  -H "Authorization: Bearer $WHATSAPP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+254700000000",
    "recipientName": "Warm Lead",
    "company": "Example Co",
    "service": "Website Design",
    "stage": "proposal_follow_up",
    "note": "Checking whether you are ready for the next step.",
    "actionUrl": "https://ggmarketing.co.ke/#contact"
  }'
```

### Template Send Example

```bash
curl -X POST https://ggmarketing.co.ke/api/whatsapp/templates/send \
  -H "Authorization: Bearer $WHATSAPP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+254700000000",
    "recipientName": "Warm Lead",
    "service": "Lead Generation",
    "template": "warm_check_in"
  }'
```

### Opt-in Status Update Example

```bash
curl -X POST https://ggmarketing.co.ke/api/whatsapp/status-update \
  -H "Authorization: Bearer $WHATSAPP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+254700000000",
    "recipientName": "Client",
    "productName": "Eazzy Rent",
    "status": "Deployment complete",
    "reference": "EZ-241",
    "note": "Landing page update is live.",
    "optInConfirmed": true,
    "actionUrl": "https://eazzy.ggmarketing.co.ke/"
  }'
```

## Current Rollout By Phase

### Phase 1

Implemented in code.

- Inquiry form now posts to `/api/leads`
- Consultation flow now posts to `/api/leads`
- Lead endpoint fans out server-side instead of exposing OpenWA in frontend JavaScript

### Phase 2

Implemented in code.

- Consultation requests with a phone number trigger an automatic WhatsApp confirmation

### Phase 3

Implemented in code.

- Incoming OpenWA `message.received` webhooks can classify simple keywords and auto-reply
- `human` / `agent` style messages can also trigger an internal handoff alert

### Phase 4

Implemented as an integration boundary, not a live provider swap.

- The worker uses a provider gate via `WHATSAPP_PROVIDER`
- `openwa` is the active provider today
- This keeps the message-sending logic centralized so a future Meta Cloud API adapter can replace it without changing the website forms again

## Required Environment Variables

- `FORMSPREE_ENDPOINT`
- `WHATSAPP_PROVIDER`
- `OPENWA_BASE_URL`
- `OPENWA_BRIDGE_TOKEN`
- `OPENWA_API_KEY`
- `OPENWA_SESSION_ID`
- `OPENWA_NOTIFY_CHAT_ID`
- `OPENWA_WEBHOOK_SECRET`
- `SITE_URL`

Optional env vars:

- `WHATSAPP_ADMIN_TOKEN`
- `AUTOMATION_WEBHOOK_URL`
- `AUTOMATION_WEBHOOK_TOKEN`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_TOKEN`
- `CRM_WEBHOOK_URL`
- `CRM_WEBHOOK_TOKEN`

## Transport Modes

Production now supports two outbound transport modes:

- direct OpenWA API mode
- bridge mode through `scripts/openwa-bridge.mjs`

Bridge mode is preferred for production hardening because the public endpoint only exposes:

- `POST /send-text`

The bridge requires `OPENWA_BRIDGE_TOKEN` and keeps the raw OpenWA API key on the host machine instead of inside the Cloudflare worker path.

## OpenWA Endpoints Used Internally

- `POST /api/sessions/:id/messages/send-text`
- `POST /api/sessions/:id/webhooks`
- `GET /api/sessions/:id/messages`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/start`

## Local Reliability

The local startup flow now includes a watchdog:

- [scripts/openwa-session-watchdog.mjs](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/scripts/openwa-session-watchdog.mjs>)
- [scripts/run-openwa-watchdog.cmd](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/scripts/run-openwa-watchdog.cmd>)

It polls the saved session, attempts a restart if the session falls to `disconnected`, and writes logs into `runtime/`.

## Recommended Production Setup

1. Keep OpenWA running as a separate service.
2. Prefer a small bridge in front of OpenWA instead of exposing the raw OpenWA API publicly.
3. Keep the raw OpenWA API key only on the OpenWA host when bridge mode is active.
4. Point the OpenWA webhook to `https://ggmarketing.co.ke/whatsapp/webhook`.
5. Make sure `OPENWA_BASE_URL` reaches the bridge or private ingress, not an unrestricted localhost tunnel.
6. Keep Formspree or another recordkeeping sink enabled even if WhatsApp is the main alert channel.

## Important Note

Local verification showed the WhatsApp side working end-to-end, but Formspree timed out from this machine during testing. The lead endpoint is designed to succeed as long as at least one delivery path works, and it reports a degraded success when recordkeeping or alerting partially fails.

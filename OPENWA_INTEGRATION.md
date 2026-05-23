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

The OpenWA webhook receiver remains available at:

- `POST /whatsapp/webhook`

That webhook now supports:

- OpenWA signature verification with `OPENWA_WEBHOOK_SECRET`
- inbound keyword auto-replies for quote, booking, services, and human handoff requests
- optional human handoff alerting back to the internal notify chat

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
- `OPENWA_API_KEY`
- `OPENWA_SESSION_ID`
- `OPENWA_NOTIFY_CHAT_ID`
- `OPENWA_WEBHOOK_SECRET`
- `SITE_URL`

## OpenWA Endpoints Used

- `POST /api/sessions/:id/messages/send-text`
- `POST /api/sessions/:id/webhooks`
- `GET /api/sessions/:id/messages`

## Recommended Production Setup

1. Keep OpenWA running as a separate service.
2. Keep all OpenWA credentials only in Cloudflare environment variables.
3. Point the OpenWA webhook to `https://ggmarketing.co.ke/whatsapp/webhook`.
4. Make sure `OPENWA_BASE_URL` is reachable from Cloudflare, not just from localhost.
5. Keep Formspree or another recordkeeping sink enabled even if WhatsApp is the main alert channel.

## Important Note

Local verification showed the WhatsApp side working end-to-end, but Formspree timed out from this machine during testing. The lead endpoint is designed to succeed as long as at least one delivery path works, and it reports a degraded success when recordkeeping or alerting partially fails.

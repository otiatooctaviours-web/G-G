# Runtime Secret Reference

This document records where the local and production runtime credentials for the `ggmarketing` WhatsApp stack are stored.

It intentionally lists locations and secret names only, not the secret values.

## Local Machine

### OpenWA Admin Key

- File: [external/openwa/data/.api-key](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/external/openwa/data/.api-key>)

### Local Bridge and OpenWA Runtime Values

- File: [.dev.vars](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/.dev.vars:1>)

Keys currently expected there:

- `OPENWA_WEBHOOK_SECRET`
- `FORMSPREE_ENDPOINT`
- `WHATSAPP_PROVIDER`
- `OPENWA_BASE_URL`
- `OPENWA_LOCAL_BASE_URL`
- `OPENWA_API_KEY`
- `OPENWA_BRIDGE_TOKEN`
- `OPENWA_SESSION_ID`
- `OPENWA_NOTIFY_CHAT_ID`
- `SITE_URL`
- `WHATSAPP_ADMIN_TOKEN`
- `AUTOMATION_WEBHOOK_URL`

### Operator/Admin Token Snapshot

- File: [runtime/whatsapp-admin-token.txt](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/runtime/whatsapp-admin-token.txt>)

### Named Tunnel Token

- User environment variable:
  - `OPENWA_NAMED_TUNNEL_TOKEN`

### Cloudflare API Token

- User environment variable:
  - `CLOUDFLARE_API_TOKEN`

## Cloudflare Pages Production

Project: `g-g`

Current secret names:

- `AUTOMATION_WEBHOOK_URL`
- `FORMSPREE_ENDPOINT`
- `OPENWA_API_KEY`
- `OPENWA_BASE_URL`
- `OPENWA_BRIDGE_TOKEN`
- `OPENWA_NOTIFY_CHAT_ID`
- `OPENWA_SESSION_ID`
- `OPENWA_WEBHOOK_SECRET`
- `SITE_URL`
- `WHATSAPP_ADMIN_TOKEN`
- `WHATSAPP_PROVIDER`

## Recommended Hygiene

- Keep only one active source of truth for each token where possible.
- Prefer environment variables or Cloudflare secrets over plaintext runtime files.
- Rotate any token that was ever pasted into chat, screenshots, or temporary notes.
- Do not commit secret values into the repository.

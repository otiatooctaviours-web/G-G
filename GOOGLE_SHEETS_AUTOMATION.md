# Google Sheets Automation

This repo includes a ready-to-paste Google Apps Script at [GOOGLE_SHEETS_AUTOMATION.gs](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/GOOGLE_SHEETS_AUTOMATION.gs>) for logging website and WhatsApp automation events into separate tabs inside one Google Sheet.

It now also supports automatic email notifications when new events are written, so you do not have to keep the sheet open to notice new submissions.

## Tabs Created

- `Raw Events`
- `Leads`
- `WhatsApp Ops`
- `Inbound Messages`

## What Goes Where

### `Raw Events`

Every webhook call is written here as a full JSON audit row.

### `Leads`

Events:

- `lead.received`

Fields include:

- lead type
- name
- email
- contact
- phone
- service
- appointment date/time
- delivery health flags

### `WhatsApp Ops`

Events:

- `whatsapp.follow_up_sent`
- `whatsapp.template_sent`
- `whatsapp.status_update_sent`

Fields include:

- chat ID
- recipient name
- company
- service
- stage
- template
- product name
- status

### `Inbound Messages`

Events:

- `whatsapp.webhook_received`

Fields include:

- sender
- message body
- detected intent
- webhook delivery metadata

## Deploy Steps

1. Open the target Google Sheet.
2. Go to `Extensions > Apps Script`.
3. Replace the existing code with the contents of [GOOGLE_SHEETS_AUTOMATION.gs](</C:/Users/otiat/Desktop/My projects/g-and-g-marketing/GOOGLE_SHEETS_AUTOMATION.gs>).
4. Set `NOTIFICATION_EMAILS` to one or more inboxes you want alerted.
5. Leave `EMAIL_NOTIFICATIONS.leads` as `true` if you want every new form submission emailed to you.
6. Optionally turn on `EMAIL_NOTIFICATIONS.whatsappOps` or `EMAIL_NOTIFICATIONS.inboundMessages` if you also want alerts for WhatsApp activity.
7. Optionally set `EXPECTED_BEARER_TOKEN` if you want header-based protection.
8. Deploy as a `Web app`.
9. Keep `Execute as` set to `Me`.
10. Keep `Who has access` set to `Anyone` if the Cloudflare worker is calling it directly.
11. Update the deployment.

## Notification Behavior

- `lead.received` sends an email by default
- WhatsApp operation and inbound-message emails are off by default to avoid noisy inboxes
- Duplicate notifications are suppressed for a short window so webhook retries do not spam you
- Emails include the submission details plus delivery health flags

## Production Notes

The live worker is currently configured with the existing Apps Script webhook URL as its automation fallback target, so updating the Apps Script code and redeploying it at the same URL is enough to upgrade the sheet behavior.

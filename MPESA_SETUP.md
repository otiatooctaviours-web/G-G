M-Pesa STK Push — Setup
=======================

This project now includes a Cloudflare Pages function endpoint that can initiate M-Pesa STK Push requests and a small client helper to trigger payments from the frontend.

Server endpoints
- `POST /mpesa/stk-push` — initiate an STK push. Expects JSON: `{ amount, phone, accountReference?, description? }`.
- `POST /mpesa/stk-callback` — endpoint for M-Pesa to deliver payment callbacks (logs payload and returns an acknowledgement).

Environment variables
Set the following environment variables in your Cloudflare Pages / Workers environment (do NOT commit these to git):

- `MPESA_CONSUMER_KEY` — Safaricom consumer key
- `MPESA_CONSUMER_SECRET` — Safaricom consumer secret
- `MPESA_PASSKEY` — Lipa na M-Pesa Online passkey (provided by Safaricom)
- `MPESA_BUSINESS_SHORTCODE` — Paybill / till number for your account (e.g. sandbox business shortcode)
- `MPESA_CALLBACK_URL` — optional; defaults to `https://<your-domain>/mpesa/stk-callback`
- `MPESA_ENV` — `sandbox` (default) or `production`

Notes
- Phone numbers must be in international format (e.g. `2547XXXXXXXX`).
- The function uses the OAuth endpoint to fetch an access token, builds the STK password from `BusinessShortCode + Passkey + Timestamp`, and calls the STK push API.
- For sandbox testing use the Safaricom sandbox credentials and endpoints (the function selects endpoints based on `MPESA_ENV`).

Quick curl test

Replace `https://<your-domain>` with your deployed domain and set the environment variables beforehand.

```bash
curl -X POST https://<your-domain>/mpesa/stk-push \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"phone":"2547XXXXXXXX","accountReference":"Starter","description":"Monthly subscription"}'
```

Security
- Never store consumer key/secret or passkey in the repository. Use Cloudflare Pages environment variables or Workers secrets.

If you want, I can:
- add server-side storage of pending transactions,
- add verification of callbacks and webhook signatures,
- or wire the client to a nicer UI modal instead of `prompt()`.

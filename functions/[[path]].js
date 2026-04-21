export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";

  const env = context.env || {};

  const base64 = (str) => {
    if (typeof btoa === "function") return btoa(str);
    if (typeof Buffer !== "undefined") return Buffer.from(str).toString("base64");
    throw new Error("No base64 encoder available");
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

  // STK push initiate endpoint
  if (url.pathname === "/mpesa/stk-push") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload;
    try {
      payload = await context.request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { amount, phone, accountReference, description } = payload;
    if (!amount || !phone) {
      return new Response(JSON.stringify({ error: "Missing amount or phone" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    try {
      const result = await initiateStkPush({ amount, phone, accountReference, description });
      console.log("STK push initiated:", result.body);
      return new Response(JSON.stringify(result.body), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (err) {
      console.error("STK push error:", err);
      return new Response(JSON.stringify({ error: err.message || "STK push failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // Handle M-Pesa STK callback and standing order callback
  if (url.pathname === "/mpesa/stk-callback" || url.pathname === "/mpesa/standing-order-callback") {
    if (context.request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payloadText = "";
    try {
      const payload = await context.request.json();
      payloadText = JSON.stringify(payload);
    } catch (err) {
      payloadText = await context.request.text();
    }

    console.log("Received M-Pesa callback for host", hostname, "path", url.pathname);
    console.log("Callback body:", payloadText);

    const responseBody = {
      ResultCode: 0,
      ResultDesc: "Accepted",
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (isEazzyDomain && isHomeRequest) {
    // Rewrite the Eazzy subdomain root to the product landing page asset.
    url.pathname = "/eazzy-rent.html";
    return context.next(url.toString());
  }

  return context.next();
}

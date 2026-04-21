export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";

  // Handle M-Pesa Standing Order callback
  if (url.pathname === '/mpesa/standing-order-callback') {
    if (context.request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    let payloadText = '';
    try {
      const payload = await context.request.json();
      payloadText = JSON.stringify(payload);
    } catch (err) {
      payloadText = await context.request.text();
    }
    console.log('Received M-Pesa standing order callback for host', hostname);
    console.log('Callback body:', payloadText);

    const responseBody = {
      ResultCode: 0,
      ResultDesc: 'Accepted'
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (isEazzyDomain && isHomeRequest) {
    // Rewrite the Eazzy subdomain root to the product landing page asset.
    url.pathname = "/eazzy-rent.html";
    return context.next(url.toString());
  }

  return context.next();
}

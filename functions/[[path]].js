export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";

  if (isEazzyDomain && isHomeRequest) {
    // Rewrite the Eazzy subdomain root to the product landing page asset.
    url.pathname = "/eazzy-rent.html";
    return context.next(url.toString());
  }

  return context.next();
}

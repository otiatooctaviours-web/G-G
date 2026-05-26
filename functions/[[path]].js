export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const isEazzyDomain = hostname === "eazzy.ggmarketing.co.ke";
  const isHomeRequest = url.pathname === "/" || url.pathname === "/index.html";

  if (!isEazzyDomain && url.pathname === "/index.html") {
    url.pathname = "/";
    return Response.redirect(url.toString(), 301);
  }

  if (isEazzyDomain && isHomeRequest) {
    url.pathname = "/eazzy-rent.html";
    return context.next(url.toString());
  }

  return context.next();
}

const CANONICAL_HOST = "ggmarketing.co.ke";
const WWW_HOST = `www.${CANONICAL_HOST}`;

const HTML_PAGE_PATHS = new Set([
  "/brand-strategy-nairobi",
  "/case-studies-kenya",
  "/content-strategy-kenya",
  "/lead-generation-kenya",
  "/officeops-rmm",
  "/payroll-case-study",
  "/seo-services-kenya",
  "/social-media-marketing-nairobi",
  "/vicidial-case-study",
  "/web-design-nairobi",
]);

const LEGACY_REDIRECTS = new Map([
  ["/freeweb", "/web-design-nairobi"],
  ["/freeweb.html", "/web-design-nairobi"],
]);

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hostname = url.hostname.toLowerCase();
  const normalizedPathname = normalizePathname(url.pathname);
  const normalizedWithoutHtml = normalizedPathname.endsWith(".html")
    ? normalizedPathname.slice(0, -5)
    : normalizedPathname;

  let targetHost = hostname;
  let targetPathname = url.pathname;

  // Keep one public hostname and one URL per page so Search Console stops
  // discovering alternate live copies of the same content.
  if (hostname === WWW_HOST) {
    targetHost = CANONICAL_HOST;
  }

  const legacyRedirect = LEGACY_REDIRECTS.get(normalizedPathname);
  if (legacyRedirect) {
    targetHost = CANONICAL_HOST;
    targetPathname = legacyRedirect;
  } else if (normalizedPathname === "/index.html") {
    targetPathname = "/";
  } else if (
    normalizedPathname.endsWith(".html") &&
    HTML_PAGE_PATHS.has(normalizedWithoutHtml)
  ) {
    targetPathname = normalizedWithoutHtml;
  }

  if (targetHost !== hostname || targetPathname !== url.pathname) {
    url.hostname = targetHost;
    url.pathname = targetPathname;
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}

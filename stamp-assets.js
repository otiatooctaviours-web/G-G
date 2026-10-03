/*
 * Stamps one version onto every stylesheet and script reference in the site.
 *
 * Why this exists
 * ---------------
 * The four entry stylesheets used to pull tokens.css and components.css in
 * with an unversioned CSS @import. An @import URL never changes, so once a
 * browser had fetched it the HTTP cache kept serving the old copy: editing
 * components.css reached only visitors who had never loaded the site. The
 * HTML now links both files directly, and every .css/.js reference carries
 * the same ?v=, so one edit here busts every cached asset at once.
 *
 * Usage
 * -----
 *   node stamp-assets.js            stamp with VERSION below
 *   node stamp-assets.js 20261004-0900   stamp with an override
 *   node stamp-assets.js --check    report only, change nothing
 *
 * It also owns the favicon block. Every page used to point at one 500x500 PNG
 * whose mark occupied only 5.5% of the canvas, so the tab icon rendered at a
 * fraction of the space a favicon gets, and 404.html used a root-absolute path
 * while the rest used "./". One generated block, stamped like everything else,
 * keeps those from drifting apart again.
 *
 * After changing any .css, .js or icon file, bump VERSION and run this.
 */

/* >>> THE ONE PLACE TO BUMP <<< */
const VERSION = "20261003-0930";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

/* Load order matters and must not change: tokens, then components, then the
 * per-page entry stylesheet. That is the same order the old @import produced,
 * so the cascade is untouched. */
const SHARED_CSS = ["tokens.css", "components.css"];

/* Built by gen-icons.py from assets/g_g_tech.dev-removebg.png. Order matters:
 * the SVG comes first so browsers that understand prefers-color-scheme get the
 * navy-on-light variant, with the flat PNG/ICO rasters behind it as fallback.
 * {0} is the version query. */
const ICON_LINKS = [
  '<link rel="icon" href="./assets/favicon.svg{0}" type="image/svg+xml" />',
  '<link rel="icon" href="./assets/favicon.ico{0}" sizes="any" />',
  '<link rel="icon" href="./assets/favicon-32.png{0}" type="image/png" sizes="32x32" />',
  '<link rel="icon" href="./assets/favicon-16.png{0}" type="image/png" sizes="16x16" />',
  '<link rel="apple-touch-icon" href="./assets/apple-touch-icon.png{0}" sizes="180x180" />',
  '<link rel="manifest" href="./site.webmanifest{0}" />',
];

/* Shared by the stamper and the stray check below so the two cannot disagree
 * about which files count as icons. */
const ICON_FILE =
  "(?:favicon(?:-16|-32|-48|-64)?\\.(?:svg|ico|png)|apple-touch-icon\\.png" +
  "|icon-(?:192|512)\\.png|maskable-icon-(?:192|512)\\.png|site\\.webmanifest)";
const ICON_REF = new RegExp(
  "(?:href|src)=\"(?:\\./|/)?(?:assets/)?" + ICON_FILE + "(?:\\?v=[^\"]*)?\"",
  "g"
);

const entryArg = process.argv[2];
const checkOnly = entryArg === "--check";
const version = checkOnly ? VERSION : entryArg || VERSION;

const versionOf = (p) => `?v=${version}`;

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

const report = [];
let changedFiles = 0;
let refCount = 0;

for (const file of htmlFiles) {
  const full = path.join(ROOT, file);
  const before = fs.readFileSync(full, "utf8");
  let text = before;
  // Preserve whatever this file already used: no BOM, CRLF stays CRLF. Doing it
  // up front means --check can compare like for like instead of seeing a
  // difference on every file that has an icon block.
  const nl = /\r\n/.test(before) ? "\r\n" : "\n";

  // 1. Rebuild the favicon block: drop every icon link already in the file and
  //    splice the canonical block back in at the position the first one held.
  //    Done line by line on purpose. A single whole-block regex looks tidier but
  //    silently stops matching if the links are ever split across two spots, and
  //    then every run appends another copy instead of replacing the old one.
  const lines = before.split(/\r?\n/);
  const isIconLine = (line) => /^\s*<link\s+rel="(?:icon|apple-touch-icon|manifest)"/.test(line);
  const kept = [];
  let insertAt = -1;
  let iconIndent = "    ";
  for (const line of lines) {
    if (isIconLine(line)) {
      if (insertAt < 0) {
        insertAt = kept.length;
        iconIndent = line.match(/^\s*/)[0];
      }
      continue;
    }
    kept.push(line);
  }
  if (insertAt < 0) {
    // Nothing to replace: put the block ahead of the first stylesheet, or ahead
    // of </head> on pages like 404.html that load no stylesheet.
    const anchor = kept.findIndex(
      (l) => /^\s*<link\s+rel="stylesheet"/.test(l) || /^\s*<\/head>/.test(l)
    );
    if (anchor >= 0) {
      insertAt = anchor;
      iconIndent = kept[anchor].match(/^\s*/)[0];
    }
  }
  if (insertAt >= 0) {
    kept.splice(insertAt, 0, ...ICON_LINKS.map((t) => iconIndent + t.replace("{0}", versionOf(""))));
    text = kept.join(nl);
  }

  // 2. Insert the shared links ahead of the first stylesheet link, once.
  //    404.html ships inline styles and loads no stylesheet, so it is skipped.
  const firstCssLink = text.match(/[ \t]*<link rel="stylesheet"[^>]*>\n?/);
  if (firstCssLink) {
    if (!/<link rel="stylesheet"[^>]*href="\.\/tokens\.css\?v=/.test(text)) {
      const indent = (firstCssLink[0].match(/^[ \t]*/) || [""])[0];
      const block = SHARED_CSS.map(
        (f) => `${indent}<link rel="stylesheet" href="./${f}${versionOf(f)}" />\n`
      ).join("");
      text = text.replace(firstCssLink[0], block + firstCssLink[0]);
    }
  }

  // 3. Put the shared version on every remaining .css/.js reference.
  //    The path prefix may be "./", "/" or absent - 404.html uses a
  //    root-absolute "/whatsapp-float.js", so all three forms are matched.
  text = text.replace(
    /((?:href|src)="(?:\.\/|\/)?(?:[\w.-]+\.(?:css|js)))(?:\?v=[^"]*)?"/g,
    (m, head) => {
      refCount++;
      return `${head}${versionOf("")}"`;
    }
  );

  if (text !== before) {
    changedFiles++;
    if (!checkOnly) {
      fs.writeFileSync(full, text, "utf8");
    }
  }
  report.push({ file, changed: text !== before });
}

const iconLinkCount = htmlFiles.reduce(
  (n, f) => n + (fs.readFileSync(path.join(ROOT, f), "utf8").match(ICON_REF) || []).length,
  0
);

console.log(`VERSION = ${version}${checkOnly ? "  (check only, nothing written)" : ""}`);
console.log(`html files scanned : ${htmlFiles.length}`);
console.log(`css/js refs stamped: ${refCount}`);
console.log(`icon refs stamped : ${iconLinkCount}`);
console.log(`files ${checkOnly ? "needing" : "rewritten"}  : ${changedFiles}`);

const untouched = report.filter((r) => !r.changed).map((r) => r.file);
if (untouched.length) console.log(`already current      : ${untouched.join(", ")}`);

// Report any stylesheet, script or icon reference that is still unversioned.
const strays = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const m of text.matchAll(/(?:href|src)="(?:\.\/|\/)?[\w.-]+\.(?:css|js)(?:\?v=[^"]*)?"/g)) {
    if (!m[0].includes("?v=")) strays.push(`${file}: ${m[0]}`);
  }
  for (const m of text.matchAll(ICON_REF)) {
    if (!m[0].includes("?v=")) strays.push(`${file}: ${m[0]}`);
  }
}
console.log(`\nunversioned refs    : ${strays.length === 0 ? "none" : ""}`);
strays.forEach((s) => console.log(`  ${s}`));
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
 * After changing any .css or .js file, bump VERSION and run this.
 */

/* >>> THE ONE PLACE TO BUMP <<< */
const VERSION = "20261003-0621";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

/* Load order matters and must not change: tokens, then components, then the
 * per-page entry stylesheet. That is the same order the old @import produced,
 * so the cascade is untouched. */
const SHARED_CSS = ["tokens.css", "components.css"];

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

  // 1. Insert the shared links ahead of the first stylesheet link, once.
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

  // 2. Put the shared version on every remaining .css/.js reference.
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
      // preserve whatever this file already used: no BOM, CRLF stays CRLF
      const hadCRLF = /\r\n/.test(before);
      fs.writeFileSync(full, hadCRLF ? text.replace(/(?<!\r)\n/g, "\r\n") : text, "utf8");
    }
  }
  report.push({ file, changed: text !== before });
}

console.log(`VERSION = ${version}${checkOnly ? "  (check only, nothing written)" : ""}`);
console.log(`html files scanned : ${htmlFiles.length}`);
console.log(`css/js refs stamped: ${refCount}`);
console.log(`files ${checkOnly ? "needing" : "rewritten"}  : ${changedFiles}`);

const untouched = report.filter((r) => !r.changed).map((r) => r.file);
if (untouched.length) console.log(`already current      : ${untouched.join(", ")}`);

// Report any stylesheet or script reference that is still unversioned.
const strays = [];
for (const file of htmlFiles) {
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  for (const m of text.matchAll(/(?:href|src)="(?:\.\/|\/)?[\w.-]+\.(?:css|js)(?:\?v=[^"]*)?"/g)) {
    if (!m[0].includes("?v=")) strays.push(`${file}: ${m[0]}`);
  }
}
console.log(`\nunversioned refs    : ${strays.length === 0 ? "none" : ""}`);
strays.forEach((s) => console.log(`  ${s}`));
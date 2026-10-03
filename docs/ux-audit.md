# UX Audit

Snapshot for the site-wide UX cleanup. **No finding in this document has been acted on.**
Companion file: [`content-inventory.md`](./content-inventory.md) — the content lock.

- Branch: `ux-cleanup`
- Scope: 17 HTML pages, 4 stylesheets, 8 scripts
- Method: static analysis of every page and stylesheet, plus programmatic extraction of
  declarations and markup. No browser rendering was available in this environment, so
  everything below is measured from source, not observed at runtime.
- Every count below is reproducible from the four root stylesheets and the 17 root HTML
  files. Stale directories (`.pages-deploy-temp/`, `runtime/`) are excluded — see
  [Clutter](#clutter).

---

## 0. The finding that shapes everything else

The site is not one design system. It is **three**, and they do not agree.

| System | Stylesheet | Script | Pages |
|---|---|---|---|
| A | `home.css` (38.7 KB, 2039 lines) + `approach-flow.css` (10 KB) + `pricing-glow.css` (2 KB) | `home.js` | 7 — `index`, `approach`, `services`, `pricing`, `contact`, `testimonials`, `officeops-rmm` |
| B | `styles.css` (21.7 KB, 1158 lines) | `script.js` (27.6 KB) | 9 — the `*-kenya.html` service pages, `web-design-nairobi`, `payroll-case-study`, `vicidial-case-study` |
| C | inline `<style>` only, no stylesheet | none | 1 — `404.html` |

Consequences that recur in every section below:

- `404.html:17` defines its own `:root` tokens (`--bg: #07111f`, `--bg-deep: #030914`,
  `--text: #f5f8ff`) that match neither system.
- Heading sizes disagree between A and B for the same element: `home.css` `h1` is
  `clamp(3.3rem, 6vw, 6rem)`, `styles.css` `h1` is `clamp(3rem, 6vw, 5.4rem)`. The same
  `<h1>` renders 96px on one page and 86.4px on another at the same viewport.
- Only `styles.css` sets `overflow-x: hidden` on `body` (1 occurrence). `home.css`,
  `approach-flow.css` and `pricing-glow.css` have **zero**.
- `button-ghost` exists only in B; `submit-button` only in A.
- CookieYes loads on 10 of 17 pages. The 7 without it are `404.html` plus the six System A
  pages other than `index.html`.

---

## Spacing

**78 `padding` declarations resolving to 49 distinct values**, and **82 `gap`
declarations resolving to 35 distinct values** across the four stylesheets.

### Section rhythm — four different vertical rhythms

| Value | Where |
|---|---|
| `88px 0` | `home.css` `.section` (System A default) |
| `88px 0 clamp(3.5rem, 7vw, 5.5rem)` | `home.css` `.pricing-group` — asymmetric on purpose, but reads as a mistake next to `.section` |
| `120px 0 76px` | hero block |
| `154px 0 88px` | `home.css` `.hero-section` — pulls the hero up under the sticky header with a negative top margin |
| `28px 0`, `42px 0`, `18px 0`, `14px 0` | section-local overrides that each re-pick a rhythm |

System B's `.section` uses a different padding again. There is no shared spacing token —
every value is a literal.

### Gap scale — 16 pixel values before any `rem`

`2, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 40, 56px`, plus the two-axis
`16px 32px` and `18px 24px`, plus `0.15rem 0.6rem 0.7rem 0.75rem 0.85rem 0.9rem 1rem
1.25rem 1.4rem 1.5rem 1.8rem`, plus 5 `clamp()` gaps, plus `0`.
`6/7/8`, `10/12/14/16`, and `20/22/24/26/28/40/56` are effectively three separate
near-identical ramps. Five use `px` where the same magnitude exists in `rem`
(`1rem` = 16px sits next to `16px`).

### Card padding — 15 variants for one job

`6px 13px`, `7px 12px`, `12px 16px`, `13px 18px`, `14px 0`, `15px 16px`, `16px 18px`,
`18px 0`, `18px 26px`, `22px 20px`, `22px 24px`, `24px 22px 22px`, `26px 24px`,
`28px 0`, `16px 18px 16px 48px`. Note `13px 18px` vs `15px 16px` vs `16px 18px` — the
same idea, three values.

Two late rules in `home.css` then override the declared card padding:

- `home.css:1219-1228` sets `padding: 0` on **eight** selectors at once —
  `.hero-summary-card`, `.service-card`, `.testimonial-card`, `.faq-item`,
  `.pricing-card`, `.addons-card`, `.contact-form-card`, `.case-study-copy`. Every one
  of those 15 padding values is dead on arrival for these cards.
- `home.css:1244-1250` goes further on `.service-card-media` and `.case-study-media`,
  resetting padding, border-radius, background and box-shadow together.

So the *effective* card padding differs from the declared padding on every card in
System A.

### Container gutter changes at two different breakpoints

Both systems declare `--container: min(1160px, calc(100vw - 40px))`, then re-declare it
as `min(100vw - 28px, 1160px)` — System A at `max-width: 560px`, System B at
`max-width: 640px`. Between 560 and 640 the two systems have different gutters.

---

## Typography

Two families (`--font-body` Plus Jakarta Sans, `--font-display` Cormorant Garamond),
4 weights (500/600/700/800), 2 size-and-spacing tokens — but **50 `font-size`
declarations resolving to 35 distinct values** and **13 distinct `line-height` values**.

### Heading scale clash between systems

| Element | System A (`home.css`) | System B (`styles.css`) |
|---|---|---|
| `h1` | `clamp(3.3rem, 6vw, 6rem)` / `0.92` | `clamp(3rem, 6vw, 5.4rem)` / `0.94` |
| `h2` | `clamp(2.3rem, 4vw, 3.9rem)` / `0.96` | `clamp(2.2rem, 4vw, 3.6rem)` / `0.98` |
| `h3` | `clamp(1.4rem, 2vw, 1.9rem)` / `1` | `clamp(1.35rem, 2vw, 1.85rem)` / `1.05` |
| body `p` | `1.7` | `1.72` |

### Line-height fragmentation — 13 values

Heading scale: `0.9, 0.92, 0.94, 0.96, 0.98, 1, 1.05, 1.1` — eight values spanning 0.2.
Body scale: `1.45, 1.5, 1.55, 1.7, 1.72` — `1.7` and `1.72` are the same intent.

### Font-size near-duplicates

`0.82 / 0.84 / 0.85 / 0.86` (four eyebrow-scale values), `0.875 / 0.88`,
`0.92 / 0.95 / 0.96`, `1.02 / 1.05 / 1.06 / 1.08`, `1.3 / 1.35`, `1.8 / 2 / 2.6`.

### Letter-spacing — 8 values

`-0.04em, -0.03em, 0, 0.08em, 0.12em, 0.14em, 0.16em, 0.18em`. The last four are all
"wide uppercase eyebrow" and differ by 0.02em each.

### Heading structure — clean

Exactly one `<h1>` on all 17 pages (17 `<h1>` tags / 17 pages, verified per page).
**Zero skipped heading levels** on any page. This is the healthiest part of the markup
and should not be disturbed.

---

## Colors

**48 distinct hex colors** plus a large `rgba()` set, for what should be roughly 15 design
tokens. `home.css` defines a coherent 20-token `:root`; the rest is one-off literals.

### Near-duplicate clusters

| Cluster | Values | Note |
|---|---|---|
| Navy/ink | `#07111f #071a36 #081223 #0b1d3a #0e1b31 #0f1f34 #10213b #112039 #122640 #13233d #16202f #1d2834 #31506f #40516a #43536f` | 15 near-identical dark navies. `#576273` / `#586274` are the same grey to the eye. |
| Gold | `#9d7a36 #c39f52 #c79635 #d8b36a #e6c07a #f1cf8d #f3dfb0 #fff0ca #fff3d7` | 9 golds. `--accent` is `#d8b36a` but `#9d7a36`, `#c39f52`, `#c79635` and `#e6c07a` all appear as literals. |
| Off-white | `#f6f6f0 #f7f7f2 #f8f7f2 #f1efe6 #fdfcf7 #ffffff` | 6 whites. |
| Pale blue | `#d7e7ff #d9e1f3 #dfe8f5 #eef3fa #eef3fb #eff4fb #eff6ff #f2f6fa #f2f7ff #f8fbff` | 10 pale blues used for surfaces that should be one token. |

### Low-contrast text

- `--text-muted: #576273` on `#f7f7f2` ≈ 5.9:1 — passes AA for body text, but it is
  applied to `.service-card p` and list text at `0.82rem`–`0.88rem`, where it reads weak.
- `#9d7a36` on `rgba(255,255,255,0.9)` ≈ 4.0:1 — **fails AA for normal text**. Used for
  `.service-index`, `.case-study-tag` in `home.css` and `.flow-index` in
  `approach-flow.css`. These are small bold uppercase labels, so 4.0:1 is a real miss.
- `rgba(247,247,242,0.72)` on `#122640` (`.pricing-delivery` in `home.css`) ≈ 6.4:1 —
  acceptable, but 0.72 alpha on a moving target is fragile.
- Gold `#d8b36a` on navy, used for small uppercase eyebrows via `--accent-strong`, is fine.
  The problem is only the mid-gold `#9d7a36`.

---

## Components

### Buttons

`min-height: 52px` in both systems — good, clears the 44px tap target. But:

| | System A | System B |
|---|---|---|
| base padding | `0 22px` | `0 1.3rem` (20.8px) |
| primary | `home.css` | `styles.css` |
| secondary | `home.css` | `styles.css` |
| ghost | **absent** | `styles.css` |
| submit | `home.css` (`.submit-button`) | **absent** |

22px and 1.3rem are different. `button-ghost` is used on 9 pages; `submit-button` on 2.
Neither system provides the other's variant, so any shared component will break on one
side.

`payroll-case-study.html` defines `.portfolio-payroll-showcase`, `.portfolio-payroll-card`
and `.portfolio-payroll-button*` in a **page-local inline `<style>`** — these classes
appear in no stylesheet or script. A third button family living inside one page.

### Cards doing the same job, styled differently

System A spreads **eight** card families across the file rather than one abstraction:
`home.css:530-534` gives `.service-card`, `.testimonial-card`, `.faq-item`,
`.case-study-card` and `.contact-form-card` a shared base, then `.hero-summary-card`
(L393), `.pricing-card` and `.addons-card` (L609-610) each get separate treatment.
System B references `.service-card` 11 times across its own rules, redefining it from
scratch. The same class name therefore means a bordered elevated card in B and a
borderless flat block in A.

### Forms

Only 2 forms and 12 fields site-wide. `index.html` and `contact.html` each carry a
**functionally identical** form: same fields, same
`action="https://formspree.io/f/xlgwyzwb"`, same classes. The only difference is
whitespace — the `<textarea>` is one line in `index.html` and six in `contact.html`. Two
copies of one live form, free to drift.

### Cards are not a component

No shared card abstraction exists. Every family sets its own padding, background,
border-radius and shadow. This is why the padding table above has 15 entries.

---

## Responsive

### Six distinct breakpoints across four files

| Stylesheet | Breakpoints (`max-width`) |
|---|---|
| `home.css` | 560, 820, 1080 |
| `styles.css` | 640, 860, 1080 |
| `approach-flow.css` | 639, 1023 |
| `pricing-glow.css` | none |

`639` and `640` are the same breakpoint expressed two ways — `approach-flow.css` switches
to its mobile layout at 639px while `styles.css` switches at 640px, so on a 640px viewport
the two files on `approach.html` disagree by one pixel. `1023` vs `1080` means
`approach-flow.css` and the rest of `home.css` disagree across a 57px band.

### Break risks at the requested widths

- **320px** — `--container` is `100vw - 28px` = 292px. `h1` at `clamp(3.3rem, 6vw, 6rem)`
  floors at 52.8px. The `index.html` hero and the pricing grid are the tightest cases. No
  `min-width: 0` guard exists on most card text, so a long single word can force a track
  wider than the viewport.
- **375px** — same as 320 with more room; low risk.
- **768px** — falls between System A's 820px and System B's 860px queries: a width where
  *neither* system's mid-range rules apply on the pages that mix them.
- **1024px** — the flow chart's narrowest desktop case. Cards are 211.5px wide with a
  147px text column in `approach-flow.css`; tight but holding.
- **1440px / 1920px** — container caps at 1160px, so content is centred with large empty
  margins. No max-width issues, but ~380px of dead margin at 1920px.

### No horizontal-overflow guard on System A

`styles.css` sets `overflow-x: hidden` on `body`. The other three stylesheets set it
nowhere. The pricing glow had to add `overflow: clip` locally to avoid scroll. Any future
wide element on a System A page has no backstop.

---

## Clutter

Listed only, not touched.

### Root images that no page references — 13 files, 15.4 MB, all git-tracked

`brand strategy.png` (2299.6 KB), `social media.png` (2210.1 KB), `content strat.png`
(2121.9 KB), `lead generation.png` (1939.5 KB), `seo.png` (1917.1 KB), `web design.png`
(1737.1 KB), `homepage-hero-confirmed.png` (915.2 KB), `homepage-bg-hero-confirmed.png`
(793.2 KB), `homepage-hero-full-layout.png` (793.2 KB), `homepage-case-logos.png`
(596.1 KB), `web-design-live-confirmed.png` (586.6 KB), `web-design-live-after-push.png`
(237.4 KB), `web-design-live.png` (230.4 KB).

These are design references and deploy confirmations. They are committed, so every clone
and deploy carries them.

### Lighthouse reports committed at root — 4 files, 1.7 MB

`lh-current-home.json` (675.1 KB), `lh-current-social.json` (453.5 KB), `lh-live-seo.json`
(319.4 KB), `lh-report.json` (254.9 KB). Plus `server.out.log` and `server.err.log`
(0 bytes each, still tracked). `wrangler-dev*.result.txt` is already gitignored.

**Total tracked root clutter: 17.66 MB.**

### Unreferenced files in `assets/` — 15 files, 2.94 MB, all git-tracked

`webdesign.png` (1446.5 KB), `logo-hero-soft.png` (906.3 KB), `founder-portrait.png`
(216.9 KB), `logo-square.jpg` (132.5 KB), `logo.jpeg` (107.6 KB), `avatars.jpg` (103.9 KB),
`founder-portrait.webp` (17.2 KB), `testimonial-daniel.jpg` (15.8 KB),
`testimonial-sarah.jpg` (15.8 KB), `testimonial-angela.jpg` (15.1 KB), `qr-code.png`
(9.6 KB), `office-management-logo.svg` (9.3 KB), `logo-square.webp` (5.6 KB),
`gg-logo.svg` (4.5 KB), `favicon.svg` (1.9 KB).

Four logo representations (`logo.jpeg`, `gg-logo.svg`, `logo-square.jpg` + `.webp`) and two
founder portraits in two formats, all unused. `favicon.svg` is unused because **all 17
pages point their icon at `assets/g_g_tech.dev-removebg.png` instead** — a PNG as the site
icon on every page.

### Stale directories — already gitignored, so no repo bloat

- `runtime/` — **1160 files, 80.4 MB.** Debug/scratch output including vendored CSS and
  JS bundles from unrelated tooling. 0 tracked files.
- `.pages-deploy-temp/` — 44 files, 4.6 MB. A stale deploy staging copy of 13 pages plus
  its own `styles.css` at 70.4 KB (a *third*, older version of the stylesheet). 0 tracked
  files.

Both are covered by `.gitignore`, so they cost disk but not clone size. Note that
`.pages-deploy-temp/styles.css` is a 70.4 KB earlier draft of the 21.7 KB current
`styles.css` — worth confirming it is not the version actually deployed before deleting.

### Heavy effects

- **33** `box-shadow` declarations, including `0 24px 70px rgba(6,15,30,0.16)` and
  `0 30px 70px rgba(4,10,20,0.46)`.
- **`backdrop-filter` in 13 rules** — 8 in `home.css` (`.site-header`,
  `.site-header.is-scrolled`, `.hero-card`, `.hero-summary-card`, `.brand-strip`,
  `.officeops-landing .site-header`, `.pricing-tabs`, `.pricing-page .pricing-card`) and
  5 in `styles.css` (`.site-header`, `.site-header.is-scrolled`,
  `.site-header .navbar.glass`, and two large grouped selectors covering ~11 components
  each). **Three different blur radii** — `blur(14px)`, `blur(16px)`, `blur(18px)`.
  Stacked blurs are the single biggest paint cost on scroll.
- `pricing-glow.css` adds a `blur(48px)` element that repaints on pointer movement.
- Layered radial gradients on `body`, `.hero-section`, `.section-surface`,
  `.section-contrast`, `.pricing-group`, plus `image-set()` with a `.webp`/`.jpg` pair.

### Duplicated content

- The contact form exists twice (`index.html`, `contact.html`) — identical fields,
  different whitespace.
- CookieYes snippet duplicated across 10 pages.
- Google Fonts `<link>` duplicated across all 17 pages, each with
  `media="print" onload="this.media='all'"`.
- Every page repeats the full nav and the footer link list by hand.
- 413 `<a>` tags across 17 pages.

---

## Accessibility and performance

### Accessibility — mostly good

| Check | Result |
|---|---|
| Images missing `alt` | **0 of 132** — clean |
| Images with `alt=""` (decorative) | 48 |
| Images missing `width`/`height` | **0 of 132** — no image-driven layout shift |
| Pages with more than one `<h1>` | **0** (17 `<h1>` / 17 pages) |
| Heading levels skipped | **0** |
| Focus styling, System A | 9 `focus-visible` rules in `home.css` |
| Focus styling, System B | **4** in `styles.css` |
| Focus styling, page-level CSS | **0** in `approach-flow.css` and `pricing-glow.css` |

Real gaps:

1. **Focus coverage is uneven between systems.** System A styles focus on 9 selectors;
   System B on 4 — nothing for cards, form fields, FAQ summaries, tabs or footer links.
   Keyboard users on the 9 System B pages get a default outline on most controls. The two
   page-level stylesheets have none at all.
2. **`#9d7a36` on white ≈ 4.0:1** fails AA for the small uppercase labels described under
   Colors.
3. **Form labels** — inputs rely on `placeholder` plus a `<label>`. The honeypot `website`
   field is `tabindex="-1"`, which is correct, but nothing links it to an explanation via
   `aria-describedby`.
4. **No `prefers-reduced-motion` guard on scroll-in reveals in `approach-flow.js`** — the
   script checks `prefers-reduced-motion` and bails, so the section renders in its final
   state. That one is correct. `home.js` and `script.js` were not audited for equivalent
   guards.
5. **Tap targets**: `.button` is 52px (pass). `.nav-toggle` is 50×50 (pass).
   `.pricing-tab` is 46px (pass). The WhatsApp launcher is 56×56 (pass). But most nav and
   footer link rules set no `min-height` at all — `home.css` and `styles.css` each have
   several `.site-nav a` / `.nav-links a` blocks with only a colour and a font size, so
   those text links sit well under the 44px minimum.

### Performance

| Metric | Value |
|---|---|
| Referenced image weight | **2.53 MB** across 23 unique files (26 unique references) |
| Images not lazy-loaded | **107 of 132** — 25 `lazy`, 7 explicitly `eager`, 100 with no attribute |
| Largest single asset in use | `founder-hero-cutout.png` — **1010.1 KB**, on `index.html` *and* `approach.html` |
| `payroll-logo.png` | 306 KB, repeated on 4 pages |
| `officeops-rmm-logo-readable.png` | 240 KB |
| Service card images | 129.8–184 KB each as `.webp` |

Lazy-loading is applied inconsistently rather than absent: `index.html` marks 11 of 19,
`services.html` 6 of 8, `testimonials.html` 3 of 5, `officeops-rmm.html` 4 of 8 — while
**all 9 System B service pages mark 0 of their 7–9 images**. So the nine pages sharing one
stylesheet are uniformly un-optimised.

`founder-hero-cutout.png` at 1 MB is a hero image; if it is not lazy-loaded it is the
likely LCP element on two pages. The Lighthouse JSON at root suggests this was already
known — `lh-current-home.json` is 675 KB.

**Layout shift risk is low**: all 132 images declare intrinsic `width`/`height`, and the
font pair loads via the print-media trick (non-render-blocking). The remaining CLS risk is
the chat widget and pricing tabs mounting after first paint — `whatsapp-float.js` and
`pricing.js` (29.9 KB and 9.3 KB) both build DOM at `defer` time.

---

## Top 15 fixes, by impact

Ordered by user impact first, then effort and risk. **None of these have been applied.**

| # | Fix | Impact | Why it ranks here |
|---|---|---|---|
| 1 | Add `loading="lazy"` + `decoding="async"` to the 107 images that lack them | High | Cheapest large win. The nine System B pages mark 0 of 76 images, so they gain the most. |
| 2 | Compress or replace `founder-hero-cutout.png` (1010 KB, on 2 pages) | High | Likely the LCP element on the two most important pages. WebP/AVIF would cut ~80%. |
| 3 | Unify on one design system | High | Fixes items 4–11 at once. Everything below is a symptom of the A/B/C split. Largest effort, largest payoff — do this first, structurally. |
| 4 | Bring `styles.css` focus-visible coverage up to `home.css`'s level (4 vs 9) | High | Keyboard accessibility gap on 9 pages. Pure addition, low risk. |
| 5 | Fix `#9d7a36` on white (~4.0:1) to meet AA | High | Fails WCAG AA on small text. One token change. |
| 6 | Add `overflow-x: hidden` to `home.css` `body` | High | System A has no overflow backstop; one line prevents a whole class of horizontal-scroll bugs. |
| 7 | Deduplicate the contact form — one source, injected or included | Medium-high | Two copies of a live form with a real Formspree endpoint; they will drift. |
| 8 | Collapse 13 heading/body line-heights and the 4 near-duplicate font-size clusters into a scale | Medium-high | Makes every future change safe. Mostly deletion. |
| 9 | Collapse 48 hex colors to the `:root` token set | Medium-high | 6 whites, 10 pale blues, 15 navies, 9 golds. Mechanical, verifiable by diff. |
| 10 | Consolidate 15 card padding values and the 16-value gap ramp into tokens | Medium | Removes the largest spacing duplication. |
| 11 | Reconcile the breakpoints (639/640, 1023/1080, 560/640, 820/860) | Medium | Off-by-one and 57px disagreement bands cause real layout bugs. |
| 12 | Untrack the 13 root PNGs and 4 Lighthouse JSONs (17.66 MB) | Medium | Never served, but they are committed, so every clone and deploy carries them. Add to `.gitignore`; `git rm --cached` to untrack without deleting. |
| 13 | Delete the 15 unreferenced `assets/` files (2.94 MB) | Medium | Same, plus the confusion of four logo variants and two portrait formats. |
| 14 | Reduce `backdrop-filter` from 13 rules / 3 blur radii to one token | Medium | Main scroll-paint cost on long pages. Visual change, so needs a screenshot check. |
| 15 | Add `min-height: 44px` to nav and footer links | Medium-low | Fails the tap-target minimum on the most-used persistent elements. |

### Deliberately not in the top 15

- **CookieYes inconsistency** (10 of 17 pages). Real, and it contributes to the mobile
  widget overlap already known on this site, but it is a third-party consent decision
  rather than a styling fix — it needs a product answer before code.
- **Untracked stale directories** `runtime/` (80.4 MB) and `.pages-deploy-temp/` (4.6 MB).
  Already gitignored, so no user-facing or repo-size benefit — but confirm
  `.pages-deploy-temp/styles.css` is not the deployed version before removing.
- **Untidy `payroll-case-study.html` inline `<style>`.** Should be absorbed when item 3
  happens.
- **PNG favicon on all 17 pages** while `assets/favicon.svg` sits unused. A real but
  low-impact win.
- **Placeholder-as-label on form fields.** Works, but better with persistent labels —
  bundles with item 7.

---

## Content lock

All text that must survive unchanged is enumerated in
[`content-inventory.md`](./content-inventory.md): **1248 element rows across the 17
pages**, scanned in document order and broken out per page (headings, links, buttons,
images, form fields, nav items), plus a section for JavaScript-rendered content from
`pricing-data.js` and `chatbot-config.js` — which exists in no HTML file.
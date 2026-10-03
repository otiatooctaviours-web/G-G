# Design System — Implementation Report

Implements the plan in [`ux-audit.md`](./ux-audit.md) §"Top 15 fixes" items 3–11 and 14,
scoped to **shared components only**. No page content was touched.

---

## 1. Changed files

| File | Status | Lines | What changed |
|---|---|---|---|
| **`tokens.css`** | **new** | 182 | Every design decision, declared once |
| **`components.css`** | **new** | 734 | One implementation of each shared component |
| `home.css` | modified | 2039 → 1700 | `-339` net; `:root` + 24 shared rule blocks removed |
| `styles.css` | modified | 1158 → 862 | `-296` net; `:root` + 21 shared rule blocks removed |
| `approach-flow.css` | modified | 470 → 476 | Colours/shape repointed at tokens; geometry untouched |
| `pricing-glow.css` | modified | 86 → 89 | Blur radius repointed at tokens |

**Not modified:** all 17 HTML files, all 8 JS files, `sitemap.xml`, `robots.txt`, every
image and asset. Verified — `git diff --name-only` returns CSS paths only.

### How it loads

```
home.css      →  @import tokens.css, components.css   →  page rules
styles.css    →  @import tokens.css, components.css   →  page rules
approach-flow.css → @import tokens.css                →  flow chart rules
pricing-glow.css  → @import tokens.css                →  glow rules
```

`components.css` is imported **before** the page rules, so an equal-specificity page rule
still wins. That is deliberate: System B's `.cta-copy .button-secondary` and System A's
`.officeops-landing .button-primary` are page decisions and keep working, while shared
geometry comes from the system. Adding a `<link>` to 17 HTML files was avoided entirely.

---

## 2. Token list

### Spacing — 4px/8px base (`tokens.css`)

| Token | Value | Replaces |
|---|---|---|
| `--space-1` | 4px | hairline offsets |
| `--space-2` | 8px | tight label gaps |
| `--space-3` | 12px | inside small controls |
| `--space-4` | 16px | default control inset |
| `--space-5` | 24px | **mobile gutter**, card gutter |
| `--space-6` | 32px | card gutter (System B) |
| `--space-7` | 48px | **desktop gutter**, **mobile section pad** |
| `--space-8` | 64px | reserved |
| `--space-9` | 96px | **desktop section pad** |
| `--space-10` | 128px | hero-scale breathing room |

### Container and section rhythm

| Token | Mobile | Desktop |
|---|---|---|
| `--container-max` | `1160px` | `1160px` |
| `--gutter` | `24px` | `48px` (≥768px) |
| `--container` | `min(1160px, 100vw − 2×gutter)` | same |
| `--section-pad` | `48px` | `96px` (≥768px) |
| `--measure` | `65ch` | `65ch` |

One container, one gutter pair, one section padding pair — previously `100vw − 40px`
(System A) and `100vw − 28px` (System B) with the gutter re-declared at **two different
breakpoints** (560px vs 640px).

### Type — fluid, same two faces

| Token | Value |
|---|---|
| `--font-display` | `"Cormorant Garamond", serif` (unchanged) |
| `--font-body` | `"Plus Jakarta Sans", sans-serif` (unchanged) |
| `--text-h1` | `clamp(2.75rem, 6vw, 5.5rem)` |
| `--text-h2` | `clamp(2.125rem, 4vw, 3.5rem)` |
| `--text-h3` | `clamp(1.3125rem, 2vw, 1.75rem)` |
| `--text-body` | `1rem` |
| `--text-small` | `clamp(0.875rem, 0.95vw, 1rem)` |
| `--text-eyebrow` | `clamp(0.75rem, 0.8vw, 0.8125rem)` |
| `--leading-heading` | **1.1** (h1, h2) |
| `--leading-heading-sm` | **1.2** (h3) |
| `--leading-body` | **1.6** |
| `--tracking-heading` | `-0.03em` |
| `--tracking-eyebrow` | `0.16em` |
| `--weight-medium/bold/max` | 600 / 700 / 800 |

`--leading-heading` replaces a **0.92–1.05** spread across eight values. This is the one
deliberately large visual change: h1 line-height goes from `0.92` to `1.1`, so headings
occupy noticeably more vertical space. It was explicitly requested.

### Colour — navy / gold / cream, near-duplicates merged

| Token | Value | Contrast | Merged from |
|---|---|---|---|
| `--color-navy` | `#081223` | — | `#081223` `#07111f` `#081223` |
| `--color-navy-2` | `#122640` | — | `#122640` `#13233d` `#112039` `#10213b` |
| `--color-ink` | `#0f1f34` | **15.44:1** on cream | `#0f1f34` `#112039` |
| `--color-ink-2` | `#1d2834` | **7.53:1** on gold | `#1d2834` |
| `--color-muted` | `#576273` | **5.75:1** on cream | `#576273` `#586274` |
| `--color-cream` | `#f7f7f2` | — | `#f6f6f0` `#f7f7f2` `#f8f7f2` |
| `--color-surface` | `#ffffff` | — | `#ffffff` `#fdfcf7` |
| `--color-surface-tint` | `#eef3fa` | — | 10 pale blues |
| `--color-gold` | `#d8b36a` | brand fill | `#c79635` `#c39f52` `#e6c07a` kept as page gradients |
| `--color-gold-strong` | `#f1cf8d` | **12.53:1** on navy | `#f1cf8d` |
| `--color-gold-text` | **`#8a6a2e`** | **4.67:1** on cream | **replaces `#9d7a36`** |
| `--color-gold-deep` | `#7d5f28` | **5.52:1** on cream | smallest text |
| `--color-ink-inverse` | `#f7f7f2` | **17.43:1** on navy | — |
| `--color-success` / `--color-error` | `#1e6c43` / `#a32e2e` | — | — |

**The AA fix:** `#9d7a36` measured **3.71:1** on cream — below the 4.5:1 minimum. It was
used for `.service-index`, `.case-study-tag`, `.pricing-kicker`, `.addons-card .eyebrow`,
`.stack-kicker`, `.case-hub-kicker`, `.payment-step-index` and the flow chart's
`.flow-index`. All eight now use `--color-gold-text` (`#8a6a2e`, **4.67:1**). Gold fills,
rules and gradients are unchanged, so the brand colour did not move.

### Radius, border, shadow

| Token | Value |
|---|---|
| `--radius-sm` | `16px` |
| `--radius-lg` | `24px` |
| `--radius-pill` | `999px` — round controls only |
| `--border-hairline` | `1px solid var(--color-border)` |
| `--shadow-1` | `0 18px 44px rgba(6,15,30,0.10)` — resting card |
| `--shadow-2` | `0 24px 70px rgba(6,15,30,0.16)` — lifted / overlay |

Two radii as specified, plus `--radius-pill`. **This is a deliberate third value:** every
button and chip on the site is a pill today. Removing that would be a large unrequested
visual change, so pills are kept as the round-control radius and the two *card/panel*
radii are 16px and 24px. Previously 17 distinct radii including `14, 18, 20, 22, 24, 26,
32px` and eight ad-hoc `999px`.

Blur radii also consolidated: `--blur-sm: 14px` (replaces `blur(14px)`, `blur(16px)`,
`blur(18px)` across 13 `backdrop-filter` rules) and `--blur-glow: 48px` (the pricing glow,
unchanged).

### Control geometry

| Token | Value |
|---|---|
| `--control-height` | `52px` |
| `--control-pad-x` | `24px` |
| `--control-pad-y` | `12px` |
| `--control-radius` | `var(--radius-pill)` |
| `--tap-min` | `44px` |
| `--focus-ring` | `2px solid var(--color-gold-strong)` |

### Legacy aliases

The 24 old hand-maintained token names (`--bg`, `--text`, `--accent`, `--shadow`,
`--radius-md`, …) are now **aliases** onto the scales above in one block at the bottom of
`tokens.css`. This is why the `var()` references left in page CSS still resolve, and why
each alias can be retired as its call sites migrate.

---

## 3. Before / after — what was consolidated

### Measured, comment-stripped

| Metric | Before (4 files) | After page CSS (4) | After total (6) |
|---|---|---|---|
| Lines | 3757 | **3131** | 4049 |
| Distinct hex colours | 48 | 34 | **44** |
| Distinct `font-size` | 35 | **27** | 32 |
| Distinct `line-height` | **13** | **7** | 11 |
| Distinct `letter-spacing` | 8 | **7** | 8 |
| Distinct `padding` | 49 | **37** | 43 |
| Distinct `gap` | 35 | 34 | 36 |
| Distinct `border-radius` | 17 | **16** | 19 |
| Custom properties defined | 46 | — | **103** |
| `:root` blocks | 2 (+1 inline in `404.html`) | **0** | 1 |

Page CSS lost **626 lines**. Total rose 292 lines because an explicit, commented shared
layer replaced implicit duplication — that trade is the point, but it is not a net
line reduction and I am not claiming one.

### The substantive consolidations

**Section padding — four rhythms → one.**
`88px 0` (A) · `5.4rem 0` (B) · `88px 0 clamp(3.5rem,7vw,5.5rem)` ·
`120px 0 76px` · `154px 0 88px` · `28px 0` · `42px 0` · `18px 0` · `14px 0`
→ **one** `--section-pad`: `48px` mobile, `96px` desktop. Hero padding stays a hero
decision (`hero-section`, `hero.section`) and now reads `--section-pad` for its bottom
edge.

**Card padding — 15 variants → one token.**
`6px 13px` `7px 12px` `12px 16px` `13px 18px` `14px 0` `15px 16px` `16px 18px` `18px 0`
`18px 26px` `22px 20px` `22px 24px` `24px 22px 22px` `26px 24px` `28px 0` `16px 18px 16px 48px`
→ `--card-pad`.

Two of those 15 were **dead**: `home.css` ended with an eight-way `padding: 0` reset that
overrode eight earlier card paddings, and an eight-way `border: 0 / border-radius: 0 /
background: transparent / box-shadow: none` reset that undid the shared card surface. The
system now has **one** card rule in `components.css`, and System A's flat presentation is
four token values:

```css
/* home.css — System A presentation preset */
:root { --card-pad: 0; --card-radius: 0; --card-border: 0;
        --card-bg: transparent; --card-shadow: none; }
```

System B keeps the default (`--card-pad: 24px`, hairline border, white surface). Both
appearances survive; neither restates a border, radius, background or shadow.

**Heading scale — two systems → one.**
`h1` was `clamp(3.3rem,6vw,6rem)/0.92` on 7 pages and `clamp(3rem,6vw,5.4rem)/0.94` on 9.
Same `<h1>`, 96px vs 86.4px at the same viewport. Now one `--text-h1` for all 17.

**Buttons — two implementations → one.**
`.button` had `padding: 0 22px` (A) and `0 1.3rem` = 20.8px (B); `button-ghost` existed
only in B, `submit-button` only in A. Now one base rule with `--control-height` (52px),
`--control-radius` and `--control-pad-x`, and three variants — primary, secondary/ghost,
text-link — all sharing those metrics.

**Container — two gutters, two breakpoints → one.**
`min(1160px, 100vw−40px)` re-declared as `min(100vw−28px, 1160px)`, at `560px` on A and
`640px` on B. One `--container`, one `--gutter` pair, switched once at 768px.

**Nav/footer — merged across two class vocabularies.**
Because the markup could not change, `components.css` covers both naming conventions —
`.site-nav`/`.nav-shell` (A) and `.nav-links`/`.nav-menu`/`.navbar` (B) — mapped onto one
set of tokens. Footer rules were duplicated wholesale in both files; one copy remains.

**Focus.** A single `:focus-visible` outline on the root now backs up the per-component
rings, so the 9 System B pages no longer fall back to the UA default on most controls
(audit item 4).

**Tap targets.** `--tap-min: 44px` is applied to nav links, footer links, `.nav-toggle`
(`44px + 6px` = 50px, unchanged), `.contact-item`/`.contact-chip` and the text-link
variant. Previously most nav and footer link rules set no height at all (audit item 15).

### AA contrast fixes

| Fix | Sites |
|---|---|
| `#9d7a36` (3.71:1) → `--color-gold-text` `#8a6a2e` (4.67:1) | 8 selectors, both systems + flow chart |
| `.footer-copy` / `.footer-note` forced to inverse cream | 7 System A pages — **a regression I introduced and caught** (see §5) |
| `.cta-copy p` verified, **not** changed | confirmed correct — see §5 |

---

## 4. Preserved features

| Feature | How it was kept working |
|---|---|
| **Pricing glow** | `pricing-glow.css` geometry, `is-active`/`is-static` states, pointer-coarse and reduced-motion guards all untouched. Only `blur(48px)` → `var(--blur-glow)` and the gold rgba values repointed. Verified `.pricing-glow` is **not** a direct child of `.section` (it is inserted inside `#pricing-groups`/`.pricing-group`, which is not `.section`), so the `.section > *` container rule cannot resize it. |
| **Flow chart** | All connector geometry (`.flow-track`, `.flow-link`, `.flow-link-v`, `.flow-start`, `--flow-gap/-rowgap/-rail/-line`) untouched, including the 639/1023 breakpoints and the documented 1024px margin reasoning. Card padding/radius/shadow now tokens; `--flow-gold` repointed to the AA gold. Verified `.flow-section` has exactly **one** direct child (`.container`), so `.section > *` is safe. |
| **WhatsApp widget** | `whatsapp-float.js` injects its own `<style id="gg-chat-styles">` and hard-codes its own font stack and colours — fully self-contained. All 23 `gg-*` class names resolve against that injected sheet, not the site CSS, so the widget is structurally immune. It inherits only `body` font/colour, which are unchanged. |
| **Text, links, prices, images** | Zero HTML touched. `git diff --name-only` returns CSS only. |
| **Sections** | None removed. `git diff --stat`: 123 insertions, 750 deletions across 4 CSS files. |

---

## 5. Judgement calls and things I got wrong

Recorded because they affect review, not as filler.

**Two bugs I introduced and caught during verification:**
1. `.site-footer .footer-grid.glass` — I gave the System B glass footer panel
   `color: var(--color-ink)`, which is dark ink on a near-transparent panel over navy
   (`rgba(255,255,255,0.06)`). Unreadable on 9 pages. Fixed: the page keeps its own
   surface and text colour, the system contributes only the shape.
2. `width: var(--tap-min) + 6px` — implicit addition is invalid CSS. Fixed with
   `calc()`.

**A regression caught by audit, not by the compiler:** moving `.footer-copy`/`.footer-note`
colour into `components.css` let a later `home.css` rule apply `--text-muted`
(`#576273`, dark grey) inside the navy `<footer>` on all 7 System A pages. Removed those
two selectors from the muted group; both are always inside `<footer>` (verified).

**Dead code removed rather than left:** `home.css` had five declarations on
`.hero-summary-card` that the later flat layer always overrode. Harmless before; once the
flat layer became tokens loaded *earlier*, they would have won and put a dark panel back.
Deleted, with a comment explaining why.

**`.glass` deliberately excluded from the card base.** My first draft put `.glass`,
`.brand-badge`, `.mini-card`, `.case-metric` and `.case-hub-card` in the card rule. `.glass`
is a modifier on 12 different components across 9 pages, and forcing `--card-radius: 16px`
onto it would have rounded the navbar, the footer panel and six small chips that are
square today. `.glass` now supplies border, surface and the lifted shadow only.

**Card `padding-top` accents left alone.** `.testimonial-card` and `.contact-form-card`
carry `border-top` + `padding-top` as deliberate section separators. They layer on top of
the flat preset and are not surface duplication.

**A `:not()` rule I wrote and then deleted.** I first expressed the light-ground button
treatment as `.section:not(.section-contrast) .button-secondary`. I traced all 15
`.button-secondary` instances: every one is on a dark ground (both heroes,
`section-contrast`, `officeops-hero`, `officeops-section-blue`, and `cta-section` on
System B). The broad rule was redundant with rules `styles.css` already owns precisely,
and would have rendered light buttons on a dark System B hero. Removed; the inverse
default is now documented as ground-dependent.

**`.button-text` / `.text-link` are defined but unused.** The third button variant the
brief asks for exists and is complete, but no current markup uses those class names, and
adding one would mean editing page content. The *existing* text links — bare `<a>` inside
`.service-card` and `.case-study-copy` — are styled to match it (same gold, same 1px
underline at `0.22em` offset). Flagging it so the unused class is not mistaken for
working markup.

**Breakpoints not reconciled (audit item 11).** Still `560/820/1080`, `640/860/1080`,
`639/1023`. Changing them alters layout on live pages and is not a shared-component
concern. `--gutter` and `--section-pad` now switch at a single 768px, which is the part
that was safe to do.

**`404.html` still has no system.** It has an inline `<style>` and its own `:root`
(`--bg: #07111f`, `--bg-deep: #030914`). Wiring it in means either an `@import` into its
inline block or editing page content. Left out; it is one page and now the only one.

---

## 6. Before this ships

**The stylesheets are cached under pinned query strings** and I did not touch them, per the
"do not change any link" rule:

```html
home.css?v=20260526-landwind        styles.css?v=20260705-legibility
approach-flow.css?v=20261003        pricing-glow.css?v=20261003
```

Returning visitors will keep the old CSS until those are bumped. **Someone needs to bump
all four**, or the change will not reach most users. Also note `tokens.css` and
`components.css` are imported without a version query, so they will be fetched fresh
while their parents stay stale — a bump is required, not optional.

**Not visually verified.** No browser was available in this environment. Verification was
structural: brace and paren balance, zero unresolved `var()` references across all six
files, cascade reasoning per component, and a programmatic check that `.section` never has
an unexpected direct child. The changes I am least certain of visually are the new `1.1`
heading line-height and the System B card radius moving to 16px — both are worth one
look on a real page before deploying.

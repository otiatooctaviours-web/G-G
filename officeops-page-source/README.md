# OfficeOps RMM landing page — page source (current Lovable state)

Stack: TanStack Start + React + Tailwind v4 + shadcn/ui (Lovable project fec86657-d348-4fc0-97b1-2521e781c006).

## Included
- src/routes/index.tsx — the whole page (nav, hero, features, pricing, FAQ, contact, footer)
- src/components/officeops/ — product-tour (tabbed screenshots), browser-frame, product-mock (hero + floor map), contact-form
- src/styles.css — design tokens (light/dark), layout and responsive rules
- src/assets/ — logo badge + 9 optimised app screenshots (WebP)

## Changed for portability
Lovable stores images as `*.asset.json` proxy files that only resolve inside Lovable.
In this bundle they are normal imports (`import x from '@/assets/screens/x.webp'`), so the real files in src/assets are used.

## Not included (stay in Lovable / GitHub)
- src/assets/office.jpg (the privacy-section photo — a binary I could not export)
- src/lib/contact-schema.ts, src/lib/contact.functions.ts, drizzle/ (contact form backend)
- shadcn components in src/components/ui, __root.tsx, router, config, package.json
For the complete runnable repo, use Lovable → GitHub sync (or Code view → download).

## Placeholders to replace
WhatsApp +254 7XX XXX XXX, hello@ggtech.example, and the KES pricing.

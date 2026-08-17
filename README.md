# Bon Bon's Sweets & More

Website project. **Current stage: design 3 chosen and expanded.**

---

## The live site

**https://eanthonycarranza.github.io/BonBons/**

That's the chosen direction (Design 3, "Party Pop") built out properly. It updates
automatically on every push to `main`.

Earlier concepts are still viewable at
[`concepts.html`](https://eanthonycarranza.github.io/BonBons/concepts.html).

### What the expanded version added

- **Shopping cart** — add products, remove them, live subtotal, free-delivery
  progress ("$12 more for free local delivery"), saved between visits
- **Build-a-box configurator** — pick a size, add treats with steppers, live
  running total; it won't let you overfill a box, and downsizing trims the
  contents instead of breaking
- **Delivery ZIP checker** — customers self-qualify before ordering
- **Quote request form** — date, occasion, headcount, colors, pickup vs delivery,
  treat interests, with inline validation
- **FAQ accordion** covering lead time, color matching, allergies, deposits
- Reviews with an aggregate score, expanded product grid (8 items with badges),
  dessert-table section, newsletter signup
- Mobile: sticky order bar, slide-out cart, 44px touch targets throughout
- Accessibility: skip link, keyboard-operable cart (Esc closes), focus styles,
  labelled form fields, honours reduced-motion preferences

### Before this goes live for real

These are placeholders in `index.html` that need your real values:

1. **`DELIVERY_ZIPS`** (in the script near the top) — currently sample ZIP codes.
   Replace with your actual service area.
2. **Prices** in the `PRODUCTS` and box-size lists.
3. **Phone and email** — `(555) 010-2288` and `hello@bonbons.com` appear in the
   footer, FAQ and quote form.
4. **Product photos** — shown as colored placeholder tiles.
5. **The forms don't submit anywhere yet.** They validate and show a confirmation,
   but nothing is sent or stored. That needs the Next.js + MongoDB backend.

---

## The original six concepts (for reference)

Design 3 won and has been built out above. The earlier concepts are kept for
reference — useful if you later want to borrow a section from another direction.

Concepts 1–3 are HTML, viewable at
[`concepts.html`](https://eanthonycarranza.github.io/BonBons/concepts.html)
or locally in `design-previews/`.

| # | Name | Personality | Best if you want to… |
|---|------|-------------|----------------------|
| 1 | **Candy Carnival** | Loud, playful, sticker-sheet. Thick black outlines, hard shadows, confetti, chunky rounded type. Cream + hot pink + blue + gold. | Look exactly like the logo feels. Strongest for birthdays, kids' parties, quinceañeras. |
| 2 | **Sweet Boutique** | Elegant, editorial, calm. Ivory, serif headlines, thin gold rules, lots of whitespace. Pink used as an accent only. | Read as premium and charge premium. Strongest for weddings, showers, corporate gifting. |
| 3 | **Party Pop** | Modern dark-mode storefront. Bento-grid hero, neon glow, product cards with prices and add-to-cart. | Sell online as the main channel. Easiest to grow into full e-commerce. |

All three use the same content and the same brand colors pulled from the logo, so you're judging **personality and layout**, not copy.

### The logo now has a transparent background

Your original logo was a square image on a **white background**, which showed as a visible box on colored sections. That's fixed — `public/logo-transparent.png` is the original with the outer white flood-filled to transparency (the cream inside the oval is preserved). All six designs now use it, and the old `mix-blend-mode` workaround is gone.

Still worth doing before launch: a **vector (SVG)** version from whoever made the logo. The transparent PNG is sharp at every size we use it, but an SVG would stay sharp at any size and shrink the page weight a lot.

### Favicons (browser-tab icons)

All four preview pages now have a tab icon. The default is your **actual logo**, cropped to the artwork so it fills as much of the square as possible.

Be aware of the tradeoff: your logo has a lot of fine detail — three words of layered text, confetti, balloons, a ribbon — and a browser tab renders it at **16×16 pixels**. At that size it reads as a colorful oval rather than as readable words. That's normal for detailed logos and not something a different export can fix.

So there's also `public/favicon-monogram.svg` — a pink rounded square with a cream **B** and a gold border, drawn as vector paths so it stays crisp at any size. To switch a page over, open it and swap the `rel="icon"` line for the commented-out one just below it (both are already in the `<head>`).

My recommendation: **monogram in the tab, full logo everywhere else.** But it's a brand call, so the logo is the default until you say otherwise.

---

## Three more concepts, built in Figma

Concepts **4, 5 and 6** live in a Figma design file rather than HTML:

**https://www.figma.com/design/pieBhsc3pHgP3706D6dsp4**

| # | Name | Personality |
|---|------|-------------|
| 4 | **Sugar Rush** | Retro soda-fountain. Warm cream, gold arch, thick outlines, rounded Baloo type. Nostalgic and warm. |
| 5 | **Confetti Editorial** | Magazine layout. Oversized Bricolage headline, hairline-ruled price list, big pink feature block. Confident and modern. |
| 6 | **Storybook Pastel** | Soft and airy. Pastel tints, rounded everything, floating accents, gentle Fredoka type. Aimed at baby showers and first birthdays. |

These are real Figma frames — you can open, edit, comment on and hand them to any designer. Brand colors are set up as Figma **variables** (`Bon Bon's / Color`), so changing a token updates everywhere it's used.

---

## Next — Install Node.js

Node.js isn't installed on this Mac yet, and it's required for Next.js. Download the **LTS** installer:

https://nodejs.org

Once it's done, this should print version numbers:

```bash
node -v && npm -v
```

---

## Then — the real Next.js + MongoDB build

Design 3 is chosen, so the build is next. It becomes a Next.js + MongoDB app:

- **Next.js (App Router)** — the pages, routing, and the API routes that replace a separate Express server
- **MongoDB Atlas + Mongoose** — products, custom-order requests, and customer reviews
- **Product catalog** — driven by the database, not hardcoded
- **Custom order form** — date, colors, treat selection, headcount; saved to MongoDB
- **Pickup or delivery scheduling** — no storefront address anywhere on the site; customers choose an arranged pickup time or enter their own delivery address at checkout
- **Admin dashboard** — password-protected, to add/edit products and work through incoming orders
- **Responsive + accessible** — works on phones, which is where most of your customers will be

You'll need a free MongoDB Atlas account for the database (https://mongodb.com/atlas) — I'll walk you through it when we get there.

---

## Folder contents

```
Bon Bon's/
├── README.md                 ← you are here
├── index.html                ← ★ THE SITE — expanded Design 3
├── concepts.html             ← the original side-by-side chooser
├── .github/workflows/        ← auto-deploys to GitHub Pages on push
├── design-previews/
│   ├── index.html            ← chooser (local copy)
│   ├── design-1.html         ← Candy Carnival
│   ├── design-2.html         ← Sweet Boutique
│   └── design-3.html         ← Party Pop (original, pre-expansion)
├── public/
│   ├── logo.png              ← web-sized logo (1000px, white background)
│   ├── logo-transparent.png  ← ★ transparent version — use this one
│   ├── favicon.png           ← 64px browser-tab icon (the logo)
│   ├── favicon-monogram.svg  ← alternative tab icon, legible at 16px
│   └── apple-touch-icon.png  ← 180px icon for iOS home screens
└── assets/
    ├── logo-original.png     ← your full-resolution original
    └── logo-embed-tp.png     ← compressed transparent copy used in the previews
```

Concepts 4–6 are in Figma: **https://www.figma.com/design/pieBhsc3pHgP3706D6dsp4**

---

## Feedback is welcome at any level

"I like 2" is fine. So is "design 3's hero but design 1's colors, and lose the dark background." Mixing is normal at this stage — nothing here is locked in.

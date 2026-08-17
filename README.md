# Bon Bon's Sweets & More

A Next.js + MongoDB site for a handmade dessert business.

---

## Two things live in this repo

| | What it is | Where it runs |
|---|---|---|
| **`index.html` / `concepts.html`** | The original single-page design preview | GitHub Pages — **https://eanthonycarranza.github.io/BonBons/** |
| **`app/`, `components/`, `lib/`** | The real Next.js app | Needs Node locally; deploys to Vercel |

**GitHub Pages cannot run the Next.js app.** Pages only serves static files, and this
app has API routes and a database behind it. The static preview stays where it is so
your link keeps working; the real app needs a host that can run a server (Vercel is
free and made by the Next.js team).

---

## Pages

| Route | What it does |
|---|---|
| `/` | Home — hero, featured treats, occasions, dessert tables, reviews, newsletter |
| `/shop` | Full catalogue, grouped by category, from the database |
| `/shop/[slug]` | Product detail with quantity picker, allergens, related items |
| `/build-a-box` | Box configurator — size, treats, live total |
| `/dessert-tables` | Service page with the four-step process |
| `/occasions` | Index of occasion types |
| `/occasions/[slug]` | Weddings, birthdays, corporate, baby showers |
| `/about` | Story and how-we-work |
| `/faq` | Accordion |
| `/quote` | Quote request form → saved to MongoDB |
| `/cart` | Review order and send it → saved to MongoDB |
| `/admin` | Password-protected dashboard: quotes, orders, seed catalogue |
| `/sitemap.xml`, `/robots.txt` | Generated automatically |

### API routes

`GET/POST /api/products` · `POST/GET /api/quotes` · `POST/GET /api/orders` ·
`POST /api/subscribe` · `POST /api/seed` · `POST /api/admin/login` · `POST /api/admin/logout`

---

## Running it

**1. Install Node.js** (still not installed on this Mac). Get the LTS build:
https://nodejs.org

**2. Install dependencies**

```bash
cd "/Users/acarranza/Documents/Claude Project/Bon Bon's" && npm install
```

**3. Create your env file**

```bash
cp .env.example .env.local
```

**4. Start it**

```bash
npm run dev
```

Then open http://localhost:3000

### It works without a database

If `MONGODB_URI` is empty, the whole site still runs — the catalogue falls back to the
sample products in `lib/sample-data.js`, and the forms accept input but tell you plainly
that nothing was stored. So you can look at every page before setting up MongoDB.

### Adding MongoDB

1. Make a free cluster at https://mongodb.com/atlas
2. **Connect → Drivers** → copy the connection string
3. Paste it into `.env.local` as `MONGODB_URI`, replacing `<password>` with your real one
4. Restart `npm run dev`
5. Set `ADMIN_PASSWORD` in `.env.local`, visit `/admin`, log in, and click **Seed sample products**

### Deploying to Vercel

1. Sign in at https://vercel.com with your GitHub account
2. **Add New → Project → import `EAnthonycarranza/BonBons`**
3. Add `MONGODB_URI`, `ADMIN_PASSWORD` and `ADMIN_SECRET` as environment variables
4. Deploy — every push to `main` redeploys automatically

---

## Still placeholder — replace before launch

1. **`DELIVERY_ZIPS`** in `lib/sample-data.js` — sample ZIP codes. The site will tell
   customers you deliver to them based on this list, so it matters.
2. **Prices** in `SAMPLE_PRODUCTS` and `BOX_SIZES`.
3. **Phone and email** in the `SITE` object.
4. **Product photos** — currently colored placeholder tiles.
5. **Payment** — orders are recorded and confirmed by email; no card processing yet.
6. **Admin auth** is a single shared password. Fine for one owner; if staff need
   separate logins, swap `lib/auth.js` for NextAuth or Clerk.

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

# Bon Bon's Sweets & More

A full-stack Next.js + Supabase e-commerce platform for a pickup-based dessert business. Features online ordering, admin dashboard, payment processing, automated email workflows, and social media integration.

---

## Two things live in this repo

| | What it is | Where it runs |
|---|---|---|
| **`index.html` / `concepts.html`** | The original single-page design preview | GitHub Pages — **https://eanthonycarranza.github.io/BonBons/** |
| **`app/`, `components/`, `lib/`** | The real Next.js app | Node locally or Heroku in production |

**GitHub Pages cannot run the Next.js app.** Pages only serves static files, and this
app has API routes and a database behind it. The static preview stays where it is so
your link keeps working; the real app needs a host that can run a Node.js server.

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
| `/quote` | Custom pickup-order request form → saved to Supabase |
| `/cart` | Review menu selections and send a pickup request → saved to Supabase |
| `/box-of-the-week` | This week's limited Celebration Box — contents, price, and how many are left |
| `/admin` | Password-protected tracker for requests, payment arrangements, and pickup status |
| `/sitemap.xml`, `/robots.txt` | Generated automatically |

### API routes

**Shop**
`GET/POST /api/products` · `POST/GET /api/quotes` · `PATCH /api/quotes/[id]` · `GET /api/quotes/[id]` ·
`POST/GET /api/orders` · `PATCH /api/orders/[id]` · `GET /api/orders/[id]` ·
`POST /api/subscribe`

**Admin** 
`POST /api/admin/login` · `POST /api/admin/logout` · `POST /api/admin/email` (send/resend order confirmations & updates) ·
`GET/POST/PATCH/DELETE /api/admin/pickup-locations` · `GET/POST/PATCH /api/admin/menu/[id]` · `POST /api/admin/menu/photo` (menu photo uploads)

**System**
`GET /api/health` · `POST /api/seed` (reload sample menu)

---

## Running it

**Node.js v24.19.0 is installed** at `~/.local/node` and on your PATH via `~/.zshrc`.
To remove it later: `rm -rf ~/.local/node` and delete that line from `~/.zshrc`.

**1. Install dependencies**

```bash
cd "/Users/acarranza/Documents/Claude Project/BonBons" && npm install
```

**2. Create your env file**

```bash
cp .env.example .env.local
```

(This already exists — it was created during setup.)

**3. Start it**

```bash
npm run dev
```

Then open http://localhost:3000

### Supabase

The linked Supabase project stores the product catalogue, pickup orders, custom
requests, newsletter subscribers, and reusable pickup locations. The public key can only read active
products. Row-level security blocks direct public access to every customer-data
table.

Server-side writes and admin reads go through the `bonbons-data` Edge Function
using `BONBONS_INTERNAL_API_TOKEN`. Keep that token server-only. The database
definition is mirrored in `supabase/schema.sql`, and the function source lives
in `supabase/functions/bonbons-data/index.ts`.

If Supabase is unavailable, catalogue pages fall back to `lib/sample-data.js`;
customer forms show an unavailable message instead of pretending the request
was saved. To resync the starter menu, log in at `/admin` and choose
**Sync menu**.

### Saved pickup locations

The staff CRM uses saved addresses rather than Google Places autocomplete, so
choosing an address does not make a billable Maps API request. The seeded
locations are **West Ave** and **Stormy Autumn**. Staff can add, edit, and delete
locations from the dashboard; the form keeps street, city, state, postal code,
and country as separate required fields. Confirmed-order emails turn the saved
address into a standard Google Maps search link, which does not require an API
key.

Orders store the formatted address as a snapshot. Editing or deleting a saved
location therefore does not silently change an older confirmed order.

### reCAPTCHA Enterprise

Only the pickup request form on `/cart` loads reCAPTCHA Enterprise, and only
`POST /api/orders` verifies its token. The script is loaded when the form is
shown, with a visible dark-theme “I'm not a robot” checkbox above the submit
button. The widget is removed after navigating away. Custom requests and
newsletter signups do not use reCAPTCHA. Set these values to enforce it:

- `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` — a **checkbox** website key created in reCAPTCHA Enterprise (Web → enable challenges → Checkbox challenge), not a Google API key or a score-based key
- `GOOGLE_CLOUD_PROJECT_ID` — the Google Cloud project ID
- `GOOGLE_RECAPTCHA_API_KEY` — a server-only API key allowed to create assessments
- `RECAPTCHA_MIN_SCORE` — optional; defaults to `0.5`

Add `localhost` to the key's allowed domains for development and the shop's real
domain before deployment; keep domain verification enabled. Restart the dev
server or rebuild the deployment after changing the public site key.

All three required Google values must be present. Missing configuration, invalid
or expired tokens, wrong actions, and low scores are rejected before the order
is written to Supabase. Customers must check the box before submitting. Failed
submissions reset the checkbox so retries obtain a fresh, single-use token.
Keep the assessment API key server-only; only the site key belongs in the browser.

### Payment Processing

The `/cart` page and admin dashboard integrate dual-provider payment checkout via **Stripe and Square** with:
- Embedded payment forms with hosted sessions
- Automated receipt emails sent immediately after successful payment
- Multiple payment method support (card, ACH, buy now pay later)
- PCI compliance via tokenized hosted checkout

Configure these environment variables in `.env.local`:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe test/live publishable key
- `STRIPE_SECRET_KEY` — Stripe test/live secret key (server-only)
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` — Square application ID
- `SQUARE_ACCESS_TOKEN` — Square access token (server-only)
- `SQUARE_LOCATION_ID` — Square location ID for transactions

Both providers are optional; the shop can accept offline payments (cash at pickup) or mix online and offline. Admin staff verify payment status before confirming orders; the system does not auto-confirm on payment alone.

### Gmail order emails

Every successful pickup request on `/cart` automatically emails the customer a
request receipt through Gmail SMTP, **after** the request is saved. It includes
the selected cake pops, quantities, estimated total, requested date, and a clear
notice that the order is not confirmed and payment should wait. SMTP failures
do not undo the order or ask the customer to submit again. The CRM shows receipt
activity or a failure notice and provides a receipt retry/resend button before
confirmation. No receipts are retroactively sent to existing requests.

The staff CRM also sends branded order confirmations and status updates through
the same Gmail connection. All email types use a responsive table-based template,
plain-text alternative, and the supplied logo as an inline CID image (the existing
transparent asset at `assets/logo-embed-tp.png`). The logo travels with the email;
it does not depend on a public website URL. Output-file tracing includes it in
the deployed email routes. Add `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `GMAIL_FROM_NAME` to
`.env.local` using the placeholders in `.env.example`. Use a Google app
password rather than the account's normal password; keep it server-only.

Saving an order as **Order Confirmed** creates a permanent customer-facing
order number. Email buttons stay disabled until those saved details are current,
and confirmation resends require an extra confirmation. Sent-message activity
is recorded in the protected `email_events` table. A Google API key is not used
for this SMTP setup.

Run `npm run test:email` for isolated email/workflow checks (no customer messages
or database writes). Run `npm run preview:email` to generate desktop/mobile
previews with fictional data under `design-previews/emails/`.

### Deploying to Heroku

The app uses Node.js 24, the `heroku/nodejs` buildpack, and the `Procfile` web
process. Heroku runs `npm run build` and provides `PORT` to the Next.js server.
The existing Supabase project remains the database; no Heroku database add-on
is needed. The `app.json` formation starts at **zero web dynos** so deploying the
manifest does not silently start paid compute. Choose and approve a dyno plan
before scaling `web` to 1.

1. Create the app in the US region on `heroku-24`.
2. Set the config variables listed in `app.json` in Heroku. Use the existing
   Supabase, Gmail, and reCAPTCHA values, but generate a separate strong
   production `ADMIN_PASSWORD` and `ADMIN_SECRET`. Never commit credentials.
3. Set `NEXT_PUBLIC_SITE_URL` to the app's HTTPS origin, without a trailing slash.
   Public variables must be present **before the build**, since Next.js embeds them.
4. Add the exact Heroku hostname to the reCAPTCHA key's allowed domains in
   Google Cloud, keeping domain verification enabled and `localhost` for development.
5. Deploy the current source, excluding `.env*`, `.git`, `node_modules`, `.next`,
   and design previews. `.slugignore` provides a second exclusion layer.
6. Scale the approved web dyno to 1 and check `/api/health`, `/shop`, `/cart`, and
   `/admin`. Verify the cart checkbox and that unauthenticated `/api/orders`
   requests cannot read customer data. Do not create real orders just to test deployment.

`npm run start:heroku` fails closed if required settings are missing. The login
password must have at least 8 characters, and the separate session-signing secret
must have at least 32. A longer, unique login password is strongly recommended.
Run `npm run test:config` to verify these startup checks. Changing `ADMIN_PASSWORD`
also invalidates existing admin session cookies. The email logo stays in
`assets/logo-embed-tp.png` and is included
in the deploy. Run `npm run test:email` before shipping changes. A local build
should run in an isolated copy when the dev server is already using `.next`.

### Alternative: deploying to Vercel

1. Sign in at https://vercel.com with your GitHub account
2. **Add New → Project → import `EAnthonycarranza/BonBons`**
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `BONBONS_INTERNAL_API_TOKEN`, `ADMIN_PASSWORD`, `ADMIN_SECRET`, `GMAIL_USER`,
   `GMAIL_APP_PASSWORD`, `GMAIL_FROM_NAME`, `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`,
   `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_RECAPTCHA_API_KEY`, and `RECAPTCHA_MIN_SCORE`
   as environment variables
4. Deploy — every push to `main` redeploys automatically

---

## Why the folder is named `BonBons`

The project folder used to be `Bon Bon's`. **Next.js cannot build from a path containing
an apostrophe.** Its metadata-route loader generates JavaScript with the file path inside
a single-quoted string, so the `'` closes the string early and `sitemap.js` / `robots.js`
fail with a parse error. Renaming the folder to `BonBons` fixed it.

If you ever move this project, keep apostrophes out of the path.

---

## Before launch — review and customize

1. **Prices** in `lib/pricing.js` and `lib/sample-data.js` — update to reflect real menu pricing.
2. **Phone and email** in the `SITE` object in `lib/sample-data.js` — update business contact info.
3. **Product photos** — currently generated placeholder cake-pop images. Replace with real product photography.
4. **Admin password** (`ADMIN_PASSWORD`) — must be changed from the development value. Requires ≥8 characters.
5. **Admin secret** (`ADMIN_SECRET`) — session signing key. Requires ≥32 characters. Generate a new one for production.
6. **Payment configuration** — decide whether to accept online payments (Stripe/Square), offline only (cash at pickup), or both. If using online payments, configure API keys and test transaction flow before launch.
7. **Email configuration** — if using automated receipts/confirmations, verify Gmail SMTP credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `GMAIL_FROM_NAME`) are set and email templates in `lib/email-template.js` match your branding.
8. **Admin auth** — currently a single shared password. Sufficient for one owner; if staff need separate logins in the future, replace `lib/admin-menu.js` auth logic with NextAuth or Clerk.
9. **reCAPTCHA Enterprise** — optional but recommended for production. Configure the four required keys in `.env.local` to enable bot protection on the order form.
10. **Social media integration** — the TikTok feed on `/` requires `NEXT_PUBLIC_TIKTOK_USERNAME`. Leave empty or remove if not using.

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

## The Next.js + Supabase build

### Managing the live shop

Open `/admin` to use the dark **Shop Desk** workspace:

- **Cake-pop menu:** add a flavor, edit its details and photo, choose four-pack eligibility, and publish or hide it. Delete moves a flavor to recoverable Trash; restoring keeps it hidden until you publish it. Past orders retain their original item details.
- **Pickup orders:** search/filter requests, confirm orders, arrange pickup, record payments, and choose when to email a customer.
- **Shop settings:** manage saved pickup addresses and review the customer contact and payment links.

Singles remain **$4 each**. Four-packs remain a separately selected **$10** option. Both the shop and four-pack builder read the same live menu; checkout validates current availability and rebuilds prices on the server. A customer must rebuild a stale four-pack if its flavors have been hidden or deleted.

Cookie Monster, Strawberry Shortcake, and Biscoff are published. Twelve other flavors verified from the business's Instagram are saved as hidden rotations for the owner to review. The original four placeholder menu items are also retained in Hidden. Recipe details and individual flavor photos were not verified, so these entries use a branded placeholder until the owner adds accurate photos and allergen information.

Customer contact: **bonbonssweets.sa@gmail.com**, **(210) 721-3983**. Payment links point to the owner's [dot.cards profile](https://dot.cards/bonbonssweetssa?utm_source=nfc&e=ZGV2aWNlLXhQTnBTNUwyUmVoLXcyLXBr) after confirmation. Payments happen outside the website and must be verified by staff; opening the link does not mark an order paid. Confirmation emails include the payment button only for an unpaid, confirmed order with a positive confirmed total. Email replies go to the business inbox; the existing authenticated SMTP sender is unchanged until new mailbox credentials are configured.

Menu photos accept JPG, PNG, and WebP up to 5 MB. The server validates uploads and stores them in Supabase's `menu-photos` public bucket; anonymous users cannot upload or change menu records. Public product queries expose only active, non-deleted rows. Admin edits use timestamps to reject conflicting saves from another window.

Database changes are recorded in `supabase/migrations/20260906223140_admin_menu_management.sql` and `supabase/migrations/20260907040220_cake_pop_flavor_catalog.sql`. Deploy the shared validation file together with `supabase/functions/bonbons-data/index.ts` when updating the Edge Function. Do not exclude `supabase/functions/_shared` from the web build.

Checks: `npm run build`, `npm run test:menu`, `npm run test:email`, `npm run test:reveal`, and `npm run test:config`. The opt-in `scripts/verify-menu-http.mjs` integration test creates a hidden QA item and uploads a test logo; it never submits a customer order or sends an email. Clean up its reported fixture afterward.

### Box of the Week, pricing, and stock

**One setup step.** Open the Supabase dashboard → SQL Editor, paste
`supabase/migrations/20260908010000_weekly_box_and_inventory.sql`, and run it.
That is the whole install: it creates the `weekly_boxes` and `shop_settings`
tables, adds `stock_quantity` / `low_stock_threshold` to `products`, creates the
privileged write function, and seeds a ready-made Celebration Box built from the
flavors already on the menu.

No Edge Function deploy is needed. Admin writes for boxes, shop prices, and
per-flavor price/stock go through `public.bonbons_admin()`, a security-definer
function guarded by the same `BONBONS_INTERNAL_API_TOKEN` the Edge Function
already uses — identical trust model, nothing new exposed. Before the migration
runs, the Shop Desk says so in plain language rather than failing obscurely.

**What the owner controls** from **Shop Desk → Box of the week**:

- The live box: name, tagline, description, price, and its contents. Contents
  are chosen from the cake-pop menu rather than typed, and each flavor carries
  its own quantity, so a box can hold several of the same pop. Picking the same
  flavor again bumps its quantity instead of adding a duplicate row
- Boxes can be added, edited, and deleted from the same screen
- How many boxes are left, and the number at which shoppers see an urgency
  message. The run size is remembered separately so the meter can read
  "Only 4 left of 25 made" instead of a bar that is always full
- Prices live in **Shop settings → Prices**: the headline single cake-pop
  price, the four-pack price, and an editable row for every flavor. Flavor
  rows save one at a time so a typo in one price cannot block the rest
- Quantity per flavor stays in **Cake-pop menu → edit a flavor**

The box is advertised in the announcement bar, as the first item in the main
nav, as a feature card on the home page, and on its own page at
`/box-of-the-week`.

Stock is **owner-managed, not auto-decremented**. Orders here are requests that
staff confirm and that are paid offline, so subtracting at submit time would let
unpaid requests exhaust a limited run. Update the remaining count as boxes
actually sell.

Leaving a flavor's quantity blank means made-to-order and always available,
which is how every existing flavor behaves. Setting it to 0 shows "Sold out"
on the card and disables its add button. `POST /api/orders` re-checks price and
availability from the database, so a sold-out or over-ordered item is refused
even if the browser asks for it.

Only one box can be featured at a time; publishing a new one stands the previous
box down automatically (enforced by a partial unique index, not just the UI).

Nothing quotes a price from hardcoded copy. The headline prices are read once in
the root layout, handed to client components through `PricesProvider`, and used
by the page metadata, so the title, nav, announcement bar, footer, shop, cart,
four-pack builder, and product pages all follow whatever the owner sets. The
"save $X" claim is derived from the two prices rather than written down, so it
cannot drift. That read is cached under the `shop-settings` tag and revalidated
whenever prices are saved, which keeps statically rendered pages accurate
without forcing them dynamic.

Singles are currently **$3** and four-packs **$10**.

Run `npm run test:box` for the pricing, stock, and box-validation checks.

### Order tracking & fulfillment

**Spreadsheets.** The order desk exports every request as Excel (.xlsx) or CSV,
and imports past orders from either. Import shows a confirmation first: how many
rows will be created, how many blank rows were skipped, and exactly which rows
could not be read and why. Row numbers refer to the line as it appears in the
file — blank rows are kept during parsing so the numbering never drifts. A
matching template is downloadable from the same panel.

The file needs **Customer**, **Email** and **Wanted date** columns; everything
else is optional, and common spellings ("Customer name", "E-mail", "Date
wanted", "Total") are matched automatically. Excel serial dates, ISO dates and
US `10/1/2026` all resolve. Unrecognised statuses fall back to `pending` rather
than reaching the database. The browser parses the file, but the API re-checks
and re-shapes every field, and the insert runs in one transaction so a bad row
cannot leave a half-finished import behind. Up to 500 rows per file.

**Deleting a request** permanently removes the customer's name, contact details
and order history — there is no soft-delete, because the owner may need to
remove that data on request. The Shop Desk confirms first and says so plainly.

Deletion works at **any stage**, including a confirmed order that already has an
order number, and for both menu orders and custom requests. The control sits in
the workspace header so it is reachable without scrolling the fulfilment card.
Nothing references `orders` or `quotes` by foreign key, so a delete never
cascades into other records; confirmed order numbers are simply retired.


The `/admin` dashboard tracks order lifecycle:
- **Received** — customer submits a pickup request or places an order
- **Confirmed** — staff confirms the order with the customer, assigns a pickup time, and generates a permanent order number
- **Payment arranged** — staff records payment status (paid in full, partial, pending)
- **Ready for pickup** — staff marks order as prepared and ready
- **Completed** — customer picks up the order

Staff can send order confirmations, status updates, and payment reminders via Gmail. All communication is tracked in the `email_events` table. Customers receive automated request receipts (unconfirmed) immediately; confirmations and status updates are sent by staff choice.

### Media & social integration

**Product photo gallery** (`BakeryPhotoGallery.jsx`) — displays high-resolution product photography from `public/products/`, with lazy loading and responsive sizing.

**TikTok creator feed** (`TikTokCreatorFeed.jsx`) — embeds a responsive TikTok video feed on the homepage. Set `NEXT_PUBLIC_TIKTOK_USERNAME` to enable. Videos load via TikTok's embed API; disable the component if social media integration is not desired.

Both are optional and can be removed or reconfigured without affecting core e-commerce functionality.

### Implementation overview

The site is built as a full-stack Next.js + Supabase app with integrated payment processing:

- **Next.js (App Router)** — server-side rendering, API routes, middleware for authentication, static generation where possible
- **Supabase Postgres** — product catalog, orders, quotes, subscribers, pickup locations, email event logs, admin menu management
- **Product catalog** — database-driven, live menu management with photo uploads, hidden/published states, flavor tracking
- **Online ordering** — date/time picker, real-time price calculation, cart review, and checkout with optional online payment
- **Payment processing** — dual-provider integration (Stripe & Square) with embedded checkout, or offline-only mode
- **Email workflows** — automated request receipts, staff-triggered confirmations and updates via Gmail SMTP, with CID-embedded logo and responsive templates
- **Order fulfillment** — staff dashboard tracks order state (received → confirmed → payment arranged → ready → completed), generates order numbers, sends status updates
- **Pickup management** — saved address library (no Maps API calls for customers), pickup time selection, staff scheduling
- **Photo gallery** — product images from `public/products/`, responsive lazy-loading display
- **Social integration** — optional TikTok creator feed embedded on homepage
- **Responsive + accessible** — designed for mobile-first, works seamlessly on phones where most customers shop

The Supabase project is connected locally through the environment variables in
`.env.local`; use the placeholders in `.env.example` for other environments.

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

All confirmations across the Shop Desk use a styled dialog rather than the
browser's `window.confirm`. Destructive ones are marked, spell out the
consequence, and open with focus on Cancel so Enter cannot delete by reflex.

Run `npm run test:import` for the spreadsheet parsing checks.

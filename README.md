# Bon Bon's Sweets & More

The website and back office for a handmade treat business in San Antonio, Texas.

Customers browse cake pops, pretzel rods, dipped rice crispy treats, and dipped Oreos, choose a cake-pop pair or mix-and-match four-pack, or claim a limited Box of the
Week, then send a pickup request — or ask to rent the cake-pop cart for an event. The owner runs everything else — menu,
prices, stock, orders, emails and invoices — from a password-protected
dashboard called **the Shop Desk**. There is no online checkout: pickup is
arranged and payment is settled directly with the owner.

**Live:** https://bonbonsweets-c194aa523849.herokuapp.com

**Stack:** Next.js 15 (App Router) · React 19 · Supabase Postgres · Gmail SMTP · Heroku

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values — see Environment below
npm run dev
```

Open http://localhost:3000 for the shop, and http://localhost:3000/admin for
the Shop Desk.

```bash
npm run test:all     # automated tests, no network or database needed
npm run build        # production build
```

> **Keep apostrophes out of the folder path.** The project used to live in a
> folder called `Bon Bon's`, and Next.js could not build from it: its
> metadata-route loader writes the file path into a single-quoted JavaScript
> string, so the apostrophe closed the string early and `sitemap.js` and
> `robots.js` failed to parse. That is why the directory is `BonBons`.

---

## How it fits together

```
Customer                     Next.js (Heroku)                Supabase Postgres
────────                     ────────────────                ─────────────────
browse / request  ─────────► Server components ──read──────► products, weekly_boxes,
                             (anon key, RLS)                 shop_settings   [public read]

                             POST /api/orders
                             ├─ re-prices from the menu
                             ├─ re-checks availability
                             ├─ verifies reCAPTCHA
                             └─ writes ──────────────────────► orders        [no public access]
                                        │
                                        └─ Gmail ──► request receipt

Owner ──► /admin ──────────► Admin API routes ─────────────► bonbons_admin()
          (password)         (session + origin checked)      bonbons_record_email()
                                                             security-definer,
                                                             internal token
```

Three rules hold the whole thing together:

**Nothing the browser sends is trusted with money or stock.** Every line of an
order is rebuilt from the current menu server-side, and availability is
re-checked, so a tampered cart cannot change a price or buy a sold-out flavor.

**Customer data is never publicly readable.** Row-level security grants `anon`
read access to the catalogue, the live box and the shop prices — and nothing
else. Orders, quotes, subscribers and email history are unreachable with the
public key.

**Privileged writes go through one guarded door.** Admin writes call
security-definer database functions that check a server-only token
(`BONBONS_INTERNAL_API_TOKEN`) before touching anything. The API routes check
the admin session and the request origin first.

---

## The shop

| Route | What it does |
|---|---|
| `/` | Hero, featured flavors, Box of the Week, four-pack feature, story, bakery photos |
| `/shop` | The full menu, grouped by category, straight from the database |
| `/shop/[slug]` | One flavor — photo, allergens, quantity picker |
| `/build-a-box` | Pick any four flavors for the four-pack price |
| `/box-of-the-week` | The limited Celebration Box, with a live "only N left" meter |
| `/cart` | Review the request and send it — reCAPTCHA, then a receipt email |
| `/rent-a-cart` | Rent the cake-pop cart for an event — date, event type (with a free-text *Other*), and one of three party sizes. `/quote` redirects here. |
| `/occasions`, `/occasions/[slug]` | Weddings, birthdays, corporate, baby showers |
| `/about`, `/faq`, `/dessert-tables` | Story, questions, and the dessert-table service |
| `/sitemap.xml`, `/robots.txt` | Generated |

**Prices are never hardcoded in copy.** The single-pop and four-pack prices are
read once in the root layout and shared through `PricesProvider`, so the page
title, nav, announcement bar, footer, cart and product pages all quote whatever
the owner set. Savings claims ("save $2") are derived from those two numbers
rather than written down, so they cannot drift. That read is cached under a
`shop-settings` tag and revalidated on save, which keeps statically rendered
pages accurate without forcing them dynamic.

---

## The Shop Desk (`/admin`)

Five sections, one password.

### Cake-pop menu
Add a flavor, edit its details and photo, set its own price and quantity, and
publish or hide it. Delete moves a flavor to a recoverable Trash. Past orders
keep the item details they were placed with.

Quantity is optional: **blank means made to order** and always available —
which is how every flavor behaves by default — and **0 shows as Sold out**,
greying the card and disabling its add button.

### Box of the Week
A limited bundle — typically **10 cake pops for $25** — that the owner builds
from the existing menu. Pick flavors from a dropdown; adding the same flavor
twice raises its quantity rather than duplicating the row. Set how many boxes
remain and the number at which shoppers see an urgency message.

The stock meter reads *"Only 4 left of 25 made"* because the size of the run is
remembered separately from what remains; it rises on restock and never falls,
so the bar means something. Only one box can be live at a time, enforced by a
partial unique index rather than by the UI alone.

Stock here is **owner-managed, not decremented at request time**. Orders are
requests that staff confirm and that are paid offline, so subtracting on submit
would let unpaid requests exhaust a limited run.

### Orders & cart rentals
The request queue — pickup orders and cart-rental requests side by side, with a
filter for each — and the workspace where a request is confirmed, scheduled and
communicated. A cart request shows its event type and party size in the queue,
and its stages are worded for the event (Cart booked → Ready for the event →
Event done).

- **Stages** — received → confirmed → payment arranged → ready → collected.
  Confirming assigns a permanent customer-facing order number.
- **Cash at pickup** — customers say so at checkout ("How will you pay?") or
  with a one-click link in their confirmation email. Either way the order's
  payment status becomes `cash_at_pickup` and a gold **Cash at pickup** pill
  shows in the queue and the workspace. It records *intent*, not money: only
  `paid_cash` and `paid_direct` mean payment arrived, and the invoice guard
  still checks for exactly those two.
- **Overdue pickups** show amber once the day has passed and the customer still
  has not collected, and mint on the day itself. Only stages that still owe a
  pickup are flagged, so a collected or cancelled order is never marked late.
- **Date and time pickers** — a calendar popover (today outlined, past days
  dimmed, Today / Tomorrow / Next week shortcuts, arrow-key navigation) and
  pickup times as 15-minute shop slots. A stored time outside the grid is kept
  rather than snapped to the nearest slot.
- **Spreadsheets** — export every order as Excel or CSV, and import past orders
  from either. Import previews what it will create, what it skipped, and which
  rows failed and why, with row numbers matching the lines in your file.
- **Delete** works at any stage, for menu orders and custom requests alike, and
  is permanent — these rows hold customer contact details the owner may need to
  remove on request.

### Coupons
Create dollar-off coupon campaigns, starting with **$1 off**. Unique single-use
codes are the default; generate up to 200 at once for physical handouts. Choose
**Shared code** to create one code with a total redemption limit. A custom code,
minimum order amount, and expiration date are optional. Codes with the same
campaign name belong to the same promotion (ignoring case and extra spaces).
Each checkout email can redeem only one coupon per promotion, across all its
codes, even if its original order is cancelled or deleted. Expiration is inclusive
of the selected day in San Antonio (America/Chicago).

Select codes to **Print coupons** or **Export CSV**. Printing matches the supplied
8 × 11-inch cardstock PDF: **3 columns × 4 rows, 12 coupons per sheet**, with
additional sheets generated automatically. Shared codes have a copies-per-code
control (up to 200); single-use codes always print once. Use actual size / 100%, background
graphics on, and browser headers/footers off. Each unique code is incorporated
inside the supplied $1 artwork. Other discount amounts use an equivalent card
with the actual offer. Unavailable codes are visibly marked; do not distribute
those cards. Disable a code to stop future uses; re-enabling never resets its use
count or expiration. Generate a new promotion for different terms.

For a physical sale, staff use **Redeem a physical coupon** in Shop Desk → Coupons,
with the code, customer email, and purchase subtotal. Customers can redeem at
`/redeem` (also linked in the footer), complete the security check, and show the
confirmation to staff. They should do this only when the shop is ready to apply
the discount. Staff verify the code in **Recent redemptions** before honoring a
confirmation. The purchase amount is entered for the physical sale and must be
checked by staff; this form does not collect a payment or create an online order.
All channels use the same code counter and promotion/email limit. A physical
redemption immediately blocks another use of a single-use code online or in
person. Shared codes continue only up to their total limit, once per customer.
An unchanged physical retry returns the existing confirmation without consuming
another use. Customer names are optional; email enforces the promotion limit.

Customers enter a code on `/cart`, click **Apply**, and see the dollar discount
and estimated total. One coupon is allowed per pickup request, including singles,
bundles, and the weekly box; it does not apply to cart-rental quotes. Changing the
cart requires applying the code again. The server recalculates menu prices and
checks the terms again on submission. Discounts are capped at the order total.

Previewing does not consume a code. Saving the pickup request and increasing its
redemption count happen in one database transaction with a row lock, so concurrent
requests cannot exceed the limit. An unchanged retry with the same request ID
returns the existing order without consuming another use or sending another
receipt. Cancelling or deleting an order does **not** restore the use.

The original subtotal, code, and discount stay with the order and appear in the
Shop Desk, emails, PDFs, and spreadsheet exports. The estimated subtotal already
includes the discount. When confirming, staff should enter the final total with
the coupon included; it is not automatically subtracted again.

Apply `supabase/migrations/20261010034033_coupons.sql`,
`supabase/migrations/20261010040511_coupon_promotions.sql`, and
`supabase/migrations/20261010041509_physical_coupon_redemption.sql` before releasing this feature.
It adds a private coupon table and a helper called only through the existing
token-guarded admin RPC. No extra environment variables are needed. Run
`npm run test:coupons` for isolated application tests and
`tests/coupons-database.sql` for database assertions that roll back all fixtures.

### Shop settings
Pickup addresses, customer contact, the Gmail connection, and **Prices**.
Cake pops are **$3 each or 2 for $5**. Mix and match four treats for **$10**,
with at most **one rice crispy treat and two Oreos per four-pack**, counting
all flavors in each category together. Other product single prices remain
editable. Saving the cake-pop price updates cake pops only.

Admin **Treat menu → Edit → Ingredients** stores up to 5,000 characters per
product. Customers can open **View ingredients** on a menu card or in the
builder. Ingredients are also displayed on the product detail page. Empty
recipes ask the shopper to contact Bonnie; no ingredients are guessed.
Existing allergen selections remain separate. **Preview packs** opens an admin-only
builder that includes Hidden products, so offers can be checked before publishing.

Old saved mixed two-packs must be rebuilt; valid cake-pop pairs and valid
four-packs use current prices and menu categories. Past orders are unchanged.
Apply `supabase/migrations/20261012043133_cake_pop_pairs_mixed_packs_and_ingredients.sql` before deploying.

### Home and About page editor
Open **Home & About pages** in the Shop Desk. Edit headings, paragraphs, photos,
photo descriptions, button text and destinations, gallery items, featured
products, page metadata, and every supporting section. Sections can be
reordered or hidden. Use `{singlePrice}`, `{pairPrice}`, and `{saving}` in copy
and `{mixedPrice}` to keep promotional text aligned with shop prices.

**Save draft** preserves edits without changing the public page. **Preview
saved draft** opens an admin-only page. **Publish changes** updates the website.
Concurrent edits are rejected rather than overwriting newer saves. Both pages
are read from Supabase, so published updates persist across deployments.

`site_pages` grants visitors access only to published content columns. Drafts
and writes remain behind the existing token-checked admin dispatcher. Apply
`supabase/migrations/20261012034042_expanded_treat_menu_and_page_content.sql` and
`supabase/migrations/20261012040221_all_flavors_two_treat_offer.sql`
before deploying this update. `tests/catalog-pages-database.sql` verifies drafts,
publishing, edit conflicts, catalog writes, and public permissions inside a
transaction that rolls back all fixtures.

### Local events and email updates
Open **Events & email updates** in the Shop Desk. Save an event as a draft,
publish it to `/events`, display a cancellation notice, or archive it. Dates
and times use San Antonio time. Photos use the existing shop photo uploader.
Flyers display in full directly on the calendar and in admin previews;
event emails also preserve the image's proportions.
Published and cancelled events automatically move to **Archived** after their
end time. Without an end time they remain visible until midnight after their
end date. Multi-day events use the final date. Archived records and images stay
available to admins, and drafts remain drafts.

The database runs `private.archive_ended_events()` every minute using Supabase
Cron, even when nobody visits the website. Public row permissions hide ended
events immediately. Check the `bonbons-archive-ended-events` job and its history
in Supabase's Cron dashboard when troubleshooting automatic archiving.

The homepage and events page offer an explicit email opt-in with reCAPTCHA.
Customers confirm their address from an email link before joining the audience.
Confirmation expires after 48 hours. Opening the link alone does not subscribe
them; they press **Confirm my subscription**. Every update includes an unsubscribe
link, and admins can unsubscribe addresses in the Subscribers tab. Order emails
are never subscribed automatically.

In **Email studio**, choose spotlight, digest, or simple announcement; edit the
subject, headline, message, accent color, photo, and button label. Select up to
12 published or cancelled events and review the live desktop/phone preview.
Save the draft, then **Review & send**. Publishing an event does not send email.
The existing Gmail settings and `NEXT_PUBLIC_SITE_URL` are used; no new secrets
are needed. Set the site URL to the public website in production so confirmation
and unsubscribe links reach customers.

Sending records a fixed copy of the design, events, and confirmed audience,
then processes three recipients per request. Each recipient gets a separate
message. Closing the page can leave queued messages; reopen the saved email and
continue them. Sent messages are never automatically retried. For failed or
stalled attempts, check Gmail's Sent folder before explicitly retrying: SMTP can
accept a message even if its response or database confirmation is lost.

Apply `supabase/migrations/20261010150303_local_events_and_email_updates.sql`
and `supabase/migrations/20261010152753_complete_event_subscriber_audience.sql`,
then `supabase/migrations/20261010174828_automatically_archive_ended_events.sql`.
`tests/events-database.sql` verifies consent, visibility, snapshots, unsubscribe,
and delivery retry rules in a transaction that rolls back its fixtures.
`tests/event-archiving-database.sql` verifies expiry, daylight saving, private
archive permissions, idempotence, and preservation of real records using only
fixtures that are rolled back. Application tests are included in
`npm run test:all`; none send real emails.

Coupon browsing now starts with promotion cards. Open a promotion to choose a
generation batch, print its unused codes, export it, or generate another batch
with the same terms. Code lists show 20 per page. Redemption and history have
separate tabs; existing codes and printed designs keep their terms.

---

## Emails and documents

Five emails, all built from one responsive template with a plain-text
alternative and the logo embedded inline (so it does not depend on a public
URL).

| Email | When | Carries |
|---|---|---|
| Request receipt | Automatically, after a request is saved | "Not confirmed yet — don't pay" |
| Order confirmation | Staff, once the stage is Confirmed and saved | **PDF confirmation**; payment marks + dot.cards button; a one-click *I'll pay cash at pickup* link (or *Pay ahead online instead* if they chose cash) |
| Status update | Staff, any time | Current stage |
| Delay update | Staff, via *Tell them the pickup date changed* | New date, or a request to call |
| Paid invoice | Staff, once payment is marked paid and saved | **PDF invoice, stamped PAID IN FULL** |

**The two PDFs share one renderer**, so a customer's confirmation and invoice
can never disagree about what was ordered — only the title, the payment panel
and the stamp differ.

**An invoice cannot claim money that has not been recorded.** The guard is
enforced three times over: the button is disabled, the API answers `409`, and
the email builder itself refuses. If a PDF fails to build, the email still goes
out without it and the admin is told — a customer is better served by the
message than by silence.

Sending never blocks saving. A request is stored first and emailed second; an
SMTP failure is surfaced in the desk with a retry, and never asks the customer
to submit again.

```bash
npm run preview:email   # writes desktop + mobile previews with fictional data
```

---

## Environment

Copy `.env.example` to `.env.local`. Everything below is read by the app; there
are no other supported variables.

| Variable | Required | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Public key — can only read active products, the live box and prices |
| `BONBONS_INTERNAL_API_TOKEN` | yes | **Server only.** Authenticates every privileged write |
| `ADMIN_PASSWORD` | yes | Shop Desk login. Minimum 8 characters |
| `ADMIN_SECRET` | yes | Signs the admin session cookie. Minimum 32 characters, and must not be a placeholder |
| `NEXT_PUBLIC_SITE_URL` | production | Public HTTPS origin, no trailing slash. Baked in at build time |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | for email | A Google **app password**, never the account password |
| `GMAIL_FROM_NAME` | for email | Sender display name |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` | for the order form | A **checkbox** key, not a score-based key or an API key |
| `GOOGLE_CLOUD_PROJECT_ID` | for the order form | Project that owns the reCAPTCHA key |
| `GOOGLE_RECAPTCHA_API_KEY` | for the order form | **Server only.** Creates assessments |
| `RECAPTCHA_MIN_SCORE` | no | Defaults to `0.5` |

`npm run start:heroku` refuses to boot if any required value is missing, if
`ADMIN_SECRET` is short or a placeholder, or if `NEXT_PUBLIC_SITE_URL` is not a
public HTTPS origin. Run `npm run test:config` to exercise those checks.

> **Payment is deliberately offline.** There is no card processing in this
> codebase and no payment is collected on the website. Confirmed orders link to
> the owner's dot.cards profile (Venmo, Cash App, Zelle) and staff verify that
> the money arrived before marking an order paid — opening the link does not
> mark anything paid.
>
> Customers are asked to put their order number in the payment note; if they
> forget, the email tells them to reply or text with the app they paid from.
> A customer can also declare **cash at pickup** — at checkout, or from a link
> in the confirmation email. The email link is authorised by an HMAC of the
> order id signed with `ADMIN_SECRET` (see `lib/order-links.js`), so it needs no
> login and nothing extra is stored. Rotating `ADMIN_SECRET` invalidates links
> already sent; the desk can still set the status by hand.

---

## Database

Eight tables in `public`, defined in `supabase/schema.sql` and applied in order
from `supabase/migrations/`.

| Table | Public read | Holds |
|---|---|---|
| `products` | active rows only | The cake-pop menu, prices, stock |
| `weekly_boxes` | active rows only | Box of the Week, contents, remaining stock |
| `shop_settings` | yes | Single-pop and four-pack prices |
| `orders` | **no** | Menu orders and customer contact details |
| `quotes` | **no** | Cart-rental requests. Event type lives in `occasion` (free text when *Other*); the party-size tier's upper bound in `guests` — see `lib/cart-rental.js` |
| `subscribers` | **no** | Newsletter signups |
| `email_events` | **no** | What was emailed, to whom, and when |
| `pickup_locations` | **no** | Saved addresses staff choose from |

### Migrations to apply

| File | What it does |
|---|---|
| `20260911120000_cash_at_pickup.sql` | Adds `cash_at_pickup` to the `payment_status` check on `orders` and `quotes`. **Until it is applied, a customer's cash choice cannot be saved** — the app degrades gracefully (the order is still stored and the customer is told to mention cash when confirmed), but the desk won't see the pill. |

### Applying a change

Paste the migration into the Supabase dashboard → SQL Editor and run it. That
is normally the only step.

**Why not the Edge Function?** `supabase/functions/bonbons-data/` predates
several features and its deployed copy validates against the shape it shipped
with — it pins single pops at $4 and rejects email types and actions added
since. Rather than requiring a function deploy for every change, newer
privileged work goes through database functions that a migration can create:

- `bonbons_admin(token, action, payload)` — Box of the Week, shop prices,
  per-flavor price and stock, order deletion, bulk import
- `bonbons_record_email(token, payload)` — logs a sent email and stamps the
  matching timestamp

Both are `security definer`, callable by `anon` but useless without the
server-only token, of which only a SHA-256 is stored. That is the same trust
boundary the Edge Function uses, with one fewer deploy step.

Redeploying the Edge Function is still worthwhile eventually — it would let the
menu editor save a flavor's price in one write instead of two — but nothing
depends on it.

---

## Deploying

Heroku, Node 24, the `heroku/nodejs` buildpack and the `Procfile` web process.
Supabase remains the database; no Heroku add-on is needed.

```bash
git push heroku main
```

`app.json` starts at **zero web dynos** so deploying the manifest never
silently starts paid compute — choose and scale a dyno yourself.

Setting up a new environment:

1. Create the app on `heroku-24` in the US region.
2. Set every config variable from the table above. Generate a **fresh**
   `ADMIN_PASSWORD` and `ADMIN_SECRET` for production; never reuse the
   development values and never commit them.
3. Set `NEXT_PUBLIC_SITE_URL` to the app's HTTPS origin **before** building —
   Next.js inlines `NEXT_PUBLIC_*` at build time, so changing it later needs a
   rebuild, not just a restart.
4. Add the Heroku hostname to the reCAPTCHA key's allowed domains.
5. Deploy, scale the web dyno to 1, then check `/api/health`, `/shop`, `/cart`
   and `/admin`.

Vercel works too: import the repo and add the same variables.

---

## Testing

```bash
npm run test:all
```

101 tests across ten suites. They need no network, no database and no
credentials — server-only modules are loaded into a VM context with explicit
stubs, and a test that pulls in an unexpected dependency fails loudly.

| Suite | Covers |
|---|---|
| `test:menu` | Server-side re-pricing, four-pack rules, tamper resistance |
| `test:box` | Box validation, stock thresholds, sold-out enforcement |
| `test:documents` | PDF rendering, invoice guards — asserts on decompressed PDF text |
| `test:email` | Templates, escaping, attachments, save-before-send ordering |
| `test:pickup` | Overdue detection, delay emails, date/time parsing |
| `test:import` | Spreadsheet parsing, Excel dates, per-row errors |
| `test:photos` | Styled-vs-real photo rules and disclosure |
| `test:mobile`, `test:reveal` | Responsive behaviour and motion |
| `test:config` | Production startup checks |

---

## Things that will bite you

**Dates are parsed as local calendar days.** `new Date("2026-09-15")` is UTC
midnight — the previous day anywhere west of Greenwich. Parsing date-only
values that way would display the wrong day and mark same-day pickups overdue
every evening in Texas. Use the helpers in `lib/date-values.js`.

**`NEXT_PUBLIC_*` is baked in at build time.** Changing one on Heroku requires
a rebuild; a restart is not enough.

**Statically rendered pages cannot use `no-store`.** They silently fall back to
default values. The shop-price read uses a revalidated cache tag for exactly
this reason.

**Photos are labelled honestly.** Styled product imagery carries a "Styled
photo" badge and links to a gallery of the owner's own photos. If you swap a
genuine photo for a styled one, move the label with it.

**Order numbers come from a sequence.** Importing an order with status
`confirmed` fires the same trigger as confirming one and consumes a real
number. Import historical orders as `pending` unless you want numbers assigned.

---

## Project layout

```
app/                    Routes — pages and API handlers
  admin/                Shop Desk shell and its stylesheet
  api/                  Public and admin endpoints
components/             UI — storefront and Shop Desk
lib/                    Server logic: pricing, orders, email, PDFs, Supabase
  order-pdf.js          Confirmation and invoice documents
  email-template.js     Every customer email
  order-menu.js         Server-side re-pricing and availability
supabase/
  schema.sql            Full database definition
  migrations/           Applied in filename order
  functions/            Edge Function (see "Why not the Edge Function?")
tests/                  Ten suites, no network
assets/                 Email and PDF logos
public/products/        Product photography
scripts/                Env checks and email previews
```

---

## Appendix: how the design was chosen

Six directions were built before the current site. Design 3 — *Party Pop*, a
modern dark storefront — won and became what you see. Concepts 1–3 are HTML and
still viewable at
[`concepts.html`](https://eanthonycarranza.github.io/BonBons/concepts.html) or
locally in `design-previews/`; concepts 4–6 (*Sugar Rush*, *Confetti
Editorial*, *Storybook Pastel*) live in
[Figma](https://www.figma.com/design/pieBhsc3pHgP3706D6dsp4) with the brand
colors set up as variables.

`index.html` and `concepts.html` deploy to GitHub Pages as a static preview of
that original work. **GitHub Pages cannot run this app** — it only serves
static files, and the real site needs a Node server and a database.

The logo is available with a transparent background
(`public/logo-transparent.png`), plus a monogram favicon
(`public/favicon-monogram.svg`) that stays legible at 16×16 where the full logo
reads as a colourful oval. An SVG of the full logo is still worth getting from
whoever designed it.

# Storefront redesign — September 5, 2026

## Design

- Deep plum, cream, and pink storefront with Cormorant Garamond display type and DM Sans body type, self-hosted by Next.js.
- Rebuilt Home and About; supplied Bonnie/Greg portrait is local at `public/images/bonnie-and-greg.jpg`.
- Updated menu, product details, builder, pickup request, FAQ, custom/event pages, navigation, and footer.
- Product photographs replace decorative food/gift illustrations in the builder and saved request items. Functional and social icons remain SVG.
- Removed fabricated customer reviews and placeholder telephone/email links from the redesigned public content.
- Existing staff workflows, APIs, email templates, CAPTCHA verification, and payment/pricing logic were not changed.

## Verification

- `npm run build`: passed, all routes compiled and static pages generated.
- `npm run test:reveal`: 6 passing checks, including client navigation, streamed content, and reduced-motion fallback.
- `npm run test:email`: 12 passing checks, including chosen pack/single pricing, request receipts, and CAPTCHA failure behavior.
- `git diff --check`: passed.
- Browser checks at desktop, 390px mobile, and 320px narrow mobile: no horizontal page overflow in checked Home, About, builder, request, and FAQ screens.
- Four distinct flavors fill the photo preview; a full pack enables adding, and selection resets after adding.
- Two packs plus two singles total $28. Four singles stay singles and trigger the optional savings nudge, without automatic conversion.
- Quantities are cream on dark backgrounds. Mobile steppers have 44px touch targets.
- Mobile menu opens, animates, closes on route selection, and hides closed links from interaction. Redundant bottom navigation is omitted on builder/cart/admin.
- FAQ and social panels expand/collapse. TikTok starts open; Instagram posts were visibly rendered in the embed.
- TikTok return-navigation bug fixed: the cached embed library is now passed the new blockquote array instead of an undefined argument. Verified an iframe returns after builder → Home navigation, without a refresh.
- Home/About sections remain visible on client navigation; no permanent opacity-zero reveal state.
- No real orders, subscriptions, emails, or CAPTCHA challenges were submitted during browser QA. Only the temporary test cart items were removed afterward.

## Third-party behavior

Social feed availability and livestream access remain controlled by each platform. Profile and live links remain available; this redesign does not claim to add native livestream hosting. TikTok integration follows its creator-profile embed markup and the node-array contract used by its own loader.

Reference: https://developers.tiktok.com/docs/en/embed-creator-profiles

## Deployment

- Existing Heroku app: `bonbonsweets`; no plan or add-on changes.
- Build `4c6036a4-1007-475b-bf02-ce913c568a37` succeeded.
- Release `68a66d5e-401c-4dc5-941e-b800dc15e5c2`.
- Live Home and About visually checked. The family photo loads, and About → Home returns all sections plus the TikTok iframe without a reload.
- Fresh live browser console check reported no errors.
- Live site: https://bonbonsweets-c194aa523849.herokuapp.com/

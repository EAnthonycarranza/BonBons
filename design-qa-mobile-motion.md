# Mobile and motion update — September 7, 2026

## Scope

Preserved the dark storefront, current menu, $4 singles / explicitly chosen $10 four-packs, pickup-only flow, CAPTCHA, and existing order/email backend. No database, credentials, pricing, or payment settings were changed.

- Constrained native date inputs and their WebKit value box; retained the native picker.
- Added clear pickup-review sections, a mobile jump-to-details link, readable field labels and helper copy, autocomplete/keyboard hints, and accessible validation associations.
- Enlarged mobile quantity and add buttons, rearranged narrow cart rows and four-pack flavor controls, and added selected-flavor styling.
- Made the mobile request drawer a bottom sheet with independently scrollable contents, safe-area padding, focus containment, and focus restoration.
- Refined navigation entry, menu dismissal on desktop resize, and keyboard navigation.
- Added finite staggered entrances, subtle image settling, quantity feedback, product hover treatments, and coordinated accordion transitions. No persistent floating, pulsing, or looping effects.
- Content remains visible before observer setup; existing route/streaming-aware reveal logic is retained. Reduced-motion preferences disable transitions and animations even when changed after load.

## Verification completed

Headless Chrome 152, isolated `bonbons-mobile` session, against the existing project served locally on port 3088. This is responsive-browser testing, **not a physical iPhone or Safari test**.

| Surface / check | Result |
| --- | --- |
| Pickup form at 320, 375, 393, 430, 768px | Page width equals viewport; native date width equals field width |
| Pickup form / Home at 1440px | Desktop screenshots visually reviewed |
| Four-pack builder at 320px | No horizontal overflow; readable names and 44px controls |
| Four-pack selection | 2 Cookie Monster + 1 Strawberry Shortcake + 1 Biscoff fills four slots; further increments disabled; $10 total; added to local cart |
| Shop / product / FAQ / About / custom form at 320px | No page-level horizontal overflow |
| Menu | Opens, Escape closes, focus returns to trigger, scroll lock clears |
| Request drawer at 393px | Fits 90dvh; reverse Tab wraps to review link inside drawer; closes normally |
| FAQ / social accordions | Toggle open/closed; 420ms transition; closed content inert; Instagram opening closes TikTok |
| Client navigation FAQ → About → Home | Correct content renders without reload; no reveal sections stuck at zero opacity |
| Runtime reduced-motion preference | Reveal animation none, panel transitions 0s, scrolling auto; no hidden sections |
| Browser JavaScript error collection | No page errors reported in the completed flow |
| Unit/regression suites | 44 tests pass: 8 mobile, 6 reveal, 12 menu/pricing, 12 email, 6 production config |
| Whitespace validation | `git diff --check` passes |
| Production build | `npm run build` succeeds, including type/lint checks and all generated routes |

No real order, email, payment, or CAPTCHA challenge was submitted. The production CAPTCHA key rejects localhost, so its successful challenge flow is not claimed as a local test. No CAPTCHA configuration was changed.

Screenshots captured in `/tmp`: `bonbons-cart-mobile-after.png`, `bonbons-menu-mobile-after.png`, `bonbons-drawer-mobile-after.png`, `bonbons-builder-selected.png`, `bonbons-home-mobile-after.png`, `bonbons-home-desktop-after.png`, `bonbons-cart-desktop-after.png`.

Sizing and accessibility references: [native date inputs](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date), [reduced-motion preferences](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

## Live deployment

Deployed successfully to existing Heroku app `bonbonsweets`; build `32d8cad9-e38a-4c52-99ad-d9b982b8b3e1`, release `21f3a410-fb1e-4025-90bc-525415b299ea`.

- `/api/health`, `/`, `/about`, `/cart`, `/shop`, and `/admin` return HTTP 200.
- Live styles include the motion system and native-date constraint.
- Live 393px Chrome check: added a single Cookie Monster to the isolated browser cart, opened the bottom-sheet drawer, and followed its review link to `/cart`. Date and field both measure 319px; page and viewport both measure 393px. No order was submitted.
- Visually inspected `/tmp/bonbons-live-mobile-form.png`.
- Live CAPTCHA renders the unchecked “I'm not a robot” widget correctly inside the form, with no horizontal overflow. Visually inspected `/tmp/bonbons-live-mobile-security.png`; challenge not solved and form not submitted.

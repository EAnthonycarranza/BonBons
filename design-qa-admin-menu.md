# Shop Desk / menu management verification

Implemented September 6, 2026 (America/Chicago).

## Deployment

- Heroku app: `bonbonsweets`, existing hosting plan unchanged.
- Build: `e425f189-6f62-4b79-bcf8-f2c8de997d9b` — succeeded.
- Release: `330b42aa-682f-4100-9815-09f58d65e84c`.
- Supabase Edge Function `bonbons-data`: version 7, active. Existing private internal-token authentication retained.
- Menu schema/storage and verified flavor catalog migrations applied.

## Verified

- Production build succeeds.
- 36 automated checks pass: menu/pricing/payment (12), emails (12), navigation reveals (6), production configuration (6).
- Authenticated HTTP integration against Supabase: add hidden flavor, duplicate rejection, edit, stale-edit rejection, upload a valid image, reject a fake image, hide from public API, delete, restore to Hidden.
- Anonymous admin reads/writes return 401; cross-site admin writes return 403. Production-origin invalid input reaches validation and returns 400.
- Production admin login succeeds and the new Shop Desk markup is served.
- Live shop and four-pack builder expose Cookie Monster, Strawberry Shortcake, and Biscoff only. Twelve historical Instagram flavors and four prior placeholder products are retained in Hidden.
- Test flavor removed after verification; no customer orders or emails were created. One logo-only QA upload remains in the public photo bucket, unused by the storefront.
- Security advisor returned no findings. Existing unused-index notices were informational; indexes were retained because a small menu need not trigger their use. [Supabase unused-index guidance](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Visual verification limitation

Desktop/mobile browser checks could not be completed: the Mac was locked and computer-use reported that automatic unlock was unavailable. The user was asked to unlock it. Responsive CSS, accessible labels, native modal focus handling, and reduced-motion rules are implemented, but no post-change screenshot review is claimed.

## Owner review

- Upload actual individual flavor photos. Branded placeholders are intentional; no unverified cake-pop photos or ingredients were invented.
- Review hidden flavors and allergen information before publishing.
- Public contact and email reply-to are `bonbonssweets.sa@gmail.com` and `(210) 721-3983`. SMTP still uses the previously authenticated sender; switching the actual sending mailbox requires its credentials.
- Payments link to the supplied dot.cards profile after confirmation and are manually recorded by staff; no automatic payment verification is claimed.

Sources checked: [Cookie Monster / Strawberry Shortcake](https://www.instagram.com/p/Dc1HQZ3y5On/), [rotating flavor menu](https://www.instagram.com/p/DcjwPNXTs4b/), [earlier flavor menu](https://www.instagram.com/p/DcO--umDxWh/), [payment profile](https://dot.cards/bonbonssweetssa?utm_source=nfc&e=ZGV2aWNlLXhQTnBTNUwyUmVoLXcyLXBr). Current $4 / four-for-$10 pricing follows the owner's instructions, not historical Instagram pricing.

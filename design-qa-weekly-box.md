# Box of the Week redesign — September 9, 2026

Local and live design QA: passed. Flyer follow-up deployed to bonbonsweets successfully: build c59ffaca-0e35-4a6c-b645-8b15d144f99c, release 8025b4d5-9ba1-4b9d-ba95-df1d18c8132d.

## Direction and accurate offer

Reference: the owner's September 9 Instagram-post screenshot. The design adapts its Cookie Monster blue, strawberry pink, celebratory copy, and flavor photography to the site's dark plum/cream editorial design. It is not a literal recreation of the post or Instagram interface.

The live offer inspected during this work is $25 for 10 cake pops, not 10 different flavors: 4 Cookie Monster, 3 Strawberry Shortcake, and 3 Biscoff. All quantities, flavor names, price, tagline, description, and stock remain sourced from the existing admin-controlled weekly box. The supplied flyer itself says “10 flavors”; its text was preserved, and the actual recipe was not changed to match that claim.

## Implemented

- Full dark page rebuild with flavor-photo mosaic, price/request panel, exact per-flavor quantities, pickup explanation, and closing CTA.
- Homepage feature moved ahead of the everyday menu.
- Contextual mobile action bar for the weekly box.
- The owner's follow-up flyer now appears in an uncropped blush frame with a full-size link, on both the weekly page and homepage. Square and landscape uploads also use contain rather than cover. Styled-photo captions were removed as requested. The seeded four-pack image is not misrepresented as a ten-pop box.
- Added admin upload, replace, preview, and remove-from-box controls. Reuses the authenticated, same-origin upload endpoint and existing file validation (JPG/PNG/WebP, 5 MB). Uploads are drafts until Save box; price, recipe, and stock are separate fields. The UI blocks save/close during upload and warns about unsaved work.
- Uploaded the supplied PNG through the admin form, saved the existing Celebration Box (id 1), and verified its image field and unchanged price/recipe/stock via read-only database query. Uploaded file bytes exactly match the provided file. Public image: https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/menu-photos/flavors/7744ed82-02a8-4450-ad3c-a2dcbe73810f.png
- No nested main landmark, responsive Next images with sizes, keyboard controls, quantity bounds, reduced-motion support, and truthful stock messaging.
- Homepage teaser is absent when there is no featured box. Empty and sold-out page branches retain useful alternatives.
- Old flyer CSS and unused homepage-teaser styling removed. Local .claude tooling excluded from deployment archives.

## Verification

- Desktop 1440 × 1100, mobile 393 × 852, and narrow 320 × 740 browser checks passed.
- New photos loaded with nonzero natural dimensions.
- Home feature appears before the everyday menu; its CTA navigates to the weekly page without reloading.
- Request and flavor anchors work; horizontal document width equals viewport width at 320 and 393 pixels.
- Two boxes added to the isolated browser cart produced $50 with Cookie Monster ×4, Strawberry Shortcake ×3, Biscoff ×3 per box. Test cart entries were removed afterwards. No order was submitted, payment attempted, or email sent.
- Reduced motion: photo transition duration 0s, reveal animation none.
- No browser application errors or framework error overlay detected.
- All 99 tests passed across weekly box/design, mobile, reveal, menu, email, production config, photography, spreadsheet import, and pickup suites.
- Production build passed. It reports one existing, unrelated useCallback dependency warning in CartProvider.jsx; that callback was not modified in this task.
- git diff --check passed.
- Live mobile weekly page (320 px): image loaded, object-fit contain, document width equals viewport, caption absent, $25 / 10 pops offer preserved. Live desktop homepage: flyer loaded and caption absent. Live admin editor: uploaded flyer loaded at its original 1122 px width with contain; invalid non-image upload rejected without replacing the saved flyer; removing a draft image and cancelling prompted to discard changes. Draft was discarded and the isolated admin session logged out without saving any further changes.

Screenshots are in design-previews/weekly-box. The flyer-desktop.png, flyer-320.png, home-flyer-desktop.png, home-flyer-320.png, and admin-flyer-mobile.png captures show the follow-up flyer layout. Earlier captures show the flavor-mosaic fallback.

## Boundaries

No admin credentials, customer records, stock quantities, menu availability, payment configuration, prices, database schema, storage policies, or authentication settings were changed. The only content write was the owner-authorized weekly artwork upload and saving that image on the existing box. Supabase changelog and upload documentation were checked; no relevant breaking change affects the reused upload route. No new image-generation or third-party service was needed.

## Subsequent owner-requested password change

After the flyer deployment, the owner explicitly requested a new admin password. Updated only ADMIN_PASSWORD in the existing Heroku app and both git-ignored local environment files. The session-signing secret and all other configuration were preserved. Do not record the credential in this document or source control.

Verified the requested new password by signing into the live admin page and loading its authenticated menu-management dashboard; then logged out of the isolated test session. All six production-configuration tests passed. Existing sessions become invalid because their tokens depend on the previous password.

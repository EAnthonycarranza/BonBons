# TikTok Section Design QA

- Source visual truth: `/var/folders/fk/nx_9gdys1tx9gz6l37c3q1h80000gn/T/TemporaryItems/NSIRD_screencaptureui_KlnICj/Screenshot 2026-09-01 at 8.51.13 AM.png`
- Desktop implementation screenshot: `/Users/acarranza/Documents/Claude Project/BonBons/design-qa-tiktok-desktop.png`
- Mobile implementation screenshot: `/Users/acarranza/Documents/Claude Project/BonBons/design-qa-tiktok-mobile.png`
- Side-by-side comparison: `/Users/acarranza/Documents/Claude Project/BonBons/design-qa-tiktok-comparison.png`
- State: homepage TikTok section with the official creator embed fully loaded

## Capture normalization

- Source pixels: 3644 x 2370. The TikTok region was cropped to 2470 x 1400.
- Desktop implementation: 1423 x 1000 pixels at a 1423 x 1000 CSS viewport.
- Mobile implementation: 390 x 782 captured pixels at a 390 x 844 CSS viewport.
- Comparison canvas: 2380 x 820. The source and implementation crops were each contained within 1180 x 820 panels so the section structure could be judged together without browser chrome.
- The source screenshot documents the defect rather than a desired visual target: one stretched outer card left a large empty area under the TikTok embed. The implementation intentionally changes that structure.

## Full-view comparison evidence

The side-by-side comparison shows that the intro and official TikTok feed now render as two independent, top-aligned cards. The feed card ends directly after the creator widget instead of stretching to the taller intro panel, removing the empty black block that made the embed look cut off.

At 1423 px desktop width, the TikTok section is 1232 px wide with no horizontal overflow. At 390 px mobile width, both cards are 354 px wide, stack vertically, and the document has no horizontal overflow.

## Focused region evidence

The creator embed was inspected directly because it is the fidelity-critical region. On desktop, its iframe measures 732.24 x 458 px inside a 778.24 px feed card. On mobile, it measures 324 x 367 px inside a 354 px feed card. The feed wrapper now follows the iframe's rendered height instead of enforcing a 500 px minimum, so there is no artificial blank area below the widget.

## Findings

- No remaining P0, P1, or P2 issues.
- Fonts and typography: Existing display and body families, weights, hierarchy, and wrapping are preserved. The official TikTok iframe controls its own typography.
- Spacing and layout rhythm: The two-card grid uses a 16 px gap and `align-items: start`; rounded corners, borders, and padding remain consistent with the site's dark design system.
- Colors and visual tokens: The dark purple/black palette, pink CTA, cyan/pink TikTok accent, and existing border tokens are unchanged.
- Image quality and asset fidelity: The supplied brand logo and TikTok's official creator profile/video assets remain sharp and uncropped by app-owned containers.
- Copy and content: The existing TikTok follow, live-check, and explanatory copy are unchanged.
- Responsive behavior: Desktop and 390 px mobile views pass without document overflow or embed clipping.
- Browser console: No errors were reported after the final desktop and mobile reloads.

## Comparison history

1. Earlier P2 finding: the official embed lived inside a grid row stretched to the height of the intro panel, creating a large empty black area that read as clipped or unfinished.
2. Fix: separated the intro and feed into independent bordered cards and aligned them to the top.
3. Mobile P2 found during verification: a 500 px minimum height on the embed wrapper left blank space below the 367 px mobile iframe.
4. Fix: removed the fixed minimum height so the wrapper follows the official iframe's responsive height.
5. Post-fix evidence: desktop and mobile captures show the feed card ending cleanly after the widget, with no overflow and no console errors.

## Follow-up polish

- None required for this scoped fix.

final result: passed

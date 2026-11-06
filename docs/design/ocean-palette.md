# Approved ocean blue and gold palette

The user approved this scheme after reviewing a generated visual concept based on the [fourth supplied Pinterest palette](https://www.pinterest.com/pin/869124428121953595/).

| Color | Value | Role |
| --- | --- | --- |
| Arctic Powder | `#F1F6F4` | Main canvas, marketing sections, auth form background |
| Oceanic Noir | `#172B36` | Sidebar, strong text, assistant header, footer |
| Nocturnal Expedition | `#114C5A` | Branded feature panels, text links, focus indicators, charts |
| Forsythia | `#FFC801` | Primary actions, selected navigation, route accents |
| Mystic Mint | `#D9E8E2` | Subtle supporting surfaces |
| Deep Saffron | `#FF9932` | Secondary chart detail |
| White | `#FFFFFF` | Cards, forms, dialogs, menus, chat conversation |

The interface is predominantly off-white and white. Dark blue provides structure, and yellow is reserved for emphasis. Yellow actions have dark blue text; links and text-only actions use ocean blue on light backgrounds. Blue branded panels use light text. Status colors remain distinct for errors, success, warnings, and information.

## Implementation

- `intelligentTokens.ts` is the shared Material UI and chart palette. `intelligentTheme.ts` uses light mode. `theme.ts` exports that same theme for fallback routes.
- `workspace.css` owns the shared semantic CSS variables and dashboard/auth layout. `oceanPalette.css` defines branded blue regions, yellow actions, light surfaces, and contrast at their boundaries.
- Public landing, marketplace, and assistant styles use the approved colors. Legacy color utilities and explicit text accents resolve through the same palette; `--ws-primary-ink` separates readable text accents from yellow button fills.
- The shared lazy chart component applies the palette to series, labels, grids, and tooltips in light mode.
- Navigation, booking, authentication, assistant endpoints, authorization, and financial behavior retain their existing implementation. Existing driving-lesson photographs are reused.

## Verification

Production build, TypeScript diagnostics compared with the working tree before this palette change, desktop/mobile browser checks, and axe accessibility scans cover the public landing and instructor browser, six auth screens, and all three dashboard overviews. Existing dashboard route checks cover secondary screens, assistant interaction, onboarding, logout, and persistent sidebar loading. Browser checks use isolated sample data, not production customer records or live payment actions.

# Intelligent workspace design

Authentication, onboarding, the public site, and all three dashboards share the approved ocean-blue, golden-yellow, and off-white identity. The design uses Inter, fine borders, white cards, blue navigation and feature panels, and yellow primary actions with dark blue text. See [Approved palette](ocean-palette.md) for exact colors and implementation ownership.

## Theme ownership

- `Frontend/src/themes/intelligentTokens.ts` defines the Material UI palette and the route matcher.
- `Frontend/src/themes/intelligentTheme.ts` styles Material UI controls, menus, drawers, dialogs, tables, alerts, and form states.
- `Frontend/src/themes/ApplicationAppearance.tsx` applies the theme to authentication, onboarding, payment-return, and dashboard routes. It scopes CSS variables on the body for every route so portal content inherits the same palette.
- `Frontend/src/themes/workspace.css` bridges existing DSP tokens and defines the shared navigation, authentication frame, surfaces, responsive behavior, and integration styles.
- `Frontend/src/themes/workspace-utilities.css` adapts legacy arbitrary Tailwind colors to semantic tokens.

Existing CSS and inline style colors now resolve through `--ws-*` tokens. Their original values remain as fallbacks for public pages. New dashboard UI should use the shared components, Material UI theme colors, or these semantic variables rather than adding fixed color values.

Success, attention, error, and information states retain distinguishable colors. Primary buttons use dark blue text on yellow. Charts use the shared ocean-blue, gold, and supporting blue palette while preserving their existing data and formatters. Reduced-motion preferences are respected. Navigation is visible immediately, with optional hover motion.

## Authentication

The shared `AuthLayout` covers sign-in, sign-up, forgotten passwords, password resets, email verification, two-factor verification, and authentication status. Profile onboarding uses the same frame. Verification digits have individual accessible labels and a responsive six-column layout. Existing validation, account flows, and dashboard permissions remain in place.

## Verification

Browser checks use isolated, synthetic GraphQL fixtures. They do not verify the live backend or modify account records. Screenshots contain sample data.

The production build passes. A direct TypeScript check reports 345 existing diagnostics; a comparison against the original checkout finds no new diagnostic signatures. The existing build also reports its large-chunk advisory.

Completed browser coverage:

- Six auth screens at 1440, 768, 390, and 320 px, with no horizontal overflow or browser runtime errors.
- All three dashboard overviews at 1440, 1024, 768, 390, and 320 px, including responsive chart resizing.
- Twenty-five additional dashboard routes covering settings, booking, payments, availability, documents, people, analytics, messaging, notifications, and support.
- Student and instructor profile onboarding, role selection, assistant drawers, and logout dialogs. The dialogs retain Escape dismissal and focus restoration.
- Sign-in validation and password visibility, verification-code focus, and returning from auth to the public landing page.
- Automated axe WCAG A/AA scans reported zero violations on the six auth screens and three dashboard overviews. Automated scans do not replace manual accessibility review.

Stripe fields receive resolved Material UI colors because their isolated frames do not inherit the host's custom properties. Live Stripe transactions and authentication services were not exercised.

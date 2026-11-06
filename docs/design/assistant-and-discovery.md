# Public assistance, lesson discovery, and workspace loading

The public landing page now mounts the shared DSP Assistant. Its visible “Ask DSP” launcher and the hero and feature actions open the same floating conversation. The panel uses the midnight and mint palette on public pages and all three dashboards. It stays modeless, so opening it does not dim or disable the workspace.

The chat includes suggested questions, user and assistant bubbles, pending and error states, retry without duplicating the question, stop, new conversation, keyboard submission, Escape dismissal, and focus restoration. Messages render as escaped text with limited bold formatting and links to known DSP routes. Personal dashboard help continues to use the authenticated, read-only assistant endpoint. Public conversations always use the public endpoint without an authorization header, including when a signed-in person visits a marketing page. Conversations are held in component memory and reset on identity changes; they are not persisted to browser storage.

`POST /api/v1/assistant/public/chat` is a separately rate-limited product-help endpoint. It validates and bounds input and history, receives no account identity, and exposes no tools or database queries. Live mode uses the existing AI provider with a product-only prompt. Without a live provider, or after provider failure, it returns deterministic product guidance with `mode: "guide"`, displayed as “Product guide.” The existing authenticated route still requires authentication. No account access rules or payment actions were changed.

“Find lessons” now scrolls to a real instructor browser appended to the home page. That browser loads near the viewport and shares instructor queries, filters, prices, profile actions, and loading/error states with the standalone `/professional` page. Public browsing no longer waits for geolocation or requests a student profile. The standalone page replaces the old stock banner and placeholder copy with a driving-lesson introduction, matching navigation, and a consistent marketplace surface. Public instructor profiles use the same palette for availability, summary, and review tabs. Missing profiles display an error or not-found state instead of fabricated instructor data.

Dashboard route fallbacks now render a relative content skeleton. The persistent shell keeps its navigation and sidebar mounted while a tab's module loads. The sidebar component itself was not edited.

## Verification

- Frontend production build.
- Assistant backend tests, including unauthenticated product guidance, authenticated endpoint rejection for guests, malformed input, bounded history, public tool isolation, provider failure, and Gemini calls without tool declarations.
- Browser checks with isolated GraphQL and assistant responses for public discovery, filters and profile tabs; chat suggestions, submission, retry, keyboard interaction and mobile layout; and all three dashboard layouts.
- Delayed dashboard module requests to inspect content loading and verify the sidebar DOM remains mounted.
- Responsive checks at 320, 390, 768, 1024 and 1440 pixels, and automated axe checks on the marketplace and chat alongside the existing auth and dashboard checks.
- TypeScript diagnostics compared against `HEAD`; repository-wide pre-existing diagnostics are tracked separately from new changes.

Browser checks use sample records and mocked assistant responses. No production bookings, payments, customer records or live-provider credentials are used.

# DSP landing page

The public home route uses the approved ocean-blue, golden-yellow, and off-white visual system, centered oversized typography, a human driving-lesson hero, floating cards, and interactive product previews. See [Approved palette](ocean-palette.md) and [Customer experience](customer-experience.md). Shared colors extend across public pages, authentication, and dashboards; layouts remain in `landing.css` and `marketplace.css`.

The workspace figures and example assistant conversations are illustrative, labeled previews. The public page uses a separate product-help assistant endpoint without account access. The illustrated account examples remain labeled previews, and the assistant cannot modify bookings. Links use the existing instructor marketplace, signup, signin, and support routes.

Animation respects reduced-motion preferences. Workspace tabs support arrow keys, Home, and End. The FAQ supports keyboard activation and exposes its expanded state.

## Hero artwork

- Asset: `Frontend/public/images/landing/intelligent-drive.webp`
- Generated with the built-in imagegen tool, then encoded as WebP for delivery.
- Original dimensions: 1536 × 1024.
- Final generation prompt:

> Use case: stylized-concept. Asset type: premium AI driving-school marketplace website hero background artwork. Create a striking photorealistic cinematic 3D render, very wide 3:2 landscape composition. A beautiful futuristic silver-white unbranded electric sports coupe viewed from elevated three-quarter front view, pointing to lower left, centered horizontally in the lower half of the image. A luminous translucent mint green navigation ribbon sweeps in a graceful ring around the car on a smooth obsidian floor, with delicate holographic route lines and subtle particle points. Architectural light sculpture, advanced intelligent mobility, refined automotive campaign aesthetic, technically sophisticated. Vast very dark midnight teal-black studio background (#071414), gently illuminated beneath car with emerald light. Restrained soft mint and white lighting, realistic metal and glass, beautiful soft reflections. Concentrate visible subject in the central 65 percent horizontally. Upper third mostly empty dark atmospheric background, edges fade into dark black-green so it seamlessly blends into a website background. Powerful sculptural art direction, ultra polished CGI, minimal elegant not busy. No words, no typography, no logos, no interface cards, no people, no watermarks. This is artwork only, not an image of a website.

## Verification

- Production build: `cd Frontend && npm run build` passed.
- Chromium layouts checked at 320, 375, 390, 700, 768, 850, 1024, and 1440 px, with no horizontal page overflow.
- Workspace switching and keyboard navigation, assistant example navigation, FAQ expansion, internal anchors, mobile menu behavior, and reduced-motion support passed browser checks.
- Automated axe WCAG A/AA checks reported zero violations on desktop and mobile. This does not replace manual accessibility review.
- No browser runtime errors occurred during these frontend checks. Authenticated backend workflows were not exercised.

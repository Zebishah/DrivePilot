# Customer-first driving lesson experience

Drive Pilot is presented as a driving-school marketplace: learners find instructors and book lessons; instructors manage teaching; admins run marketplace operations. The approved ocean-blue, golden-yellow, and off-white palette remains consistent across marketing, authentication, and all three workspaces.

## Customer and reviewer journeys

- The landing hero names driving lessons directly. Its primary action scrolls to the embedded instructor marketplace; the secondary action creates an instructor account.
- Learner and instructor sections explain profiles, lesson options, availability, bookings, payment, messages, and feedback without inventing prices or performance claims.
- An interactive Find / Book / Learn preview explains the lesson journey with real navigation links.
- Recruiter and product-review access has a dedicated section and links to the existing three demo sign-in actions. Technical implementation details appear in a disclosure in that section.
- Auth pages explain what the account is for, including a compact mobile service introduction. Authentication and authorization logic remain unchanged.
- Shared dashboard introductions and workflow navigation emphasize each role's actual tasks. Demo accounts are clearly identified. Existing lesson, booking, progress, and payment figures continue to come from their original queries.

## Imagery and motion

The new representative image shows a learner and instructor inside a parked car. It is editorial AI-generated imagery, not a testimonial, instructor profile, or photograph of a customer.

Asset: `Frontend/public/images/landing/driving-lesson.webp` (1536 × 1024), generated with the built-in imagegen tool and encoded as WebP. The existing futuristic car artwork remains available separately.

Subtle route animations, the interactive lesson preview, workspace entry motion, and existing tab interactions reinforce the connected lesson journey. Reduced-motion preferences disable or simplify this motion.

### Generation prompt

> Use case: photorealistic-natural. Asset type: editorial driving school platform website imagery. Create a premium cinematic wide landscape photograph, 3:2 composition, of a real driving lesson inside an unbranded modern car that is safely parked. A young adult female learner in the driver's seat, fully clothed casual neutral jacket and seat belt fastened, hands resting naturally on the steering wheel, smiling with growing confidence. A friendly adult male driving instructor in the front passenger seat wearing a casual dark green overshirt and seat belt, explaining something with an open hand and relaxed encouraging expression. Camera from the back seat on a slight diagonal, both faces clearly visible in three-quarter side profile, with the dashboard and road through the windscreen establishing unmistakably that this is a driving lesson. The learner is in control of the steering wheel, instructor has no extra steering wheel. Contemporary Swiss city residential street softly visible through windows, no landmarks or flags required. Sophisticated natural dusk light with soft emerald and warm daylight highlights, deep midnight-green shadows, photorealistic skin texture, believable hands and anatomically correct bodies, a warm human moment rather than a sci-fi scene. Both people are adults. Crop-friendly central subjects with dark soft edges for use on a midnight green website, generous atmosphere around the subjects. Editorial luxury photography, welcoming and credible, subtly advanced technology aesthetic. No text, no brands, no logos, no watermarks, no cartoon, no holographic screens.


## Verification

- The production build passes.
- Landing page checks cover customer links, the interactive lesson journey, role tabs and keyboard controls, the assistant example, FAQ, reviewer disclosure, and navigation to the existing demo entry points.
- Responsive checks pass at 320, 390, 768, 1024, and 1440 px for the landing page and three dashboard overviews, and at 320, 390, 768, and 1440 px for the six auth screens.
- Automated axe WCAG A/AA scans report zero violations on the landing page, six auth screens, and three dashboard overviews. Automated scans do not replace manual accessibility review.
- The existing dashboard route, onboarding, assistant panel, and logout-dialog checks still pass with isolated sample GraphQL data. Live authentication and payment services were not exercised.
- A TypeScript diagnostic comparison against the original checkout finds no new error signatures. The existing repository errors remain.

The public assistant and embedded instructor browser are documented in [assistant-and-discovery.md](assistant-and-discovery.md).

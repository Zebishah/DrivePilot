# Student Dashboard -> Help & Support (deep)

**Module:** `student-dashboard`  
**Feature:** `help-support`  
**Route:** `/student-dashboard/help-support`

This feature provides the student-facing FAQ browser and support contact form. It is largely shared with the teacher-side help/support implementation but is exposed through the student dashboard route.

## Purpose

- Let students browse frequently asked questions without leaving the dashboard.
- Let students send a support/contact message.
- Reuse the same admin-managed FAQ and contact-details backend configuration used elsewhere in the platform.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/HelpSuportPage.tsx` | Reused route-level page | Mounted by the student route; owns tab switching between FAQs and contact form. |
| `Frontend/src/components/InstructorComponent/Help&Support/TabPanel.tsx` | Shared tab wrapper | Used for FAQ/contact tab composition. |
| `Frontend/src/components/InstructorComponent/Help&Support/FaqList.tsx` | FAQ list renderer | Consumes FAQ data with show-more/show-less behavior. |
| `Frontend/src/components/InstructorComponent/Help&Support/ContactSection.tsx` | Contact shell | Hosts the contact form inside the help/support route. |
| `Frontend/src/components/InstructorComponent/Help&Support/ContactForm.tsx` | Student support form | Collects student message, validates inputs, and triggers send-contact mutation. |
| `Frontend/src/hooks/UseFaqs's.ts` | FAQ hook | Wraps FAQ query logic. |

## Frontend GraphQL

### FAQs

- File: `Frontend/src/graphql/Queries/Faqs.ts`
- Relevant operation:
  - `GET_ALL_FAQS` → `getAllFaqs`
- Used by:
  - FAQ tab/list in help/support page.

### Contact

- File: `Frontend/src/graphql/mutations/AdminContact.ts`
- Relevant operation:
  - `SEND_CONTACT_EMAIL`
- Used by:
  - `ContactForm.tsx`

## Backend schema

### TypeDefs

- File: `server/src/graphql/typeDefs/Faq'sTypes.js`
  - Exposes FAQ query types.
- File: `server/src/graphql/typeDefs/AdminContactTypes.js`
  - Exposes contact-detail and contact-email mutation shapes.

### Resolvers

- File: `server/src/graphql/resolvers/Faqs.resolver.js`
  - `Query.getAllFaqs`
- File: `server/src/graphql/resolvers/ContactDetail.resolver.js`
  - `Mutation.sendContactEmail`
  - contact-detail lookups used by the contact form destination logic

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/FAQ's.js` | FAQ records managed by admin |
| `server/src/models/AdminContact.js` | Contact-detail configuration source |
| `server/src/services/FaqServices.js` | FAQ service layer |
| `server/src/services/ContactAdminServices.js` | Admin contact-detail service layer |
| `server/src/services/ContaactFormServices.js` | Email relay for support form submissions |

## Data flow

1. Student opens `/student-dashboard/help-support`.
2. FAQ tab loads `getAllFaqs` and renders the accordion/list view.
3. If the student switches to the contact tab, the contact form renders with prefilled user information when available.
4. Submitting the form triggers `sendContactEmail`.
5. Backend resolves the configured support destination and relays the message.

## Developer notes

- The route uses a teacher-side page/component set; this is shared UI, not a student-specific duplicate implementation.
- FAQ content is admin-managed, so students never mutate FAQ data from this route.
- This is a contact-email feature, not a ticketing/helpdesk system with persisted student-visible conversation history.

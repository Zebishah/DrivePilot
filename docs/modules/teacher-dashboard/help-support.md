# Teacher Dashboard -> Help & Support (deep)

**Module:** `teacher-dashboard`  
**Feature:** `help-support`  
**Route:** `/teacher-dashboard/help-support`

This page gives instructors access to FAQs and a contact form for reaching support.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/HelpSuportPage.tsx` | Main page | Renders FAQ and Contact tabs; uses `useFAQs`. |
| `Frontend/src/hooks/UseFaqs's.ts` | FAQ hook | Fetches FAQs and manages pagination/accordion state. |
| `Frontend/src/components/InstructorComponent/Help&Support/FaqList.tsx` | FAQ renderer | Displays FAQ items. |
| `Frontend/src/components/InstructorComponent/Help&Support/ContactSection.tsx` | Contact tab shell | Hosts the contact form. |
| `Frontend/src/components/InstructorComponent/Help&Support/ContactForm.tsx` | Contact submit form | Uses `SEND_CONTACT_EMAIL`. |
| `Frontend/src/graphql/Queries/Faqs.ts` | FAQ queries | Defines `GET_ALL_FAQS`. |
| `Frontend/src/graphql/mutations/AdminContact.ts` | Contact mutation | Defines `SEND_CONTACT_EMAIL`. |

## Frontend GraphQL

### FAQ flow

- `GET_ALL_FAQS`
  - Used by the FAQ hook/page
  - Public/shared FAQ data source for teachers

### Contact flow

- `SEND_CONTACT_EMAIL`
  - Used by `ContactForm.tsx`
  - Sends support message input to backend

## Backend schema

### FAQ backend

- TypeDefs: `server/src/graphql/typeDefs/Faq'sTypes.js`
  - relevant query: `getAllFaqs`
- Resolvers: `server/src/graphql/resolvers/Faqs.resolver.js`
  - relevant resolver: `Query.getAllFaqs`

### Contact backend

- TypeDefs: `server/src/graphql/typeDefs/AdminContactTypes.js`
  - relevant mutation: `sendContactEmail(input: ContactInput!): ContactResponse`
- Resolvers: `server/src/graphql/resolvers/ContactDetail.resolver.js`
  - relevant resolver: `Mutation.sendContactEmail`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/services/FaqServices.js` | FAQ retrieval |
| `server/src/models/AdminContact.js` | Holds configured support contact details |
| `server/src/services/ContactAdminServices.js` | Admin-side contact config services |
| `server/src/services/ContaactFormServices.js` | Sends support contact emails |

## Data flow

1. Instructor opens Help & Support page.
2. FAQ tab loads all FAQs via the FAQ hook.
3. Contact tab renders the contact form.
4. Submitting the form calls `SEND_CONTACT_EMAIL`.
5. Backend validates the payload, looks up configured support email, and sends the message via contact-email service.

## Developer notes

- Teachers can read FAQs and send contact emails, but they do not manage contact-detail records directly; that remains an admin-side capability.
- The page-level `handleContactSubmit` is mostly a wrapper; the real submission logic lives in `ContactForm.tsx`.

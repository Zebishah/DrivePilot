# Admin Dashboard -> Help & Support (deep)

**Module:** `admin-dashboard`  
**Feature:** `help-support`  
**Route:** `/admin-dashboard/help-support`

This module lets a super admin manage FAQs and the support contact email used by the platform.

## Purpose

- Maintain the FAQ list shown in the platform.
- Maintain the support email/contact details.
- Keep FAQ and support settings under admin control.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/admin-dashboard/HelpSupport.tsx` | Main route page | Provides the two-tab shell: `FAQ` and `Contact Details`; reads `user.id` from `useAuth()` and passes it into `FaqTab`. |
| `Frontend/src/components/AdminComponents/FaqTab.tsx` | FAQ section shell | Opens `FaqForm` and renders `FaqList`. |
| `Frontend/src/components/AdminComponents/FaqForm.tsx` | Create FAQ dialog | Calls `CREATE_FAQ`; refetches `GET_FAQS_BY_ADMIN`. |
| `Frontend/src/components/AdminComponents/FaqList.tsx` | FAQ list and edit/delete UI | Calls `GET_FAQS_BY_ADMIN`, `UPDATE_FAQ`, `DELETE_FAQ`. |
| `Frontend/src/components/AdminComponents/ContactDetails.tsx` | Support-email management UI | Calls `GET_MY_CONTACT_DETAIL`, `CREATE_CONTACT_DETAIL`, `UPDATE_CONTACT_DETAIL`. |
| `Frontend/src/graphql/Queries/Faqs.ts` | FAQ queries | Defines `GET_ALL_FAQS`, `GET_FAQS_BY_ADMIN`, `GET_FAQ_BY_ID`. |
| `Frontend/src/graphql/mutations/Faqs.ts` | FAQ mutations | Defines `CREATE_FAQ`, `UPDATE_FAQ`, `DELETE_FAQ`. |
| `Frontend/src/graphql/Queries/AdminContact.ts` | Contact queries | Defines `GET_MY_CONTACT_DETAIL` and `GET_ALL_CONTACT_DETAILS`. |
| `Frontend/src/graphql/mutations/AdminContact.ts` | Contact mutations | Defines `CREATE_CONTACT_DETAIL`, `UPDATE_CONTACT_DETAIL`, `DELETE_CONTACT_DETAIL`, `SEND_CONTACT_EMAIL`. |

## Frontend GraphQL used by this module

### FAQ tab

- `GET_FAQS_BY_ADMIN`
  - Used by `FaqList.tsx`
- `CREATE_FAQ`
  - Used by `FaqForm.tsx`
- `UPDATE_FAQ`
  - Used by `FaqList.tsx`
- `DELETE_FAQ`
  - Used by `FaqList.tsx`

### Contact Details tab

- `GET_MY_CONTACT_DETAIL`
  - Used by `ContactDetails.tsx`
- `CREATE_CONTACT_DETAIL`
  - Used when no contact record exists yet
- `UPDATE_CONTACT_DETAIL`
  - Used when the admin edits the existing support email

## Backend schema

### FAQ typeDefs and resolvers

- TypeDefs file: `server/src/graphql/typeDefs/Faq'sTypes.js`
  - Type: `Faq`
  - Query fields:
    - `getAllFaqs`
    - `getFaqsByAdmin(adminId: ID!)`
    - `getFaqById(id: ID!)`
  - Mutation fields:
    - `createFaq(question: String!, answer: String!, adminId: ID!): Faq`
    - `updateFaq(id: ID!, question: String, answer: String): Faq`
    - `deleteFaq(id: ID!): Faq`
- Resolver file: `server/src/graphql/resolvers/Faqs.resolver.js`
  - `getFaqsByAdmin`
    - Admin-only
    - Uses authenticated `user.id`
  - `createFaq`
    - Admin-only
    - Uses authenticated `user.id`
    - If the same question already exists for this admin, updates it instead of creating a duplicate
  - `updateFaq`
    - Admin-only
  - `deleteFaq`
    - Admin-only

### Contact typeDefs and resolvers

- TypeDefs file: `server/src/graphql/typeDefs/AdminContactTypes.js`
  - Types:
    - `ContactDetail`
    - `ContactInput`
    - `ContactResponse`
  - Query fields:
    - `getAllContactDetails`
    - `getMyContactDetail`
  - Mutation fields:
    - `createContactDetail`
    - `updateContactDetail`
    - `deleteContactDetail`
    - `sendContactEmail`
- Resolver file: `server/src/graphql/resolvers/ContactDetail.resolver.js`
  - `getMyContactDetail`
    - Admin-only
    - Reads contact detail by current admin id
  - `createContactDetail`
    - Admin-only
  - `updateContactDetail`
    - Admin-only
  - `sendContactEmail`
    - Validates input
    - Reads configured support email
    - Sends the contact email through `ContaactFormServices`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/services/FaqServices.js` | FAQ data access used by FAQ resolvers |
| `server/src/services/ContactAdminServices.js` | Contact-detail CRUD used by contact resolvers |
| `server/src/services/ContaactFormServices.js` | Sends actual contact email to configured support inbox |

## Data flow

1. Super admin opens `HelpSupport.tsx`.
2. Tab 1 renders `FaqTab`:
   - `FaqList` loads `GET_FAQS_BY_ADMIN`
   - `FaqForm` creates with `CREATE_FAQ`
   - edit/delete actions use `UPDATE_FAQ` and `DELETE_FAQ`
3. Tab 2 renders `ContactDetails`:
   - loads `GET_MY_CONTACT_DETAIL`
   - creates or updates support email with `CREATE_CONTACT_DETAIL` / `UPDATE_CONTACT_DETAIL`
4. Backend stores FAQ data and contact data through dedicated services.

## Developer notes

- The route is wrapped in a super-admin gate at the router level, so not every admin sees it.
- `adminId` is still passed from frontend into some FAQ operations for typing/compatibility, but the backend resolver primarily trusts the authenticated `user.id`.
- FAQ and contact management are separate backend modules even though they share one admin page.

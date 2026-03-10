# Teacher Dashboard -> Profile Price Management (deep)

**Module:** `teacher-dashboard`  
**Feature:** `profile-price-management`  
**Surface:** Price Management tab inside `/teacher-dashboard/settings`

This tab lets the instructor manage lesson pricing, lesson discount, and bulk lesson packages.

## Purpose

- Set base lesson fee.
- Apply lesson-level discount.
- Calculate final lesson price.
- Build bulk lesson packages with package-specific discount and end date.

## Frontend files

| File | Role | Integration |
|---|---|---|
| `Frontend/src/pages/private/teacher-dashboard/tabs/TariffTab.tsx` | Main tariff/price UI | Calls `GET_TEACHER_TARIFF` and `UPDATE_TEACHER_TARIFF`; calculates price values client-side before saving. |
| `Frontend/src/graphql/mutations/tariff.ts` | Tariff GraphQL | Defines teacher tariff query and mutation. |

## Frontend GraphQL

### `GET_TEACHER_TARIFF`

- File: `Frontend/src/graphql/mutations/tariff.ts`
- Query field: `teacherTariff`
- Used by: `TariffTab.tsx`
- Provides:
  - `lessonFee`
  - `lessonDiscount`
  - `FinalPricePerLesson`
  - `bulkPackages`
  - `isDefault`

### `UPDATE_TEACHER_TARIFF`

- File: `Frontend/src/graphql/mutations/tariff.ts`
- Mutation field: `updateTeacherTariff(input: TeacherTariffInput!)`
- Used by: `TariffTab.tsx`
- Refetches `GET_TEACHER_TARIFF` after save

## Backend schema

### TypeDefs

- File: `server/src/schemas/tariff.schema.js`
- Relevant query:
  - `teacherTariff: TeacherTariff`
- Relevant mutation:
  - `updateTeacherTariff(input: TeacherTariffInput!): TeacherTariff`
- Relevant types:
  - `TeacherTariff`
  - `TeacherTariffInput`
  - `BulkLessonPackage`
  - `BulkLessonPackageInput`

### Resolvers

- File: `server/src/graphql/resolvers/tariff.resolver.js`
- Relevant resolvers:
  - `Query.teacherTariff`
  - `Mutation.updateTeacherTariff`

## Main backend dependencies

| File | Role |
|---|---|
| `server/src/models/teacherTariff.model.js` | Stores lesson fee, lesson discount, final price, and bulk packages |

## Data flow

1. Instructor opens the Price Management tab.
2. `GET_TEACHER_TARIFF` loads existing tariff data.
3. `TariffTab.tsx` initializes local state from the response.
4. The tab recalculates derived values like final lesson price, package total, student savings, and final package price in the frontend.
5. Save action sends the full tariff payload through `UPDATE_TEACHER_TARIFF`.
6. Backend stores the updated tariff record and the UI refetches the latest saved values.

## Developer notes

- The tab performs significant client-side calculation, but the canonical stored values still live in `teacherTariff`.
- There is a known ecosystem mismatch around some package/discount fields in other public-facing schema files; the teacher tariff model is the authoritative source for this tab’s saved data.

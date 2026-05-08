# Cancellation + Refund Consistency Implementation

## Scope

This implementation covers:

1. Showing cancellation actor and cancellation timestamp in all required panels.
2. Normalizing refunded lesson status display to **Refunded** across Student, Instructor, and Admin panels.
3. Improving student refund UX with direct list action + dedicated request form.
4. Making refund justification message mandatory and adding attachment support (PDF/images).
5. Blocking duplicate refund requests for the same lesson.
6. Syncing manual Stripe refunds to DSP statuses via webhook events.
7. Sending refund completion emails to Admin, Student, and Instructor.

## Backend Changes

### 1) Refund request schema and API contract

Updated refund request model and GraphQL schema to support mandatory message + optional attachments.

- Model updates in `server/src/models/refundRequest.model.js`:
  - Added `message` (required).
  - Added `attachments[]` with `url`, `fileName`, `mimeType`.
  - Added unique index on `{ bookingId, slotId }` to prevent duplicates.

- GraphQL updates in `server/src/graphql/typeDefs/refundRequest.typeDefs.js`:
  - Added `RefundAttachment` type and `RefundAttachmentInput`.
  - Updated mutation signature:
    - `requestRefund(bookingId, slotId, message, attachments)`
  - Added `message` and `attachments` fields to `RefundRequest`.

- Resolver updates in `server/src/graphql/resolvers/refundRequest.resolver.js`:
  - Enforced non-empty message.
  - Validated attachments to allow only:
    - `application/pdf`
    - `image/*`
  - Stored message + attachments in created request.
  - Added duplicate-key (`E11000`) handling to return user-friendly error.

### 2) Preserve cancellation metadata

Adjusted status update flows so changing a slot to `refund` does not overwrite original cancellation metadata.

- Updated:
  - `server/src/graphql/resolvers/studentBooking.resolver.js`
  - `server/src/graphql/resolvers/AdminBookingType.resolver.js`

Behavior now:

- `cancellationDate` and `cancelledBy` are set when status becomes `cancelled`.
- Transition to `refund` preserves prior canceller and cancellation time.

### 3) Stripe manual refund synchronization

Added webhook handling to synchronize manual Stripe refunds to DSP.

- Updated `server/src/routes/stripeWebhook.routes.js`:
  - Added handlers for:
    - `charge.refunded`
    - `refund.created`
    - `refund.updated`
  - Added `syncManualRefundFromStripe()` workflow:
    - finds booking/slot by payment intent
    - marks slot as refunded (`status = refund`, `paymentStatus = refunded`)
    - sets `refundAmount` and `refundedAt`
    - creates refund transaction if not already created (idempotency by `stripeRefundId`)
    - sends refund-completed notifications

### 4) Refund completion notifications

- Updated `server/src/utils/SendOtpEmail.js`:
  - Added new email type: `booking_refunded`.

- Triggered notification on admin-approved refund in:
  - `server/src/graphql/resolvers/refundRequest.resolver.js`

- Triggered notification on Stripe-manual refund sync in:
  - `server/src/routes/stripeWebhook.routes.js`

Recipients:

- Student
- Instructor
- Admin

## Frontend Changes

### 1) Student panel

#### Direct Request Refund action in cancelled list

- Updated `Frontend/src/components/BookingList.tsx`:
  - Added direct `Request Refund` button in Cancelled tab rows.
  - Button is enabled only when:
    - slot is still `cancelled` (not already refunded),
    - slot was paid,
    - lesson has not passed,
    - no existing request status exists (`pending`, `approved`, or `rejected`).

#### New status label and cancellation timestamp

- Updated `BookingList` display:
  - Slot `refund` now displays **Refunded**.
  - Added `Cancelled At` column in Cancelled tab.

#### Dedicated refund request form page

- Added page `Frontend/src/pages/private/student-dashboard/RefundRequestPage.tsx`.
  - Mandatory message field.
  - Upload support for PDF/images using existing S3 upload flow (`useFileUpload`).
  - Terms text included:
    - “Refund requests must be submitted directly through this platform...”

- Route added in `Frontend/src/routes/index.tsx`:
  - `/student-dashboard/refund-request`

- `Frontend/src/pages/private/student-dashboard/bookLesson.tsx`:
  - Wired direct list action to navigate to new refund form.
  - Loaded `getMyRefundRequests` and passed request status map to list for button gating.

- `Frontend/src/pages/private/student-dashboard/bookingDetails.tsx`:
  - Request refund action now redirects to dedicated refund form page.
  - Added cancellation info display in details:
    - cancelled by
    - cancelled at

### 2) Instructor panel

- Updated `Frontend/src/components/InstructorComponent/StudentBookingWInst.tsx`:
  - Status label changed from `Refund` to **Refunded**.
  - Added `Cancelled At` column in cancelled tab.
  - Added cancellation info in details modal.

### 3) Admin panel

- Updated `Frontend/src/components/AdminComponents/StudentBookingTable.tsx`:
  - `refund` status now displays **Refunded** (not Cancelled).
  - Added `Cancelled By` column in booking table.
  - Improved cancellation datetime formatting.
  - Added cancellation metadata in details modal.
  - Updated cancelled filter to include both `Cancelled` and `Refunded`.

- Updated `Frontend/src/graphql/Queries/AdminBookingShowcase.ts`:
  - Added `slots.cancelledBy` in admin booking query payload.

### 4) Admin refund request review visibility

- Updated `Frontend/src/pages/private/admin-dashboard/AdminRefundRequestsPage.tsx`:
  - Displays student message (justification reason).
  - Displays uploaded attachment links.

### 5) Frontend GraphQL mutation updates

- Updated `Frontend/src/graphql/mutations/refundRequest.ts`:
  - `REQUEST_REFUND` now sends message + attachments.
  - Added message/attachments fields to request query responses.

- Updated `Frontend/src/graphql/mutations/studentBooking.ts` duplicate refund mutation shape to match new API signature.

## Validation Notes

- Lint diagnostics were checked after edits.
- No blocking linter errors remain in changed files.
- Existing pre-existing warning about fast-refresh export style in admin component remains non-blocking.

## Functional Outcome

- Cancelled-by and cancellation time are now visible where required across Student, Instructor, and Admin views.
- Refunded lessons now display consistently as **Refunded** in all required panels.
- Student refund UX is simplified with a direct list action and dedicated form.
- Duplicate requests per lesson are blocked by both backend logic and database unique constraint.
- Manual Stripe refunds are now reflected in DSP booking/slot statuses through webhook synchronization.
- Refund completion notifications are sent to all relevant parties.

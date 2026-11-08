# Transactional email delivery

Drive Pilot uses the Resend HTTPS Email API and its existing durable MongoDB outbox. Email verification OTPs, sign-in codes, password resets, invitations and notifications continue through the same queue, retry, and deduplication workflow.

## Render backend and email worker

Configure the following as **server-side environment variables** on Render and on any separately deployed email worker:

```env
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM_ADDRESS=<sender@your-verified-domain>
EMAIL_FROM_NAME=Drive Pilot
EMAIL_REPLY_TO=<optional-reply-address>
EMAIL_MODE=test
EMAIL_TEST_RECIPIENT=<your-controlled-test-inbox>
EMAIL_REQUEST_TIMEOUT_MS=10000
```

Do not put `RESEND_API_KEY` into source control or a Vite / Vercel frontend environment. Remove the old `ELASTIC_EMAIL_API_KEY` variable after the Resend deployment is verified.

In `EMAIL_MODE=test`, the application sends every outbox message to the designated `EMAIL_TEST_RECIPIENT`, regardless of the intended user. Use test mode when first deploying to avoid sending real OTPs and reminders to users.

After verifying the sending domain in the Resend dashboard, testing email delivery, and confirming the sender address is authorized, switch to `EMAIL_MODE=production` to send to actual recipients. Email delivery must not use an unverified Gmail address as the `from` sender. Configure SPF/DKIM records as instructed by Resend for the domain you own.

Resend accepts both HTML and plain-text content. The existing OTP templates include the code and expiry without marketing links. The provider is called only from the email delivery worker; the API creates durable outbox events.

The adapter passes the outbox event ID as an `Idempotency-Key` to Resend. Resend deduplicates identical requests for 24 hours. The application retains its outbox, lease, retry and reconciliation logic; delivery cannot be guaranteed exactly once forever, particularly after the provider's idempotency retention expires.

`EMAIL_FROM` remains supported as a legacy fallback only when `EMAIL_FROM_ADDRESS` is empty.

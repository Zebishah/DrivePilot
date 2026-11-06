# Email delivery

## Current sender setup

DSP Marketplace sends transactional mail through the Elastic Email v4 HTTPS API and a durable MongoDB outbox. The current setup uses a verified personal Gmail address as the Elastic Email sender. The address is configured only in the server-side deployment secret store:

```text
EMAIL_PROVIDER=elasticemail
ELASTIC_EMAIL_API_KEY=<elastic-email-api-key>
EMAIL_FROM_ADDRESS=<verified-sender-address>
EMAIL_FROM_NAME=DSP Marketplace
EMAIL_REPLY_TO=<optional-reply-address>
```

The repository does not claim control of `gmail.com` DNS and does not configure SPF, DKIM, DMARC, or a custom bounce domain for that personal sender. Do not put the real address or API key in source control or frontend variables.

Until a DSP-owned domain is available, keep the Elastic Email sender verification in place and use `EMAIL_MODE=test` with `EMAIL_TEST_RECIPIENT` for controlled testing. Switch to production recipients only after the provider account and sender are intentionally configured.

`EMAIL_FROM` remains supported for older deployments, but new deployments should use `EMAIL_FROM_ADDRESS` and `EMAIL_FROM_NAME` so the sender name is consistently `DSP Marketplace`.

## OTP messages

Email verification and two-factor sign-in codes are sent through the same outbox and retry/deduplication path as other transactional mail. OTP messages contain only DSP Marketplace branding, the six-digit code, its ten-minute expiry, and a security note. They intentionally contain no dashboard links, calls to action, marketing copy, unsubscribe links, or notification-management links.

OTP messages include both HTML and plain-text bodies. Elastic Email open and click tracking is disabled per OTP message using the provider's transactional `Options` fields.

The API keeps OTPs one-time and time-limited. Resends have a one-minute per-email/type cooldown in addition to the GraphQL/IP rate limit, and expired OTP records are cleaned up by MongoDB's TTL index. Codes, tokens, API keys, and provider secrets are not written to application logs.

## Future custom-domain setup

When DSP Marketplace owns a sending domain, configure the domain in Elastic Email and publish the exact SPF, DKIM, DMARC, and custom bounce-domain records supplied by Elastic Email. Then change `EMAIL_FROM_ADDRESS` to an address on that owned domain, verify a controlled production recipient flow, and document the provider's final authentication state. No custom-domain authentication is assumed until those steps are completed.

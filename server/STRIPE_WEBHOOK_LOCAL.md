# Stripe Webhooks for Local Development (Stripe CLI)

Use the Stripe CLI to forward webhooks to your local server and get a signing secret.

## 1. Install Stripe CLI

**Linux (e.g. Ubuntu):**
```bash
# Download and install (see https://stripe.com/docs/stripe-cli#install)
curl -s https://packages.stripe.com/api/v1/packages/stripe-cli-linux-x64/tarball | tar -xz
sudo mv stripe /usr/local/bin
```

**macOS (Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Or download from:** https://stripe.com/docs/stripe-cli#install

## 2. Log in to your Stripe account (sandbox)

```bash
stripe login
```

This opens the browser to link the CLI to your Stripe account. Use the account that has your **sandbox** (CHF) and test keys.

## 3. Forward webhooks to your local server

Start your **server** first (e.g. `pnpm run dev` in the server folder so it listens on port 4000).

Then in a **separate terminal** run:

```bash
stripe listen --forward-to http://localhost:4000/webhooks/stripe
```

You should see something like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. Use the secret in your .env

Copy the `whsec_...` value and set it in `server/.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Restart your server so it picks up the new env var.

## 5. Trigger test events (optional)

In another terminal you can send test events:

```bash
stripe trigger payment_intent.succeeded
stripe trigger account.updated
```

Your local server will receive these at `http://localhost:4000/webhooks/stripe` and the signature will validate with the `whsec_...` from `stripe listen`.

## Notes

- Keep `stripe listen` running while you develop; when you stop it, the same secret may be reused after next `stripe listen`, or a new one may be shown (update `.env` if it changes).
- For **live** environment later, create a real webhook endpoint in Stripe Dashboard (with your HTTPS URL) and use that endpoint’s signing secret in production `.env`.

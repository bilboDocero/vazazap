# Stripe Integration Status & Next Steps

## Values to Replace

The following values are configured dynamically in the application code.

**Files containing placeholders:**
- [server/stripe.js](server/stripe.js)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | payment | Set to "payment" for one-time charges or "subscription" for recurring billing. |
| success_url | `http://localhost:5173/#/status?session_id={CHECKOUT_SESSION_ID}` | Your actual post-payment success page URL. Keep the `{CHECKOUT_SESSION_ID}` template. |
| cancel_url | `http://localhost:5173/#/status` | Your actual cancel/return page URL. |
| line_items[].price_data | Dynamic BRL price calculation (`amountCents`) | Dynamic in-code calculation in BRL or custom Stripe Price IDs from Dashboard. |

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly.

**Files containing these parameters:**
- [server/stripe.js](server/stripe.js)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection | { "enabled": false } |
| automatic_tax | { "enabled": false } |
| allow_promotion_codes | false |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Setup and Next Steps

### 1. Environment Variables & API Keys
Configure the following variables in your `.env` file:
```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_... for production)
STRIPE_WEBHOOK_SECRET=whsec_...
```
- For development and local testing before compliance verification, use test keys (`sk_test_...` and `pk_test_...`) from [Stripe Dashboard API Keys](https://dashboard.stripe.com/apikeys).
- In production, ensure your live account has completed document verification and activated `card_payments`.

### 2. How the Integration Works
1. **Initiation**: The customer selects the Status or Vitrine plan and completes content editing.
2. **Checkout Session Creation**: Clicking Apple Pay, Google Pay, or Digital Wallet invokes `/api/payment/create`, which creates a Stripe Checkout Session with `ui_mode: 'hosted_page'`.
3. **Redirection & Authorization**: The customer is redirected to the Stripe hosted page where Apple Pay (iOS/macOS Safari), Google Pay (Android/Chrome), Link, and Card are displayed.
4. **Fulfillment**: Once authorized, Stripe redirects back to `success_url` with `{CHECKOUT_SESSION_ID}`. The application verifies the session status and marks the story as published in Supabase and IndexedDB.
5. **Webhook**: The endpoint `POST /api/webhook/stripe` verifies `payment_intent.succeeded` as asynchronous redundancy.

### 3. Testing and Test Cards
- In test mode (`sk_test_...`), use official Stripe test cards:
  - Card number: `4242 4242 4242 4242`
  - Expiry: Any future date (e.g. `12/28`)
  - CVC: Any 3 digits (e.g. `123`)
  - Postal Code: Any 5-8 digits (e.g. `01001-000`)

### 4. Resources
- Support: https://support.stripe.com
- Stripe Developer Documentation: https://docs.stripe.com/mcp
- Dynamic Payment Methods: https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods

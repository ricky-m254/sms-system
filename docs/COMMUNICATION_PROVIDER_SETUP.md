# Communication Provider Setup (Placeholder-First)

This project is configured to run Communication module features without paid provider keys.
Email, SMS, and WhatsApp can run in placeholder/local mode for development.

## Current Runtime Behavior

- Email:
  - Uses Django `send_mail`.
  - Works with console backend or SMTP if configured.
- SMS:
  - Uses placeholder transport when `COMMUNICATION_SMS_API_KEY` is empty.
  - Records are still stored and marked as sent for workflow testing.
- WhatsApp:
  - Uses placeholder transport when `COMMUNICATION_WHATSAPP_API_KEY` is empty.
  - Delivered through the same SMS gateway model with `channel=WhatsApp`.

## Environment Variables

Set in backend environment (or `.env` if used by your runtime):

```env
COMMUNICATION_SMS_API_KEY=
COMMUNICATION_WHATSAPP_API_KEY=
COMMUNICATION_PUSH_SERVER_KEY=
COMMUNICATION_WEBHOOK_TOKEN=
COMMUNICATION_WEBHOOK_SHARED_SECRET=
COMMUNICATION_WEBHOOK_REQUIRE_TIMESTAMP=true
COMMUNICATION_WEBHOOK_MAX_AGE_SECONDS=300
COMMUNICATION_WEBHOOK_STRICT_MODE=true
```

Optional production SMTP variables (example):

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=your-user
EMAIL_HOST_PASSWORD=your-password
DEFAULT_FROM_EMAIL=noreply@your-school-domain
```

## Frontend Settings Placeholders

Use Settings -> Communication to store operational config values for admins:
- `emailProvider`
- `emailFromAddress`
- `smsProvider`
- `smsApiKey`
- `whatsappProvider`
- `whatsappApiKey`

These are UI-level settings for operations. Real provider secrets must still be injected via backend environment.

## Finance Placeholder Alignment

Finance is aligned to the same pattern:
- `paymentGatewayProvider` default is `placeholder`.
- `paymentGatewayApiKey` can remain blank until production rollout.

Use backend env keys for production gateway integrations; do not rely on browser-stored values for secrets.

## Production Cutover Checklist

1. Add real provider keys to backend environment.
2. Switch provider mode in admin settings from `placeholder` to the selected provider.
3. Validate with test recipients (email/SMS/WhatsApp).
4. Enable delivery monitoring in `/api/communication/analytics/*`.
5. Keep fallback/placeholder path available for non-production environments.

## Webhook Endpoints (Hardening Phase)

Provider callbacks can update delivery state asynchronously:

- `POST /api/communication/webhooks/email/`
  - payload: `provider_id`, `status`, optional `reason`
- `POST /api/communication/webhooks/sms/`
  - payload: `provider_id`, `status`, optional `reason`

Verification headers (at least one configured method must pass):
- Token mode:
  - Header: `X-Webhook-Token: <COMMUNICATION_WEBHOOK_TOKEN>`
- Signature mode (HMAC SHA-256 over raw request body):
  - Header: `X-Webhook-Signature: <hex>` or `sha256=<hex>`
  - Secret: `COMMUNICATION_WEBHOOK_SHARED_SECRET`

Strict mode:
- `COMMUNICATION_WEBHOOK_STRICT_MODE=true` (recommended): reject all callbacks unless token/signature verification passes.
- `COMMUNICATION_WEBHOOK_STRICT_MODE=false` (development only): allows callbacks only when verification is not configured; invalid provided token/signature is still rejected.

Supported status values:
- Email: `Sent`, `Delivered`, `Opened`, `Clicked`, `Bounced`, `Failed`
- SMS: `Sent`, `Delivered`, `Failed`

## Push Notification Placeholder

Push is now supported with placeholder mode:

- Device registration:
  - `GET/POST /api/communication/push/devices/`
- Admin send:
  - `POST /api/communication/push/send/`
- Logs:
  - `GET /api/communication/push/`

If `COMMUNICATION_PUSH_SERVER_KEY` is missing, push send still succeeds in placeholder mode with simulated provider IDs.

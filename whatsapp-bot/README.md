# WhatsApp Bot

Phase 3 is implemented as backend webhook routes:

- `GET /whatsapp/webhook`: Meta webhook verification.
- `POST /whatsapp/webhook`: inbound WhatsApp message processor.

The bot writes directly to the existing six-table PostgreSQL schema through the backend.

## Environment

For local testing, no Meta credentials are required. The API returns the reply text in the HTTP response.

For Meta Cloud API delivery, configure these values in `.env`:

```bash
WHATSAPP_VERIFY_TOKEN=agritech_v4v_verify_token
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v20.0
```

## Local Conversation Test

Start the database and backend first:

```bash
bash scripts/start-postgres.sh
cd backend
npm start
```

Stop any older backend first with `Ctrl+C`. Source changes are only loaded after
the backend is restarted. Confirm the current server before testing:

```bash
curl http://localhost:4000/health
```

Use a second terminal for webhook tests.

### Webhook Verification

```bash
curl "http://localhost:4000/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=agritech_v4v_verify_token&hub.challenge=phase3-ok"
```

Expected response:

```text
phase3-ok
```

### Registration Flow

Send one message at a time with the same `from` phone number:

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"REGISTER"}'
```

Then continue with:

```text
Phase Three Farmer
+2348100888000
SHF
Female
Chikun
YES
```

Expected final response includes:

```text
Registration complete. Your V4V ID is USR_...
```

### Listing Flow

After registration, send:

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"POST"}'
```

Then continue with:

```text
SELL
Crop
Maize
5
Bags
47000
```

Expected final response includes:

```text
Listing created: PST_...
```

## Meta Payload Shape

The webhook also accepts the standard Meta Cloud API message shape under:

```text
entry[0].changes[0].value.messages[0]
```

Text messages and interactive button/list replies are supported for the POC flow.
The NDPC consent prompt is delivered as YES/NO reply buttons when Meta credentials
are configured.

## Live Meta Setup

Local tests require no external service. To receive and send real WhatsApp
messages, you must complete these steps outside the repository:

1. Create or select a Meta developer app and add the WhatsApp product.
2. Add a WhatsApp Business phone number and obtain its Phone Number ID.
3. Create a suitable access token and add it and the Phone Number ID to `.env`.
4. Expose this API over public HTTPS. For development, use a tunnel; for
   production, deploy the backend to a public host.
5. Set Meta's callback URL to `https://YOUR_PUBLIC_HOST/whatsapp/webhook`, enter
   the same verify token used in `.env`, and subscribe to the `messages` webhook.
6. Restart the backend after changing `.env`, then complete Meta's webhook
   verification and send a test message.

Do not commit `.env` or access tokens. Meta test tokens expire; production should
use a system-user token and a deployed HTTPS endpoint.

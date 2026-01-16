# Telegram Bot Webhook Setup Guide

This document explains how to configure and troubleshoot the Telegram bot webhook for FastPay.

## Overview

The bot webhook system allows Telegram to push updates (messages, callbacks, payments) directly to your backend server instead of polling the Bot API. This is required for the bot to respond to `/start` and other commands.

## Current Configuration

- **Webhook Base URL**: `https://fastpayai.onrender.com`
- **Webhook Endpoint**: `/bot/{botToken}/webhook`
- **Full Example**: `https://fastpayai.onrender.com/bot/123456:ABC.../webhook`

## Setup Steps

### 1. Get a Telegram Bot Token

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Choose a name for your bot (e.g., "FastPay Shop")
4. Choose a username (e.g., `fastpay_shop_bot`)
5. Copy the bot token provided (format: `123456:ABC...`)

### 2. Add Bot Token to .env

Edit `/backend/.env` and add:

```bash
BOT_TOKEN=your_bot_token_here
```

Example:
```bash
BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh
```

### 3. Restart the Backend Server

```bash
# Stop the running server (Ctrl+C)
# Then restart it
npm start
```

You should see in the startup logs:
```
  BOT_TOKEN: ✅ Set
```

### 4. Set Up Webhook via Admin API

Send a POST request to the webhook setup endpoint:

```bash
curl -X POST https://fastpayai.onrender.com/admin/bot/setup-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{}'
```

Success response:
```json
{
  "success": true,
  "message": "Webhook configured successfully",
  "webhookUrl": "https://fastpayai.onrender.com/bot/123456:ABC.../webhook",
  "secretTokenPreview": "a1b2c3d4..."
}
```

### 5. Verify Webhook Status

Check the webhook configuration:

```bash
curl https://fastpayai.onrender.com/admin/bot/webhook-status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Success response:
```json
{
  "success": true,
  "configured": true,
  "webhookInfo": {
    "url": "https://fastpayai.onrender.com/bot/123456:ABC.../webhook",
    "pendingUpdateCount": 0,
    "lastErrorDate": null,
    "lastErrorMessage": null,
    "allowedUpdates": ["message", "callback_query", "pre_checkout_query", "successful_payment"]
  }
}
```

## Testing the Bot

### Via Telegram App

1. Find your bot in Telegram using the username you created
2. Send `/start` command
3. You should receive the welcome message

### Via Telegram Bot API

Send a test webhook update:

```bash
BOT_TOKEN="your_token_here"
WEBHOOK_SECRET="secret_token_from_setup"

curl -X POST https://fastpayai.onrender.com/bot/$BOT_TOKEN/webhook \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $WEBHOOK_SECRET" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "date": 1673000000,
      "chat": {
        "id": -1001234567890,
        "type": "private"
      },
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "Test"
      },
      "text": "/start"
    }
  }'
```

Response should be:
```json
{"ok": true}
```

## Troubleshooting

### Problem: Bot doesn't respond to /start

**Possible causes:**

1. **BOT_TOKEN not set** in .env
   - Check: `echo $BOT_TOKEN`
   - Fix: Add token to .env and restart server

2. **Webhook not configured in Telegram**
   - Check: Call `/admin/bot/webhook-status` endpoint
   - Fix: Call `/admin/bot/setup-webhook` endpoint

3. **Wrong webhook URL**
   - Check: Webhook status should show correct URL
   - Verify: URL matches `{WEBHOOK_BASE_URL}/bot/{botToken}/webhook`

4. **Server not accessible**
   - Check: Can you reach `https://fastpayai.onrender.com` from your browser?
   - Verify: Render deployment is running

5. **Pending updates**
   - Check: `webhookInfo.pendingUpdateCount` in status
   - Fix: Delete and re-setup webhook to drop pending updates

### Problem: "Bot token not configured"

This means the tenant's `botToken` field is null in MongoDB.

**Fix:**

1. Check if BOT_TOKEN is set in .env
2. Restart backend - it should sync to default tenant
3. If still failing, manually update the tenant:

```bash
# In MongoDB
db.tenants.updateOne(
  { id: "fastpay" },
  { $set: { botToken: "your_token_here" } }
)
```

### Problem: "Invalid webhook secret token"

The X-Telegram-Bot-Api-Secret-Token header doesn't match.

**Fix:**

1. Re-setup the webhook to generate new secret
2. Make sure you're using the exact secret from setup response
3. Verify the secret is stored in `paymentConfig.webhookSecret`

### Problem: "lastErrorMessage" in webhook status

Telegram couldn't reach your webhook URL.

**Possible causes:**
- Server is down or restarting
- URL is incorrect
- Render deployment is not running
- Network firewall issue

**Fix:**
1. Check Render deployment status
2. Verify `WEBHOOK_BASE_URL` environment variable
3. Test connectivity: `curl https://fastpayai.onrender.com/health`

## How It Works

1. **User sends /start** → Telegram forwards update to webhook URL
2. **Webhook handler receives update** → `/bot/{botToken}/webhook` endpoint
3. **Handler extracts tenant from botToken** → Looks up tenant in database
4. **Validates secret token** → Prevents unauthorized requests
5. **Processes message** → Routes to appropriate handler (/start, /orders, etc.)
6. **Sends response** → Uses Telegram Bot API to send messages back

## Architecture

```
Telegram User
    ↓
    │ /start command
    ↓
Telegram Bot API
    ↓
    │ POST /bot/{token}/webhook
    ↓
FastPay Backend (Render)
    ↓
    │ botWebhookHandler.ts
    ├─ Verify secret token
    ├─ Resolve tenant by token
    ├─ Handle message type
    └─ Send response via Bot API
```

## Security

- **Secret Token**: Randomly generated 32-byte hex string
- **Token Validation**: Every webhook request must include correct `X-Telegram-Bot-Api-Secret-Token` header
- **HTTPS Only**: All communication is encrypted (required by Telegram)
- **Rate Limiting**: Webhook endpoint respects rate limits

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| BOT_TOKEN | Yes | Telegram bot token from @BotFather |
| WEBHOOK_BASE_URL | No | Base URL for webhook (default: https://fastpayai.onrender.com) |
| DEFAULT_TENANT_ID | No | Default tenant ID for bot (default: fastpay) |

## Admin Endpoints

All endpoints require valid admin authentication token.

### GET /admin/bot/webhook-status
Check webhook configuration and status

### POST /admin/bot/setup-webhook
Configure webhook with Telegram API

### DELETE /admin/bot/webhook
Remove webhook configuration

## Webhook Handler Structure

Located in: `backend/src/botWebhookHandler.ts`

Key functions:
- `processUpdate()` - Route incoming updates
- `handleMessage()` - Process text messages (/start, /orders, /help)
- `handleCallbackQuery()` - Process button clicks
- `handlePreCheckoutQuery()` - Validate purchases
- `handleSuccessfulPayment()` - Process completed payments

## Related Files

- `backend/src/botWebhookHandler.ts` - Webhook handler and message processors
- `backend/src/routes/index.ts` - Route registration
- `backend/src/routes/admin.ts` - Admin webhook management endpoints
- `backend/src/server-mock.ts` - Server startup and logging
- `backend/.env` - Environment configuration

## Support

For issues:
1. Check the Render logs
2. Verify webhook status via admin endpoint
3. Test manually via curl
4. Check Telegram Bot API documentation: https://core.telegram.org/bots/api

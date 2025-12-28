# CryptoBot Integration - Final Configuration

## Quick Setup

### 1. Get CryptoBot Token

1. Open @CryptoBot in Telegram
2. Send `/pay` command
3. Create new application (or use existing)
4. Copy API token (format: `12345:ABCDEFghijklmnop...`)

### 2. Configure on Render

1. Open Render Dashboard → Your Backend Service → Environment
2. Add/Update variable:
   - Name: `CRYPTOBOT_TOKEN`
   - Value: your token (NO quotes, NO spaces)
3. Click **Save Changes**
4. Wait for automatic redeploy (2-3 minutes)

### 3. Verify Configuration

Open in browser:
```
https://your-backend-url.onrender.com/payment/test-cryptobot
```

Expected response:
```json
{
  "success": true,
  "configured": true,
  "bot_info": {
    "app_id": 12345,
    "name": "Your App Name",
    "payment_processing_bot_username": "CryptoBot"
  }
}
```

### 4. Configure Webhook

1. Open @CryptoBot → Crypto Pay → Your App → Settings
2. Set Webhook URL:
```
https://your-backend-url.onrender.com/payment/webhook
```

## Troubleshooting

### "CRYPTOBOT_TOKEN not configured"

Token is missing or empty. Check:
- Variable name is exactly `CRYPTOBOT_TOKEN`
- Value is set without quotes
- Service was redeployed after adding variable

### "Invalid character in header content"

Token contains invalid characters. The code now auto-cleans tokens, but to be safe:
- Remove any quotes around the token
- Remove any spaces before/after token
- Ensure no newlines in the value

### Payment fails on mobile

Check that `FRONTEND_URL` is set correctly in Render environment.

## Security Notes

- **NEVER** commit tokens to repository
- Tokens should only be in environment variables
- Webhook signature verification is enabled for security

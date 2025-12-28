# Mobile Payment Fix

## Problem

Payment via CryptoBot worked on desktop but not on mobile devices.

## Cause

The frontend was using an incorrect hardcoded fallback URL for the backend API.

## Solution

1. Fixed fallback URL in `frontend/src/lib/api.ts`
2. Added proper environment variable configuration

## Configuration

### On Vercel (Frontend)

1. Open project on Vercel → Settings → Environment Variables
2. Add variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```
3. Save and Redeploy

### On Render (Backend)

Ensure these variables are set:
```
CRYPTOBOT_TOKEN=<your_token>
CACTUSPAY_TOKEN=<your_token>
FRONTEND_URL=https://your-frontend-url.vercel.app
```

## Verification

1. Open your app URL on mobile
2. Select any product
3. Click "Buy"
4. Select cryptocurrency (TON or USDT)
5. Click "Proceed to payment"
6. CryptoBot payment window should open

## Files Changed

- `frontend/src/lib/api.ts` - fixed backend URL
- `frontend/src/app/checkout/page.tsx` - improved logging

## Why This Solves The Problem

1. **Correct URL** - hardcoded fallback now points to correct backend
2. **Environment variable** - can easily change URL without code changes
3. **Logging** - easier to diagnose issues in the future

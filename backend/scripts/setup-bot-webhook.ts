#!/usr/bin/env ts-node
/**
 * Bot Webhook Setup Utility
 *
 * This script helps configure Telegram bot webhooks for the FastPay platform.
 *
 * Usage:
 *   npx ts-node scripts/setup-bot-webhook.ts <botToken> [tenantId] [webhookUrl]
 *
 * Example:
 *   npx ts-node scripts/setup-bot-webhook.ts "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh" "fastpay"
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import crypto from 'crypto'

// Load environment variables
const envPath = path.join(__dirname, '../.env')
const envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf8'))

const args = process.argv.slice(2)
const botToken = args[0]
const tenantId = args[1] || process.env.DEFAULT_TENANT_ID || 'fastpay'
const webhookUrl = args[2] || process.env.WEBHOOK_BASE_URL || 'https://fastpayai.onrender.com'

if (!botToken) {
  console.error('❌ Bot token is required')
  console.error('Usage: npx ts-node scripts/setup-bot-webhook.ts <botToken> [tenantId] [webhookUrl]')
  process.exit(1)
}

// Validate bot token format
if (!botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
  console.error('❌ Invalid bot token format')
  console.error('Expected format: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh')
  process.exit(1)
}

async function setupWebhook() {
  try {
    console.log('🚀 Setting up Telegram bot webhook...')
    console.log('━'.repeat(60))
    console.log(`Bot Token: ${botToken.substring(0, 10)}...`)
    console.log(`Tenant ID: ${tenantId}`)
    console.log(`Webhook Base URL: ${webhookUrl}`)
    console.log('━'.repeat(60))

    // Step 1: Generate secret token
    const secretToken = crypto.randomBytes(32).toString('hex')
    console.log('\n✅ Generated webhook secret token')

    // Step 2: Construct full webhook URL
    const fullWebhookUrl = `${webhookUrl}/bot/${botToken}/webhook`
    console.log(`✅ Full webhook URL: ${fullWebhookUrl}`)

    // Step 3: Call Telegram API to set webhook
    console.log('\n🔄 Calling Telegram API to set webhook...')
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: fullWebhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment'],
        drop_pending_updates: false
      })
    })

    const result = await response.json() as { ok: boolean; description?: string; result?: any }

    if (!result.ok) {
      console.error('❌ Failed to set webhook in Telegram')
      console.error('Error:', result.description)
      process.exit(1)
    }

    console.log('✅ Webhook set successfully in Telegram API')

    // Step 4: Update .env file with BOT_TOKEN
    console.log('\n🔄 Updating .env file...')
    let envContent = fs.readFileSync(envPath, 'utf8')

    // Check if BOT_TOKEN exists
    if (envContent.includes('BOT_TOKEN=')) {
      envContent = envContent.replace(/BOT_TOKEN=.*/g, `BOT_TOKEN=${botToken}`)
      console.log('✅ Updated existing BOT_TOKEN')
    } else {
      envContent += `\n# Telegram Bot Token for WebApp validation and notifications\nBOT_TOKEN=${botToken}\n`
      console.log('✅ Added BOT_TOKEN to .env')
    }

    fs.writeFileSync(envPath, envContent, 'utf8')

    // Step 5: Print summary
    console.log('\n' + '━'.repeat(60))
    console.log('✅ SETUP COMPLETE!')
    console.log('━'.repeat(60))
    console.log('\n📋 Configuration Summary:')
    console.log(`  Bot Token: ${botToken.substring(0, 10)}...`)
    console.log(`  Webhook URL: ${fullWebhookUrl}`)
    console.log(`  Secret Token: ${secretToken.substring(0, 16)}...`)
    console.log(`  Tenant ID: ${tenantId}`)
    console.log('\n⚠️  IMPORTANT:')
    console.log('  1. Restart the backend server to load new BOT_TOKEN from .env')
    console.log('  2. The webhook secret token should be stored in the database')
    console.log('  3. If you need to test the webhook, use:')
    console.log(`     curl -X POST ${fullWebhookUrl} \\`)
    console.log(`       -H "Content-Type: application/json" \\`)
    console.log(`       -H "X-Telegram-Bot-Api-Secret-Token: ${secretToken}" \\`)
    console.log(`       -d '{"update_id": 1, "message": {"text": "/start"}}'`)
    console.log('\n' + '━'.repeat(60))

  } catch (error: any) {
    console.error('❌ Error during setup:', error.message)
    process.exit(1)
  }
}

setupWebhook()

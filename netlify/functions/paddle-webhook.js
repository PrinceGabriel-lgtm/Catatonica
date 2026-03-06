/**
 * Paddle webhook handler for Catatonica
 * 
 * This runs server-side with the Supabase SERVICE ROLE key.
 * Only this function can set is_premium / tier on a user.
 * Users cannot touch the subscriptions table directly.
 * 
 * Paddle sends webhooks for:
 *   - subscription.activated   → grant premium
 *   - subscription.updated     → update tier
 *   - subscription.cancelled   → revoke premium
 *   - subscription.past_due    → revoke premium
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase client with SERVICE ROLE key — never expose this to the frontend
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // NOT the anon key
);

// Verify the webhook actually came from Paddle
function verifyPaddleSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;

  // Paddle signature format: "ts=TIMESTAMP;h1=HASH"
  const parts = Object.fromEntries(
    signatureHeader.split(';').map(p => p.split('='))
  );

  if (!parts.ts || !parts.h1) return false;

  // Replay attack protection — reject webhooks older than 5 minutes
  const ts = parseInt(parts.ts, 10);
  if (Date.now() / 1000 - ts > 300) return false;

  const payload = `${parts.ts}:${rawBody}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(parts.h1, 'hex')
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify signature
  const isValid = verifyPaddleSignature(
    event.body,
    event.headers['paddle-signature'],
    process.env.PADDLE_WEBHOOK_SECRET
  );

  if (!isValid) {
    console.error('Invalid Paddle signature');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const eventType = payload.event_type;
  const data = payload.data;

  console.log('Paddle webhook received:', eventType);

  // Extract user ID from Paddle custom_data (set when creating checkout)
  const userId = data?.custom_data?.user_id;

  if (!userId) {
    console.error('No user_id in custom_data:', JSON.stringify(data));
    // Return 200 so Paddle doesn't retry — log for manual review
    return { statusCode: 200, body: 'No user_id, skipped' };
  }

  try {
    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.updated': {
        const priceId = data?.items?.[0]?.price?.id;
        // Map your Paddle price IDs to tiers
        const tier = priceId === process.env.PADDLE_PRICE_ORDER ? 'order' : 'deep';

        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            is_premium: true,
            tier,
            paddle_subscription_id: data.id,
            paddle_status: data.status,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
        console.log(`Granted premium (${tier}) to user ${userId}`);
        break;
      }

      case 'subscription.cancelled':
      case 'subscription.past_due': {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            is_premium: false,
            tier: null,
            paddle_status: data.status,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
        console.log(`Revoked premium for user ${userId}`);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    // Return 500 so Paddle retries
    return { statusCode: 500, body: 'Internal error' };
  }
};

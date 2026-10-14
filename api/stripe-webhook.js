// POST /api/stripe-webhook
//
// Verifies the Stripe-Signature header against the raw request body before
// trusting anything in it (fails closed with 400 on any mismatch or missing
// STRIPE_WEBHOOK_SECRET). On a verified checkout.session.completed event,
// records a fulfilment placeholder.
//
// IMPORTANT LIMITATION, stated plainly rather than hidden: Vercel Functions
// are stateless/ephemeral — there is no persistent filesystem or database
// here. The in-memory "processedEvents" set below only de-duplicates
// retries that land on the *same warm instance* within its lifetime; it is
// NOT durable idempotency. A real deployment needs persistent storage
// (e.g. a database or KV store) keyed on event.id before this can be
// trusted to never double-fulfil an order. No such storage has been
// configured, so this is a placeholder, not a finished fulfilment system.

const { verifyWebhookSignature } = require('./_lib/stripe');

// Disable Vercel's automatic JSON body parsing — signature verification
// needs the exact raw bytes Stripe signed.
module.exports.config = { api: { bodyParser: false } };

const processedEvents = new Set(); // best-effort, single-instance only — see note above

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: 'webhook_unavailable', message: 'STRIPE_WEBHOOK_SECRET is not configured.' });
  }

  const rawBody = await readRawBody(req);
  const signatureHeader = req.headers['stripe-signature'];

  const verification = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!verification.ok) {
    return res.status(400).json({ error: 'invalid_signature', message: verification.reason });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  if (processedEvents.has(event.id)) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  processedEvents.add(event.id);

  if (event.type === 'checkout.session.completed') {
    // Fulfilment placeholder: logs only. Replace with a real write to
    // persistent storage (order record, inventory decrement, confirmation
    // email) before this is relied on for real orders.
    console.log('[stripe-webhook] checkout.session.completed', {
      eventId: event.id,
      sessionId: event.data && event.data.object && event.data.object.id,
    });
  }

  return res.status(200).json({ received: true });
};

// GET /api/checkout-session?session_id=cs_test_...
//
// Used by checkout/success.html to verify a completed session server-side
// rather than trusting anything in the URL. Fails closed without
// STRIPE_SECRET_KEY, and never echoes back raw Stripe internals — only the
// minimal fields the success page needs.

const { retrieveCheckoutSession, requireSecretKey } = require('./_lib/stripe');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const sessionId = req.query && req.query.session_id;
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'invalid_request', message: 'A valid session_id is required.' });
  }

  if (!requireSecretKey()) {
    return res.status(503).json({ error: 'checkout_unavailable', message: 'Checkout is not yet configured on this deployment.' });
  }

  try {
    const session = await retrieveCheckoutSession(sessionId);
    return res.status(200).json({
      status: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details ? session.customer_details.email : null,
    });
  } catch (err) {
    return res.status(502).json({ error: 'stripe_error', message: err.message });
  }
};

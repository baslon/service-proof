import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Public and unauthenticated, unlike every other endpoint in this app - a
// prospective customer has no account yet, that's the entire point of
// this one.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { planId, interval } = req.body || {}
    if (!planId || !['monthly', 'annual'].includes(interval)) {
      return res.status(400).json({ error: 'A plan and billing interval are required' })
    }

    // The price actually charged is resolved here, server-side, from the
    // plans table - never trusted from the client. A modified request
    // could otherwise name any Stripe price ID and check out at a
    // different amount than the plan it claims to be.
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id, name, self_serve, stripe_price_id_monthly, stripe_price_id_annual')
      .eq('id', planId)
      .single()
    if (planError || !plan) {
      return res.status(400).json({ error: 'That plan does not exist' })
    }
    if (!plan.self_serve) {
      return res.status(400).json({ error: `${plan.name} isn't available for self-service checkout - please contact us.` })
    }

    const priceId = interval === 'annual' ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly
    if (!priceId) {
      return res.status(500).json({ error: `${plan.name} isn't ready for checkout yet - its Stripe price hasn't been configured.` })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/signup/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      // Prices are stored exclusive of VAT - this calculates and adds it
      // based on the customer's location rather than a flat rate baked in
      // here that would be wrong for a non-UK customer. Requires an
      // address, hence billing_address_collection below.
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      custom_fields: [
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Company name' },
          type: 'text',
        },
      ],
      metadata: { plan_id: plan.id },
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

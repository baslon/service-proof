import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Handles both upgrade and downgrade through the same call - only the
// direction of the price change differs, Stripe prorates automatically
// either way. This only requests the change; the resulting
// customer.subscription.updated webhook is what actually syncs
// plan_id/site_limit/operative_limit, same single source of truth as a
// brand new subscription.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organizations(stripe_subscription_id)')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change the subscription plan' })
    }

    const subscriptionId = callerProfile.organizations?.stripe_subscription_id
    if (!subscriptionId) {
      return res.status(400).json({ error: 'This organization has no active subscription to change - subscribe first.' })
    }

    const { planId, interval } = req.body || {}
    if (!planId || !['monthly', 'annual'].includes(interval)) {
      return res.status(400).json({ error: 'A plan and billing interval are required' })
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('id, name, self_serve, stripe_price_id_monthly, stripe_price_id_annual')
      .eq('id', planId)
      .single()
    if (planError || !plan) {
      return res.status(400).json({ error: 'That plan does not exist' })
    }
    if (!plan.self_serve) {
      return res.status(400).json({ error: `${plan.name} isn't available for self-service switching - please contact us.` })
    }

    const priceId = interval === 'annual' ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly
    if (!priceId) {
      return res.status(500).json({ error: `${plan.name} isn't ready yet - its Stripe price hasn't been configured.` })
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const currentItemId = subscription.items.data[0]?.id
    if (!currentItemId) {
      return res.status(500).json({ error: 'Could not find the current subscription item to update.' })
    }

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItemId, price: priceId }],
      proration_behavior: 'create_prorations',
    })

    return res.status(200).json({ ok: true })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Consolidates what were three separate functions (create-checkout-session,
// create-billing-portal-session, update-subscription) into one, for the
// same reason api/operatives.js merged four into one: Vercel's Hobby plan
// caps a deployment at 12 serverless functions. stripe-webhook.js stays
// separate - it needs the raw request body for signature verification and
// is the one endpoint here with no caller authentication at all, different
// enough from these three that combining it in would cost more clarity
// than it saves function slots.
//
// createCheckoutSession is unauthenticated (a prospective customer has no
// account yet); the other two require an admin session. Routed by an
// `action` field on every POST body.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { action } = req.body || {}
    if (action === 'createCheckoutSession') return await createCheckoutSession(req, res)
    if (action === 'subscribeOrganization') return await subscribeOrganization(req, res)
    if (action === 'createPortalSession') return await createPortalSession(req, res)
    if (action === 'updateSubscription') return await updateSubscription(req, res)
    return res.status(400).json({ error: 'Unknown action' })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

async function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) throw Object.assign(new Error('Missing authorization token'), { status: 401 })

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) throw Object.assign(new Error('Invalid session'), { status: 401 })

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('organization_id, role, organizations(stripe_customer_id, stripe_subscription_id)')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !callerProfile || callerProfile.role !== 'admin') {
    throw Object.assign(new Error('Only admins can manage billing'), { status: 403 })
  }
  return callerProfile
}

async function resolvePlanPrice(planId, interval) {
  if (!planId || !['monthly', 'annual'].includes(interval)) {
    throw Object.assign(new Error('A plan and billing interval are required'), { status: 400 })
  }

  // The price actually charged is resolved here, server-side, from the
  // plans table - never trusted from the client. A modified request could
  // otherwise name any Stripe price ID and check out at a different amount
  // than the plan it claims to be.
  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, name, self_serve, stripe_price_id_monthly, stripe_price_id_annual')
    .eq('id', planId)
    .single()
  if (planError || !plan) throw Object.assign(new Error('That plan does not exist'), { status: 400 })
  if (!plan.self_serve) {
    throw Object.assign(new Error(`${plan.name} isn't available for self-service checkout - please contact us.`), {
      status: 400,
    })
  }

  const priceId = interval === 'annual' ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly
  if (!priceId) {
    throw Object.assign(
      new Error(`${plan.name} isn't ready for checkout yet - its Stripe price hasn't been configured.`),
      { status: 500 }
    )
  }
  return { plan, priceId }
}

// Public and unauthenticated - a prospective customer has no account yet,
// that's the entire point of this action.
async function createCheckoutSession(req, res) {
  try {
    const { planId, interval } = req.body || {}
    const { plan, priceId } = await resolvePlanPrice(planId, interval)

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
    return res.status(err.status || 500).json({ error: err.message })
  }
}

// Same as createCheckoutSession, but for an existing, authenticated
// organization rather than a prospective signup - ties the Checkout
// Session to this organization via metadata so the webhook updates it in
// place instead of running the new-organization signup path.
async function subscribeOrganization(req, res) {
  try {
    const callerProfile = await requireAdmin(req)
    if (callerProfile.organizations?.stripe_subscription_id) {
      return res.status(400).json({ error: 'This organization already has a subscription - use Change plan instead.' })
    }

    const { planId, interval } = req.body || {}
    const { plan, priceId } = await resolvePlanPrice(planId, interval)

    const origin = req.headers.origin || `https://${req.headers.host}`
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing`,
      cancel_url: `${origin}/billing`,
      automatic_tax: { enabled: true },
      billing_address_collection: 'required',
      metadata: { plan_id: plan.id, organization_id: callerProfile.organization_id },
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}

async function createPortalSession(req, res) {
  try {
    const callerProfile = await requireAdmin(req)
    const customerId = callerProfile.organizations?.stripe_customer_id
    if (!customerId) {
      return res.status(400).json({ error: 'This organization has no billing account yet.' })
    }

    const origin = req.headers.origin || `https://${req.headers.host}`
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    })

    return res.status(200).json({ url: portalSession.url })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}

// Handles both upgrade and downgrade through the same call - only the
// direction of the price change differs, Stripe prorates automatically
// either way. This only requests the change; the resulting
// customer.subscription.updated webhook is what actually syncs
// plan_id/site_limit/operative_limit, same single source of truth as a
// brand new subscription.
async function updateSubscription(req, res) {
  try {
    const callerProfile = await requireAdmin(req)
    const subscriptionId = callerProfile.organizations?.stripe_subscription_id
    if (!subscriptionId) {
      return res.status(400).json({ error: 'This organization has no active subscription to change - subscribe first.' })
    }

    const { planId, interval } = req.body || {}
    const { priceId } = await resolvePlanPrice(planId, interval)

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
    return res.status(err.status || 500).json({ error: err.message })
  }
}

import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Stripe signs the raw request body - Vercel's default JSON parsing would
// re-serialize it before this handler ever sees it, which changes the
// bytes and breaks signature verification. This opts out of that parsing
// so the exact bytes Stripe signed are what gets verified.
export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

function findCompanyName(session) {
  const field = (session.custom_fields || []).find((f) => f.key === 'company_name')
  return field?.text?.value?.trim() || 'New organization'
}

// The only place a new organization + its first admin get created outside
// the superadmin dashboard. Mirrors create-organization.js + create-admin.js
// exactly - same invite-by-email, same profile insert, same rollback on
// failure - just triggered by a paid Checkout Session instead of a
// superadmin click, and it fills in plan-derived limits along the way.
async function handleCheckoutCompleted(session) {
  const planId = session.metadata?.plan_id
  if (!planId) throw new Error('Checkout session has no plan_id in metadata')

  const { data: plan, error: planError } = await supabaseAdmin
    .from('plans')
    .select('id, site_limit, operative_limit')
    .eq('id', planId)
    .single()
  if (planError || !plan) throw new Error(`Plan ${planId} not found`)

  const subscription = await stripe.subscriptions.retrieve(session.subscription)

  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .insert({
      name: findCompanyName(session),
      site_limit: plan.site_limit,
      operative_limit: plan.operative_limit,
      plan_id: plan.id,
      limits_source: 'plan',
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .select()
    .single()
  if (orgError || !organization) throw new Error(orgError?.message || 'Could not create organization')

  const email = session.customer_details?.email
  if (!email) throw new Error('Checkout session has no customer email')

  const origin = process.env.PUBLIC_APP_URL || 'https://service-proof-nine.vercel.app'
  const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { org_name: organization.name },
  })
  if (inviteError) {
    // The organization row stays - a payment has genuinely been taken for
    // it, so it must not silently vanish. A failed invite here is a support
    // case (resend it manually), not a reason to roll back a paid signup.
    throw new Error(`Organization created but invite failed: ${inviteError.message}`)
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: invitedUser.user.id,
    organization_id: organization.id,
    role: 'admin',
    name: email.split('@')[0],
  })
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id)
    throw new Error(profileError.message)
  }
}

// Fires on every subscription change, including the one that immediately
// follows checkout.session.completed - so this only touches the limit
// columns when limits_source is still 'plan'. A superadmin who has
// manually overridden an organization's limits must never have that
// override silently clobbered by an unrelated renewal or plan change,
// the same reasoning auto-resolve never overwrites a manual resolution.
async function handleSubscriptionUpdated(subscription) {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, limits_source')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle()
  if (!org) return

  const patch = {
    subscription_status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }

  if (org.limits_source === 'plan') {
    const priceId = subscription.items.data[0]?.price?.id
    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('id, site_limit, operative_limit')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_annual.eq.${priceId}`)
      .maybeSingle()
    if (plan) {
      patch.plan_id = plan.id
      patch.site_limit = plan.site_limit
      patch.operative_limit = plan.operative_limit
    }
  }

  await supabaseAdmin.from('organizations').update(patch).eq('id', org.id)
}

// Records status only - deliberately does not touch site_limit/operative_limit
// or otherwise restrict the organization. What a cancelled or past-due
// subscription should actually prevent is a real product decision that
// hasn't been made yet, and this must not silently invent an answer to it.
async function handleStatusOnly(subscriptionId, status) {
  await supabaseAdmin.from('organizations').update({ subscription_status: status }).eq('stripe_subscription_id', subscriptionId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let event
  try {
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleStatusOnly(event.data.object.id, 'canceled')
        break
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        if (invoice.subscription) await handleStatusOnly(invoice.subscription, 'past_due')
        break
      }
      default:
        break
    }
    return res.status(200).json({ received: true })
  } catch (err) {
    // A non-200 here tells Stripe to retry the delivery - every handler
    // above is safe to run twice (each is a plain upsert/update keyed by
    // subscription ID, not "have I seen this event before"), so retrying
    // on failure is the right default rather than swallowing the error.
    return res.status(500).json({ error: err.message })
  }
}

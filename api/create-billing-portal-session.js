import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

    // The caller's own organization is looked up server-side, same as
    // every other admin-facing endpoint - never trusted from the request,
    // so one org's admin can never open another org's billing portal.
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organizations(stripe_customer_id)')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can manage billing' })
    }

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
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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

    const { data: superadmin } = await supabaseAdmin
      .from('superadmins')
      .select('user_id')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (!superadmin) {
      return res.status(403).json({ error: 'Superadmin access required' })
    }

    const { organizationId, limitsSource } = req.body || {}
    if (!organizationId || !['plan', 'manual'].includes(limitsSource)) {
      return res.status(400).json({ error: 'A valid organization and limits source are required' })
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, plan_id, stripe_subscription_id')
      .eq('id', organizationId)
      .single()
    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' })
    }

    const patch = { limits_source: limitsSource }

    // Switching back to plan-controlled should reflect the plan's current
    // limits immediately, not sit on whatever manual numbers were last set
    // until an unrelated Stripe event happens to sync them.
    if (limitsSource === 'plan') {
      if (!org.stripe_subscription_id || !org.plan_id) {
        return res.status(400).json({ error: 'This organization has no subscription to defer to.' })
      }
      const { data: plan, error: planError } = await supabaseAdmin
        .from('plans')
        .select('site_limit, operative_limit')
        .eq('id', org.plan_id)
        .single()
      if (planError || !plan) {
        return res.status(500).json({ error: 'Could not load the subscribed plan.' })
      }
      patch.site_limit = plan.site_limit
      patch.operative_limit = plan.operative_limit
    }

    const { error } = await supabaseAdmin.from('organizations').update(patch).eq('id', organizationId)
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({
      limitsSource,
      siteLimit: patch.site_limit,
      operativeLimit: patch.operative_limit,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

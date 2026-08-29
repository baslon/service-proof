import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Consolidates what used to be eight separate functions (whoami,
// create-organization, create-admin, invite-operative, list-organizations,
// set-site-limit, set-operative-limit, set-limits-source) plus the new
// set-geofencing-enabled into one - same reasoning as api/operatives.js:
// Vercel's Hobby plan caps a deployment at 12 serverless functions, and
// this project was already sitting at exactly that before this feature's
// two new endpoints (this file's geofencing action, and api/geocode.js)
// would have pushed it to 14.
//
// Routed by an `action` field on every request, reads included - simpler
// than operatives.js's GET-for-list/POST-with-action split, since here
// there are two read actions (whoami, list-organizations), not one. Each
// branch below is still exactly the endpoint it used to be, just no
// longer paying for a function slot of its own.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { action, ...body } = req.body || {}

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

    // whoami answers even when the caller isn't a superadmin - it's how the
    // UI finds that out in the first place, not an action a superadmin
    // performs on something.
    if (action === 'whoami') {
      return res.status(200).json({ isSuperadmin: !!superadmin })
    }

    if (!superadmin) {
      return res.status(403).json({ error: 'Superadmin access required' })
    }

    switch (action) {
      case 'list-organizations':
        return await listOrganizations(res)
      case 'create-organization':
        return await createOrganization(res, body)
      case 'create-admin':
        return await createAdmin(req, res, body)
      case 'invite-operative':
        return await inviteOperative(req, res, body)
      case 'set-site-limit':
        return await setSiteLimit(res, body)
      case 'set-operative-limit':
        return await setOperativeLimit(res, body)
      case 'set-limits-source':
        return await setLimitsSource(res, body)
      case 'set-geofencing-enabled':
        return await setGeofencingEnabled(res, body)
      default:
        return res.status(400).json({ error: 'Unknown action' })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

async function listOrganizations(res) {
  const { data: organizations, error } = await supabaseAdmin
    .from('organizations')
    .select(
      'id, name, created_at, site_limit, operative_limit, limits_source, stripe_subscription_id, plan_id, plans(name), geofencing_enabled'
    )
    .order('name')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ organizations })
}

async function createOrganization(res, { name }) {
  if (!name) {
    return res.status(400).json({ error: 'Organization name is required' })
  }

  const { data: organization, error } = await supabaseAdmin.from('organizations').insert({ name }).select().single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ organization })
}

async function createAdmin(req, res, { organizationId, name, email }) {
  if (!organizationId || !name || !email) {
    return res.status(400).json({ error: 'Organization, name and email are required' })
  }

  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    return res.status(400).json({ error: 'That organization does not exist' })
  }

  const origin = req.headers.origin || `https://${req.headers.host}`
  const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { org_name: organization.name },
  })

  if (inviteError) {
    const alreadyExists = /already.*(registered|exists)/i.test(inviteError.message || '')
    return res.status(500).json({
      error: alreadyExists
        ? 'That email already has an account. Use a different email, or remove the existing account first.'
        : inviteError.message,
    })
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: invitedUser.user.id,
    organization_id: organizationId,
    role: 'admin',
    name,
  })

  if (profileError) {
    // Roll back the Auth account rather than leaving a dangling invite with
    // no profile - an "authenticated but unrecognized" dead end if they
    // ever click their invite link.
    await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id)
    return res.status(500).json({ error: profileError.message })
  }

  return res.status(200).json({ adminId: invitedUser.user.id })
}

async function inviteOperative(req, res, { organizationId, name, email }) {
  if (!organizationId || !name || !email) {
    return res.status(400).json({ error: 'Organization, name and email are required' })
  }

  const { data: organization, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  if (orgError || !organization) {
    return res.status(400).json({ error: 'That organization does not exist' })
  }

  const { data: operative, error: operativeError } = await supabaseAdmin
    .from('operatives')
    .insert({
      organization_id: organizationId,
      name,
      invite_status: 'invited',
      invited_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (operativeError) {
    return res.status(500).json({ error: operativeError.message })
  }

  const origin = req.headers.origin || `https://${req.headers.host}`
  const { data: invitedUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/set-password`,
    data: { org_name: organization.name },
  })

  if (inviteError) {
    await supabaseAdmin.from('operatives').delete().eq('id', operative.id)
    const alreadyExists = /already.*(registered|exists)/i.test(inviteError.message || '')
    return res.status(500).json({
      error: alreadyExists
        ? 'That email already has an account. Use a different email, or remove the existing account first.'
        : inviteError.message,
    })
  }

  const { error: linkError } = await supabaseAdmin.from('profiles').insert({
    id: invitedUser.user.id,
    organization_id: organizationId,
    role: 'operative',
    name,
    operative_id: operative.id,
  })

  if (linkError) {
    await supabaseAdmin.auth.admin.deleteUser(invitedUser.user.id)
    await supabaseAdmin.from('operatives').delete().eq('id', operative.id)
    return res.status(500).json({ error: linkError.message })
  }

  return res.status(200).json({ operative })
}

async function setSiteLimit(res, { organizationId, siteLimit }) {
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization is required' })
  }

  // Blank/null clears the limit back to unlimited. Anything else must be a
  // whole number - the trigger already treats "at or over the limit"
  // correctly at 0, but a negative number would just make the org
  // uncreatable-into forever, which is never what's meant by a limit.
  let limitValue = null
  if (siteLimit !== null && siteLimit !== '' && siteLimit !== undefined) {
    limitValue = Number(siteLimit)
    if (!Number.isInteger(limitValue) || limitValue < 0) {
      return res.status(400).json({ error: 'Site limit must be a whole number of 0 or more.' })
    }
  }

  const { error } = await supabaseAdmin.from('organizations').update({ site_limit: limitValue }).eq('id', organizationId)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ siteLimit: limitValue })
}

async function setOperativeLimit(res, { organizationId, operativeLimit }) {
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization is required' })
  }

  let limitValue = null
  if (operativeLimit !== null && operativeLimit !== '' && operativeLimit !== undefined) {
    limitValue = Number(operativeLimit)
    if (!Number.isInteger(limitValue) || limitValue < 0) {
      return res.status(400).json({ error: 'Operative limit must be a whole number of 0 or more.' })
    }
  }

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ operative_limit: limitValue })
    .eq('id', organizationId)
  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ operativeLimit: limitValue })
}

async function setLimitsSource(res, { organizationId, limitsSource }) {
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
}

// Decision 6, docs/gps-geofencing-clock-in-scope.md: an operational
// kill-switch per organization, not another plan gate - geofencing is
// available on every tier (decision 5), this just lets it be paused for
// one org (e.g. sites that can't be geocoded reliably).
async function setGeofencingEnabled(res, { organizationId, geofencingEnabled }) {
  if (!organizationId || typeof geofencingEnabled !== 'boolean') {
    return res.status(400).json({ error: 'organizationId and a boolean geofencingEnabled are required' })
  }

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ geofencing_enabled: geofencingEnabled })
    .eq('id', organizationId)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ geofencingEnabled })
}

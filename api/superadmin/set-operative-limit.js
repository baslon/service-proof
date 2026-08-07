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

    const { organizationId, operativeLimit } = req.body || {}
    if (!organizationId) {
      return res.status(400).json({ error: 'Organization is required' })
    }

    // Blank/null clears the limit back to unlimited. Anything else must be
    // a whole number - the database enforces >= 0 isn't needed since the
    // trigger already treats "at or over the limit" correctly at 0, but a
    // negative number would just make the org uninvitable-into forever,
    // which is never what's meant by a limit.
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
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

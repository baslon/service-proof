import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Lets the superadmin UI decide upfront whether to show the dashboard or an
// access-denied message, rather than only discovering unauthorized on the
// first action. Each action endpoint still re-checks this independently -
// this is a convenience for the UI, not the actual authorization boundary.
export default async function handler(req, res) {
  try {
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

    return res.status(200).json({ isSuperadmin: !!superadmin })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

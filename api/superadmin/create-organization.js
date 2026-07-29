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

    const { name } = req.body || {}
    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' })
    }

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .insert({ name })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ organization })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

import { createClient } from '@supabase/supabase-js'

// Anon-keyed, not service_role: this endpoint doesn't touch any protected
// table, it only proxies to Google. The session check exists purely to
// stop the API key/quota being spammed by anyone who finds the URL, same
// reasoning as the language module's proposed /api/translate.js
// (docs/language-module-scope.md).
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Geocoding is not configured yet' })
  }

  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const { address, postcode } = req.body || {}
  if (!address) {
    return res.status(400).json({ error: 'address is required' })
  }

  const query = [address, postcode].filter(Boolean).join(', ')

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', query)
    url.searchParams.set('key', process.env.GOOGLE_MAPS_API_KEY)

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      // Not a 500 - "this address didn't geocode" is an expected outcome
      // (typo, incomplete address), not a server failure. The caller
      // treats this the same as a network error: proceed without
      // coordinates rather than blocking site creation on it.
      return res.status(200).json({ latitude: null, longitude: null })
    }

    const { lat, lng } = data.results[0].geometry.location
    return res.status(200).json({ latitude: lat, longitude: lng })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unexpected server error' })
  }
}

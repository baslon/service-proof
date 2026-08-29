// One-time backfill for docs/gps-geofencing-clock-in-scope.md: every site
// created before this feature shipped has no latitude/longitude, so its
// geofence check is silently skipped (record_attendance_event treats a
// site with no coordinates as "nothing to check against"). This finds
// every such site, geocodes its address via Google Maps, and writes the
// result back.
//
// Talks to Supabase directly with the service_role key (not through
// api/geocode.js, which is session-checked and meant for the browser) and
// to Google's Geocoding API directly (not through api/geocode.js either,
// since this runs standalone, outside any request with a user session).
//
// Run locally, not by Claude - needs secrets that aren't and shouldn't be
// available to it:
//   node --env-file=.env.local scripts/backfill-site-coordinates.mjs
// .env.local needs SUPABASE_SERVICE_ROLE_KEY and GOOGLE_MAPS_API_KEY added
// (VITE_SUPABASE_URL is already there) - neither should ever be prefixed
// VITE_ or shipped to the browser bundle.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GOOGLE_MAPS_API_KEY) {
  console.error('Missing VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GOOGLE_MAPS_API_KEY in the environment.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function geocode(address, postcode) {
  const query = [address, postcode].filter(Boolean).join(', ')
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', query)
  url.searchParams.set('key', GOOGLE_MAPS_API_KEY)

  const response = await fetch(url)
  const data = await response.json()
  if (data.status !== 'OK' || !data.results?.[0]) {
    return null
  }
  return data.results[0].geometry.location
}

const { data: sites, error } = await supabase
  .from('sites')
  .select('id, display_id, address, postcode')
  .is('latitude', null)

if (error) {
  console.error('Could not load sites:', error.message)
  process.exit(1)
}

console.log(`${sites.length} site(s) with no coordinates.`)

let succeeded = 0
let failed = 0

for (const site of sites) {
  const location = await geocode(site.address, site.postcode)
  if (!location) {
    console.warn(`  ${site.display_id}: could not geocode "${site.address}, ${site.postcode}" - left as-is.`)
    failed += 1
    continue
  }

  const { error: updateError } = await supabase
    .from('sites')
    .update({ latitude: location.lat, longitude: location.lng })
    .eq('id', site.id)

  if (updateError) {
    console.warn(`  ${site.display_id}: geocoded but failed to save - ${updateError.message}`)
    failed += 1
    continue
  }

  console.log(`  ${site.display_id}: ${location.lat}, ${location.lng}`)
  succeeded += 1

  // Google's free tier and standard rate limits are generous for this
  // volume, but a small pause keeps a large backlog from bursting the
  // per-second request cap.
  await new Promise((resolve) => setTimeout(resolve, 150))
}

console.log(`Done. ${succeeded} geocoded, ${failed} left without coordinates.`)

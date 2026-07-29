import { supabase } from './supabaseClient'

const BUCKET = 'job-photos'

export async function uploadPhoto(file, organizationId) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw new Error(error.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

// Recovers the object path from a public URL. Returns null for anything
// that isn't one of our stored objects - base64 data URLs left over from
// before photos moved to Storage, or any other external URL - so those are
// skipped rather than being passed to the storage API as junk paths.
function storagePathFromUrl(url) {
  if (typeof url !== 'string') return null
  const marker = `/${BUCKET}/`
  const start = url.indexOf(marker)
  if (start === -1) return null
  return url.slice(start + marker.length).split('?')[0] || null
}

// Deleting a job_photos row only forgets the photo - the file itself stays
// in the bucket, and since the bucket is public it stays readable at its
// original URL, so a "deleted" photo isn't deleted in any sense that
// matters. Always call this after the database change has succeeded: the
// reverse order risks removing a file that's still referenced.
//
// Best-effort by design. The user's action has already succeeded at this
// point, so a cleanup failure is an orphaned file to sweep up later, not
// something to fail their request over.
export async function removePhotoObjects(urls) {
  const paths = (urls || []).map(storagePathFromUrl).filter(Boolean)
  if (paths.length === 0) return

  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) {
    console.warn('Could not remove orphaned photo files from storage:', error.message)
  }
}

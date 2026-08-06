import { supabase } from './supabaseClient'

const BUCKET = 'job-videos'
const MAX_BYTES = 50 * 1024 * 1024
const MAX_DURATION_SECONDS = 30

// Reading duration this way (rather than trusting the file as-is) catches
// an oversized clip before it's uploaded, not after - a phone video can
// take a while to push over a job site's connection, so the check has to
// happen before that starts, not when the server rejects it afterward.
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const videoEl = document.createElement('video')
    videoEl.preload = 'metadata'
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(videoEl.duration)
    }
    videoEl.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read that video file.'))
    }
    videoEl.src = url
  })
}

export async function uploadVideo(file, organizationId) {
  if (file.size > MAX_BYTES) {
    throw new Error(`Video is too large - max ${Math.floor(MAX_BYTES / (1024 * 1024))}MB.`)
  }

  const duration = await readVideoDuration(file)
  if (duration > MAX_DURATION_SECONDS) {
    throw new Error(`Video is too long - max ${MAX_DURATION_SECONDS} seconds.`)
  }

  const ext = file.name.split('.').pop() || 'mp4'
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`

  // The bucket's own file_size_limit/allowed_mime_types (set in the
  // migration) enforce the real limit server-side - this check is purely
  // so a doomed upload never starts, not the source of truth for it.
  const { error } = await supabase.storage.from(BUCKET).upload(path, file)
  if (error) throw new Error(error.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
}

function storagePathFromUrl(url) {
  if (typeof url !== 'string') return null
  const marker = `/${BUCKET}/`
  const start = url.indexOf(marker)
  if (start === -1) return null
  return url.slice(start + marker.length).split('?')[0] || null
}

// Mirrors removePhotoObjects in uploadPhoto.js - same best-effort cleanup,
// same reasoning for why a failure here doesn't fail the caller's request.
export async function removeVideoObjects(urls) {
  const paths = (urls || []).map(storagePathFromUrl).filter(Boolean)
  if (paths.length === 0) return

  const { data, error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) {
    console.warn('Could not remove orphaned video files from storage:', error.message)
    return
  }
  if ((data || []).length < paths.length) {
    console.warn(
      `Storage removed ${(data || []).length} of ${paths.length} video file(s); the rest were not deleted.`
    )
  }
}

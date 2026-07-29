import { supabase } from './supabaseClient'

export async function uploadPhoto(file, organizationId) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${organizationId}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('job-photos').upload(path, file)
  if (error) throw new Error(error.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from('job-photos').getPublicUrl(path)
  return publicUrl
}

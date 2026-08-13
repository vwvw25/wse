'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface AvRider {
  id: string
  name: string
  file_path: string | null
  file_name: string | null
  file_size: number | null
  link_url: string | null
  created_at: string
}

const BUCKET = 'av-riders'

async function uploadRiderFile(
  supabase: ReturnType<typeof createServiceClient>,
  riderId: string,
  file: File,
): Promise<{ file_path: string; file_name: string; file_size: number }> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {})
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const filePath = `${riderId}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, bytes, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  return { file_path: filePath, file_name: file.name, file_size: file.size }
}

export async function createAvRider(formData: FormData) {
  const supabase = createServiceClient()
  const name = (formData.get('name') as string).trim()
  const linkUrl = (formData.get('link_url') as string)?.trim() || null
  const file = formData.get('file') as File | null

  const { data, error } = await supabase.from('av_riders').insert({ name, link_url: linkUrl }).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create rider')

  if (file && file.size > 0) {
    const meta = await uploadRiderFile(supabase, data.id, file)
    await supabase.from('av_riders').update(meta).eq('id', data.id)
  }
  revalidatePath('/admin/av-riders')
}

export async function updateAvRider(id: string, formData: FormData) {
  const supabase = createServiceClient()
  const name = (formData.get('name') as string).trim()
  const linkUrl = (formData.get('link_url') as string)?.trim() || null
  const file = formData.get('file') as File | null
  const removeFile = formData.get('remove_file') === '1'

  const update: Record<string, unknown> = { name, link_url: linkUrl }

  if (removeFile || (file && file.size > 0)) {
    const { data: existing } = await supabase.from('av_riders').select('file_path').eq('id', id).single()
    if (existing?.file_path) await supabase.storage.from(BUCKET).remove([existing.file_path]).catch(() => {})
    if (removeFile) {
      update.file_path = null
      update.file_name = null
      update.file_size = null
    } else if (file && file.size > 0) {
      Object.assign(update, await uploadRiderFile(supabase, id, file))
    }
  }

  await supabase.from('av_riders').update(update).eq('id', id)
  revalidatePath('/admin/av-riders')
}

export async function deleteAvRider(id: string) {
  const supabase = createServiceClient()
  const { data: existing } = await supabase.from('av_riders').select('file_path').eq('id', id).single()
  if (existing?.file_path) await supabase.storage.from(BUCKET).remove([existing.file_path]).catch(() => {})
  await supabase.from('av_riders').delete().eq('id', id)
  revalidatePath('/admin/av-riders')
}

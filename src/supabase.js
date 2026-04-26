import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify.')
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export async function dbGet(key) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return data.value
  } catch (e) {
    console.error('dbGet error', e)
    return null
  }
}

export async function dbSet(key, value) {
  if (!supabase) return
  try {
    await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch (e) {
    console.error('dbSet error', e)
  }
}

// ── FILE STORAGE ─────────────────────────────────────────
// Upload a receipt file, returns public URL or null
export async function uploadReceipt(file, path) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) { console.error('Upload error', error); return null }
    const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path)
    return urlData?.publicUrl || null
  } catch (e) {
    console.error('uploadReceipt error', e)
    return null
  }
}

// Delete a receipt file
export async function deleteReceipt(path) {
  if (!supabase) return
  try {
    await supabase.storage.from('receipts').remove([path])
  } catch (e) {
    console.error('deleteReceipt error', e)
  }
}

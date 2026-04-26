import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://miyeptckoozhvcbujxtu.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_EBoq1jrMueBa_PdTBW_PIQ_br98TATz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function dbGet(key) {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single()
    if (error || !data) return null
    return data.value
  } catch (e) {
    return null
  }
}

export async function dbSet(key, value) {
  try {
    await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  } catch (e) {}
}

export async function uploadReceipt(file, path) {
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

export async function deleteReceipt(path) {
  try {
    await supabase.storage.from('receipts').remove([path])
  } catch (e) {}
}

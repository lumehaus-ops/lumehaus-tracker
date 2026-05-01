import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://miyeptckoozhvcbujxtu.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_EBoq1jrMueBa_PdTBW_PIQ_br98TATz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Get a value - tries Supabase first, falls back to localStorage
export async function dbGet(key) {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('value')
      .eq('key', key)
      .single()
    if (!error && data) {
      // Sync to localStorage as backup
      try { localStorage.setItem(key, data.value); } catch(e) {}
      return data.value
    }
  } catch (e) {
    console.warn('Supabase read failed for', key, e)
  }
  // Fall back to localStorage
  try {
    const local = localStorage.getItem(key)
    if (local) return local
  } catch(e) {}
  return null
}

// Set a value - saves to BOTH Supabase and localStorage
export async function dbSet(key, value) {
  // Always save to localStorage first (instant, never fails)
  try { localStorage.setItem(key, value); } catch(e) {}
  
  // Then save to Supabase (cloud sync)
  try {
    const { error } = await supabase
      .from('app_data')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) {
      console.error('Supabase save failed for', key, error)
    }
  } catch (e) {
    console.error('Supabase save error for', key, e)
  }
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

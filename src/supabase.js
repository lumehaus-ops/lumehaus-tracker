import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function dbGet(key) {
  const { data, error } = await supabase
    .from('app_data')
    .select('value')
    .eq('key', key)
    .single()
  if (error || !data) return null
  return data.value
}

export async function dbSet(key, value) {
  await supabase
    .from('app_data')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}

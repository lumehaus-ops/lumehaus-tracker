import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://miyeptckoozhvcbujxtu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_EBoq1jrMueBa_PdTBW_PIQ_br98TATz'

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

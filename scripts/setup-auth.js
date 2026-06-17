#!/usr/bin/env node
// One-time script: creates Supabase Auth accounts for all Lumé Haus staff.
// Run once after deploying the RLS policy:
//   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/setup-auth.js
//
// Find your service role key at:
//   supabase.com → project → Settings → API → service_role (secret)

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://miyeptckoozhvcbujxtu.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var before running.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TEMP_PASSWORD = 'LumeHaus2025!'

const USERS = [
  { email: 'lumehaus@cornerstonemd.health',   name: 'Crystal-Dior',  role: 'admin'  },
  { email: 'lumehausmedspa@gmail.com',         name: 'Lauren Greene', role: 'staff'  },
  { email: 'hjbtampus@gmail.com',              name: 'Honey Tampus',  role: 'va'     },
  { email: 'lmoreaux@cornerstonemd.health',    name: 'Lauren M',      role: 'va'     },
  { email: 'michaeltampus1123@gmail.com',      name: 'Michael T',     role: 'va'     },
]

async function main() {
  console.log('Creating Lumé Haus Supabase Auth accounts…\n')
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:          u.email,
      password:       TEMP_PASSWORD,
      email_confirm:  true,          // skip email verification
      user_metadata:  { name: u.name, role: u.role },
    })
    if (error) {
      if (error.message?.includes('already been registered')) {
        console.log(`  SKIP  ${u.email} (already exists)`)
      } else {
        console.error(`  FAIL  ${u.email}: ${error.message}`)
      }
    } else {
      console.log(`  OK    ${u.email}  →  ${data.user.id}`)
    }
  }
  console.log('\nDone. All users should now be able to sign in with password: ' + TEMP_PASSWORD)
  console.log('Remind each person to change their password after first login.')
}

main().catch(err => { console.error(err); process.exit(1) })

# Lumé Haus Staff Tracker — Setup Guide

## You need to do 3 things:
1. Set up Supabase (free database)
2. Deploy to Netlify (free hosting)
3. Add your Supabase keys to Netlify

---

## STEP 1 — Supabase (database)

1. Go to **supabase.com** → sign up free
2. Click **"New Project"** → name it `lumehaus` → choose a password → Create
3. Wait ~1 minute for it to set up
4. Click **"SQL Editor"** in the left sidebar
5. Paste the contents of **SUPABASE_SETUP.sql** → click **Run**
6. Go to **Settings → API** → copy two things:
   - **Project URL** (looks like: https://abcxyz.supabase.co)
   - **anon public key** (long string starting with "eyJ...")
   - 📌 Save both — you'll need them in Step 3

---

## STEP 2 — GitHub + Netlify

1. Go to **github.com** → sign up free → click **New Repository**
2. Name it `lumehaus-tracker` → Create
3. Click **"uploading an existing file"**
4. Upload ALL files from this folder (except node_modules if present)
5. Click **Commit changes**

6. Go to **netlify.com** → sign up with GitHub
7. Click **"Add new site" → "Import an existing project" → GitHub**
8. Select your `lumehaus-tracker` repo
9. Build settings will auto-fill from netlify.toml — **don't change anything**
10. Click **Deploy site** — it will fail at first, that's OK

---

## STEP 3 — Add Supabase keys to Netlify

1. In Netlify, go to **Site Settings → Environment Variables**
2. Click **Add variable** → add these two:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | your Project URL from Step 1 |
   | `VITE_SUPABASE_ANON_KEY` | your anon key from Step 1 |

3. Go to **Deploys → Trigger deploy → Deploy site**
4. Wait ~60 seconds — your app is live! 🎉

---

## Default Login Credentials

| Person | Username | Password |
|--------|----------|----------|
| Admin (you) | `admin` | `LumeAdmin2025` |
| Lauren | `lauren` | `Lauren2025` |
| Emy | `emy` | `Emy2025` |
| Megan | `megan` | `Megan2025` |

Change all passwords after your first login under **Providers tab → Edit → Credentials**.

---

## How data works now
- All data saves to Supabase cloud database
- Every device sees the same data in real time
- Lauren logs a service on her phone → you see it instantly on your laptop
- Data persists month to month and never gets wiped

---

## Need help? 
Email: lumehaus@cornerstonemd.health

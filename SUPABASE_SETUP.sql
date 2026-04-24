-- Run this ONE TIME in your Supabase SQL Editor
-- supabase.com → your project → SQL Editor → paste this → Run

create table if not exists app_data (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Allow the app to read and write data (public anon access)
alter table app_data enable row level security;

create policy "Allow all operations" on app_data
  for all
  using (true)
  with check (true);

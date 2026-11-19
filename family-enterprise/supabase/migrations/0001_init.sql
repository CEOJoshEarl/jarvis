-- Family Enterprise: multi-tenant schema. Every row belongs to a family, and
-- row-level security keeps each family's data to its own members.

create extension if not exists pgcrypto;

-- ---------- Families and people ----------
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- "Earl" -> "The Earl Family Enterprise"
  timezone text not null default 'America/New_York',
  go_live date,
  rotation_start date,                      -- a Sunday
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  user_id uuid references auth.users on delete set null,   -- null for pets and not-yet-joined people
  key text not null,                        -- stable id used by the chore catalog ('josh', 'max', ...)
  name text not null,
  short text not null,
  color text not null,
  role text not null check (role in ('admin', 'member', 'pet')),
  invited_at timestamptz,
  joined_at timestamptz,                    -- set when setup is complete (Phase 5)
  unique (family_id, key)
);
create index on members (user_id);

-- Helpers used by every policy.
create or replace function my_family_ids() returns setof uuid
language sql stable security definer set search_path = public as
$$ select family_id from members where user_id = auth.uid() $$;

create or replace function is_family_admin(f uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from members where family_id = f and user_id = auth.uid() and role = 'admin') $$;

create or replace function my_member_id(f uuid) returns uuid
language sql stable security definer set search_path = public as
$$ select id from members where family_id = f and user_id = auth.uid() $$;

-- ---------- Plan settings ----------
create table tier_history (            -- a paying member's tier (Andrew's $500 / $700 / $1,000)
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  member_id uuid not null references members on delete cascade,
  tier int not null,
  starts_on date not null,
  unique (member_id, starts_on)
);

create table rotation_groups (
  family_id uuid not null references families on delete cascade,
  key text not null,                        -- 'kids3'
  member_keys text[] not null,              -- week-one order
  primary key (family_id, key)
);

create table chore_owner_overrides (      -- owners set by parents in the app; the chore catalog itself ships with the app
  family_id uuid not null references families on delete cascade,
  template_id text not null,
  member_keys text[] not null,
  primary key (family_id, template_id)
);

-- ---------- Tasks and proof ----------
create table submissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  instance_id text not null,
  member_id uuid not null references members,
  submitted_at timestamptz not null default now(),
  checked text[] not null default '{}',
  proof_path text,                          -- storage object in the 'proofs' bucket
  proof_type text check (proof_type in ('photo', 'video'))
);
create index on submissions (family_id, instance_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  instance_id text not null,
  reviewer_id uuid references members,      -- null = approved automatically at midnight
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  reviewed_at timestamptz not null default now()
);
create index on reviews (family_id, instance_id);

-- ---------- Penalties, fun account and rent (Phase 3) ----------
create table ledger (                      -- fines, payments into the family fun account, rent
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  member_id uuid not null references members,
  kind text not null check (kind in ('fine', 'fun_payment', 'rent_due', 'rent_paid', 'late_fee')),
  amount_cents int not null,
  note text,
  instance_id text,
  created_at timestamptz not null default now()
);

create table rent_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families on delete cascade,
  member_id uuid not null references members,
  amount_cents int not null,
  due_day int not null check (due_day between 1 and 28),
  grace_days int not null default 0,
  late_fee_cents int not null default 0,
  instructions text,                        -- how to pay (Zelle, Cash App, ...)
  active boolean not null default true
);

-- ---------- Push subscriptions (Phase 2) ----------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  lead_minutes int not null default 30,
  created_at timestamptz not null default now()
);

-- ---------- Row-level security ----------
do $$
declare t text;
begin
  foreach t in array array['families','members','tier_history','rotation_groups','chore_owner_overrides',
                           'submissions','reviews','ledger','rent_plans'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
alter table push_subscriptions enable row level security;

create policy "family reads" on families for select using (id in (select my_family_ids()));
create policy "admins edit family" on families for update using (is_family_admin(id));

do $$
declare t text;
begin
  foreach t in array array['members','tier_history','rotation_groups','chore_owner_overrides',
                           'submissions','reviews','ledger','rent_plans'] loop
    execute format('create policy "family reads" on %I for select using (family_id in (select my_family_ids()))', t);
  end loop;
  foreach t in array array['members','tier_history','rotation_groups','chore_owner_overrides','rent_plans','ledger'] loop
    execute format('create policy "admins write" on %I for all using (is_family_admin(family_id)) with check (is_family_admin(family_id))', t);
  end loop;
end $$;

-- People submit proof as themselves only.
create policy "submit own proof" on submissions for insert with check (member_id = my_member_id(family_id));
-- Parents review, but never their own submission.
create policy "admins review" on reviews for insert with check (
  is_family_admin(family_id) and reviewer_id = my_member_id(family_id)
  and not exists (
    select 1 from submissions s where s.family_id = reviews.family_id and s.instance_id = reviews.instance_id
      and s.member_id = reviews.reviewer_id and s.submitted_at = (
        select max(submitted_at) from submissions x where x.family_id = s.family_id and x.instance_id = s.instance_id)
  )
);
create policy "own push" on push_subscriptions for all
  using (member_id in (select id from members where user_id = auth.uid()))
  with check (member_id in (select id from members where user_id = auth.uid()));

-- ---------- Proof storage: private bucket, one folder per family ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 52428800, array['image/jpeg','image/png','image/heic','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

create policy "family reads proofs" on storage.objects for select
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] in (select my_family_ids()::text));
create policy "family uploads proofs" on storage.objects for insert
  with check (bucket_id = 'proofs' and (storage.foldername(name))[1] in (select my_family_ids()::text));

-- ---------- Proof retention: 14 days ----------
-- The nightly job (an Edge Function on a pg_cron schedule) deletes storage
-- objects older than this, then clears proof_path here.
create or replace function expired_proofs(days int default 14)
returns table (family_id uuid, proof_path text)
language sql stable set search_path = public as
$$ select family_id, proof_path from submissions
   where proof_path is not null and submitted_at < now() - make_interval(days => days) $$;

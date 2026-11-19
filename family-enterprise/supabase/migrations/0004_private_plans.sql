-- Andrew's plan and rent are private: parents and the member themselves only.
-- Siblings see a neutral chore level (1, 2, 3) so the app can work out who does which chore,
-- never the price, perks, rent status or late fees.

-- 1. The plan itself: private.
alter table tier_history rename to member_plans;
alter table member_plans add column level smallint check (level in (1, 2, 3));
alter table member_plans add column monthly_cents int;
update member_plans set level = case tier when 500 then 1 when 700 then 2 when 1000 then 3 end,
                        monthly_cents = tier * 100;
alter table member_plans alter column level set not null;
alter table member_plans drop column tier;

drop policy "family reads" on member_plans;
create policy "parents and self read plan" on member_plans for select
  using (private.is_family_admin(family_id) or member_id = private.my_member_id(family_id));

-- 2. What siblings may see: chore level only, kept in sync by a trigger.
create table chore_levels (
  family_id uuid not null references families on delete cascade,
  member_id uuid not null references members on delete cascade,
  level smallint not null check (level in (1, 2, 3)),
  starts_on date not null,
  primary key (member_id, starts_on)
);
alter table chore_levels enable row level security;
create policy "family reads" on chore_levels for select using (family_id in (select private.my_family_ids()));

create or replace function private.sync_chore_level() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from chore_levels where member_id = old.member_id and starts_on = old.starts_on;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    insert into chore_levels (family_id, member_id, level, starts_on)
    values (new.family_id, new.member_id, new.level, new.starts_on)
    on conflict (member_id, starts_on) do update set level = excluded.level;
  end if;
  return null;
end $$;
revoke execute on function private.sync_chore_level() from public, anon, authenticated;
create trigger sync_chore_level after insert or update or delete on member_plans
  for each row execute function private.sync_chore_level();
insert into chore_levels (family_id, member_id, level, starts_on)
  select family_id, member_id, level, starts_on from member_plans on conflict do nothing;

-- 3. Rent plans: private.
drop policy "family reads" on rent_plans;
create policy "parents and self read rent plan" on rent_plans for select
  using (private.is_family_admin(family_id) or member_id = private.my_member_id(family_id));

-- 4. Ledger: chore fines and the family fun account stay visible to the family (they come up in the
--    Sunday meeting); rent, rent payments and late fees are parents and self only.
drop policy "family reads" on ledger;
create policy "family reads fines" on ledger for select
  using (family_id in (select private.my_family_ids()) and kind in ('fine', 'fun_payment'));
create policy "parents and self read rent" on ledger for select
  using (kind in ('rent_due', 'rent_paid', 'late_fee')
         and (private.is_family_admin(family_id) or member_id = private.my_member_id(family_id)));

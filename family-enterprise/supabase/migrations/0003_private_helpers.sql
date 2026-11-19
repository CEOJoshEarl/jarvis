-- Policy helpers live in a schema the API doesn't expose; policies keep working because they reference the functions directly.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.my_family_ids() set schema private;
alter function public.is_family_admin(uuid) set schema private;
alter function public.my_member_id(uuid) set schema private;
alter function public.guard_member_update() set schema private;

alter function private.is_family_admin(uuid) set search_path = public;
alter function private.my_family_ids() set search_path = public;
alter function private.my_member_id(uuid) set search_path = public;

revoke execute on function private.my_family_ids(), private.is_family_admin(uuid), private.my_member_id(uuid), private.guard_member_update() from public, anon;
grant execute on function private.my_family_ids(), private.is_family_admin(uuid), private.my_member_id(uuid) to authenticated;

create or replace function private.guard_member_update() returns trigger
language plpgsql security definer set search_path = public, private as $$
begin
  if auth.uid() is null or private.is_family_admin(old.family_id) then return new; end if;
  if new.role is distinct from old.role or new.key is distinct from old.key or new.family_id is distinct from old.family_id
     or new.user_id is distinct from old.user_id or new.invite_email is distinct from old.invite_email
     or new.color is distinct from old.color or new.invited_at is distinct from old.invited_at then
    raise exception 'You can only change your own name and picture';
  end if;
  return new;
end $$;

-- Joining: only signed-in people may claim their invite.
revoke execute on function public.claim_member() from public, anon;
grant execute on function public.claim_member() to authenticated;
alter function public.claim_member() set search_path = public, private;

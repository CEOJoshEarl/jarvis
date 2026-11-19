-- Profile pictures, invite emails, and joining.

alter table members add column if not exists avatar_path text;
alter table members add column if not exists invite_email text;
create unique index if not exists members_invite_email on members (family_id, lower(invite_email));

-- Each person edits their own row; parents edit anyone (the "admins write" policy).
create policy "edit own profile" on members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A person editing their own row may only change their name and picture.
create or replace function guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_family_admin(old.family_id) then return new; end if;
  if new.role is distinct from old.role or new.key is distinct from old.key or new.family_id is distinct from old.family_id
     or new.user_id is distinct from old.user_id or new.invite_email is distinct from old.invite_email
     or new.color is distinct from old.color or new.invited_at is distinct from old.invited_at then
    raise exception 'You can only change your own name and picture';
  end if;
  return new;
end $$;
create trigger guard_member_update before update on members for each row execute function guard_member_update();

-- After signing in, link the account to the family member a parent invited by email.
create or replace function claim_member() returns setof members
language plpgsql security definer set search_path = public as $$
declare e text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or e is null then return; end if;
  update members set user_id = auth.uid()
   where user_id is null and lower(invite_email) = e;
  return query select * from members where user_id = auth.uid();
end $$;
revoke execute on function claim_member() from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Paths: avatars/<family id>/<member id>.jpg
create policy "family reads avatars" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] in (select my_family_ids()::text));
create policy "self or parent writes avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] in (select my_family_ids()::text)
    and (split_part(storage.filename(name), '.', 1) = my_member_id(((storage.foldername(name))[1])::uuid)::text
         or is_family_admin(((storage.foldername(name))[1])::uuid)));
create policy "self or parent replaces avatar" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] in (select my_family_ids()::text)
    and (split_part(storage.filename(name), '.', 1) = my_member_id(((storage.foldername(name))[1])::uuid)::text
         or is_family_admin(((storage.foldername(name))[1])::uuid)));

-- Profile pictures and names. Each person edits their own; parents edit anyone in their family.

alter table members add column if not exists avatar_path text;

create policy "edit own profile" on members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Only name and picture are editable by the person themselves; role, key and family stay with parents.
revoke update on members from authenticated;
grant update (name, short, avatar_path) on members to authenticated;
-- Parents still edit everything through the "admins write" policy via a security-definer function later;
-- column grants apply to everyone, so give parents a function for full edits.
create or replace function admin_update_member(m uuid, new_name text, new_short text, new_avatar text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_family_admin((select family_id from members where id = m)) then
    raise exception 'Only a parent can edit another person';
  end if;
  update members set name = coalesce(new_name, name), short = coalesce(new_short, short), avatar_path = new_avatar where id = m;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "family reads avatars" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1]::uuid in (select my_family_ids()));
create policy "self or parent uploads avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1]::uuid in (select my_family_ids())
    and ((storage.foldername(name))[2]::uuid = my_member_id((storage.foldername(name))[1]::uuid)
         or is_family_admin((storage.foldername(name))[1]::uuid)));

-- First family. Invite emails are set in the app by a parent (or directly in the database), not kept in the repo.
with f as (
  insert into families (name, timezone, go_live, rotation_start)
  values ('Earl', 'America/New_York', '2026-11-29', '2026-11-29') returning id
), m as (
  insert into members (family_id, key, name, short, color, role)
  select f.id, v.key, v.name, v.short, v.color, v.role from f, (values
    ('josh','Josh','JE','#F5B83D','admin'), ('vanilla','Vanilla','VA','#FF7AA8','admin'),
    ('andrew','Andrew','AN','#2FD3C5','member'), ('angela','Angela','AG','#A98BFF','member'),
    ('max','Max','MX','#4DA3FF','member'), ('uso','Uso','US','#D9A36A','pet')
  ) as v(key,name,short,color,role)
  returning id, family_id, key
), t as (
  insert into tier_history (family_id, member_id, tier, starts_on)
  select family_id, id, 500, '2026-11-01' from m where key = 'andrew' returning 1
)
insert into rotation_groups (family_id, key, member_keys) select id, 'kids3', array['max','angela','andrew'] from f;

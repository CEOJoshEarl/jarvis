-- Members are people. Pets are not accounts; their care tasks are labeled in the chore catalog.
delete from members where role = 'pet';
alter table members drop constraint members_role_check;
alter table members add constraint members_role_check check (role in ('admin', 'member'));

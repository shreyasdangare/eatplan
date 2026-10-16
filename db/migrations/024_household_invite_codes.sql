-- Revocable invite codes (instead of sharing the household id), and an atomic join that
-- removes the joiner's previous household when nobody else is left in it.
alter table public.households add column if not exists invite_code text;
create unique index if not exists households_invite_code_key on public.households (invite_code) where invite_code is not null;

update public.households
set invite_code = upper(substr(translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=0O1IL', ''), 1, 8))
where invite_code is null;

create or replace function public.join_household_by_code(p_user_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target uuid;
  v_old uuid;
begin
  select id into v_target from public.households
  where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_target is null then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  select household_id into v_old from public.household_members where user_id = p_user_id;
  if v_old = v_target then
    return v_target;
  end if;

  delete from public.household_members where user_id = p_user_id;
  insert into public.household_members (household_id, user_id, role) values (v_target, p_user_id, 'member');

  -- Previous household is gone if the joiner was its last member (its data cascades with it).
  if v_old is not null and not exists (select 1 from public.household_members where household_id = v_old) then
    delete from public.households where id = v_old;
  end if;

  return v_target;
end;
$$;

revoke all on function public.join_household_by_code(uuid, text) from public, anon, authenticated;
grant execute on function public.join_household_by_code(uuid, text) to service_role;

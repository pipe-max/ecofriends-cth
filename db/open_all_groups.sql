-- Apply after readiness.sql. Preserves all votes and current group states.
begin;
drop index if exists public.ecofriends_one_open_group;

create or replace function ecofriends_private.set_group(p_token text,p_grupo text,p_open boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  if p_open is null or p_grupo is null then raise exception 'Selecciona un salón y un estado válidos.'; end if;
  perform pg_advisory_xact_lock(762602);
  if not exists(select 1 from public.ecofriends_grupos where grupo=p_grupo) then raise exception 'Salón inexistente.'; end if;
  update public.ecofriends_grupos set voting_open=p_open,completed_at=case when p_open then null else coalesce(completed_at,now()) end where grupo=p_grupo;
  insert into ecofriends_private.audit(action,detail) values('set_group',jsonb_build_object('grupo',p_grupo,'open',p_open));
  return true;
end $$;

create or replace function ecofriends_private.open_all(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  perform pg_advisory_xact_lock(762602);
  update public.ecofriends_grupos set voting_open=true,completed_at=null where not voting_open or completed_at is not null;
  insert into ecofriends_private.audit(action,detail) values('open_all','{}');
  return true;
end $$;

create or replace function public.ecofriends_admin_open_all(p_token text) returns boolean
language sql security invoker set search_path='' as $$ select ecofriends_private.open_all(p_token) $$;
revoke all on function ecofriends_private.open_all(text) from public,anon,authenticated;
revoke all on function public.ecofriends_admin_open_all(text) from public,anon,authenticated;
grant execute on function ecofriends_private.open_all(text) to anon,authenticated;
grant execute on function public.ecofriends_admin_open_all(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;

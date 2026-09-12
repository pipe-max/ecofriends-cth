-- Adds a way to wipe a group's votes and reopen it from zero (e.g. after test votes,
-- or to redo a room's election). Applied to the existing Ecofriends database.
create function ecofriends_private.reset_group(p_token text,p_grupo text) returns integer
language plpgsql security definer set search_path='' as $$
declare deleted_count integer;
begin
  perform ecofriends_private.require_admin(p_token);
  if p_grupo is null then raise exception 'Selecciona un salón válido.'; end if;
  if not exists(select 1 from public.ecofriends_grupos where grupo=p_grupo) then raise exception 'Salón inexistente.'; end if;
  perform pg_advisory_xact_lock(762602);
  delete from public.ecofriends_votos where grupo=p_grupo;
  get diagnostics deleted_count = row_count;
  update public.ecofriends_grupos set voting_open=false,completed_at=null where grupo=p_grupo;
  insert into ecofriends_private.audit(action,detail) values('reset_group',jsonb_build_object('grupo',p_grupo,'deleted',deleted_count));
  return deleted_count;
end $$;

create function public.ecofriends_admin_reset_group(p_token text,p_grupo text) returns integer language sql security invoker set search_path='' as $$ select ecofriends_private.reset_group(p_token,p_grupo) $$;

revoke all on function ecofriends_private.reset_group(text,text) from public,anon,authenticated;
revoke all on function public.ecofriends_admin_reset_group(text,text) from public,anon,authenticated;
grant execute on function ecofriends_private.reset_group(text,text) to anon,authenticated;
grant execute on function public.ecofriends_admin_reset_group(text,text) to anon,authenticated;
notify pgrst,'reload schema';

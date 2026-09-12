-- Clears the active election while preserving saved final reports.
create function ecofriends_private.reset_election(p_token text) returns integer
language plpgsql security definer set search_path='' as $$
declare deleted_count integer;
begin
  perform ecofriends_private.require_admin(p_token);
  perform pg_advisory_xact_lock(762602);
  if exists(select 1 from public.ecofriends_grupos where voting_open) then
    raise exception 'Cierra todos los salones antes de reiniciar la votación.';
  end if;
  -- An explicit predicate satisfies pg-safeupdate while still clearing every vote.
  delete from public.ecofriends_votos where id is not null;
  get diagnostics deleted_count = row_count;
  update public.ecofriends_grupos
    set voting_open=false, completed_at=null, expected_voters=null
    where grupo is not null;
  insert into ecofriends_private.audit(action,detail)
    values('reset_election',jsonb_build_object('deleted',deleted_count));
  return deleted_count;
end $$;

create function public.ecofriends_admin_reset_election(p_token text) returns integer
language sql security invoker set search_path='' as $$
  select ecofriends_private.reset_election(p_token)
$$;

revoke all on function ecofriends_private.reset_election(text) from public,anon,authenticated;
revoke all on function public.ecofriends_admin_reset_election(text) from public,anon,authenticated;
grant execute on function ecofriends_private.reset_election(text) to anon,authenticated;
grant execute on function public.ecofriends_admin_reset_election(text) to anon,authenticated;
notify pgrst,'reload schema';

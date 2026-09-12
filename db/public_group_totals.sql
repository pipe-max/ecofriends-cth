-- Exposes participation totals to voting stations without revealing candidate results.
create function ecofriends_private.public_groups() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(to_jsonb(g) order by g.orden),'[]'::jsonb)
  from (
    select groups.grupo, groups.voting_open, groups.completed_at, groups.orden,
      (select count(*) from public.ecofriends_votos votes where votes.grupo=groups.grupo) as total
    from public.ecofriends_grupos groups
  ) g
$$;

create function public.ecofriends_public_groups() returns jsonb
language sql stable security invoker set search_path='' as $$
  select ecofriends_private.public_groups()
$$;

revoke all on function ecofriends_private.public_groups() from public,anon,authenticated;
revoke all on function public.ecofriends_public_groups() from public,anon,authenticated;
grant execute on function ecofriends_private.public_groups() to anon,authenticated;
grant execute on function public.ecofriends_public_groups() to anon,authenticated;
notify pgrst,'reload schema';

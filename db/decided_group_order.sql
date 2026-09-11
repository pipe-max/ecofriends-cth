-- K5 Bet (designated without a vote) needs a position in the report ordering
-- so it prints right after K5 Alef instead of after every voted group.
create or replace function ecofriends_private.snapshot(p_token text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
  perform ecofriends_private.require_admin(p_token);
  select jsonb_build_object('generated_at',now(),'groups',coalesce(jsonb_agg(to_jsonb(g) order by g.orden),'[]'::jsonb)) into payload
  from (
    select g.*, (select count(*) from public.ecofriends_votos v where v.grupo=g.grupo) as total,
      (select coalesce(jsonb_agg(to_jsonb(c) order by c.orden),'[]'::jsonb) from (
        select c.id,c.nombre,c.orden,(select count(*) from public.ecofriends_votos v where v.candidato_id=c.id) as votos
        from public.ecofriends_candidatos c where c.grupo=g.grupo
      ) c) as candidates
    from public.ecofriends_grupos g
  ) g;
  return payload || jsonb_build_object('decided',jsonb_build_array(jsonb_build_object('grupo','K5 Bet','seccion','Preescolar','nombre','Jacob Goleburn','orden',5.5)),
    'reports',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select id,created_at from ecofriends_private.reports order by created_at desc limit 10)r));
end $$;
notify pgrst,'reload schema';

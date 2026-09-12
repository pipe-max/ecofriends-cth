-- Lets the admin delete a saved report from the list (they pile up over time).
create function ecofriends_private.delete_report(p_token text,p_report_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  if p_report_id is null then raise exception 'Selecciona un informe válido.'; end if;
  delete from ecofriends_private.reports where id=p_report_id;
  if not found then raise exception 'Informe inexistente.'; end if;
  insert into ecofriends_private.audit(action,detail) values('delete_report',jsonb_build_object('report_id',p_report_id));
  return true;
end $$;

create function public.ecofriends_admin_delete_report(p_token text,p_report_id uuid) returns boolean language sql security invoker set search_path='' as $$ select ecofriends_private.delete_report(p_token,p_report_id) $$;

revoke all on function ecofriends_private.delete_report(text,uuid) from public,anon,authenticated;
revoke all on function public.ecofriends_admin_delete_report(text,uuid) from public,anon,authenticated;
grant execute on function ecofriends_private.delete_report(text,uuid) to anon,authenticated;
grant execute on function public.ecofriends_admin_delete_report(text,uuid) to anon,authenticated;
notify pgrst,'reload schema';

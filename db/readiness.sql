-- Applied atomically to the existing Ecofriends database. Does not delete votes.
create schema if not exists ecofriends_private;
revoke all on schema ecofriends_private from public;
grant usage on schema ecofriends_private to anon, authenticated;

create table ecofriends_private.settings (singleton boolean primary key default true check(singleton), code_hash text not null);
create table ecofriends_private.sessions (token_hash text primary key, expires_at timestamptz not null);
create table ecofriends_private.login_attempts (address_hash text primary key, attempts integer not null default 0, since timestamptz not null default now());
create table ecofriends_private.reports (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), payload jsonb not null);
create table ecofriends_private.audit (id bigint generated always as identity primary key, created_at timestamptz not null default now(), action text not null, detail jsonb not null);
insert into ecofriends_private.audit(action,detail) values('preparation_backup',jsonb_build_object('votes',(select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb) from public.ecofriends_votos v),'groups',(select jsonb_agg(to_jsonb(g)) from public.ecofriends_grupos g)));
-- Preserve the existing administrator code without copying it into files or output.
do $block$
declare old_code text;
begin
  select substring(prosrc from $pattern$p_code\s*=\s*'([^']+)'$pattern$) into old_code
  from pg_proc where oid='public.ecofriends_verify_admin(text)'::regprocedure;
  if old_code is null or length(old_code)=0 then raise exception 'Cannot preserve administrator code'; end if;
  insert into ecofriends_private.settings(code_hash) values(extensions.crypt(old_code,extensions.gen_salt('bf',10)));
end $block$;

alter table ecofriends_private.settings enable row level security;
alter table ecofriends_private.sessions enable row level security;
alter table ecofriends_private.login_attempts enable row level security;
alter table ecofriends_private.reports enable row level security;
alter table ecofriends_private.audit enable row level security;
revoke all on all tables in schema ecofriends_private from public, anon, authenticated;
alter default privileges in schema ecofriends_private revoke execute on functions from public;

alter table public.ecofriends_grupos add column expected_voters integer check(expected_voters between 0 and 500);
alter table public.ecofriends_grupos add column completed_at timestamptz;
-- Prepare for supervised voting: all groups start closed; keep existing votes.
update public.ecofriends_grupos set voting_open=false;
create unique index ecofriends_one_open_group on public.ecofriends_grupos(voting_open) where voting_open;
create index if not exists ecofriends_votes_candidate on public.ecofriends_votos(candidato_id);
create index if not exists ecofriends_votes_group on public.ecofriends_votos(grupo);

create function ecofriends_private.require_admin(p_token text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_token is null or not exists(select 1 from ecofriends_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now()) then
    raise exception using errcode='42501',message='Sesión vencida. Ingresa de nuevo.';
  end if;
end $$;

create function ecofriends_private.login(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare address text; bucket ecofriends_private.login_attempts%rowtype; secret text; token text;
begin
  address:=encode(extensions.digest(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','unknown'),'sha256'),'hex');
  insert into ecofriends_private.login_attempts(address_hash) values(address) on conflict do nothing;
  select * into bucket from ecofriends_private.login_attempts where address_hash=address for update;
  if bucket.since<now()-interval '5 minutes' then
    update ecofriends_private.login_attempts set attempts=0,since=now() where address_hash=address;
    bucket.attempts:=0;
  end if;
  if bucket.attempts>=8 then return jsonb_build_object('error','Demasiados intentos. Espera cinco minutos.'); end if;
  select code_hash into secret from ecofriends_private.settings where singleton;
  if p_code is null or length(p_code)>200 or extensions.crypt(p_code,secret) is distinct from secret then
    update ecofriends_private.login_attempts set attempts=attempts+1 where address_hash=address;
    return jsonb_build_object('error','Código incorrecto.');
  end if;
  update ecofriends_private.login_attempts set attempts=0,since=now() where address_hash=address;
  delete from ecofriends_private.sessions where expires_at<now();
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into ecofriends_private.sessions values(encode(extensions.digest(token,'sha256'),'hex'),now()+interval '12 hours');
  return jsonb_build_object('token',token,'expires_at',now()+interval '12 hours');
end $$;

create function ecofriends_private.logout(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  delete from ecofriends_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
  return true;
end $$;

-- Vote and close operations share a lock, so closing waits for accepted writes.
create or replace function public.ecofriends_set_grupo() returns trigger
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock_shared(762602);
  select grupo into new.grupo from public.ecofriends_candidatos where id=new.candidato_id;
  if new.grupo is null or not exists(select 1 from public.ecofriends_grupos where grupo=new.grupo and voting_open) then
    raise exception using errcode='P0001',message='El salón está cerrado.';
  end if;
  return new;
end $$;

create function ecofriends_private.cast_vote(p_request_id uuid,p_candidato_id bigint,p_dispositivo_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.ecofriends_votos%rowtype; target_group text;
begin
  if p_request_id is null or p_candidato_id is null or p_dispositivo_id is null or length(p_dispositivo_id) not between 1 and 200 then
    return jsonb_build_object('status','invalid');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,762603));
  perform pg_advisory_xact_lock_shared(762602);
  select * into existing from public.ecofriends_votos where id=p_request_id;
  if found then
    if existing.candidato_id<>p_candidato_id or existing.dispositivo_id<>p_dispositivo_id then
      return jsonb_build_object('status','conflict');
    end if;
    return jsonb_build_object('status','saved','id',existing.id,'grupo',existing.grupo);
  end if;
  select grupo into target_group from public.ecofriends_candidatos where id=p_candidato_id;
  if target_group is null then return jsonb_build_object('status','invalid'); end if;
  if not exists(select 1 from public.ecofriends_grupos where grupo=target_group and voting_open) then
    return jsonb_build_object('status','closed','grupo',target_group);
  end if;
  insert into public.ecofriends_votos(id,candidato_id,dispositivo_id) values(p_request_id,p_candidato_id,p_dispositivo_id);
  return jsonb_build_object('status','saved','id',p_request_id,'grupo',target_group);
end $$;

create function ecofriends_private.snapshot(p_token text) returns jsonb
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
  return payload || jsonb_build_object('decided',jsonb_build_array(jsonb_build_object('grupo','K5 Bet','seccion','Preescolar','nombre','Jacob Goleburn')),
    'reports',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (select id,created_at from ecofriends_private.reports order by created_at desc limit 10)r));
end $$;

create function ecofriends_private.set_group(p_token text,p_grupo text,p_open boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  if p_open is null or p_grupo is null then raise exception 'Selecciona un salón y un estado válidos.'; end if;
  perform pg_advisory_xact_lock(762602);
  if not exists(select 1 from public.ecofriends_grupos where grupo=p_grupo) then raise exception 'Salón inexistente.'; end if;
  if p_open and exists(select 1 from public.ecofriends_grupos where voting_open and grupo<>p_grupo) then
    raise exception 'Cierra el salón abierto antes de habilitar otro.';
  end if;
  update public.ecofriends_grupos set voting_open=p_open,completed_at=case when p_open then null else coalesce(completed_at,now()) end where grupo=p_grupo;
  insert into ecofriends_private.audit(action,detail) values('set_group',jsonb_build_object('grupo',p_grupo,'open',p_open));
  return true;
end $$;

create function ecofriends_private.close_all(p_token text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  perform pg_advisory_xact_lock(762602);
  update public.ecofriends_grupos set voting_open=false,completed_at=now() where voting_open;
  insert into ecofriends_private.audit(action,detail) values('close_all','{}');
  return true;
end $$;

create function ecofriends_private.set_expected(p_token text,p_grupo text,p_expected integer) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  perform ecofriends_private.require_admin(p_token);
  if p_expected is not null and p_expected not between 0 and 500 then raise exception 'Cantidad inválida.'; end if;
  update public.ecofriends_grupos set expected_voters=p_expected where grupo=p_grupo;
  if not found then raise exception 'Salón inexistente.'; end if;
  insert into ecofriends_private.audit(action,detail) values('set_expected',jsonb_build_object('grupo',p_grupo,'expected',p_expected));
  return true;
end $$;

create function ecofriends_private.report(p_token text,p_report_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare data jsonb; report_id uuid:=gen_random_uuid();
begin
  perform ecofriends_private.require_admin(p_token);
  if p_report_id is not null then
    select payload into data from ecofriends_private.reports where id=p_report_id;
    if data is null then raise exception 'Informe inexistente.'; end if;
    return data;
  end if;
  perform pg_advisory_xact_lock(762602);
  if exists(select 1 from public.ecofriends_grupos where voting_open) then raise exception 'Cierra todos los salones antes de generar el informe final.'; end if;
  data:=(ecofriends_private.snapshot(p_token)-'reports')||jsonb_build_object('report_id',report_id);
  insert into ecofriends_private.reports(id,payload) values(report_id,data);
  return data;
end $$;

-- Public RPCs are invokers; privileged implementations live outside the API schema.
create function public.ecofriends_login(p_code text) returns jsonb language sql security invoker set search_path='' as $$ select ecofriends_private.login(p_code) $$;
create function public.ecofriends_logout(p_token text) returns boolean language sql security invoker set search_path='' as $$ select ecofriends_private.logout(p_token) $$;
create function public.ecofriends_cast_vote(p_request_id uuid,p_candidato_id bigint,p_dispositivo_id text) returns jsonb language sql security invoker set search_path='' as $$ select ecofriends_private.cast_vote(p_request_id,p_candidato_id,p_dispositivo_id) $$;
create function public.ecofriends_admin_snapshot(p_token text) returns jsonb language sql security invoker set search_path='' as $$ select ecofriends_private.snapshot(p_token) $$;
create function public.ecofriends_admin_set_group(p_token text,p_grupo text,p_open boolean) returns boolean language sql security invoker set search_path='' as $$ select ecofriends_private.set_group(p_token,p_grupo,p_open) $$;
create function public.ecofriends_admin_close_all(p_token text) returns boolean language sql security invoker set search_path='' as $$ select ecofriends_private.close_all(p_token) $$;
create function public.ecofriends_admin_set_expected(p_token text,p_grupo text,p_expected integer) returns boolean language sql security invoker set search_path='' as $$ select ecofriends_private.set_expected(p_token,p_grupo,p_expected) $$;
create function public.ecofriends_admin_report(p_token text,p_report_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select ecofriends_private.report(p_token,p_report_id) $$;

-- Retire legacy endpoints and public writes/results. Old pages must refresh.
drop function public.ecofriends_set_voting(text,boolean,text);
drop function public.ecofriends_verify_admin(text);
drop policy votos_insert_publico on public.ecofriends_votos;
revoke all on public.ecofriends_votos,public.ecofriends_resultados,public.ecofriends_grupos,public.ecofriends_candidatos from public,anon,authenticated;
grant select on public.ecofriends_grupos,public.ecofriends_candidatos to anon,authenticated;
alter view public.ecofriends_resultados set (security_invoker=true);
revoke all on function public.ecofriends_set_grupo() from public,anon,authenticated;

do $block$
declare f record;
begin
  for f in select p.oid::regprocedure signature,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='ecofriends_private' and p.proname<>'require_admin') or (n.nspname='public' and p.proname in ('ecofriends_login','ecofriends_logout','ecofriends_cast_vote','ecofriends_admin_snapshot','ecofriends_admin_set_group','ecofriends_admin_close_all','ecofriends_admin_set_expected','ecofriends_admin_report'))
  loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to anon,authenticated',f.signature);
  end loop;
end $block$;
notify pgrst,'reload schema';

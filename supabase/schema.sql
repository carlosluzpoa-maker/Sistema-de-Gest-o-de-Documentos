-- SGI Docs — controle de documentos do Sistema de Gestão Integrada (Supabase / Postgres)
-- Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem problema.

-- ───────────── Tabelas ─────────────
create table if not exists public.areas (
  id text primary key,
  nome text not null,
  sigla text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  responsavel text
);

create table if not exists public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  area text references public.areas(id),
  permissao text not null default 'leitura' check (permissao in ('editar', 'leitura')),
  recebe_avisos boolean not null default true,
  ativo boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);
create unique index if not exists funcionarios_email_idx on public.funcionarios (lower(email));

create table if not exists public.docs (
  id text primary key,                       -- ex.: LO-002
  codigo text not null,                      -- ex.: LO 002
  titulo text not null,
  area text not null references public.areas(id),
  tipo text not null check (tipo in ('Procedimento','Instrução de trabalho','Formulário','Planilha','Manual','Política')),
  revisao integer not null default 0,
  status text not null default 'rascunho' check (status in ('rascunho','em_aprovacao','vigente','obsoleto')),
  descricao text,
  alteracao text,
  elaborador text,
  aprovador text,
  publicado_em date,
  atualizado_em timestamptz not null default now(),
  proxima_revisao date,
  periodicidade_meses integer not null default 12 check (periodicidade_meses in (6, 12, 24)),
  arquivo jsonb,                             -- {path, nome, contentType, tamanho}
  anexos jsonb not null default '[]'::jsonb, -- lista de objetos iguais ao arquivo
  avisar_funcionarios uuid[] not null default '{}'
);

create table if not exists public.revisoes (
  id bigint generated always as identity primary key,
  doc_id text not null references public.docs(id) on delete cascade,
  revisao integer not null,
  data timestamptz not null default now(),
  autor_id uuid,
  resumo text,
  arquivo jsonb
);

create table if not exists public.leituras (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_id text not null references public.docs(id) on delete cascade,
  revisao integer not null,
  em timestamptz not null default now(),
  primary key (user_id, doc_id)
);

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('novo','revisao','em_aprovacao','aprovado','obsoleto','arquivo')),
  doc_id text references public.docs(id) on delete cascade,
  codigo text,
  titulo text,
  area text,
  revisao integer,
  em timestamptz not null default now(),
  por_id uuid,
  resumo text,
  destinatarios text[] not null default '{}',
  email_enviado boolean not null default false
);

create table if not exists public.estado_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ultima_visita timestamptz not null default now()
);

create table if not exists public.config (
  chave text primary key,
  valor text
);

create index if not exists revisoes_doc_idx on public.revisoes(doc_id);
create index if not exists eventos_em_idx on public.eventos(em desc);

-- ───────────── Funções de apoio ─────────────
create or replace function public.is_funcionario() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.funcionarios f
                 where f.ativo and lower(f.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.funcionarios f
                 where f.ativo and f.permissao = 'editar'
                   and lower(f.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

create or replace function public.meu_funcionario() returns setof public.funcionarios
language sql stable security definer set search_path = public as $$
  select * from public.funcionarios f
  where f.ativo and lower(f.email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1;
$$;

create or replace function public.existe_funcionario() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.funcionarios);
$$;

-- Primeiro acesso: o primeiro usuário que entrar vira administrador (só funciona com a tabela vazia).
create or replace function public.primeiro_admin(p_nome text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.funcionarios) then
    raise exception 'Já existe um administrador cadastrado.';
  end if;
  insert into public.funcionarios (nome, email, permissao, recebe_avisos, ativo, user_id)
  values (p_nome, lower(auth.jwt() ->> 'email'), 'editar', true, true, auth.uid());
end;
$$;

-- Liga a conta de login ao cadastro do funcionário pelo e-mail.
create or replace function public.vincular_conta() returns void
language sql security definer set search_path = public as $$
  update public.funcionarios set user_id = auth.uid()
  where user_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke all on function public.is_funcionario(), public.is_editor(), public.meu_funcionario(),
  public.existe_funcionario(), public.primeiro_admin(text), public.vincular_conta() from public, anon;
grant execute on function public.is_funcionario(), public.is_editor(), public.meu_funcionario(),
  public.existe_funcionario(), public.primeiro_admin(text), public.vincular_conta() to authenticated;

-- ───────────── Segurança por linha (RLS) ─────────────
-- Leitura: qualquer funcionário ativo. Escrita: somente editores (exceto leituras e estado do usuário).
alter table public.areas enable row level security;
alter table public.funcionarios enable row level security;
alter table public.docs enable row level security;
alter table public.revisoes enable row level security;
alter table public.leituras enable row level security;
alter table public.eventos enable row level security;
alter table public.estado_usuario enable row level security;
alter table public.config enable row level security;

do $$
declare t text;
begin
  foreach t in array array['areas','funcionarios','docs','revisoes','eventos','config'] loop
    execute format('drop policy if exists "ler" on public.%I', t);
    execute format('drop policy if exists "editar" on public.%I', t);
    execute format('create policy "ler" on public.%I for select to authenticated using (public.is_funcionario())', t);
    execute format('create policy "editar" on public.%I for all to authenticated using (public.is_editor()) with check (public.is_editor())', t);
  end loop;
end $$;

drop policy if exists "ler" on public.leituras;
drop policy if exists "gravar propria" on public.leituras;
create policy "ler" on public.leituras for select to authenticated using (public.is_funcionario());
create policy "gravar propria" on public.leituras for all to authenticated
  using (user_id = auth.uid() and public.is_funcionario())
  with check (user_id = auth.uid() and public.is_funcionario());

drop policy if exists "proprio estado" on public.estado_usuario;
create policy "proprio estado" on public.estado_usuario for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────── Arquivos (Storage) ─────────────
insert into storage.buckets (id, name, public) values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "sgi ler arquivos" on storage.objects;
drop policy if exists "sgi enviar arquivos" on storage.objects;
drop policy if exists "sgi alterar arquivos" on storage.objects;
drop policy if exists "sgi apagar arquivos" on storage.objects;
create policy "sgi ler arquivos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.is_funcionario());
create policy "sgi enviar arquivos" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and public.is_editor());
create policy "sgi alterar arquivos" on storage.objects for update to authenticated
  using (bucket_id = 'documentos' and public.is_editor());
create policy "sgi apagar arquivos" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and public.is_editor());

-- ───────────── Dados iniciais ─────────────
insert into public.areas (id, nome, sigla, ordem) values
  ('integracao', 'Integração', 'IN', 1),
  ('atendimento', 'Treinamentos Atendimento', 'AT', 2),
  ('logistica', 'Treinamentos Logística', 'LO', 3),
  ('financeiro', 'Treinamentos Financeiro', 'FI', 4)
on conflict (id) do nothing;

insert into public.config (chave, valor) values ('link_sgi', '') on conflict (chave) do nothing;

-- Ranking do jogo Pixel Fuga. Tabelas isoladas (prefixo pixelfuga_), sem acesso público:
-- RLS ligado e SEM policies; só a Edge Function pixelfuga-ranking (service role) lê e grava.
create table if not exists public.pixelfuga_players (
  id               uuid primary key default gen_random_uuid(),
  device_hash      text not null unique check (char_length(device_hash) = 64),
  name             text not null check (char_length(name) between 2 and 20),
  current_level    integer not null default 1 check (current_level between 1 and 1000),
  levels_done      integer not null default 0 check (levels_done between 0 and 1000),
  challenge_levels integer not null default 0 check (challenge_levels between 0 and 100),
  ultra_done       integer not null default 0 check (ultra_done between 0 and 10),
  total_time_s     integer not null default 0 check (total_time_s between 0 and 100000000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists pixelfuga_players_rank_idx on public.pixelfuga_players (current_level desc, levels_done desc, challenge_levels desc, total_time_s asc);

create table if not exists public.pixelfuga_rate (
  ip_hash      text primary key check (char_length(ip_hash) = 64),
  window_start timestamptz not null default now(),
  hits         integer not null default 0 check (hits >= 0)
);

alter table public.pixelfuga_players enable row level security;
alter table public.pixelfuga_rate enable row level security;
revoke all on public.pixelfuga_players from anon, authenticated;
revoke all on public.pixelfuga_rate from anon, authenticated;

create or replace function public.pixelfuga_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.pixelfuga_touch_updated_at() from public, anon, authenticated;
drop trigger if exists pixelfuga_players_updated_at on public.pixelfuga_players;
create trigger pixelfuga_players_updated_at before update on public.pixelfuga_players
  for each row execute function public.pixelfuga_touch_updated_at();

-- v2.3: o Instagram saiu do ranking (só o apelido aparece). Em bancos antigos:
alter table public.pixelfuga_players drop column if exists instagram;

-- v2.4: cópia do progresso (código de recuperação). Mesmas regras: RLS sem policies, sem acesso público.
create table if not exists public.pixelfuga_saves (
  device_hash text primary key check (char_length(device_hash) = 64),
  data        jsonb not null check (pg_column_size(data) < 16000),
  updated_at  timestamptz not null default now()
);
alter table public.pixelfuga_saves enable row level security;
revoke all on public.pixelfuga_saves from anon, authenticated;

-- v2.7: código de recuperação curto (8 caracteres). Só o hash fica no banco.
alter table public.pixelfuga_saves add column if not exists code_hash text check (code_hash is null or char_length(code_hash) = 64);
create unique index if not exists pixelfuga_saves_code_hash_key on public.pixelfuga_saves (code_hash);

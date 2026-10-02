create extension if not exists pgcrypto;

create table if not exists public.ai_planning_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null check (char_length(visitor_id) between 32 and 128),
  request_payload jsonb not null,
  response_payload jsonb not null,
  input_tokens integer,
  output_tokens integer,
  model_used text not null,
  risk_level text not null check (risk_level in ('BALANCED','WATCH','HIGH','CRITICAL'))
);
create index if not exists ai_planning_requests_visitor_date_idx on public.ai_planning_requests (visitor_id, created_at desc);
create index if not exists ai_planning_requests_risk_idx on public.ai_planning_requests (risk_level);
alter table public.ai_planning_requests enable row level security;
revoke all on public.ai_planning_requests from anon, authenticated;

create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  reference text not null,
  item_code text not null,
  quantity numeric not null,
  uom text not null,
  actor_role text not null,
  payload jsonb not null default '{}'::jsonb
);
alter table public.inventory_events enable row level security;
revoke all on public.inventory_events from anon, authenticated;

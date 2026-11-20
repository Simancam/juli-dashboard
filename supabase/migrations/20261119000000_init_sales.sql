-- Fase 3: persistencia de datasets y líneas de venta normalizadas.
-- Montos en centavos (bigint) para evitar errores de punto flotante.

create extension if not exists pgcrypto;

create table if not exists public.datasets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start date not null,
  period_end date not null,
  file_hash text not null unique,
  file_name text not null,
  row_count integer not null check (row_count >= 0),
  uploaded_at timestamptz not null default now(),
  constraint datasets_period_order check (period_start <= period_end)
);

comment on table public.datasets is
  'Cargas del informe de ventas. Un archivo (file_hash) se ingesta una sola vez.';
comment on column public.datasets.row_count is
  'Cantidad de líneas válidas persistidas (estado Aprobada).';

create table if not exists public.sale_lines (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.datasets (id) on delete cascade,
  document_number text not null,
  doc_type text not null check (doc_type in ('FEV', 'FEF', 'FEE', 'NCE')),
  date date not null,
  status text not null,
  cost_center text not null,
  seller_name text not null,
  seller_id text not null,
  seller_key text not null,
  client_name text not null,
  client_key text not null,
  item text not null,
  item_description text not null,
  unit text not null,
  quantity numeric(18, 4) not null,
  subtotal_cents bigint not null,
  net_cents bigint not null,
  margin numeric(12, 4) not null,
  warehouse text not null,
  family_key text not null,
  is_product boolean not null,
  is_return boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.sale_lines is
  'Líneas canónicas del informe de ventas. Los duplicados exactos se conservan.';
comment on column public.sale_lines.subtotal_cents is
  'Valor subtotal local en centavos: base de venta y comisión.';
comment on column public.sale_lines.margin is
  'Margen promedio en puntos porcentuales tal como viene en el informe.';
comment on column public.sale_lines.seller_key is
  'Nombre del vendedor normalizado; identidad lógica para comisiones.';

create index if not exists sale_lines_dataset_id_idx
  on public.sale_lines (dataset_id);

create index if not exists sale_lines_date_idx
  on public.sale_lines (date);

create index if not exists sale_lines_date_doc_type_idx
  on public.sale_lines (date, doc_type);

create index if not exists sale_lines_seller_key_idx
  on public.sale_lines (seller_key, date);

create index if not exists sale_lines_client_key_idx
  on public.sale_lines (client_key, date);

create index if not exists sale_lines_item_idx
  on public.sale_lines (item, date);

create index if not exists sale_lines_family_key_idx
  on public.sale_lines (family_key, date);

create index if not exists sale_lines_warehouse_idx
  on public.sale_lines (warehouse, date);

-- Los accesos serán exclusivamente a través de API Routes con service role.
-- RLS sin políticas bloquea el acceso anónimo/autenticado directo a las tablas.
alter table public.datasets enable row level security;
alter table public.sale_lines enable row level security;

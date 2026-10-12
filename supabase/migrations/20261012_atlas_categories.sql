create table if not exists public.atlas_categories (
  slug text primary key,
  label text not null,
  color text not null default '#64748b',
  icon text not null default 'map-pin',
  sort_order integer not null default 100,
  constraint atlas_categories_color_check check (color ~ '^#[0-9a-fA-F]{6}$')
);
alter table public.atlas_categories enable row level security;
drop policy if exists "atlas_categories_read" on public.atlas_categories;
drop policy if exists "atlas_categories_write" on public.atlas_categories;
create policy "atlas_categories_read" on public.atlas_categories for select using (true);
create policy "atlas_categories_write" on public.atlas_categories for all using (true) with check (true);
insert into public.atlas_categories(slug,label,color,icon,sort_order) values
('città','Città','#2563eb','building-2',10),
('borgo','Borgo','#b45309','store',20),
('attrazione_turistica','Attrazione turistica','#0d9488','camera',25),
('monumento','Monumento','#7c3aed','landmark',30),
('museo','Museo','#9333ea','university',40),
('castello','Castello','#6b21a8','castle',50),
('passo','Passo','#475569','mountain',60),
('panorama','Panorama','#ea580c','camera',70),
('spiaggia','Spiaggia','#0891b2','umbrella',80),
('ristorante','Ristorante','#dc2626','utensils-crossed',90),
('hotel','Hotel','#1d4ed8','hotel',100),
('lavoro','Lavoro','#334155','briefcase-business',110),
('altro','Altro','#64748b','circle-help',120)
on conflict (slug) do nothing;

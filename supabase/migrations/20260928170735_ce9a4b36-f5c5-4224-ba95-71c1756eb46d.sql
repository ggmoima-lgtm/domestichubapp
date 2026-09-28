create table public.sa_provinces (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null unique
);
create table public.sa_cities (
  id uuid primary key default gen_random_uuid(),
  province_id uuid not null references public.sa_provinces(id) on delete cascade,
  name text not null,
  sort_order integer not null,
  unique (province_id, name)
);
create index idx_sa_cities_province_id on public.sa_cities(province_id);

grant select on public.sa_provinces to anon, authenticated;
grant select on public.sa_cities to anon, authenticated;
grant all on public.sa_provinces to service_role;
grant all on public.sa_cities to service_role;

alter table public.sa_provinces enable row level security;
alter table public.sa_cities enable row level security;
create policy "sa_provinces_are_public" on public.sa_provinces for select using (true);
create policy "sa_cities_are_public" on public.sa_cities for select using (true);

insert into public.sa_provinces (name, sort_order) values
  ('Gauteng', 1),('Western Cape', 2),('KwaZulu-Natal', 3),('Eastern Cape', 4),('Free State', 5),
  ('Limpopo', 6),('Mpumalanga', 7),('North West', 8),('Northern Cape', 9);

insert into public.sa_cities (province_id, name, sort_order)
select p.id, city.name, city.sort_order
from public.sa_provinces p
join (values
  ('Gauteng','Alberton',1),('Gauteng','Benoni',2),('Gauteng','Boksburg',3),('Gauteng','Centurion',4),
  ('Gauteng','Germiston',5),('Gauteng','Johannesburg',6),('Gauteng','Kempton Park',7),('Gauteng','Krugersdorp',8),
  ('Gauteng','Midrand',9),('Gauteng','Pretoria',10),('Gauteng','Randburg',11),('Gauteng','Roodepoort',12),
  ('Gauteng','Sandton',13),('Gauteng','Soweto',14),('Gauteng','Springs',15),('Gauteng','Vanderbijlpark',16),
  ('Gauteng','Vereeniging',17),
  ('Western Cape','Bellville',1),('Western Cape','Cape Town',2),('Western Cape','George',3),('Western Cape','Hermanus',4),
  ('Western Cape','Knysna',5),('Western Cape','Mossel Bay',6),('Western Cape','Paarl',7),('Western Cape','Somerset West',8),
  ('Western Cape','Stellenbosch',9),('Western Cape','Worcester',10),
  ('KwaZulu-Natal','Ballito',1),('KwaZulu-Natal','Durban',2),('KwaZulu-Natal','Ladysmith',3),('KwaZulu-Natal','Newcastle',4),
  ('KwaZulu-Natal','Pietermaritzburg',5),('KwaZulu-Natal','Pinetown',6),('KwaZulu-Natal','Port Shepstone',7),
  ('KwaZulu-Natal','Richards Bay',8),('KwaZulu-Natal','Umhlanga',9),
  ('Eastern Cape','East London',1),('Eastern Cape','Gqeberha',2),('Eastern Cape','Grahamstown',3),('Eastern Cape','Mthatha',4),
  ('Eastern Cape','Queenstown',5),('Eastern Cape','Uitenhage',6),
  ('Free State','Bethlehem',1),('Free State','Bloemfontein',2),('Free State','Harrismith',3),('Free State','Kroonstad',4),
  ('Free State','Sasolburg',5),('Free State','Welkom',6),
  ('Limpopo','Bela-Bela',1),('Limpopo','Mokopane',2),('Limpopo','Phalaborwa',3),('Limpopo','Polokwane',4),
  ('Limpopo','Thohoyandou',5),('Limpopo','Tzaneen',6),
  ('Mpumalanga','Barberton',1),('Mpumalanga','Ermelo',2),('Mpumalanga','Middelburg',3),('Mpumalanga','Nelspruit',4),
  ('Mpumalanga','Secunda',5),('Mpumalanga','Witbank',6),
  ('North West','Brits',1),('North West','Klerksdorp',2),('North West','Mahikeng',3),('North West','Potchefstroom',4),
  ('North West','Rustenburg',5),('North West','Vryburg',6),
  ('Northern Cape','De Aar',1),('Northern Cape','Kimberley',2),('Northern Cape','Kuruman',3),('Northern Cape','Springbok',4),
  ('Northern Cape','Upington',5)
) as city(province_name, name, sort_order) on city.province_name = p.name;
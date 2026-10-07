-- Opciones de la empresa que edita el super admin: datos, logo, alertas de stock y tallas.
-- Es una sola fila (id = 1). Todo usuario con acceso la lee; solo el super admin la cambia.
-- Se puede volver a ejecutar sin errores.

create table if not exists public.empresa (
  id smallint primary key default 1,
  razon_social text not null default 'Element First S.A.C.',
  nombre_comercial text not null default 'Element First',
  ruc text,
  direccion text,
  telefono text,
  correo text,
  logo_url text,
  stock_bajo integer not null default 6,
  riesgo_unidades integer not null default 4,
  riesgo_dias integer not null default 3,
  tallas text[] not null default array['28', '30', '32', '34', '36'],
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'empresa_una_fila') then
    alter table public.empresa add constraint empresa_una_fila check (id = 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'empresa_textos') then
    alter table public.empresa add constraint empresa_textos check (
      char_length(btrim(razon_social)) between 1 and 120
      and char_length(btrim(nombre_comercial)) between 1 and 60
      and coalesce(char_length(direccion), 0) <= 200
      and coalesce(char_length(telefono), 0) <= 30
      and coalesce(char_length(correo), 0) <= 120
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'empresa_ruc_formato') then
    alter table public.empresa add constraint empresa_ruc_formato check (ruc is null or ruc ~ '^(10|15|16|17|20)[0-9]{9}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'empresa_correo_formato') then
    alter table public.empresa add constraint empresa_correo_formato check (correo is null or correo ~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');
  end if;
  -- El logo solo puede ser un archivo del bucket "empresa" de este proyecto
  if not exists (select 1 from pg_constraint where conname = 'empresa_logo_propio') then
    alter table public.empresa add constraint empresa_logo_propio check (
      logo_url is null
      or logo_url like 'https://yeneobadnttqwbjmvajd.supabase.co/storage/v1/object/public/empresa/%'
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'empresa_alertas') then
    alter table public.empresa add constraint empresa_alertas check (
      stock_bajo between 1 and 999
      and riesgo_unidades between 0 and stock_bajo
      and riesgo_dias between 1 and 60
    );
  end if;
  -- De 1 a 20 tallas, cada una de 1 a 10 caracteres y sin el separador "|"
  if not exists (select 1 from pg_constraint where conname = 'empresa_tallas') then
    alter table public.empresa add constraint empresa_tallas check (
      cardinality(tallas) between 1 and 20
      and array_position(tallas, null) is null
      and array_to_string(tallas, '|') ~ '^[^|]{1,10}(\|[^|]{1,10})*$'
    );
  end if;
end $$;

insert into public.empresa (id, direccion) values (1, 'Lima, Perú') on conflict (id) do nothing;

-- Antes de guardar: limpia los textos y las tallas, anota quién y cuándo,
-- y no deja quitar una talla que todavía tiene stock.
create or replace function public.empresa_antes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_talla text;
  v_unidades bigint;
begin
  new.id := 1;
  new.razon_social := btrim(new.razon_social);
  new.nombre_comercial := btrim(new.nombre_comercial);
  new.ruc := nullif(btrim(coalesce(new.ruc, '')), '');
  new.direccion := nullif(btrim(coalesce(new.direccion, '')), '');
  new.telefono := nullif(btrim(coalesce(new.telefono, '')), '');
  new.correo := nullif(lower(btrim(coalesce(new.correo, ''))), '');
  new.tallas := coalesce((
    select array_agg(t order by primera)
    from (
      select btrim(x) as t, min(o) as primera
      from unnest(new.tallas) with ordinality as u (x, o)
      where btrim(coalesce(x, '')) <> ''
      group by btrim(x)
    ) q
  ), array[]::text[]);

  if tg_op = 'UPDATE' then
    for v_talla in select unnest(old.tallas) except select unnest(new.tallas) loop
      select coalesce(sum(i.cantidad), 0) into v_unidades from public.inventario i where i.talla = v_talla;
      if v_unidades > 0 then
        raise exception 'No puedes quitar la talla %: todavía hay % unidades en stock.', v_talla, v_unidades
          using errcode = '23514';
      end if;
    end loop;
  end if;

  new.actualizado_en := now();
  new.actualizado_por := (select auth.uid());
  return new;
end $$;

revoke execute on function public.empresa_antes() from public, anon, authenticated;

create or replace trigger empresa_antes before insert or update on public.empresa
  for each row execute function public.empresa_antes();

-- Cada cambio queda en el Registro del sistema, como en las demás tablas
create or replace trigger auditar_empresa after update on public.empresa
  for each row execute function public.auditar_cambio();

alter table public.empresa enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_leer' and tablename = 'empresa') then
    create policy empresa_leer on public.empresa for select to authenticated
      using ((select public.puede_acceder()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_editar' and tablename = 'empresa') then
    create policy empresa_editar on public.empresa for update to authenticated
      using ((select public.es_super_admin()))
      with check ((select public.es_super_admin()));
  end if;
end $$;

-- Nadie crea ni borra la fila desde la app; solo se leen y se cambian estas columnas
revoke all on public.empresa from anon, authenticated;
grant select on public.empresa to authenticated;
grant update (razon_social, nombre_comercial, ruc, direccion, telefono, correo, logo_url,
              stock_bajo, riesgo_unidades, riesgo_dias, tallas)
  on public.empresa to authenticated;

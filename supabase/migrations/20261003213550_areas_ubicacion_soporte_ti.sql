-- Áreas de personal (Logística, Tienda, Almacén, Soporte TI) y ubicación asignada.
-- Tienda y Almacén solo ven y operan ventas, stock y órdenes de compra de su ubicación.
-- Aplicada en partes: areas_ubicacion_1_columnas (20261003213550) … areas_ubicacion_5_observabilidad_soporte (20261003213745).

-- 1) Columnas y validaciones
alter table public.perfiles
  add column if not exists area text,
  add column if not exists almacen_id bigint references public.almacenes (id) on delete restrict;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'perfiles_area_valida') then
    alter table public.perfiles add constraint perfiles_area_valida check (area is null or area in ('logistica', 'tienda', 'almacen', 'soporte_ti'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'perfiles_area_con_ubicacion') then
    alter table public.perfiles add constraint perfiles_area_con_ubicacion check (area is null or area not in ('tienda', 'almacen') or almacen_id is not null);
  end if;
end $$;
create index if not exists perfiles_almacen_id_idx on public.perfiles (almacen_id);

-- 2) Funciones auxiliares (null = sin límite de ubicación)
create or replace function public.ubicacion_restringida() returns bigint language sql stable security definer set search_path = '' as $fn$ select case when p.rol <> 'administrador' and p.area in ('tienda', 'almacen') then p.almacen_id end from public.perfiles p where p.id = (select auth.uid()); $fn$;
create or replace function public.es_soporte_ti() returns boolean language sql stable security definer set search_path = '' as $fn$ select coalesce((select p.activo and p.area = 'soporte_ti' from public.perfiles p where p.id = (select auth.uid())), false); $fn$;
revoke execute on function public.ubicacion_restringida() from public, anon;
revoke execute on function public.es_soporte_ti() from public, anon;
grant execute on function public.ubicacion_restringida() to authenticated;
grant execute on function public.es_soporte_ti() to authenticated;
create or replace function public.puede_acceder() returns boolean language sql stable security definer set search_path = '' as $fn$ select coalesce((select p.activo and (p.rol in ('administrador','gerente','consulta','colaborador') or p.area = 'soporte_ti' or exists (select 1 from jsonb_each_text(p.permisos) e where e.value in ('ver','editar','true'))) from public.perfiles p where p.id = (select auth.uid())), false); $fn$;

-- 3) Ventas, detalle e inventario limitados a la ubicación
alter policy ventas_leer on public.ventas
  using ((select public.puede_ver('{ventas,clientes,dashboard,reportes,canales}'::text[]))
         and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));
alter policy ventas_escribir on public.ventas
  using (public.tiene_permiso('ventas') and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())))
  with check (public.tiene_permiso('ventas') and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));
alter policy venta_items_leer on public.venta_items
  using ((select public.puede_ver('{ventas,clientes,dashboard,reportes,canales}'::text[]))
         and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ventas v where v.id = venta_id)));
alter policy venta_items_escribir on public.venta_items
  using (public.tiene_permiso('ventas') and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ventas v where v.id = venta_id)))
  with check (public.tiene_permiso('ventas') and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ventas v where v.id = venta_id)));
alter policy inventario_leer on public.inventario
  using ((select public.puede_acceder())
         and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));
alter policy inventario_escribir on public.inventario
  using ((public.tiene_permiso('ventas') or public.tiene_permiso('ordenes_compra'))
         and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())))
  with check ((public.tiene_permiso('ventas') or public.tiene_permiso('ordenes_compra'))
         and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));

-- 4) Órdenes de compra (destino) y Registro del sistema para Soporte TI
alter policy ordenes_compra_leer on public.ordenes_compra
  using ((select public.puede_ver('{proveedores,ordenes_compra}'::text[]))
         and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));
alter policy ordenes_compra_escribir on public.ordenes_compra
  using (public.tiene_permiso('ordenes_compra') and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())))
  with check (public.tiene_permiso('ordenes_compra') and ((select public.ubicacion_restringida()) is null or almacen_id = (select public.ubicacion_restringida())));
alter policy orden_compra_items_leer on public.orden_compra_items
  using ((select public.puede_ver('{proveedores,ordenes_compra}'::text[]))
         and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ordenes_compra o where o.id = orden_compra_id)));
alter policy orden_compra_items_escribir on public.orden_compra_items
  using (public.tiene_permiso('ordenes_compra') and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ordenes_compra o where o.id = orden_compra_id)))
  with check (public.tiene_permiso('ordenes_compra') and ((select public.ubicacion_restringida()) is null or exists (select 1 from public.ordenes_compra o where o.id = orden_compra_id)));
alter policy registro_eventos_leer on public.registro_eventos
  using ((select public.es_super_admin()) or (select public.es_soporte_ti()));

-- 5) Métricas del registro también para Soporte TI
do $do$
declare d text;
begin
  select pg_get_functiondef('public.resumen_observabilidad(timestamp with time zone)'::regprocedure) into d;
  if position('if not public.es_super_admin() then' in d) > 0 then
    execute replace(d, 'if not public.es_super_admin() then', 'if not (public.es_super_admin() or public.es_soporte_ti()) then');
  end if;
end
$do$;

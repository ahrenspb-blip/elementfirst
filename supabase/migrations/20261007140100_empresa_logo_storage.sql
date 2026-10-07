-- Logo de la empresa: bucket público y permisos (solo el super admin sube, cambia o borra).
-- Se puede volver a ejecutar sin errores.

-- Bucket público del logo: 2 MB como máximo, solo JPG, PNG o WEBP
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('empresa', 'empresa', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Solo el super admin sube, cambia o borra archivos del bucket "empresa"
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_archivos_ver' and tablename = 'objects') then
    create policy empresa_archivos_ver on storage.objects for select to authenticated
      using (bucket_id = 'empresa' and (select public.es_super_admin()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_archivos_subir' and tablename = 'objects') then
    create policy empresa_archivos_subir on storage.objects for insert to authenticated
      with check (bucket_id = 'empresa' and (select public.es_super_admin()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_archivos_cambiar' and tablename = 'objects') then
    create policy empresa_archivos_cambiar on storage.objects for update to authenticated
      using (bucket_id = 'empresa' and (select public.es_super_admin()))
      with check (bucket_id = 'empresa' and (select public.es_super_admin()));
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'empresa_archivos_borrar' and tablename = 'objects') then
    create policy empresa_archivos_borrar on storage.objects for delete to authenticated
      using (bucket_id = 'empresa' and (select public.es_super_admin()));
  end if;
end $$;

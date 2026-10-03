-- DNI (8 dígitos, único), sexo (hombre/mujer) y foto de perfil de cada usuario
alter table public.perfiles
  add column if not exists dni text,
  add column if not exists sexo text,
  add column if not exists foto_url text;

alter table public.perfiles
  add constraint perfiles_dni_formato check (dni is null or dni ~ '^[0-9]{8}$'),
  add constraint perfiles_sexo_valido check (sexo is null or sexo in ('hombre', 'mujer')),
  -- La foto solo puede ser un archivo del propio usuario dentro del bucket "avatares"
  add constraint perfiles_foto_propia check (
    foto_url is null
    or foto_url like 'https://yeneobadnttqwbjmvajd.supabase.co/storage/v1/object/public/avatares/' || id::text || '/%'
  );

create unique index if not exists perfiles_dni_unico on public.perfiles (dni) where dni is not null;

-- Cada usuario puede cambiar su propia foto (la política perfiles_editar_propio ya limita a su fila).
-- DNI y sexo solo los cambia un administrador desde la función admin-usuarios.
grant update (foto_url) on public.perfiles to authenticated;

-- Bucket público de fotos: 2 MB máximo, solo imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario solo puede ver, subir, cambiar o borrar archivos dentro de su carpeta (su id)
create policy avatares_ver_propios on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatares_subir_propios on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatares_actualizar_propios on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy avatares_borrar_propios on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

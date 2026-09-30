import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL  = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

// Módulo -> ¿admite "editar"? Los que no, solo pueden ser "ver".
const MODULOS: Record<string, boolean> = {
  dashboard: false, ventas: true, inventario: false, productos: true, clientes: false,
  canales: false, reportes: false, alertas: false, proveedores: true, almacenes: true,
  ordenes_compra: true,
};
const BANEO = "876000h"; // ~100 años: desactivar el acceso sin borrar la cuenta.

type Permisos = Record<string, "ver" | "editar">;

function limpiarPermisos(permisos: unknown): Permisos {
  const out: Permisos = {};
  if (!permisos || typeof permisos !== "object") return out;
  for (const [m, editable] of Object.entries(MODULOS)) {
    const v = (permisos as Record<string, unknown>)[m];
    if (v === "editar" || v === true) out[m] = editable ? "editar" : "ver";
    else if (v === "ver") out[m] = "ver";
  }
  return out;
}

// Acepta también los roles antiguos (gerente/consulta/colaborador) por si
// llega una petición de una versión anterior de la página.
function normalizar(rol: string, permisos: unknown): { rol: string; permisos: Permisos } | null {
  const todos = (nivel: "ver" | "editar") =>
    Object.fromEntries(Object.entries(MODULOS).map(([m, ed]) => [m, nivel === "editar" && ed ? "editar" : "ver"])) as Permisos;
  if (rol === "administrador") return { rol, permisos: {} };
  if (rol === "usuario") return { rol, permisos: limpiarPermisos(permisos) };
  if (rol === "gerente") return { rol: "usuario", permisos: todos("editar") };
  if (rol === "consulta") return { rol: "usuario", permisos: todos("ver") };
  if (rol === "colaborador") return { rol: "usuario", permisos: limpiarPermisos(permisos) };
  return null;
}

async function quienLlama(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token === ANON) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: perfil } = await admin
    .from("perfiles").select("id, nombre, rol, activo").eq("id", data.user.id).single();
  return perfil ? { ...perfil, email: data.user.email ?? "" } : null;
}

async function hayAdministradores() {
  const { count } = await admin
    .from("perfiles").select("id", { count: "exact", head: true })
    .eq("rol", "administrador").eq("activo", true);
  return (count ?? 0) > 0;
}

// ¿Quedaría al menos un administrador activo si "id" deja de serlo?
async function quedaOtroAdmin(id: string) {
  const { count } = await admin
    .from("perfiles").select("id", { count: "exact", head: true })
    .eq("rol", "administrador").eq("activo", true).neq("id", id);
  return (count ?? 0) > 0;
}

// Contraseña temporal: el usuario deberá cambiarla al iniciar sesión.
async function crear(email: string, password: string, nombre: string, rol: string, permisos?: unknown, temporal = true) {
  if (!email || !password) return json({ error: "Correo y contraseña son obligatorios" }, 400);
  if (password.length < 8)  return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  const n = normalizar(rol, permisos);
  if (!n) return json({ error: "Rol no válido" }, 400);
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre: nombre || email },
  });
  if (error) return json({ error: error.message }, 400);
  await admin.from("perfiles")
    .update({ nombre: nombre || email, rol: n.rol, permisos: n.permisos, activo: true, debe_cambiar_clave: temporal })
    .eq("id", data.user.id);
  return json({ ok: true, id: data.user.id });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "Método no permitido" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const accion = body?.accion;

  if (accion === "hay_admin") return json({ hay: await hayAdministradores() });

  if (accion === "bootstrap") {
    if (await hayAdministradores())
      return json({ error: "Ya existe un administrador. Inicia sesión." }, 403);
    return await crear(body.email, body.password, body.nombre, "administrador", undefined, false);
  }

  const perfil = await quienLlama(req);
  if (!perfil)                                         return json({ error: "No autenticado" }, 401);

  // Cualquier usuario activo: cambiar su propia contraseña (p. ej. la temporal).
  if (accion === "cambiar_clave_propia") {
    if (!perfil.activo) return json({ error: "Tu cuenta está desactivada" }, 403);
    const password = String(body.password ?? "");
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password))
      return json({ error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número" }, 400);
    const prueba = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error: igual } = await prueba.auth.signInWithPassword({ email: perfil.email, password });
    if (!igual) {
      // Solo cierra esta sesión de prueba ("local"); la global cerraría también la del usuario.
      await prueba.auth.signOut({ scope: "local" });
      return json({ error: "La nueva contraseña debe ser distinta de la actual" }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(perfil.id, { password });
    if (error) return json({ error: error.message }, 400);
    await admin.from("perfiles").update({ debe_cambiar_clave: false }).eq("id", perfil.id);
    return json({ ok: true });
  }

  if (perfil.rol !== "administrador" || !perfil.activo) return json({ error: "Requiere rol administrador" }, 403);

  if (accion === "listar") {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const { data: perfiles } = await admin.from("perfiles").select("id, nombre, rol, permisos, activo, debe_cambiar_clave");
    const mapa = Object.fromEntries((perfiles ?? []).map((p: any) => [p.id, p]));
    return json({
      usuarios: (users?.users ?? []).map((u: any) => {
        const p = mapa[u.id];
        const n = normalizar(p?.rol ?? "usuario", p?.permisos) ?? { rol: "usuario", permisos: {} };
        return {
          id: u.id, email: u.email,
          nombre: p?.nombre ?? u.email,
          rol: n.rol, permisos: n.permisos,
          activo: p?.activo ?? true,
          debe_cambiar_clave: p?.debe_cambiar_clave ?? false,
          ultimo_acceso: u.last_sign_in_at, creado: u.created_at,
        };
      }),
    });
  }

  if (accion === "crear")
    return await crear(body.email, body.password, body.nombre, body.rol ?? "usuario", body.permisos);

  // Guarda nombre, rol, permisos, estado y (opcional) contraseña nueva.
  if (accion === "guardar") {
    const id = body.id;
    if (!id) return json({ error: "Falta el usuario" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", id).single();
    if (!actual) return json({ error: "Usuario no encontrado" }, 404);

    const n = normalizar(body.rol, body.permisos);
    if (!n) return json({ error: "Rol no válido" }, 400);
    const activo = body.activo !== false;
    const esYo = id === perfil.id;

    if (esYo && n.rol !== "administrador") return json({ error: "No puedes quitarte el rol de administrador" }, 400);
    if (esYo && !activo)                   return json({ error: "No puedes desactivar tu propia cuenta" }, 400);
    const dejaDeSerAdminActivo = actual.rol === "administrador" && actual.activo && (n.rol !== "administrador" || !activo);
    if (dejaDeSerAdminActivo && !(await quedaOtroAdmin(id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);

    if (body.password) {
      if (String(body.password).length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password: String(body.password) });
      if (error) return json({ error: error.message }, 400);
    }
    if (activo !== actual.activo) {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? "none" : BANEO });
      if (error) return json({ error: error.message }, 400);
    }
    const cambios: Record<string, unknown> = { rol: n.rol, permisos: n.permisos, activo };
    // Si el administrador le puso una contraseña nueva, es temporal (salvo la suya propia).
    if (body.password && !esYo) cambios.debe_cambiar_clave = true;
    if (typeof body.nombre === "string" && body.nombre.trim()) cambios.nombre = body.nombre.trim();
    const { error } = await admin.from("perfiles").update(cambios).eq("id", id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  // Acciones de la versión anterior de la página (se mantienen compatibles).
  if (accion === "cambiar_rol") {
    if (body.id === perfil.id) return json({ error: "No puedes cambiar tu propio rol" }, 400);
    const n = normalizar(body.rol, body.permisos);
    if (!n) return json({ error: "Rol no válido" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", body.id).single();
    if (actual?.rol === "administrador" && n.rol !== "administrador" && !(await quedaOtroAdmin(body.id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);
    const { error } = await admin.from("perfiles").update({ rol: n.rol, permisos: n.permisos }).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "cambiar_permisos") {
    const { error } = await admin
      .from("perfiles").update({ permisos: limpiarPermisos(body.permisos) }).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "eliminar") {
    if (body.id === perfil.id) return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", body.id).single();
    if (actual?.rol === "administrador" && actual.activo && !(await quedaOtroAdmin(body.id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);
    const { error } = await admin.auth.admin.deleteUser(body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
});

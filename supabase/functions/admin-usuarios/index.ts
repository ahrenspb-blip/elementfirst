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
const ROLES = ["administrador", "gerente", "consulta", "colaborador"];
const MODULOS = ["ventas", "productos", "proveedores", "almacenes", "ordenes_compra"];

function limpiarPermisos(permisos: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (permisos && typeof permisos === "object") {
    for (const m of MODULOS) {
      if ((permisos as Record<string, unknown>)[m] === true) out[m] = true;
    }
  }
  return out;
}

async function quienLlama(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token === ANON) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: perfil } = await admin
    .from("perfiles").select("id, nombre, rol").eq("id", data.user.id).single();
  return perfil ?? null;
}

async function hayAdministradores() {
  const { count } = await admin
    .from("perfiles").select("id", { count: "exact", head: true }).eq("rol", "administrador");
  return (count ?? 0) > 0;
}

async function crear(email: string, password: string, nombre: string, rol: string, permisos?: unknown) {
  if (!email || !password) return json({ error: "Correo y contraseña son obligatorios" }, 400);
  if (password.length < 8)  return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  if (!ROLES.includes(rol))  return json({ error: "Rol no válido" }, 400);
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre: nombre || email },
  });
  if (error) return json({ error: error.message }, 400);
  const update: Record<string, unknown> = { nombre: nombre || email, rol };
  if (rol === "colaborador") update.permisos = limpiarPermisos(permisos);
  await admin.from("perfiles").update(update).eq("id", data.user.id);
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
    return await crear(body.email, body.password, body.nombre, "administrador");
  }

  const perfil = await quienLlama(req);
  if (!perfil)                       return json({ error: "No autenticado" }, 401);
  if (perfil.rol !== "administrador") return json({ error: "Requiere rol administrador" }, 403);

  if (accion === "listar") {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const { data: perfiles } = await admin.from("perfiles").select("id, nombre, rol, permisos");
    const mapa = Object.fromEntries((perfiles ?? []).map((p: any) => [p.id, p]));
    return json({
      usuarios: (users?.users ?? []).map((u: any) => ({
        id: u.id, email: u.email,
        nombre: mapa[u.id]?.nombre ?? u.email,
        rol: mapa[u.id]?.rol ?? "consulta",
        permisos: mapa[u.id]?.permisos ?? {},
        ultimo_acceso: u.last_sign_in_at, creado: u.created_at,
      })),
    });
  }

  if (accion === "crear")
    return await crear(body.email, body.password, body.nombre, body.rol ?? "consulta", body.permisos);

  if (accion === "cambiar_rol") {
    if (!ROLES.includes(body.rol)) return json({ error: "Rol no válido" }, 400);
    if (body.id === perfil.id)     return json({ error: "No puedes cambiar tu propio rol" }, 400);
    const update: Record<string, unknown> = { rol: body.rol };
    if (body.rol !== "colaborador") update.permisos = {};
    const { error } = await admin.from("perfiles").update(update).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "cambiar_permisos") {
    const { error } = await admin
      .from("perfiles").update({ permisos: limpiarPermisos(body.permisos) }).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "eliminar") {
    if (body.id === perfil.id) return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
    const { error } = await admin.auth.admin.deleteUser(body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
});

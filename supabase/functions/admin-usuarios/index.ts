import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const URL  = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SVC  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-transaction-id, x-request-id",
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
    .from("perfiles").select("id, nombre, rol, activo, area").eq("id", data.user.id).single();
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

type Personales = { dni?: string | null; sexo?: string | null };

// DNI (8 dígitos) y sexo (hombre/mujer). Solo se incluyen los campos que llegan en la solicitud.
function datosPersonales(body: any): Personales | string {
  const out: Personales = {};
  if (body && "dni" in body) {
    const dni = body.dni == null ? "" : String(body.dni).trim();
    if (dni && !/^\d{8}$/.test(dni)) return "El DNI debe tener 8 dígitos";
    out.dni = dni || null;
  }
  if (body && "sexo" in body) {
    const sexo = body.sexo == null ? "" : String(body.sexo);
    if (sexo && sexo !== "hombre" && sexo !== "mujer") return "El sexo debe ser hombre o mujer";
    out.sexo = sexo || null;
  }
  return out;
}

async function dniOcupado(dni: string | null | undefined, exceptoId?: string) {
  if (!dni) return false;
  let q = admin.from("perfiles").select("id", { count: "exact", head: true }).eq("dni", dni);
  if (exceptoId) q = q.neq("id", exceptoId);
  const { count } = await q;
  return (count ?? 0) > 0;
}

const AREAS = ["logistica", "tienda", "almacen", "soporte_ti"];
type AreaUbic = { area?: string | null; almacen_id?: number | null };

// Área de trabajo y ubicación. Tienda y Almacén necesitan una ubicación activa (Tienda: una tienda).
// Solo se incluye si la solicitud trae "area"; un administrador no tiene área.
async function datosArea(body: any, rol: string): Promise<AreaUbic | string> {
  if (!body || !("area" in body)) return {};
  if (rol === "administrador") return { area: null, almacen_id: null };
  const area = body.area ? String(body.area) : null;
  if (area && !AREAS.includes(area)) return "Área no válida";
  if (area !== "tienda" && area !== "almacen") return { area, almacen_id: null };
  const id = Number(body.almacen_id);
  if (!Number.isInteger(id) || id <= 0) return area === "tienda" ? "Elige la tienda donde trabaja" : "Elige el almacén donde trabaja";
  const { data: alm } = await admin.from("almacenes").select("id, tipo, activo").eq("id", id).maybeSingle();
  if (!alm || !alm.activo) return "La ubicación elegida no existe o está desactivada";
  if (area === "tienda" && alm.tipo !== "tienda") return "Para el área Tienda elige una ubicación de tipo tienda";
  return { area, almacen_id: id };
}

const mensajeBd = (m: string) => /perfiles_dni_unico|duplicate key/.test(m) ? "Ya existe un usuario con ese DNI" : m;

// Contraseña temporal: el usuario deberá cambiarla al iniciar sesión.
async function crear(bd: SupabaseClient, email: string, password: string, nombre: string, rol: string, permisos?: unknown, temporal = true, personales: Personales & AreaUbic = {}) {
  if (!email || !password) return json({ error: "Correo y contraseña son obligatorios" }, 400);
  if (password.length < 8)  return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  const n = normalizar(rol, permisos);
  if (!n) return json({ error: "Rol no válido" }, 400);
  if (await dniOcupado(personales.dni)) return json({ error: "Ya existe un usuario con ese DNI" }, 400);
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { nombre: nombre || email },
  });
  if (error) return json({ error: error.message }, 400);
  const { error: ePerfil } = await bd.from("perfiles")
    .update({ nombre: nombre || email, rol: n.rol, permisos: n.permisos, activo: true, debe_cambiar_clave: temporal, ...personales })
    .eq("id", data.user.id);
  // Si el perfil no se pudo completar (p. ej. DNI repetido al mismo tiempo), no se deja una cuenta a medias.
  if (ePerfil) {
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: mensajeBd(ePerfil.message) }, 400);
  }
  return json({ ok: true, id: data.user.id });
}

// Traza del servidor: etapas de cada solicitud, unidas a la operación del usuario por x-transaction-id.
type Ctx = {
  tx: string | null; rq: string | null; accion: string; usuario: { id: string; nombre: string } | null;
  bd: SupabaseClient; pasos: Record<string, unknown>[];
  paso: (etapa: string, estado: string, nivel: string, mensaje: string, detalle?: unknown) => void;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const t0 = Date.now();
  const tx = req.headers.get("x-transaction-id")?.slice(0, 40) ?? null;
  const rq = req.headers.get("x-request-id")?.slice(0, 40) ?? null;
  const ctx: Ctx = {
    tx, rq, accion: "?", usuario: null, pasos: [],
    // Cliente por solicitud: los cambios auditados en la base de datos llevan el mismo Transaction ID.
    bd: tx ? createClient(URL, SVC, { auth: { persistSession: false }, global: { headers: { "x-transaction-id": tx, ...(rq ? { "x-request-id": rq } : {}) } } }) : admin,
    paso(etapa, estado, nivel, mensaje, detalle) {
      ctx.pasos.push({ tipo: "backend", etapa, estado, nivel, mensaje, detalle: detalle ?? null, modulo: "admin-usuarios",
        accion: ctx.accion, transaccion_id: tx, solicitud_id: rq, duracion_ms: Date.now() - t0, momento: new Date().toISOString() });
    },
  };
  let res: Response;
  try {
    res = await manejar(req, ctx);
  } catch (e) {
    ctx.paso("backend", "FAILED", "error", "Error inesperado en el servidor: " + String((e as Error)?.message ?? e));
    res = json({ error: "Error inesperado en el servidor" }, 500);
  }
  let error = "";
  if (res.status >= 400) { try { error = (await res.clone().json())?.error ?? ""; } catch { /* sin cuerpo */ } }
  ctx.paso("respuesta", res.status < 400 ? "COMPLETED" : "FAILED", res.status < 400 ? "ok" : "error",
    `Servidor respondió HTTP ${res.status} en ${Date.now() - t0} ms` + (error ? " · " + error : ""));
  // hay_admin se consulta en cada carga de la pantalla de inicio: solo se registra si falla.
  if (ctx.accion !== "hay_admin" || res.status >= 400) {
    const filas = ctx.pasos.map((p) => ({ ...p, usuario_id: ctx.usuario?.id ?? null, usuario_nombre: ctx.usuario?.nombre ?? null }));
    const { error: e } = await admin.from("registro_eventos").insert(filas);
    if (e) console.error("No se pudo registrar la traza", e.message);
  }
  return res;
});

async function manejar(req: Request, ctx: Ctx): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const accion = body?.accion;
  ctx.accion = String(accion ?? "?").slice(0, 40);
  ctx.paso("servidor", "RECEIVED", "info", `Servidor recibió la solicitud (acción: ${ctx.accion})`);

  if (accion === "hay_admin") return json({ hay: await hayAdministradores() });

  if (accion === "bootstrap") {
    if (await hayAdministradores())
      return json({ error: "Ya existe un administrador. Inicia sesión." }, 403);
    return await crear(ctx.bd, body.email, body.password, body.nombre, "administrador", undefined, false);
  }

  const perfil = await quienLlama(req);
  if (!perfil)                                         return json({ error: "No autenticado" }, 401);
  ctx.usuario = { id: perfil.id, nombre: perfil.nombre };
  ctx.paso("backend", "PROCESSING", "info", `Usuario verificado: ${perfil.nombre} (${perfil.rol}); procesando`);

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
    await ctx.bd.from("perfiles").update({ debe_cambiar_clave: false }).eq("id", perfil.id);
    return json({ ok: true });
  }

  // Administradores gestionan todo. Soporte TI gestiona usuarios que no son administradores.
  const esAdmin = perfil.rol === "administrador" && perfil.activo;
  const esSoporte = perfil.rol !== "administrador" && perfil.activo && perfil.area === "soporte_ti";
  const soloAdmin = ["cambiar_rol", "cambiar_permisos"].includes(accion);
  if (!esAdmin && !(esSoporte && !soloAdmin)) return json({ error: "Requiere rol administrador o Soporte TI" }, 403);

  if (accion === "listar") {
    const { data: users } = await admin.auth.admin.listUsers({ perPage: 200 });
    const { data: perfiles } = await admin.from("perfiles").select("id, nombre, rol, permisos, activo, debe_cambiar_clave, dni, sexo, foto_url, area, almacen_id");
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
          dni: p?.dni ?? null, sexo: p?.sexo ?? null, foto_url: p?.foto_url ?? null,
          area: p?.area ?? null, almacen_id: p?.almacen_id ?? null,
          ultimo_acceso: u.last_sign_in_at, creado: u.created_at,
        };
      }),
    });
  }

  if (accion === "crear") {
    const rol = body.rol ?? "usuario";
    if (!esAdmin && rol === "administrador") return json({ error: "Soporte TI no puede crear administradores" }, 403);
    const personales = datosPersonales(body);
    if (typeof personales === "string") return json({ error: personales }, 400);
    const area = await datosArea(body, rol);
    if (typeof area === "string") return json({ error: area }, 400);
    return await crear(ctx.bd, body.email, body.password, body.nombre, rol, body.permisos, true, { ...personales, ...area });
  }

  // Guarda nombre, rol, permisos, estado, DNI, sexo, área, ubicación y (opcional) contraseña nueva.
  if (accion === "guardar") {
    const id = body.id;
    if (!id) return json({ error: "Falta el usuario" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", id).single();
    if (!actual) return json({ error: "Usuario no encontrado" }, 404);

    const n = normalizar(body.rol, body.permisos);
    if (!n) return json({ error: "Rol no válido" }, 400);
    const activo = body.activo !== false;
    const esYo = id === perfil.id;
    if (!esAdmin) {
      if (actual.rol === "administrador" || n.rol === "administrador") return json({ error: "Soporte TI no puede modificar administradores" }, 403);
      if (esYo) return json({ error: "Pide a un administrador que cambie tu propio acceso" }, 403);
    }

    if (esYo && n.rol !== "administrador") return json({ error: "No puedes quitarte el rol de administrador" }, 400);
    if (esYo && !activo)                   return json({ error: "No puedes desactivar tu propia cuenta" }, 400);
    const dejaDeSerAdminActivo = actual.rol === "administrador" && actual.activo && (n.rol !== "administrador" || !activo);
    if (dejaDeSerAdminActivo && !(await quedaOtroAdmin(id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);
    // DNI y sexo se validan antes de tocar la contraseña o el estado, para no aplicar cambios a medias.
    const personales = datosPersonales(body);
    if (typeof personales === "string") return json({ error: personales }, 400);
    if (await dniOcupado(personales.dni, id)) return json({ error: "Ya existe un usuario con ese DNI" }, 400);
    const area = await datosArea(body, n.rol);
    if (typeof area === "string") return json({ error: area }, 400);

    if (body.password) {
      if (String(body.password).length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password: String(body.password) });
      if (error) return json({ error: error.message }, 400);
    }
    if (activo !== actual.activo) {
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: activo ? "none" : BANEO });
      if (error) return json({ error: error.message }, 400);
    }
    const cambios: Record<string, unknown> = { rol: n.rol, permisos: n.permisos, activo, ...personales, ...area };
    // Si el administrador le puso una contraseña nueva, es temporal (salvo la suya propia).
    if (body.password && !esYo) cambios.debe_cambiar_clave = true;
    if (typeof body.nombre === "string" && body.nombre.trim()) cambios.nombre = body.nombre.trim();
    const { error } = await ctx.bd.from("perfiles").update(cambios).eq("id", id);
    return error ? json({ error: mensajeBd(error.message) }, 400) : json({ ok: true });
  }

  // Acciones de la versión anterior de la página (se mantienen compatibles).
  if (accion === "cambiar_rol") {
    if (body.id === perfil.id) return json({ error: "No puedes cambiar tu propio rol" }, 400);
    const n = normalizar(body.rol, body.permisos);
    if (!n) return json({ error: "Rol no válido" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", body.id).single();
    if (actual?.rol === "administrador" && n.rol !== "administrador" && !(await quedaOtroAdmin(body.id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);
    const { error } = await ctx.bd.from("perfiles").update({ rol: n.rol, permisos: n.permisos }).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "cambiar_permisos") {
    const { error } = await ctx.bd
      .from("perfiles").update({ permisos: limpiarPermisos(body.permisos) }).eq("id", body.id);
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  if (accion === "eliminar") {
    if (body.id === perfil.id) return json({ error: "No puedes eliminar tu propia cuenta" }, 400);
    const { data: actual } = await admin.from("perfiles").select("rol, activo").eq("id", body.id).single();
    if (!esAdmin && actual?.rol === "administrador") return json({ error: "Soporte TI no puede eliminar administradores" }, 403);
    if (actual?.rol === "administrador" && actual.activo && !(await quedaOtroAdmin(body.id)))
      return json({ error: "Debe quedar al menos un administrador activo" }, 400);
    const { error } = await admin.auth.admin.deleteUser(body.id);
    if (error) return json({ error: error.message }, 400);
    // Borra también sus fotos de perfil (no bloquea si falla).
    const { data: fotos } = await admin.storage.from("avatares").list(String(body.id));
    if (fotos?.length) await admin.storage.from("avatares").remove(fotos.map((f) => `${body.id}/${f.name}`));
    return json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
}

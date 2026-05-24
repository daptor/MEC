// ======================================================
// 🎯 SELECCIÓN SOCIO REUNIÓN
// ======================================================
document.addEventListener("change", (e) => {
  if (e.target.name === "socioReunion") {
    const btn = document.getElementById("btnIngresarReunion");
    if (btn) btn.disabled = false;
  }
});

// ======================================================
// 🚀 INGRESAR A REUNIÓN (LOBBY MESA SINDICAL DIGITAL)
// ======================================================
const btnIngresarReunion = document.getElementById("btnIngresarReunion");

if (btnIngresarReunion) {
  btnIngresarReunion.addEventListener("click", async () => {
    const socioSeleccionado = document.querySelector(
      'input[name="socioReunion"]:checked'
    );
    if (!socioSeleccionado) {
      alert("⚠️ Debes seleccionar un socio.");
      return;
    }

    const socioId = socioSeleccionado.value;

    try {
      const { data: socio, error } = await supabase
        .from("socios")
        .select("*")
        .eq("id", socioId)
        .single();

      if (error || !socio) {
        alert("❌ Error obteniendo socio.");
        return;
      }

      // Identidad sindical global
      window.usuarioFederacion = {
        socio_id: socio.id,
        nombre: socio.nombre,
        rol: socio.rol,
        sindicato_id: socio.sindicato_id,
        sindicato_nombre: window.sindicatoFederacionActual?.nombre || ""
      };

      console.log("✅ usuarioFederacion:", window.usuarioFederacion);

      // Mostrar lobby Reunión Federación
      mostrarPantalla("pantalla-reunion-federacion");

      // Configurar lobby según rol (TESORERO / DIRECTOR_x vs SOCIO)
      if (typeof msd2_configurarLobbyPorRol === "function") {
        msd2_configurarLobbyPorRol();
      }

      alert("Ingreso correcto: " + socio.nombre);
    } catch (err) {
      console.error(err);
      alert("❌ Error ingresando a Mesa Sindical.");
    }
  });
}

// ======================================================
// MESA SINDICAL DIGITAL V2 – LOBBY + SALA
// Prefijo: msd2_*
// ======================================================

// Estado local de la sala
window.msd2_estado = {
  cola: [],            // [{ socio_id, nombre }]
  actual: null,        // socio actual hablando
  segRestantes: 0,
  timerId: null,
  running: false
};

// ------------------------------------------------------
// Helpers de rol
// ------------------------------------------------------
function msd2_esRolModeradorPotencial() {
  if (!window.usuarioFederacion || !window.usuarioFederacion.rol) return false;
  const rol = window.usuarioFederacion.rol.toUpperCase();
  if (rol === "TESORERO") return true;
  if (rol.startsWith("DIRECTOR_")) return true;
  return false;
}

function msd2_esModeradorActual() {
  if (!window.usuarioFederacion || !window.reunionFederacionActual) return false;
  return (
    window.usuarioFederacion.socio_id ===
    window.reunionFederacionActual.moderador_socio_id
  );
}

// ------------------------------------------------------
// LOBBY – Reunión Federación
// ------------------------------------------------------
function msd2_configurarLobbyPorRol() {
  const bloqueCrear = document.getElementById("msd2-bloque-crear-reunion");
  if (bloqueCrear) {
    bloqueCrear.style.display = msd2_esRolModeradorPotencial()
      ? "block"
      : "none";
  }

  const info = document.getElementById("msd2-lobby-usuario-info");
  if (info && window.usuarioFederacion) {
    info.textContent =
      "Sindicato: " +
      (window.usuarioFederacion.sindicato_nombre || "") +
      " — Usuario: " +
      window.usuarioFederacion.nombre +
      " (" +
      window.usuarioFederacion.rol +
      ")";
  }
}

// Crear reunión (solo desde lobby, TESORERO / DIRECTOR_x)
window.msd2_crearReunion = async function () {
  try {
    if (!msd2_esRolModeradorPotencial()) {
      alert("Solo DIRECTOR_x o TESORERO puede crear reuniones.");
      return;
    }
    if (!window.usuarioFederacion) {
      alert("No hay identidad sindical activa.");
      return;
    }

    const nombreInput = document.getElementById("msd2-input-nombre-reunion");
    const nombre = (nombreInput?.value || "").trim();
    if (!nombre) {
      alert("Escribe un nombre para la reunión.");
      return;
    }

    const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("reuniones")
      .insert([
        {
          codigo,
          nombre,
          estado: "activa",
          moderador_socio_id: window.usuarioFederacion.socio_id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("No se pudo crear la reunión.");
      return;
    }

    window.reunionFederacionActual = data;
    console.log("✅ reunión creada:", data);

    msd2_entrarSala();

    alert("✔ Reunión creada correctamente. Código: " + data.codigo);
  } catch (e) {
    console.error(e);
    alert("Error creando reunión.");
  }
};

// Unirse por código (todos los roles usan este camino)
window.msd2_unirsePorCodigo = async function () {
  try {
    const input = document.getElementById("msd2-input-codigo-reunion");
    const codigo = (input?.value || "").trim().toUpperCase();

    if (!codigo) {
      alert("Debes ingresar un código de reunión.");
      return;
    }

    const { data: reunion, error } = await supabase
      .from("reuniones")
      .select("*")
      .eq("codigo", codigo)
      .eq("estado", "activa")
      .maybeSingle();

    if (error) {
      console.error(error);
      alert("Error buscando reunión.");
      return;
    }

    if (!reunion) {
      alert("No existe una reunión activa con ese código.");
      return;
    }

    window.reunionFederacionActual = reunion;
    console.log("✅ Reunión encontrada:", reunion);

    msd2_entrarSala();
  } catch (e) {
    console.error(e);
    alert("Error al ingresar a la reunión.");
  }
};

// ------------------------------------------------------
// SALA – configuración básica
// ------------------------------------------------------
function msd2_configurarSalaBasica() {
  const reunion = window.reunionFederacionActual;
  if (!reunion) return;

  const spanCodigo = document.getElementById("msd2-codigo-reunion");
  if (spanCodigo) spanCodigo.textContent = reunion.codigo || "---";

  const modInfo = document.getElementById("msd2-moderador-info");
  if (modInfo) {
    modInfo.textContent = "Moderador: cargando...";
    supabase
      .from("socios")
      .select("nombre")
      .eq("id", reunion.moderador_socio_id)
      .single()
      .then(({ data }) => {
        if (data) modInfo.textContent = "Moderador: " + data.nombre;
      });
  }

  const hablandoNombre = document.getElementById("msd2-hablando-nombre");
  if (hablandoNombre) {
    hablandoNombre.textContent = "(Nadie está interviniendo)";
  }
}

function msd2_configurarVistaRolSala() {
  const controles = document.getElementById("msd2-controles-moderador");
  const inputDur = document.getElementById("msd2-duracion-min");
  const esMod = msd2_esModeradorActual();

  if (controles) controles.style.display = esMod ? "flex" : "none";
  if (inputDur) inputDur.disabled = !esMod;
}

// ------------------------------------------------------
// TIMER LOCAL REAL
// 🔥 SIN REINICIO EN PAUSA
// 🔥 SIN TIMER DUPLICADO
// 🔥 SINCRONIZADO CON SUPABASE
// ------------------------------------------------------
function msd2_iniciarTimerLocal() {

  // 🧹 limpiar interval anterior
  if (window.msd2_estado.timerId) {
    clearInterval(window.msd2_estado.timerId);
    window.msd2_estado.timerId = null;
  }

  // 🔥 activar estado
  window.msd2_estado.running = true;

  // 🖥 refrescar display inmediato
  msd2_actualizarDisplayTurno();

  // ⏱ iniciar timer real
  window.msd2_estado.timerId = setInterval(async () => {

    // 🛑 pausado
    if (!window.msd2_estado.running) {
      return;
    }

    // ⏰ tiempo terminado
    if (window.msd2_estado.segRestantes <= 0) {
      msd2_detenerTimer();
      return;
    }

    // 🔻 descontar
    window.msd2_estado.segRestantes--;

    // 🖥 actualizar display
    msd2_actualizarDisplayTurno();

    // ------------------------------------------------------
    // 🔥 SINCRONIZAR SEGUNDOS REALES EN BD
    // CLAVE PARA QUE PAUSA FUNCIONE
    // ------------------------------------------------------
    try {
      await supabase
        .from("reuniones")
        .update({
          seg_restantes:
            window.msd2_estado.segRestantes
        })
        .eq(
          "id",
          window.reunionFederacionActual.id
        );

    } catch (err) {
      console.error(
        "❌ Error sincronizando segundos:",
        err
      );
    }

  }, 1000);
}

// ------------------------------------------------------
// DETENER TIMER
// ------------------------------------------------------
function msd2_detenerTimer() {
  window.msd2_estado.running = false;
  if (window.msd2_estado.timerId) {
    clearInterval(window.msd2_estado.timerId);
    window.msd2_estado.timerId = null;
  }
}

// ======================================================
// 🟢 REGISTRAR PARTICIPANTE EN REUNIÓN (ASISTENCIA)
// Se ejecuta automáticamente al entrar a la sala
// ======================================================
async function registrarParticipanteEnReunion() {
  try {
    if (!window.usuarioFederacion) return;
    if (!window.reunionFederacionActual?.id) return;

    const reunionId = window.reunionFederacionActual.id;
    const usuario = window.usuarioFederacion;

    console.log("📝 Registrando participante:", usuario.nombre);

    const { error } = await supabase
      .from("reunion_participantes")
      .insert({
        reunion_id: reunionId,
        socio_id: usuario.socio_id,
        socio_nombre: usuario.nombre,
        sindicato_id: usuario.sindicato_id,
        sindicato_nombre: usuario.sindicato_nombre,
        es_moderador: 
        usuario.rol && 
        (usuario.rol.toUpperCase() === "TESORERO" ||
         usuario.rol.toUpperCase().startsWith("DIRECTOR_"))

      });

    if (error && error.code !== "23505") {
      console.error("❌ Error registrando participante:", error);
    } else {
      console.log("✅ Participante registrado");
    }

  } catch (err) {
    console.error("❌ Error asistencia:", err);
  }
}

// ======================================================
// 📋 GENERAR ACTA AUTOMÁTICA DE ASISTENCIA (CORREGIDA)
// ======================================================
async function generarAsistenciaReunion_v2(reunionId) {
  try {
    if (!reunionId) throw new Error("reunionId requerido");

    console.log("📋 Generando asistencia V2 para reunión:", reunionId);

    // 1) Obtener reunión (id, código, nombre, moderador)
    const { data: reunion, error: errReu } = await supabase
      .from("reuniones")
      .select("id, codigo, nombre, moderador_socio_id")
      .eq("id", reunionId)
      .single();

    if (errReu || !reunion) throw new Error("Reunión no encontrada");

    // 2) Idempotencia: ¿ya existe acta?
    const { data: existing, error: errExist } = await supabase
      .from("reunion_asistencia")
      .select("id")
      .eq("reunion_id", reunionId)
      .limit(1);

    if (errExist) throw new Error("Error verificando acta existente");
    if (existing && existing.length > 0) {
      console.log("ℹ️ Acta ya existente. ID:", existing[0].id);
      return existing[0];
    }

    // 3) Obtener todos los socios
    const { data: socios, error: errSocios } = await supabase
      .from("socios")
      .select("id, nombre, sindicato_id")
      .order("nombre", { ascending: true });

    if (errSocios) throw new Error("No se pudieron obtener socios");

    // 3.b) Obtener nombres de sindicatos para mapear sindicato_id → sindicato_nombre
    const { data: sindicatos, error: errSind } = await supabase
      .from("sindicatos")
      .select("id, nombre");

    if (errSind) throw new Error("No se pudieron obtener sindicatos");

    const mapaSindicatos = {};
    (sindicatos || []).forEach(s =>
      mapaSindicatos[String(s.id)] = s.nombre || ""
    );

    // 4) Obtener participantes de la reunión
    const { data: participantes, error: errPart } = await supabase
      .from("reunion_participantes")
      .select("socio_id")
      .eq("reunion_id", reunionId);

    if (errPart) throw new Error("No se pudieron obtener participantes");

    const asistentesSet = new Set((participantes || []).map(p => String(p.socio_id)));
    const totalSocios = (socios || []).length;
    const totalAsistentes = asistentesSet.size;
    const totalInasistentes = totalSocios - totalAsistentes;
    const porcentaje = totalSocios > 0
      ? Number(((totalAsistentes / totalSocios) * 100).toFixed(2))
      : 0;

    const codigoReunion = reunion.codigo || null;
    const nombreReunion = reunion.nombre || null;

    // 5) Determinar moderador_nombre (si se puede)
    let moderadorNombre = window.usuarioFederacion?.nombre || null;

    if (!moderadorNombre && reunion.moderador_socio_id) {
      const { data: mod, error: errMod } = await supabase
        .from("socios")
        .select("nombre")
        .eq("id", reunion.moderador_socio_id)
        .single();

      if (!errMod && mod) {
        moderadorNombre = mod.nombre;
      }
    }

    // 6) Insertar acta maestra
    const { data: asistencia, error: errAsis } = await supabase
      .from("reunion_asistencia")
      .insert({
        reunion_id: reunionId,
        codigo_reunion: codigoReunion,
        nombre_reunion: nombreReunion,
        moderador_nombre: moderadorNombre,
        total_socios: totalSocios,
        total_asistentes: totalAsistentes,
        total_inasistentes: totalInasistentes,
        porcentaje_asistencia: porcentaje,
        fecha_cierre: new Date().toISOString()
      })
      .select()
      .single();

    if (errAsis) {
      console.warn("⚠️ Error insertando asistencia, intento recuperar:", errAsis);
      const { data: rec, error: errRec } = await supabase
        .from("reunion_asistencia")
        .select("*")
        .eq("reunion_id", reunionId)
        .limit(1);
      if (errRec) throw new Error("No se pudo crear ni recuperar acta");
      if (rec && rec.length) return rec[0];
      throw new Error("No se pudo crear asistencia");
    }

    const asistenciaId = asistencia.id;

    // 7) Insertar detalle socio x socio (todas las columnas NOT NULL llenas)
    const detalle = (socios || []).map(socio => {
      const sid = socio.sindicato_id ? String(socio.sindicato_id) : null;
      const nombreSindicato = sid && mapaSindicatos[sid]
        ? mapaSindicatos[sid]
        : ""; // evitar null en columna NOT NULL

      return {
        asistencia_id: asistenciaId,
        socio_id: socio.id,
        socio_nombre: socio.nombre,
        sindicato_id: socio.sindicato_id || null,
        sindicato_nombre: nombreSindicato,
        asistio: asistentesSet.has(String(socio.id))
      };
    });

    const { error: errorDetalle } = await supabase
      .from("reunion_asistencia_detalle")
      .insert(detalle);

    if (errorDetalle) {
      console.error("❌ Error detalle asistencia (Supabase):", errorDetalle);
      throw new Error("Error guardando detalle asistencia");
    }

    console.log("✅ Acta de asistencia generada V2:", asistenciaId);
    return { ...asistencia, detalle_guardado: true };

  } catch (err) {
    console.error("❌ generarAsistenciaReunion_v2 error:", err);
    throw err;
  }
}

// ------------------------------------------------------
// ENTRAR A LA SALA (FIX REALTIME DEFINITIVO)
// ------------------------------------------------------
async function msd2_entrarSala() {

  // 🛑 detener timer anterior
  msd2_detenerTimer();

  // 🧹 reset estado local
  window.msd2_estado.cola = [];
  window.msd2_estado.actual = null;
  window.msd2_estado.segRestantes = 0;
  window.msd2_estado.running = false;

  // 🔒 validar reunión activa
  if (!window.reunionFederacionActual?.id) {

    console.error("❌ No existe reunión activa");

    alert("⚠️ Error al ingresar a la sala.");

    return;
  }

  const reunionId = window.reunionFederacionActual.id;

  console.log("🏛️ Entrando a sala:", reunionId);

  // 🎨 preparar UI
    msd2_configurarSalaBasica();
  // 🟢 REGISTRAR ASISTENCIA AUTOMÁTICA (NUEVO)
    await registrarParticipanteEnReunion();
    msd2_configurarVistaRolSala();

  // 🔹 cargar estado inicial desde BD
  await msd2_cargarColaDesdeBD();
  await msd2_cargarEstadoRelojDesdeBD();

  // 🧠 pequeña pausa para estabilizar DOM/UI
  await new Promise(resolve => setTimeout(resolve, 200));

  // 🔥 evitar doble realtime
  if (window.msd2_realtimeActivo === reunionId) {

    console.warn("⚠️ Realtime ya activo para esta sala");

  } else {

    console.log("📡 Activando realtime sala:", reunionId);

    await msd2_suscribirseReloj(reunionId);

    window.msd2_realtimeActivo = reunionId;
  }

  // 🖥️ mostrar sala
  mostrarPantalla("pantalla-reunion-sala");
}

// ------------------------------------------------------
// CARGAR ESTADO INICIAL DEL RELOJ (para entrar tarde)
// ------------------------------------------------------
async function msd2_cargarEstadoRelojDesdeBD() {

  const { data } = await supabase
    .from("reuniones")
    .select("seg_restantes, reloj_activo")
    .eq("id", window.reunionFederacionActual.id)
    .single();

  if (!data) return;

  window.msd2_estado.segRestantes = data.seg_restantes || 0;

  if (data.reloj_activo) {
    msd2_iniciarTimerLocal();
  }

  msd2_actualizarDisplayTurno();
}

// ------------------------------------------------------
// COLA
// ------------------------------------------------------
function msd2_renderCola() {
  const ul = document.getElementById("msd2-turnos-cola");
  if (!ul) return;
  ul.innerHTML = "";

  if (!window.msd2_estado.cola.length) {
    const li = document.createElement("li");
    li.textContent = "No hay personas anotadas aún.";
    li.style.color = "#6b7280";
    ul.appendChild(li);
    return;
  }

  window.msd2_estado.cola.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${item.nombre}`;
    ul.appendChild(li);
  });
}

async function msd2_cargarColaDesdeBD() {
  const reunion = window.reunionFederacionActual;
  if (!reunion) return;

  const { data } = await supabase
    .from("reuniones_turnos")
    .select("*")
    .eq("reunion_id", reunion.id)
    .order("creado_en", { ascending: true });

  window.msd2_estado.cola = data || [];
  msd2_renderCola();
}

// ------------------------------------------------------
// DISPLAY RELOJ
// ------------------------------------------------------
function msd2_formatoTiempo(s) {
  const sec = Math.max(0, Math.floor(s));
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

function msd2_actualizarDisplayTurno() {
  const disp = document.getElementById("msd2-hablando-display");
  if (!disp) return;
  disp.textContent = msd2_formatoTiempo(window.msd2_estado.segRestantes || 0);
}

// ------------------------------------------------------
// CONTROLES MODERADOR (FULL SINCRONIZADOS + ORADOR)
// VERSION CORREGIDA 🔥
// ------------------------------------------------------
window.msd2_iniciarTurno = async function () {

  // 🔒 Solo moderador
  if (!msd2_esModeradorActual()) {

    alert("Solo el moderador puede controlar el tiempo.");

    return;
  }

  const reunion = window.reunionFederacionActual;

  if (!reunion) {

    console.error("❌ No existe reunión activa");

    return;
  }

  console.log("🎤 Iniciando turno...");

  // ------------------------------------------------------
  // 1️⃣ OBTENER COLA ACTUAL
  // ------------------------------------------------------
  const { data: cola, error } = await supabase
    .from("reuniones_turnos")
    .select("*")
    .eq("reunion_id", reunion.id)
    .order("creado_en", { ascending: true });

  if (error) {

    console.error("❌ Error obteniendo cola:", error);

    return;
  }

  // ------------------------------------------------------
  // 2️⃣ VALIDAR COLA
  // ------------------------------------------------------
  if (!cola || cola.length === 0) {

    alert("No hay personas en la cola.");

    return;
  }

  // ------------------------------------------------------
  // 3️⃣ TOMAR PRIMER ORADOR
  // ------------------------------------------------------
  const orador = cola[0];

  console.log("🗣 Próximo orador:", orador.nombre);

  // ------------------------------------------------------
  // 4️⃣ FEEDBACK VISUAL LOCAL INMEDIATO
  // ------------------------------------------------------
  const hablandoNombre = document.getElementById("msd2-hablando-nombre");

  if (hablandoNombre) {

    hablandoNombre.textContent = orador.nombre;
  }

  // ------------------------------------------------------
  // 5️⃣ DURACIÓN DEL TURNO
  // ------------------------------------------------------
  const durInput = document.getElementById("msd2-duracion-min");

  const min = durInput
    ? Number(durInput.value || 3)
    : 3;

  const segundos = min * 60;

  // ------------------------------------------------------
  // 6️⃣ ELIMINAR ORADOR DE LA COLA
  // 🔥 ESTO ERA EL BUG PRINCIPAL
  // ------------------------------------------------------
  const { error: deleteError } = await supabase
    .from("reuniones_turnos")
    .delete()
    .eq("id", orador.id);

  if (deleteError) {

    console.error("❌ Error eliminando turno:", deleteError);

    return;
  }

  console.log("🧹 Turno removido de cola");

  // ------------------------------------------------------
  // 7️⃣ ACTUALIZAR ESTADO DE REUNIÓN
  // ------------------------------------------------------
  const { error: updateError } = await supabase
    .from("reuniones")
    .update({

      seg_restantes: segundos,

      reloj_activo: true,

      orador_actual_id: orador.socio_id

    })
    .eq("id", reunion.id);

  if (updateError) {

    console.error("❌ Error iniciando turno:", updateError);

    return;
  }

  console.log("✅ Turno iniciado correctamente");

  // ------------------------------------------------------
  // 8️⃣ ACTUALIZAR UI LOCAL
  // ------------------------------------------------------
  window.msd2_estado.segRestantes = segundos;

  msd2_actualizarDisplayTurno();

  msd2_iniciarTimerLocal();

  // ------------------------------------------------------
  // 9️⃣ RECARGAR COLA LOCAL
  // ------------------------------------------------------
  await msd2_cargarColaDesdeBD();
};

// ------------------------------------------------------
// ⏸ PAUSAR / ▶ CONTINUAR
// VERSION REALTIME ESTABLE
// ------------------------------------------------------
window.msd2_pausarTurno = async function () {

  if (!msd2_esModeradorActual()) return;

  const reunionId =
    window.reunionFederacionActual.id;

  // ------------------------------------------------------
  // 🔍 obtener estado REAL desde BD
  // ------------------------------------------------------
  const { data: reunion, error: errLoad } =
    await supabase
      .from("reuniones")
      .select("reloj_activo")
      .eq("id", reunionId)
      .single();

  if (errLoad || !reunion) {

    console.error(
      "❌ Error leyendo estado reloj:",
      errLoad
    );

    return;
  }

  // ------------------------------------------------------
  // ⏸ PAUSAR
  // ------------------------------------------------------
  if (reunion.reloj_activo) {

    const { error } = await supabase
      .from("reuniones")
      .update({
        reloj_activo: false
      })
      .eq("id", reunionId);

    if (error) {

      console.error(
        "❌ Error pausando turno:",
        error
      );

      return;
    }

    console.log("⏸ Turno pausado");

    const btn =
      document.getElementById(
        "msd2-btn-pausar"
      );

    if (btn) {
      btn.textContent =
        "▶ Continuar";
    }

  }

  // ------------------------------------------------------
  // ▶ CONTINUAR
  // ------------------------------------------------------
  else {

    const { error } = await supabase
      .from("reuniones")
      .update({
        reloj_activo: true
      })
      .eq("id", reunionId);

    if (error) {

      console.error(
        "❌ Error continuando turno:",
        error
      );

      return;
    }

    console.log("▶ Turno continuado");

    const btn =
      document.getElementById(
        "msd2-btn-pausar"
      );

    if (btn) {
      btn.textContent =
        "⏸ Pausa";
    }
  }
};

// ------------------------------------------------------
// REINICIAR TURNO
// ------------------------------------------------------
window.msd2_reiniciarTurno = async function () {

  if (!msd2_esModeradorActual()) return;

  const durInput = document.getElementById("msd2-duracion-min");

  const min = durInput
    ? Number(durInput.value || 3)
    : 3;

  const segundos = min * 60;

  const { error } = await supabase
    .from("reuniones")
    .update({

      seg_restantes: segundos,

      reloj_activo: false,

      orador_actual_id: null

    })
    .eq("id", window.reunionFederacionActual.id);

  if (error) {

    console.error("❌ Error reiniciando turno:", error);

    return;
  }

  // 🔄 reset local
  msd2_detenerTimer();

  window.msd2_estado.segRestantes = segundos;

  msd2_actualizarDisplayTurno();

  const hablandoNombre = document.getElementById("msd2-hablando-nombre");

  if (hablandoNombre) {

    hablandoNombre.textContent = "(Nadie está interviniendo)";
  }

  console.log("⟲ Turno reiniciado");
};

// ------------------------------------------------------
// ANOTARSE EN TURNO
// ------------------------------------------------------
window.msd2_anotarmeTurno = async function () {

  const reunion = window.reunionFederacionActual;
  if (!reunion) {
    alert("No hay reunión activa.");
    return;
  }

  if (!window.usuarioFederacion) {
    alert("Usuario no cargado.");
    return;
  }

  console.log("👉 Intentando anotarse en cola:", window.usuarioFederacion.nombre);

  // 1️⃣ verificar si ya existe
  const { data: existente, error: errCheck } = await supabase
    .from("reuniones_turnos")
    .select("id")
    .eq("reunion_id", reunion.id)
    .eq("socio_id", window.usuarioFederacion.socio_id)
    .maybeSingle();

  if (errCheck) {
    console.error("❌ Error verificando cola:", errCheck);
    alert("Error verificando cola. Mira la consola.");
    return;
  }

  if (existente) {
    console.log("⚠️ Ya estaba en cola");
    document.getElementById("msd2-msg-anotado").style.display = "block";
    return;
  }

  // 2️⃣ INSERT REAL CON DEBUG
  const { data, error } = await supabase
    .from("reuniones_turnos")
    .insert({
      reunion_id: reunion.id,
      socio_id: window.usuarioFederacion.socio_id,
      nombre: window.usuarioFederacion.nombre
    })
    .select();

  if (error) {
    console.error("❌ ERROR INSERT TURNOS:", error);
    alert("No se pudo entrar a la cola. Revisa consola.");
    return;
  }

  console.log("✅ Insert exitoso en cola:", data);

  document.getElementById("msd2-msg-anotado").style.display = "block";

  // 🔄 recargar cola manual para el cliente actual
  await msd2_cargarColaDesdeBD();
};

// ------------------------------------------------------
// REALTIME SALA (RELOJ + COLA)
// VERSION ESTABLE REAL 🔥
// ------------------------------------------------------
async function msd2_suscribirseReloj(reunionId) {

  // 🔒 validar reunión
  if (!reunionId) {

    console.error("❌ reunionId inválido en realtime");

    return;
  }

  console.log("📡 Suscribiendo realtime sala:", reunionId);

  // 🧹 eliminar canal anterior
  if (window.msd2_canalRealtime) {

    console.log("🧹 Eliminando canal realtime anterior...");

    await supabase.removeChannel(window.msd2_canalRealtime);

    window.msd2_canalRealtime = null;
  }

  // 🔑 clave única usuario realtime
  const realtimeUserKey =
    window.usuarioFederacion?.socio_id ||
    crypto.randomUUID();

  console.log("👤 Presence key:", realtimeUserKey);

  // 🔥 crear canal limpio
  const canal = supabase.channel(
    "reunion-live-" + reunionId,
    {
      config: {

        broadcast: {
          self: false
        },

        presence: {
          key: realtimeUserKey
        }
      }
    }
  );

  // guardar referencia global
  window.msd2_canalRealtime = canal;


// ------------------------------------------------------
// 🕒 CAMBIOS EN REUNIÓN
// 🔥 SINCRONIZACIÓN GLOBAL RELOJ + ORADOR
// ------------------------------------------------------
canal.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "reuniones",
    filter: "id=eq." + reunionId
  },

  async (payload) => {

    console.log("🔥 UPDATE REUNION RECIBIDO:", payload);

    const r = payload.new;

    if (!r) {
      console.warn("⚠️ Payload reunión vacío");
      return;
    }

// ------------------------------------------------------
// 🔴 REUNIÓN CERRADA
// ------------------------------------------------------
    if (r.estado === "cerrada") {

      console.log(
        "🔴 Reunión cerrada por moderador"
      );

      msd2_cerrarSalaLocal();

      return;
    }

    // ------------------------------------------------------
    // 🔄 ACTUALIZAR ESTADO GLOBAL LOCAL
    // ------------------------------------------------------
    window.msd2_estado.segRestantes =
      Number(r.seg_restantes || 0);

    window.msd2_estado.running =
      !!r.reloj_activo;


    // ------------------------------------------------------
    // 🔥 ACTUALIZAR BOTÓN PAUSA / CONTINUAR
    // ------------------------------------------------------
    const btnPausa =
      document.getElementById(
        "msd2-btn-pausar"
      );

    if (btnPausa) {

      if (r.reloj_activo) {

        btnPausa.textContent =
          "⏸ Pausa";

      } else {

        btnPausa.textContent =
          "▶ Continuar";
      }
    }


    // ------------------------------------------------------
    // 🗣 ACTUALIZAR ORADOR
    // ------------------------------------------------------
    const el =
      document.getElementById(
        "msd2-hablando-nombre"
      );

    if (r.orador_actual_id) {

      console.log(
        "🗣 Nuevo orador:",
        r.orador_actual_id
      );

      const {
        data: socio,
        error
      } = await supabase
        .from("socios")
        .select("nombre")
        .eq("id", r.orador_actual_id)
        .single();

      if (error) {

        console.error(
          "❌ Error cargando orador:",
          error
        );

        if (el) {
          el.textContent =
            "(Interviniendo)";
        }

      } else {

        if (el) {
          el.textContent =
            socio?.nombre ||
            "(Interviniendo)";
        }
      }

    } else {

      console.log("🛑 Sin orador activo");

      if (el) {
        el.textContent =
          "(Nadie está interviniendo)";
      }
    }

    // ------------------------------------------------------
    // ⏱ CONTROL RELOJ GLOBAL
    // ------------------------------------------------------
        if (r.reloj_activo) {

        // 🔥 evitar recrear timer ya activo
        if (!window.msd2_estado.running) {
            console.log("▶ Iniciando timer realtime");
            msd2_iniciarTimerLocal();
        }
        } else {
        console.log("⏸ Deteniendo timer realtime");
        msd2_detenerTimer();
        }

    // ------------------------------------------------------
    // 🖥 ACTUALIZAR DISPLAY
    // ------------------------------------------------------
    msd2_actualizarDisplayTurno();


    // ------------------------------------------------------
    // 🎙 CONTROL GRABACIÓN ORADOR
    // ------------------------------------------------------
    const soyOrador = msd2_esOradorActual(r);

    // Si el reloj está activo y yo soy el orador → asegurar grabación iniciada
    if (soyOrador && r.reloj_activo) {
      await iniciarGrabacionOrador(r);
    }

    // Si el reloj se detiene o cambia el orador → detener grabación (si estaba)
    if (!r.reloj_activo || !soyOrador) {
      detenerYGuardarGrabacion();
    }


    // ------------------------------------------------------
    // 🔄 RECARGAR COLA
    // 🔥 IMPORTANTE:
    // el orador ya fue removido de la cola
    // ------------------------------------------------------
    await msd2_cargarColaDesdeBD();

    console.log(
      "✅ Estado reunión sincronizado"
    );
  }
);

// ------------------------------------------------------
// 👥 CAMBIOS EN COLA
// 🔥 SINCRONIZACIÓN GLOBAL COLA
// ------------------------------------------------------
canal.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "reuniones_turnos",
    filter: "reunion_id=eq." + reunionId
  },

  async (payload) => {

    console.log("👥 Cambio realtime COLA:", payload);

    // 🔄 refrescar cola completa
    await msd2_cargarColaDesdeBD();

    console.log("✅ Cola sincronizada");
  }
);

  // 🔥 SUSCRIPCIÓN SEGURA
  canal.subscribe((status) => {

    console.log("📡 Estado realtime:", status);

    if (status === "SUBSCRIBED") {
      console.log("✅ Realtime conectado correctamente");
    }

    if (status === "CHANNEL_ERROR") {
      console.error("❌ Error realtime canal");
    }

    if (status === "TIMED_OUT") {
      console.error("⏰ Timeout realtime");
    }

    if (status === "CLOSED") {
      console.warn("📴 Canal realtime cerrado");
    }
  });

  window.msd2_canalRealtime = canal;
}

// ------------------------------------------------------
// 🔴 CERRAR REUNIÓN
// ------------------------------------------------------
window.msd2_cerrarReunion = async function () {

  if (!msd2_esModeradorActual()) {
    alert("Solo el moderador puede cerrar la reunión.");
    return;
  }

  const reunion = window.reunionFederacionActual;

  if (!reunion?.id) {
    alert("No existe reunión activa.");
    return;
  }

  const confirmar = confirm(
    "¿Cerrar reunión para todos?"
  );

  if (!confirmar) return;

  console.log("🔴 Cerrando reunión...");

// ------------------------------------------------------
// 🟢 GENERAR ACTA DE ASISTENCIA (NUEVO)
// ------------------------------------------------------
await generarAsistenciaReunion_v2(reunion.id);

  // ------------------------------------------------------
  // 1️⃣ CERRAR REUNIÓN
  // ------------------------------------------------------
  const { error: errorReunion } = await supabase
    .from("reuniones")
    .update({
      estado: "cerrada",
      reloj_activo: false,
      seg_restantes: 0,
      orador_actual_id: null
    })
    .eq("id", reunion.id);

  if (errorReunion) {

    console.error(
      "❌ Error cerrando reunión:",
      errorReunion
    );

    alert("No se pudo cerrar la reunión.");

    return;
  }

  // ------------------------------------------------------
  // 2️⃣ LIMPIAR COLA
  // ------------------------------------------------------
  const { error: errorCola } = await supabase
    .from("reuniones_turnos")
    .delete()
    .eq("reunion_id", reunion.id);

  if (errorCola) {

    console.error(
      "❌ Error limpiando cola:",
      errorCola
    );
  }

  console.log("✅ Reunión cerrada");
};

// ------------------------------------------------------
// 🔴 CERRAR SALA LOCAL
// 🔥 Ejecutado en TODOS los clientes
// ------------------------------------------------------
function msd2_cerrarSalaLocal() {

  console.log("🔴 Cerrando sala local...");

  // ------------------------------------------------------
  // 🛑 DETENER TIMER
  // ------------------------------------------------------
  msd2_detenerTimer();

  // ------------------------------------------------------
  // 🧹 LIMPIAR ESTADO
  // ------------------------------------------------------
  window.msd2_estado.cola = [];
  window.msd2_estado.actual = null;
  window.msd2_estado.segRestantes = 0;
  window.msd2_estado.running = false;

  // ------------------------------------------------------
  // 🧹 LIMPIAR REALTIME
  // ------------------------------------------------------
  if (window.msd2_canalRealtime) {

    supabase.removeChannel(
      window.msd2_canalRealtime
    );

    window.msd2_canalRealtime = null;
  }

  window.msd2_realtimeActivo = null;

  // ------------------------------------------------------
  // 🧹 LIMPIAR UI
  // ------------------------------------------------------
  const cola =
    document.getElementById(
      "msd2-turnos-cola"
    );

  if (cola) {
    cola.innerHTML = "";
  }

  const hablando =
    document.getElementById(
      "msd2-hablando-nombre"
    );

  if (hablando) {hablando.textContent = "(Nadie está interviniendo)";}

  msd2_actualizarDisplayTurno();

  // ------------------------------------------------------
  // 🖥 VOLVER AL MENÚ
  // ------------------------------------------------------
  alert("📴 La reunión fue cerrada.");
    mostrarPantalla("menu-principal");
  console.log(
    "✅ Sala cerrada localmente"
  );
}

// ======================================================
// 📊 DASHBOARD ASISTENCIA - KPIs PRINCIPALES (FIX MEC)
// ======================================================
async function cargarDashboardAsistencia() {

    try {

        console.log("📊 Cargando dashboard de asistencia...");

        // 🔎 Buscar elementos reales del HTML (nuevos IDs)
        const elAsistencia = document.getElementById("stat-asistencia");
        const elReuniones  = document.getElementById("stat-reuniones");
        const elAsistentes = document.getElementById("stat-asistentes");
        const elUltima     = document.getElementById("stat-ultima");

        // 🚨 Si aún no existen en DOM → salir sin error
        if (!elAsistencia || !elReuniones || !elAsistentes || !elUltima) {
            console.warn("⚠️ KPIs aún no están en pantalla. Se cancela carga dashboard.");
            return;
        }

        // ==============================
        // 📡 Cargar datos desde Supabase
        // ==============================
        const { data, error } = await supabase
            .from("reunion_asistencia")
            .select("*")
            .order("fecha_cierre", { ascending: false });

        if (error) {
            console.error("Error cargando dashboard asistencia:", error);
            return;
        }

        // Si no hay reuniones aún
        if (!data || data.length === 0) {
            elAsistencia.innerText = "0%";
            elReuniones.innerText  = "0";
            elAsistentes.innerText = "0";
            elUltima.innerText     = "-";
            return;
        }

        // ==============================
        // 📊 TOTAL REUNIONES
        // ==============================
        const totalReuniones = data.length;
        elReuniones.innerText = totalReuniones;

        // ==============================
        // 📊 % ASISTENCIA PROMEDIO
        // ==============================
        const sumaPorcentajes = data.reduce((acc, r) =>
            acc + Number(r.porcentaje_asistencia || 0), 0);

        const promedioAsistencia =
            (sumaPorcentajes / totalReuniones).toFixed(1);

        elAsistencia.innerText = promedioAsistencia + "%";

        // ==============================
        // 👥 PROMEDIO ASISTENTES
        // ==============================
        const sumaAsistentes = data.reduce((acc, r) =>
            acc + Number(r.total_asistentes || 0), 0);

        const promedioAsistentes =
            Math.round(sumaAsistentes / totalReuniones);

        elAsistentes.innerText = promedioAsistentes;

        // ==============================
        // 🕒 ÚLTIMA REUNIÓN
        // ==============================
        const ultima = data[0];
        elUltima.innerText = ultima.porcentaje_asistencia + "%";

        console.log("✅ Dashboard asistencia cargado");

    } catch (err) {
        console.error("Error inesperado dashboard:", err);
    }
}

// ======================================================
// 📅 HISTORIAL DE REUNIONES
// ======================================================
async function cargarHistorialReuniones() {

    try {

        const tbody = document.getElementById("tabla-historial-reuniones");
        if (!tbody) return;

        tbody.innerHTML = "<tr><td colspan='5'>Cargando...</td></tr>";

        const { data, error } = await supabase
            .from("reunion_asistencia")
            .select("*")
            .order("fecha_cierre", { ascending: false });

        if (error) {
            console.error("Error cargando historial reuniones:", error);
            tbody.innerHTML = "<tr><td colspan='5'>Error cargando datos</td></tr>";
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5'>No hay reuniones registradas</td></tr>";
            return;
        }

        tbody.innerHTML = "";

        data.forEach(reunion => {

            const fila = document.createElement("tr");

            const fecha = reunion.fecha_cierre
                ? new Date(reunion.fecha_cierre).toLocaleDateString("es-CL")
                : "-";

            const reunionId = reunion.reunion_id;

            fila.innerHTML = `
                <td>${fecha}</td>
                <td>${reunion.nombre_reunion || "Reunión Federación"}</td>
                <td>${reunion.moderador_nombre || "-"}</td>
                <td>${reunion.porcentaje_asistencia || 0}%</td>
                <td>
                    <button onclick="verDetalleReunion('${reunionId}')">
                        Ver
                    </button>
                </td>
            `;

            tbody.appendChild(fila);
        });

    } catch (err) {
        console.error("Error inesperado historial:", err);
    }
}

// ======================================================
// 🔎 VER DETALLE DE REUNIÓN
// ======================================================
async function verDetalleReunion(reunionId) {

    try {

        const { data: acta, error: errActa } = await supabase
            .from("reunion_asistencia")
            .select("*")
            .eq("reunion_id", reunionId)
            .maybeSingle();

        if (errActa) {
            console.error(errActa);
            alert("Error cargando acta.");
            return;
        }

        if (!acta) {
            alert("No se encontró acta.");
            return;
        }

        const { data: detalle, error: errDet } = await supabase
            .from("reunion_asistencia_detalle")
            .select("*")
            .eq("asistencia_id", acta.id);

        if (errDet) {
            console.error(errDet);
            alert("Error cargando detalle.");
            return;
        }

        const asistentes = detalle.filter(d => d.asistio);
        const ausentes = detalle.filter(d => !d.asistio);
        const wrapperEl = document.getElementById("detalle-reunion-wrapper");
        const headerEl = document.getElementById("detalle-reunion-header");
        const ulAsistentes = document.getElementById("detalle-reunion-asistentes");
        const ulAusentes = document.getElementById("detalle-reunion-ausentes");

        if (!wrapperEl || !headerEl || !ulAsistentes || !ulAusentes) return;

        const fechaStr = acta.fecha_cierre
            ? new Date(acta.fecha_cierre).toLocaleString("es-CL")
            : "-";

        headerEl.innerHTML = `
            <p><strong>Reunión:</strong> ${acta.nombre_reunion || ""}</p>
            <p><strong>Código:</strong> ${acta.codigo_reunion || ""}</p>
            <p><strong>Moderador:</strong> ${acta.moderador_nombre || "-"}</p>
            <p><strong>Fecha cierre:</strong> ${fechaStr}</p>
            <p><strong>Total socios:</strong> ${acta.total_socios}</p>
            <p><strong>Asistentes:</strong> ${acta.total_asistentes} |
               <strong>Inasistentes:</strong> ${acta.total_inasistentes} |
               <strong>% Asistencia:</strong> ${acta.porcentaje_asistencia}%</p>
        `;

        ulAsistentes.innerHTML = "";
        asistentes.forEach(a => {
            const li = document.createElement("li");
            li.textContent = `${a.socio_nombre} (${a.sindicato_nombre})`;
            ulAsistentes.appendChild(li);
        });

        ulAusentes.innerHTML = "";
        ausentes.forEach(a => {
            const li = document.createElement("li");
            li.textContent = `${a.socio_nombre} (${a.sindicato_nombre})`;
            ulAusentes.appendChild(li);
        });

        wrapperEl.style.display = "block";

        await cargarAudiosReunion(reunionId);

    } catch (err) {
        console.error(err);
        alert("Error inesperado.");
    }
}


// ======================================================
// 🎙 CARGAR AUDIOS DE REUNIÓN
// ======================================================
async function cargarAudiosReunion(reunionId) {

    try {

        const contenedor = document.getElementById("detalle-reunion-audios");
        if (!contenedor) return;

        contenedor.innerHTML = "<p>Cargando intervenciones...</p>";

        const { data, error } = await supabase
            .from("reunion_intervenciones")
            .select("*")
            .eq("reunion_id", reunionId)
            .order("orden", { ascending: true });

        if (error) {
            console.error(error);
            contenedor.innerHTML = "<p>Error cargando intervenciones.</p>";
            return;
        }

        if (!data || data.length === 0) {
            contenedor.innerHTML = "<p>No existen intervenciones grabadas.</p>";
            return;
        }

        let html = "";

        for (const intervencion of data) {

            let audioUrl = "";

            if (intervencion.audio_path) {

                const { data: signedData } = await supabase
                    .storage
                    .from("reunion_intervenciones")
                    .createSignedUrl(intervencion.audio_path, 3600);

                audioUrl = signedData?.signedUrl || "";
            }

            html += `
                <div style="
                    border:1px solid #ddd;
                    border-radius:10px;
                    padding:12px;
                    margin-bottom:12px;
                    background:#f8f8f8;
                ">

                    <strong>🎤 ${intervencion.socio_nombre || "Socio"}</strong>

                    <br><br>

                    ${
                        audioUrl
                            ? `<audio controls style="width:100%;">
                                 <source src="${audioUrl}" type="audio/webm">
                               </audio>`
                            : ""
                    }

                </div>
            `;
        }

        contenedor.innerHTML = html;

    } catch (err) {
        console.error("❌ Error inesperado cargando audios:", err);
    }
}

// ======================================================
// 🔙 CERRAR ACTA DE REUNIÓN
// ======================================================
function cerrarDetalleReunion() {
  const wrapperEl = document.getElementById("detalle-reunion-wrapper");
  if (wrapperEl) {
    wrapperEl.style.display = "none";
  }

  const headerEl = document.getElementById("detalle-reunion-header");
  const ulAsist  = document.getElementById("detalle-reunion-asistentes");
  const ulAus    = document.getElementById("detalle-reunion-ausentes");

  if (headerEl) headerEl.innerHTML = "";
  if (ulAsist)  ulAsist.innerHTML  = "";
  if (ulAus)    ulAus.innerHTML    = "";
}

// ======================================================
// 📊 RANKING PARTICIPACIÓN POR SINDICATO
// ======================================================
async function cargarRankingSindicatos() {
  try {
    const tbody = document.getElementById("tabla-ranking-sindicatos");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

    // Usamos el detalle consolidado de todas las reuniones
    const { data, error } = await supabase
      .from("reunion_asistencia_detalle")
      .select("sindicato_id, sindicato_nombre, asistio");

    if (error) {
      console.error("Error ranking sindicatos:", error);
      tbody.innerHTML = "<tr><td colspan='4'>Error cargando datos</td></tr>";
      return;
    }

    if (!data || data.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4'>Sin datos aún</td></tr>";
      return;
    }

    // Acumular por sindicato
    const mapa = {};
    data.forEach(r => {
      const key = r.sindicato_id || "sin_sindicato";
      if (!mapa[key]) {
        mapa[key] = {
          nombre: r.sindicato_nombre || "Sin sindicato",
          total: 0,
          asistencias: 0
        };
      }
      mapa[key].total += 1;
      if (r.asistio) mapa[key].asistencias += 1;
    });

    const filas = Object.values(mapa)
      .map(s => {
        const porcentaje = s.total
          ? (s.asistencias / s.total) * 100
          : 0;
        return {
          ...s,
          inasistencias: s.total - s.asistencias,
          porcentaje
        };
      })
      // mejor a peor (como pediste)
      .sort((a, b) => b.porcentaje - a.porcentaje);

    tbody.innerHTML = "";

    filas.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.nombre}</td>
        <td>${s.asistencias}</td>
        <td>${s.inasistencias}</td>
        <td class="col-porcentaje"><strong>${s.porcentaje.toFixed(1)}%</strong></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error inesperado ranking sindicatos:", err);
  }
}

// ======================================================
// 👔 RANKING ASISTENCIA DIRECTORES
// ======================================================
async function cargarRankingDirectores() {
  try {
    const tbody = document.getElementById("tabla-ranking-directores");
    if (!tbody) return;

    tbody.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

    // 1) Detalle asistencia (todas las reuniones)
    const { data: detalle, error: errDet } = await supabase
      .from("reunion_asistencia_detalle")
      .select("asistencia_id, socio_id, socio_nombre, asistio");

    if (errDet) {
      console.error("Error detalle directores:", errDet);
      tbody.innerHTML = "<tr><td colspan='4'>Error cargando datos</td></tr>";
      return;
    }

    if (!detalle || detalle.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4'>Sin datos aún</td></tr>";
      return;
    }

// 2) Traer roles para saber quién es director
const { data: socios, error: errSoc } = await supabase
  .from("socios")
  .select("id, rol");

if (errSoc) {
  console.error("Error socios directores:", errSoc);
  tbody.innerHTML = "<tr><td colspan='4'>Error cargando roles</td></tr>";
  return;
}

const directoresSet = new Set(
  (socios || [])
    .filter(s => {
      if (!s.rol) return false;
      const r = s.rol.toUpperCase();
      return r.startsWith("DIRECTOR_") || r === "TESORERO";
    })
    .map(s => String(s.id))
);

if (directoresSet.size === 0) {
  tbody.innerHTML = "<tr><td colspan='4'>No hay directores configurados</td></tr>";
  return;
}

    // 3) Acumular por director
    const estadisticas = {};

    detalle.forEach(r => {
      const sid = String(r.socio_id);
      if (!directoresSet.has(sid)) return;

      if (!estadisticas[sid]) {
        estadisticas[sid] = {
          nombre: r.socio_nombre,
          reuniones: new Set(),   // para contar reuniones únicas
          asistencias: 0
        };
      }
      estadisticas[sid].reuniones.add(r.asistencia_id);
      if (r.asistio) estadisticas[sid].asistencias += 1;
    });

    const filas = Object.values(estadisticas)
      .map(d => {
        const totalReuniones = d.reuniones.size;
        const porcentaje = totalReuniones
          ? (d.asistencias / totalReuniones) * 100
          : 0;
        return {
          nombre: d.nombre,
          totalReuniones,
          asistencias: d.asistencias,
          porcentaje
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje); // mejor a peor

    if (filas.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4'>Sin registros de directores</td></tr>";
      return;
    }

    tbody.innerHTML = "";
    filas.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.nombre}</td>
        <td>${d.totalReuniones}</td>
        <td>${d.asistencias}</td>
        <td class="col-porcentaje"><strong>${d.porcentaje.toFixed(1)}%</strong></td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error inesperado ranking directores:", err);
  }
}

// ======================================================
// 🎙 ENGINE GLOBAL AUDIO MEC
// ======================================================

window.mecAudio = {
  stream: null,
  permiso: false,
  inicializado: false,
  reconectando: false,
  ultimoUso: null,
  tracksActivos: 0
};

// ======================================================================================
// 🎙 GRABACIÓN DE INTERVENCIÓN (lado cliente del orador)
// ======================================================================================

window.msd2_grabacion = {
  mediaRecorder: null,
  chunks: [],
  grabando: false,
  iniciando: false,
  guardando: false,
  reunionId: null,
  intervencionId: null
};

// ======================================================
// 🎙 ACTIVAR MICRÓFONO MEC (ENGINE PERSISTENTE)
// ======================================================

async function activarMicrofonoMEC() {

  try {

    // ======================================================
    // 🔥 VALIDAR SOPORTE
    // ======================================================

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      console.warn(
        "⚠️ Este dispositivo no soporta grabación de audio."
      );

      return null;
    }

    // ======================================================
    // ♻️ REUTILIZAR STREAM EXISTENTE
    // ======================================================

    if (
      window.mecAudio &&
      window.mecAudio.stream &&
      window.mecAudio.stream.active
    ) {

      const tracks =
        window.mecAudio.stream
          .getAudioTracks()
          .filter(
            t => t.readyState === "live"
          );

      if (tracks.length > 0) {

        console.log(
          "♻️ Reutilizando stream persistente"
        );

        return window.mecAudio.stream;
      }
    }

    // ======================================================
    // 🆕 SOLICITAR STREAM NUEVO
    // ======================================================

    console.log(
      "🎙 Solicitando acceso real al micrófono..."
    );

    const stream =
      await navigator.mediaDevices.getUserMedia({

        audio: {

          echoCancellation: true,

          noiseSuppression: true,

          autoGainControl: true

        },

        video: false

      });

    // ======================================================
    // 🔥 VALIDAR TRACKS AUDIO
    // ======================================================

    const audioTracks =
      stream.getAudioTracks();

    if (
      !audioTracks ||
      audioTracks.length === 0
    ) {

      console.warn(
        "⚠️ El dispositivo no entregó acceso al micrófono."
      );

      return null;
    }

    // ======================================================
    // 💾 CREAR ENGINE SI NO EXISTE
    // ======================================================

    if (!window.mecAudio) {

      window.mecAudio = {

        stream: null,

        permiso: false,

        inicializado: false,

        reconectando: false,

        ultimoUso: null,

        tracksActivos: 0

      };
    }

    // ======================================================
    // 💾 GUARDAR STREAM GLOBAL
    // ======================================================

    window.mecAudio.stream = stream;

    window.mecAudio.permiso = true;

    window.mecAudio.inicializado = true;

    window.mecAudio.ultimoUso = Date.now();

    window.mecAudio.tracksActivos =
      audioTracks.length;

    // ======================================================
    // 🔁 COMPATIBILIDAD LEGACY MEC
    // ======================================================

    window.msd2_streamMicrofono =
      stream;

    window.msd2_microfonoHabilitado =
      true;

    // ======================================================
    // 🔥 DETECTAR TRACK FINALIZADO
    // ======================================================

    stream.getTracks().forEach(track => {

      track.onended = async () => {

        console.warn(
          "⚠️ Track micrófono finalizado."
        );

        // ==========================================
        // 🧹 LIMPIAR ENGINE
        // ==========================================

        if (window.mecAudio) {

          window.mecAudio.stream = null;

          window.mecAudio.permiso = false;

          window.mecAudio.inicializado = false;
        }

        window.msd2_streamMicrofono =
          null;

        window.msd2_microfonoHabilitado =
          false;

        // ==========================================
        // 🔄 RECOVERY SUAVE ANDROID
        // ==========================================

        try {

          if (
            window.mecAudio &&
            !window.mecAudio.reconectando
          ) {

            window.mecAudio.reconectando =
              true;

            console.log(
              "🔄 Intentando reconexión automática..."
            );

            setTimeout(async () => {

              try {

                await activarMicrofonoMEC();

              } catch (err) {

                console.error(
                  "❌ Error reconectando micrófono:",
                  err
                );

              } finally {

                if (window.mecAudio) {

                  window.mecAudio.reconectando =
                    false;
                }
              }

            }, 1500);
          }

        } catch (err) {

          console.error(
            "❌ Error recovery audio:",
            err
          );
        }
      };
    });

    // ======================================================
    // ✅ OK
    // ======================================================

    console.log(
      "✅ Micrófono activado correctamente"
    );

    return stream;

  } catch (err) {

    console.error(
      "❌ Error acceso micrófono:",
      err
    );

    return null;
  }
}

// ======================================================
// ✅ Saber si este cliente es el orador actual
// ======================================================

function msd2_esOradorActual(payloadReunion) {

  if (!window.usuarioFederacion) return false;

  if (!payloadReunion?.orador_actual_id) return false;

  return (
    String(window.usuarioFederacion.socio_id) ===
    String(payloadReunion.orador_actual_id)
  );
}

// ======================================================
// 🎬 Iniciar grabación en el cliente del orador
// ======================================================

async function iniciarGrabacionOrador(reunionPayload) {

  try {

    // 🚫 Solo el orador actual graba

    if (!msd2_esOradorActual(reunionPayload)) {
      return;
    }

    // 🚫 Lock anti duplicación

    if (
      window.msd2_grabacion.grabando ||
      window.msd2_grabacion.iniciando
    ) {
      return;
    }

    // 🔒 Activar lock inmediatamente

    window.msd2_grabacion.iniciando = true;

    console.log(
      "🎙 Iniciando grabación intervención..."
    );

    // ======================================================
    // 🎙 ASEGURAR AUDIO ENGINE
    // ======================================================

    const stream =
    await activarMicrofonoMEC();

    if (!stream) {
    console.warn(
        "⚠️ No existe stream de audio disponible."
    );
    window.msd2_grabacion.iniciando = false;
    return;
    }

    // ======================================================
    // 🔥 VALIDAR STREAM MUERTO
    // ======================================================
    if (!stream.active) {
    console.warn(
        "⚠️ Stream inactivo."
    );
    window.mecAudio.stream = null;
    window.msd2_grabacion.iniciando = false;
    return;
    }

    // ======================================================
    // 🔥 VALIDAR TRACKS ACTIVOS
    // ======================================================

    const tracksActivos =
      stream.getAudioTracks().filter(
        track => track.readyState === "live"
      );

    if (tracksActivos.length === 0) {
    console.warn(
        "⚠️ No existen tracks activos."
    );
    window.mecAudio.stream = null;
    window.msd2_grabacion.iniciando = false;
    return;
    }

    // ======================================================
    // 🔥 FIX COMPATIBILIDAD CELULAR (MEC)
    // ======================================================

    let mimeType = "";

    if (
      MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
    ) {

      mimeType =
        "audio/webm;codecs=opus";

    } else if (
      MediaRecorder.isTypeSupported(
        "audio/webm"
      )
    ) {

      mimeType = "audio/webm";

    } else if (
      MediaRecorder.isTypeSupported(
        "audio/mp4"
      )
    ) {

      mimeType = "audio/mp4";

    } else {

      mimeType = "";
    }

    // ======================================================
    // 🔥 VALIDAR SOPORTE MediaRecorder
    // ======================================================

    if (
      typeof MediaRecorder === "undefined"
    ) {

      console.error(
        "❌ MediaRecorder no soportado."
      );

      window.msd2_grabacion.iniciando =
        false;

      return;
    }

    const mediaRecorder = mimeType
      ? new MediaRecorder(
          stream,
          { mimeType }
        )
      : new MediaRecorder(stream);

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    // ==================================================
    // 🔑 NUEVA INTERVENCIÓN ÚNICA
    // ==================================================

    const intervencionId =
      crypto.randomUUID();

    window.msd2_grabacion.mediaRecorder =
      mediaRecorder;

    window.msd2_grabacion.chunks = [];

    window.msd2_grabacion.grabando =
      true;

    window.msd2_grabacion.reunionId =
      reunionPayload.id;

    window.msd2_grabacion.intervencionId =
      intervencionId;

    // 🔓 liberar lock inicio

    window.msd2_grabacion.iniciando =
      false;

    // =========================================
    // 📦 Captura chunks audio
    // =========================================

    mediaRecorder.ondataavailable = (e) => {

      if (e.data && e.data.size > 0) {

        console.log(
          "📦 Chunk recibido:",
          e.data.size
        );

        window.msd2_grabacion.chunks.push(
          e.data
        );
      }
    };

    // =========================================
    // ❌ Error MediaRecorder
    // =========================================

    mediaRecorder.onerror = (event) => {

      console.error(
        "❌ MediaRecorder error:",
        event
      );
    };

    // =========================================
    // 🛑 Al detener grabación
    // =========================================

    mediaRecorder.onstop = async () => {

      try {

        console.log(
          "🛑 Grabación detenida, procesando Blob..."
        );

        const chunks =
          window.msd2_grabacion.chunks || [];

        console.log(
          "📦 Total chunks:",
          chunks.length
        );

        if (chunks.length === 0) {

          console.warn(
            "⚠️ No existen chunks de audio."
          );

          return;
        }

        const blob = new Blob(
          chunks,
          {
            type:
              mimeType ||
              "audio/webm"
          }
        );

        console.log(
          "🎧 Blob generado:",
          blob.size
        );

        if (
          !blob ||
          blob.size === 0
        ) {

          console.warn(
            "⚠️ Blob vacío, no se guarda intervención."
          );

          return;
        }

        if (
          !window.msd2_grabacion.reunionId ||
          !window.msd2_grabacion.intervencionId
        ) {

          console.warn(
            "⚠️ Faltan IDs, no se guarda intervención."
          );

          return;
        }

        await guardarIntervencionAudio(
          blob,
          window.msd2_grabacion.reunionId,
          window.msd2_grabacion.intervencionId
        );

      } catch (err) {

        console.error(
          "❌ Error post-procesando grabación:",
          err
        );

      } finally {

        // 🧹 limpiar estado

        window.msd2_grabacion.chunks = [];

        window.msd2_grabacion.mediaRecorder =
          null;

        window.msd2_grabacion.grabando =
          false;

        window.msd2_grabacion.iniciando =
          false;

        window.msd2_grabacion.guardando =
          false;

        window.msd2_grabacion.reunionId =
          null;

        window.msd2_grabacion.intervencionId =
          null;
      }
    };

// ======================================================
// ▶ START UNIVERSAL ESTABLE
// ======================================================

console.log(
  "🎙 MediaRecorder.start() universal"
);

mediaRecorder.start();

    console.log(
      "✅ MediaRecorder.start() OK"
    );

    const aviso =
      document.getElementById(
        "msd2-aviso-orador"
      );

    if (aviso) {

      aviso.textContent =
        "🎙 Estás interviniendo (audio grabándose)";

      aviso.style.display = "block";
    }

  } catch (err) {

    // 🔓 liberar lock si falla permiso micro

    window.msd2_grabacion.iniciando =
      false;

    window.msd2_grabacion.grabando =
      false;

    console.error(
      "❌ No se pudo iniciar grabación:",
      err
    );

    console.error(
    "⚠️ No fue posible acceder al micrófono."
    );
  }
}

// ======================================================
// ⏹ Detener grabación
// ======================================================

function detenerYGuardarGrabacion() {

  try {

    // 🚫 No existe grabación activa

    if (
      !window.msd2_grabacion.grabando ||
      !window.msd2_grabacion.mediaRecorder
    ) {
      return;
    }

    const recorder =
      window.msd2_grabacion.mediaRecorder;

    // 🚫 Evitar doble stop()

    if (
      recorder.state === "inactive"
    ) {
      return;
    }

    console.log(
      "⏹ Solicitando stop() al MediaRecorder..."
    );

    // ======================================================
    // 📱 FIX REAL PARA CELULAR
    // ======================================================

    const esMovil =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    // ======================================================
    // ⏹ STOP UNIVERSAL ESTABLE
    // ======================================================

    try {

    recorder.stop();

    } catch (err) {

    console.error(
        "❌ Error stop recorder:",
        err
    );
    }

    // 📢 ocultar aviso

    const aviso =
      document.getElementById(
        "msd2-aviso-orador"
      );

    if (aviso) {

      aviso.textContent = "";

      aviso.style.display = "none";
    }

  } catch (err) {

    console.error(
      "❌ Error deteniendo grabación:",
      err
    );
  }
}

// ======================================================
// 🎙 BOTÓN ACTIVAR MICRÓFONO
// ======================================================

document.addEventListener(
  "click",
  async (e) => {

    if (
      e.target.id ===
      "btnActivarMicrofonoMEC"
    ) {

      await activarMicrofonoMEC();
    }
  }
);

// ======================================================
// 📱 ANDROID BACKGROUND / FOREGROUND
// ======================================================

    document.addEventListener(
    "visibilitychange",
    async () => {

        try {

        if (
            document.visibilityState ===
            "visible"
        ) {

            console.log(
            "👁 App visible nuevamente"
            );

            if (
            !window.mecAudio ||
            !window.mecAudio.stream ||
            !window.mecAudio.stream.active
            ) {

            console.warn(
                "⚠️ Stream perdido en background."
            );

            await activarMicrofonoMEC();
            }
        }

        } catch (err) {

        console.error(
            "❌ Error visibilitychange:",
            err
        );
        }
    }
);

// ======================================================
// 💾 Guardar intervención en Storage + BD
// ======================================================

async function guardarIntervencionAudio(
  blob,
  reunionId,
  intervencionId
) {

  try {

    // 🚫 Lock anti doble guardado

    if (window.msd2_grabacion.guardando) {

      console.warn(
        "⚠️ Ya existe un guardado en proceso."
      );

      return;
    }

    // 🔒 activar lock

    window.msd2_grabacion.guardando = true;

    // 🚫 Validar usuario

    if (
      !window.usuarioFederacion ||
      !window.usuarioFederacion.socio_id
    ) {

      console.warn(
        "⚠️ Usuario federación no disponible."
      );

      return;
    }

    const socio = window.usuarioFederacion;

    // ==================================================
    // ☁️ SUBIR AUDIO STORAGE
    // ==================================================

    const BUCKET =
      "reunion_intervenciones";

    const ts = Date.now();

    const safeNombre =
      (socio.nombre || "socio")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_\-]/g, "_");

    const path =
      `${reunionId}/${socio.socio_id}/${intervencionId}_${ts}_${safeNombre}.webm`;

    const { error: errUpload } =
      await supabase
      .storage
      .from(BUCKET)
      .upload(path, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "audio/webm"
      });

    if (errUpload) {

      console.error(
        "❌ Error subiendo audio:",
        errUpload
      );

      return;
    }

    console.log(
      "☁️ Audio subido correctamente:",
      path
    );

    // ==================================================
    // 🗂 INSERT IDEMPOTENTE VIA RPC
    // ==================================================

    const { error: errInsert } =
      await supabase
      .rpc("insertar_intervencion_segura", {

        p_intervencion_id:
          intervencionId,

        p_reunion_id:
          reunionId,

        p_socio_id:
          socio.socio_id,

        p_socio_nombre:
          socio.nombre,

        p_audio_path:
          path

      });

    if (errInsert) {

      console.error(
        "❌ Error registrando intervención:",
        errInsert
      );

      return;
    }

    console.log(
      "✅ Intervención registrada:",
      intervencionId
    );

  } catch (err) {

    console.error(
      "❌ Error guardarIntervencionAudio:",
      err
    );

  } finally {

    // 🔓 liberar lock guardado

    window.msd2_grabacion.guardando = false;
  }
}

// ========================== fin mesa sindical ==========================

window.cargarDashboardAsistencia = cargarDashboardAsistencia;
window.cargarHistorialReuniones = cargarHistorialReuniones;
window.cargarRankingSindicatos = cargarRankingSindicatos;
window.cargarRankingDirectores = cargarRankingDirectores;

window.verDetalleReunion = verDetalleReunion;
window.cerrarDetalleReunion = cerrarDetalleReunion;

window.activarMicrofonoMEC = activarMicrofonoMEC;

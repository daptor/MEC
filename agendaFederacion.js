// ============================
// 📅 Agenda Federación MEC
// SOLO LECTURA (listar + ver)
// ============================
console.log("📅 agendaFederacion.js cargado");

// Estado simple de filtro en memoria
let agendaFiltroEstado = "TODAS";

// Inicialización cuando se entra a la pantalla
async function agendaInit() {
  try {
    // Mostrar u ocultar botón "Crear" según rol admin
    const esAdmin = window.PERMISSIONS && PERMISSIONS.isAdmin && PERMISSIONS.isAdmin();
    const btnCrear = document.getElementById("agenda-boton-crear");
    if (btnCrear) {
      btnCrear.style.display = esAdmin ? "block" : "none";
    }

    // Dejar un texto base y luego cargar
    const cont = document.getElementById("agenda-lista");
    if (cont) cont.textContent = "Cargando reuniones...";

    await agendaRefrescarLista();
  } catch (e) {
    console.error("Error en agendaInit:", e);
    const cont = document.getElementById("agenda-lista");
    if (cont) cont.textContent = "Error al cargar la agenda.";
  }
}
window.agendaInit = agendaInit;

// Cambiar filtro por estado y recargar
async function agendaFiltrar(estado) {
  agendaFiltroEstado = estado;
  await agendaRefrescarLista();
}
window.agendaFiltrar = agendaFiltrar;

// Cargar reuniones desde Supabase según filtros
async function agendaRefrescarLista() {
  const cont = document.getElementById("agenda-lista");
  if (!cont) return;
  cont.textContent = "Cargando reuniones...";

  try {
    const filtroClase = document.getElementById("agenda-filtro-clase")?.value || "";

    let query = supabase
      .from("reunion_federacion")
      .select("*")
      .order("fecha", { ascending: false });

    // Filtro por estado/fecha
    const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (agendaFiltroEstado === "FUTURAS") {
      query = query.gte("fecha", hoy);
    } else if (agendaFiltroEstado === "REALIZADAS") {
      query = query.eq("estado", "REALIZADA");
    } else if (agendaFiltroEstado === "CANCELADAS") {
      query = query.eq("estado", "CANCELADA");
    }
    // "TODAS" no agrega condición

    // Filtro por clase A..I
    if (filtroClase) {
      query = query.eq("clase", filtroClase);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error cargando reuniones:", error);
      cont.textContent = "Error al cargar las reuniones.";
      return;
    }

    if (!data || data.length === 0) {
      cont.textContent = "No hay reuniones registradas.";
      return;
    }

    // Render tarjetas
    cont.innerHTML = data.map(r => agendaRenderTarjeta(r)).join("");
  } catch (e) {
    console.error("Error en agendaRefrescarLista:", e);
    cont.textContent = "Error inesperado al cargar reuniones.";
  }
}

// Generar HTML de tarjeta resumen
function agendaRenderTarjeta(r) {
  const tipoTxt = r.tipo_conexion === "TELEMATICA" ? "ZOOM" : "PRESENCIAL";
  const fechaStr = r.fecha || "";
  const estadoStr = r.estado || "";
  const motivo = r.motivo || "";
  const claseNombre = r.clase_nombre || "";

  // Horario (solo muestra si es Zoom y tiene horas)
  let horasTxt = "";
  if (r.tipo_conexion === "TELEMATICA" && r.hora_inicio && r.hora_final) {
    horasTxt = `${r.hora_inicio.slice(0, 5)}–${r.hora_final.slice(0, 5)} · `;
  }

  // Resumen de pago (solo si realizada)
  let resumenPago = "";
  if (estadoStr === "REALIZADA" && r.total_monto != null) {
    const totalFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
      .format(r.total_monto);
    resumenPago = `
      <div style="font-size:13px; color:#166534; margin-top:4px;">
        <strong>Asistentes pagados:</strong> ${r.total_asistentes_pagados || 0}
        · <strong>Total:</strong> ${totalFmt}
      </div>
    `;
  }

  // Color por estado
  let colorBorde = "#e5e7eb";
  if (estadoStr === "REALIZADA") colorBorde = "#22c55e";
  else if (estadoStr === "PLANIFICADA") colorBorde = "#facc15";
  else if (estadoStr === "CANCELADA") colorBorde = "#f97373";

  return `
    <div onclick="agendaVerDetalle('${r.id}')"
         style="
           border-left: 6px solid ${colorBorde};
           background:#ffffff;
           border-radius:10px;
           padding:10px 12px;
           margin-bottom:8px;
           cursor:pointer;
         ">
      <div><strong>${fechaStr}</strong> · ${claseNombre}</div>
      <div style="font-size:13px; color:#4b5563;">
        ${tipoTxt} · ${horasTxt}Estado: ${estadoStr}
      </div>
      <div style="font-size:13px; color:#4b5563; margin-top:4px;">
        Motivo: ${motivo}
      </div>
      ${resumenPago}
    </div>
  `;
}

// Ver detalle de una reunión (solo lectura)
async function agendaVerDetalle(reunionId) {
  try {
    const { data: reunion, error } = await supabase
      .from("reunion_federacion")
      .select("*")
      .eq("id", reunionId)
      .maybeSingle();

    if (error || !reunion) {
      alert("No se pudo cargar la reunión.");
      console.error(error);
      return;
    }

    const { data: asistentes, error: errA } = await supabase
      .from("reunion_federacion_asistente")
      .select("*")
      .eq("reunion_id", reunionId)
      .order("rol_interno", { ascending: true });

    if (errA) {
      console.error("Error cargando asistentes:", errA);
    }

    agendaRenderDetalle(reunion, asistentes || []);
    mostrarPantalla("pantalla-agenda-detalle");
  } catch (e) {
    console.error("Error en agendaVerDetalle:", e);
    alert("Error inesperado al cargar detalle.");
  }
}
window.agendaVerDetalle = agendaVerDetalle;

// Render del detalle
function agendaRenderDetalle(r, asistentes) {
  const cont = document.getElementById("agenda-detalle-contenido");
  if (!cont) return;

  const esZoom = r.tipo_conexion === "TELEMATICA";
  const tipoTxt = esZoom ? "ZOOM" : "PRESENCIAL";
  const fechaStr = r.fecha || "";
  const motivo = r.motivo || "";
  const claseNombre = r.clase_nombre || "";
  const estadoStr = r.estado || "";

  let html = `
    <div style="background:#fff; border-radius:10px; padding:10px; margin-bottom:10px;">
      <div><strong>${claseNombre}</strong></div>
      <div style="font-size:13px; color:#4b5563;">
        ${tipoTxt} · Fecha: ${fechaStr}
      </div>
      <div style="font-size:13px; color:#4b5563;">
        Estado: ${estadoStr}
      </div>
      <div style="font-size:13px; color:#4b5563; margin-top:4px;">
        Motivo: ${motivo}
      </div>
  `;

  if (esZoom && r.hora_inicio && r.hora_final && r.duracion_horas != null) {
    html += `
      <div style="font-size:13px; color:#4b5563; margin-top:4px;">
        Horario: ${r.hora_inicio.slice(0,5)}–${r.hora_final.slice(0,5)}
        · Duración: ${Number(r.duracion_horas).toFixed(2)} h
      </div>
    `;
  } else if (!esZoom && r.tarifa_dia != null) {
    html += `
      <div style="font-size:13px; color:#4b5563; margin-top:4px;">
        Pago día por asistente: $${Number(r.tarifa_dia).toLocaleString("es-CL")}
      </div>
    `;
  }

  html += `</div>`;

  // Asistentes
  html += `
    <div style="background:#fff; border-radius:10px; padding:10px; margin-bottom:10px;">
      <h3 style="margin-top:0;">Asistentes</h3>
  `;

  if (!asistentes.length) {
    html += `<div style="font-size:13px; color:#6b7280;">Sin asistentes registrados.</div>`;
  } else {
    asistentes.forEach(a => {
      const pagoFmt = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" })
        .format(a.pago_calculado || 0);
      html += `
        <div style="border-bottom:1px solid #e5e7eb; padding:4px 0;">
          <div><strong>${a.nombre_mostrado}</strong> (${a.rol_interno})</div>
          <div style="font-size:13px; color:#4b5563;">
            Asistió: ${a.asistio ? "Sí" : "No"} · Pago: ${pagoFmt}
          </div>
        </div>
      `;
    });
  }
  html += `</div>`;

  // Resumen pago
  const totalFmt = r.total_monto != null
    ? new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(r.total_monto)
    : "$0";

  html += `
    <div style="background:#ecfdf3; border-radius:10px; padding:10px; margin-bottom:10px;">
      <div><strong>Resumen pago</strong></div>
      <div style="font-size:13px; color:#166534;">
        Asistentes pagados: ${r.total_asistentes_pagados || 0}
      </div>
      <div style="font-size:16px; font-weight:bold; color:#166534;">
        Total reunión: ${totalFmt}
      </div>
    </div>
  `;

  cont.innerHTML = html;
}

// Por ahora, esta función es solo un placeholder.
// Más adelante implementaremos la creación/edición.
function agendaNuevaReunion() {
  alert("Función para crear reunión aún no implementada.");
}
window.agendaNuevaReunion = agendaNuevaReunion;

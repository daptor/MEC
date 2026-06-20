// ============================
// 📅 Agenda Federación MEC
// ============================

let AGENDA_ESTADO = ""; // "", PLANIFICADA, REALIZADA, CANCELADA

// Se llama desde verificarClave() cuando ya se mostró la pantalla
async function agendaInit() {
  const cont = document.getElementById("agenda-lista");
  if (cont) cont.textContent = "Cargando reuniones...";
  await agendaRefrescarLista();
}
window.agendaInit = agendaInit;

// Cambiar filtro de estado: "", PLANIFICADA, REALIZADA, CANCELADA
function agendaFiltrar(estado) {
  AGENDA_ESTADO = estado || "";
  agendaRefrescarLista();
}
window.agendaFiltrar = agendaFiltrar;

// Leer reuniones desde Supabase y pintar tarjetas
async function agendaRefrescarLista() {
  const cont = document.getElementById("agenda-lista");
  if (!cont) return;
  cont.textContent = "Cargando...";

  try {
    const clase = document.getElementById("agenda-filtro-clase")?.value || "";

    let q = supabase
      .from("reunion_federacion")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(100);

    if (AGENDA_ESTADO) {
      q = q.eq("estado", AGENDA_ESTADO);
    }
    if (clase) {
      q = q.eq("clase", clase);
    }

    const { data, error } = await q;
    if (error) {
      console.error("Error cargando reuniones:", error);
      cont.textContent = "Error al cargar reuniones.";
      return;
    }

    if (!data || data.length === 0) {
      cont.textContent = "No hay reuniones registradas.";
      return;
    }

    cont.innerHTML = data.map(r => agendaRenderTarjeta(r)).join("");
  } catch (e) {
    console.error("Error inesperado agendaRefrescarLista:", e);
    cont.textContent = "Error inesperado.";
  }
}
window.agendaRefrescarLista = agendaRefrescarLista;

// Tarjeta resumen de una reunión
function agendaRenderTarjeta(r) {
  const tipo = r.tipo_conexion === "TELEMATICA" ? "ZOOM" : "PRESENCIAL";
  const fecha = r.fecha || "";
  const estado = r.estado || "";
  const claseNombre = r.clase_nombre || "";
  const motivo = r.motivo || "";

  const horas = (r.tipo_conexion === "TELEMATICA" && r.hora_inicio && r.hora_final)
    ? `${r.hora_inicio.slice(0,5)}–${r.hora_final.slice(0,5)} · `
    : "";

  let color = "#e5e7eb";
  if (estado === "REALIZADA") color = "#22c55e";
  else if (estado === "PLANIFICADA") color = "#facc15";
  else if (estado === "CANCELADA") color = "#f97373";

  const totalFmt = (r.total_monto != null)
    ? new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(r.total_monto)
    : "$0";

  return `
    <div onclick="agendaVerDetalle('${r.id}')"
         style="
           border-left:6px solid ${color};
           background:#fff;
           border-radius:10px;
           padding:10px 12px;
           margin-bottom:8px;
           cursor:pointer;
         ">
      <div><strong>${fecha}</strong> · ${claseNombre}</div>
      <div style="font-size:13px; color:#4b5563;">
        ${tipo} · ${horas}Estado: ${estado}
      </div>
      <div style="font-size:13px; color:#4b5563; margin-top:4px;">
        Motivo: ${motivo}
      </div>
      <div style="font-size:13px; color:#166534; margin-top:4px;">
        <strong>Total:</strong> ${totalFmt}
      </div>
    </div>
  `;
}

// Ver detalle de una reunión (cabecera + asistentes y montos)
async function agendaVerDetalle(reunionId) {
  const cont = document.getElementById("agenda-detalle-contenido");
  if (!cont) return;
  cont.textContent = "Cargando detalle...";

  try {
    const { data: r, error } = await supabase
      .from("reunion_federacion")
      .select("*")
      .eq("id", reunionId)
      .maybeSingle();

    if (error || !r) {
      console.error("Error cargando reunión:", error);
      cont.textContent = "No se pudo cargar la reunión.";
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

    const esZoom = r.tipo_conexion === "TELEMATICA";
    const durTxt = (r.duracion_horas != null)
      ? `${Number(r.duracion_horas).toFixed(2)} h`
      : "-";

    const totalFmt = (r.total_monto != null)
      ? new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(r.total_monto)
      : "$0";

    const asistentesHTML = (asistentes || []).map(a => {
      const pago = new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP"}).format(a.pago_calculado || 0);
      return `
        <div style="border-bottom:1px solid #e5e7eb; padding:4px 0;">
          <div><strong>${a.nombre_mostrado}</strong> (${a.rol_interno})</div>
          <div style="font-size:13px; color:#4b5563;">
            Asistió: ${a.asistio ? "Sí" : "No"} · Pago: ${pago}
          </div>
        </div>
      `;
    }).join("");

    cont.innerHTML = `
      <div style="background:#fff; border-radius:10px; padding:10px 12px;">
        <div><strong>${r.clase_nombre || ""}</strong></div>
        <div style="font-size:13px; color:#4b5563;">
          ${r.tipo_conexion} · ${r.fecha || ""}
        </div>
        ${esZoom ? `<div style="font-size:13px; color:#4b5563;">Duración: ${durTxt}</div>` : ""}
        <div style="font-size:13px; color:#4b5563;">
          Estado: ${r.estado || ""}
        </div>
        <div style="font-size:13px; color:#4b5563;">
          Motivo: ${r.motivo || ""}
        </div>
        <hr>
        <div><strong>Asistentes</strong></div>
        ${asistentesHTML || '<div style="font-size:13px; color:#6b7280;">Sin asistentes.</div>'}
        <hr>
        <div style="font-size:14px; color:#166534;">
          <strong>Total reunión:</strong> ${totalFmt}
        </div>
      </div>
    `;

    mostrarPantalla("pantalla-agenda-detalle");
  } catch (e) {
    console.error("Error inesperado en agendaVerDetalle:", e);
    cont.textContent = "Error inesperado.";
  }
}
window.agendaVerDetalle = agendaVerDetalle;

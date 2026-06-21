// Catálogo A–I (solo para mostrar nombres y tipo)
const AGENDA_CLASES = {
  A: { clase: 'A', nombre: 'Asambleas Plenarias Zoom', tipo_conexion: 'TELEMATICA' },
  B: { clase: 'B', nombre: 'Asamblea Plenaria Presencial', tipo_conexion: 'PRESENCIAL' },
  C: { clase: 'C', nombre: 'Plenarias Director S/SB', tipo_conexion: 'PRESENCIAL' },
  D: { clase: 'D', nombre: 'Reunión Ejecutivo Presencial', tipo_conexion: 'PRESENCIAL' },
  E: { clase: 'E', nombre: 'Reunión Directorio Zoom (2h)', tipo_conexion: 'TELEMATICA' },
  F: { clase: 'F', nombre: 'Reuniones Especiales Presenciales', tipo_conexion: 'PRESENCIAL' },
  G: { clase: 'G', nombre: 'Reuniones Zoom (2h)', tipo_conexion: 'TELEMATICA' },
  H: { clase: 'H', nombre: 'Visita Zona Norte Zoom', tipo_conexion: 'TELEMATICA' },
  I: { clase: 'I', nombre: 'Visita Zona Sur Zoom', tipo_conexion: 'TELEMATICA' },
};

let agendaFiltroEstado = 'TODAS';
let agendaReunionesCache = [];
let agendaReunionActual = null;

function esAdminMEC() {
  return window.currentUser && window.currentUser.email === "christorfu@gmail.com";
}

async function agendaInicializar() {
  const bloqueCrear = document.getElementById('agenda-bloque-crear');
  if (bloqueCrear) bloqueCrear.style.display = esAdminMEC() ? 'block' : 'none';
  await agendaRefrescarListado();

  const bloqueResumen = document.getElementById('agenda-resumen-pagos');
  if (bloqueResumen) bloqueResumen.style.display = esAdminMEC() ? 'block' : 'none';

  // Solo llamamos al resumen si las funciones ya están definidas
  if (esAdminMEC()) {
    if (typeof agendaCargarResumenPagosClase === 'function') {
      await agendaCargarResumenPagosClase();
    }
    if (typeof agendaCargarResumenPagosDirector === 'function') {
      await agendaCargarResumenPagosDirector();
    }
  }
}


function agendaFiltrarPorEstado(estado) {
  agendaFiltroEstado = estado;
  agendaRefrescarListado();
}

async function agendaRefrescarListado() {
  const cont = document.getElementById('agenda-lista-reuniones');
  if (!cont) return;
  cont.innerHTML = "Cargando reuniones...";

  let query = supabase.from('reunion_federacion')
    .select('*')
    .order('fecha', { ascending: false });

  if (agendaFiltroEstado === 'REALIZADA') query = query.eq('estado', 'REALIZADA');
  if (agendaFiltroEstado === 'CANCELADA') query = query.eq('estado', 'CANCELADA');
  if (agendaFiltroEstado === 'FUTURAS') {
    const hoy = new Date().toISOString().slice(0,10);
    query = query.gte('fecha', hoy);
  }

  const claseSel = document.getElementById('agenda-filtro-clase')?.value || '';
  if (claseSel) query = query.eq('clase', claseSel);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    cont.innerHTML = "Error cargando reuniones.";
    return;
  }
  agendaReunionesCache = data || [];
  if (!agendaReunionesCache.length) {
    cont.innerHTML = "<p>No hay reuniones registradas.</p>";
    return;
  }
  cont.innerHTML = "";
  agendaReunionesCache.forEach(r => {
    const div = document.createElement('div');
    div.className = 'mec-seccion-card';
    let borde = '#e5e7eb';
    if (r.estado === 'REALIZADA') borde = '#22c55e';
    else if (r.estado === 'PLANIFICADA') borde = '#facc15';
    else if (r.estado === 'CANCELADA') borde = '#f87171';
    div.style.borderLeft = `4px solid ${borde}`;

    let fechaStr = '';
    if (r.fecha) {
    const [yyyy, mm, dd] = r.fecha.split('-');
    if (yyyy && mm && dd) {
    fechaStr = `${dd}-${mm}-${yyyy}`;
  }
}

    const claseNombre = r.clase_nombre;
    const esTele = (r.tipo_conexion === 'TELEMATICA');
    let linea2 = esTele ? 'ZOOM' : 'PRESENCIAL';
    if (esTele && r.hora_inicio && r.hora_final) {
      linea2 += ` · ${r.hora_inicio.slice(0,5)}–${r.hora_final.slice(0,5)}`;
    }
    linea2 += ` · Estado: ${r.estado}`;

    let linea4 = '';
    if (r.estado === 'REALIZADA') {
      const n = r.total_asistentes_pagados || 0;
      const total = r.total_monto || 0;
      linea4 = `Asistentes pagados: ${n} · Total: ${formatearCLP(total)}`;
    }

    // Mensaje fijo de política de pago según clase
    let lineaPago = '';
    if (r.clase === 'A') {
      lineaPago = 'Pago MEC: $0 (Asamblea Plenaria Zoom sin pago).';
    } else if (r.clase === 'B') {
      lineaPago = 'Pago MEC: $0 (Asamblea Plenaria Presencial sin pago).';
    } else if (r.clase === 'C') {
      lineaPago = 'Esta reunión paga $20.000 por día al director sin SB (1 a 3 días).';
    }

    div.innerHTML = `
      <div class="agenda-card-compact">
        <div class="agenda-card-line1">
          <strong>${fechaStr}</strong> · ${claseNombre}
        </div>
        <div class="agenda-card-line2">
          ${linea2}
        </div>
        <div class="agenda-card-line3">
          Motivo: ${r.motivo || ''}
        </div>
        ${lineaPago ? `<div class="agenda-card-line4">${lineaPago}</div>` : ''}
        ${linea4 ? `<div class="agenda-card-line5">${linea4}</div>` : ''}
      </div>
    `;

    div.onclick = () => abrirDetalleReunionAgenda(r.id);
    cont.appendChild(div);
  });
}

// ------------------------------------------------------
// Helper: poblar select de clase en el detalle (solo lectura)
// ------------------------------------------------------
function agendaAsegurarOpcionesClase() {
  const sel = document.getElementById('ag-clase');
  if (!sel) return;
  if (sel.options.length > 0) return; // ya poblado

  Object.values(AGENDA_CLASES).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.clase;
    opt.textContent = `${c.clase} – ${c.nombre}`;
    sel.appendChild(opt);
  });
}

// ------------------------------------------------------
// Crear reunión (solo ADMIN MEC)
// ------------------------------------------------------
async function agendaNuevaReunion() {
  try {
    // Solo admin MEC
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user || user.email !== "christorfu@gmail.com") {
      alert("Solo ADMIN MEC puede crear reuniones.");
      return;
    }

    // 1) Pedir clase (A–I)
    let clase = prompt(
      "Clase de reunión (A–I):\nA: Plenaria Zoom (sin pago)\nB: Plenaria Presencial (sin pago)\nC: Plenaria Director S/SB (paga día)\nD: Reunión Ejecutivo Presencial\nE: Directorio Zoom (2h)\nF: Reuniones Especiales Presenciales\nG: Reuniones Zoom (2h)\nH: Visita Zona Norte Zoom\nI: Visita Zona Sur Zoom",
      "E"
    );
    if (!clase) return;
    clase = clase.trim().toUpperCase();

    if (!AGENDA_CLASES[clase]) {
      alert("Clase inválida. Debe ser una letra de A a I.");
      return;
    }

    // 2) Fecha (formato yyyy-mm-dd)
    const hoy = new Date().toISOString().slice(0, 10);
    let fecha = prompt("Fecha de la reunión (YYYY-MM-DD):", hoy);
    if (!fecha) return;
    fecha = fecha.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      alert("Formato de fecha inválido. Usa YYYY-MM-DD.");
      return;
    }

    // 3) Motivo
    let motivo = prompt("Motivo / tema principal de la reunión:", "");
    motivo = (motivo || "").trim();

    const claseInfo = AGENDA_CLASES[clase];

    // 4) Insertar reunión base
    const { data: inserted, error: errIns } = await supabase
      .from("reunion_federacion")
      .insert({
        fecha: fecha,
        clase: claseInfo.clase,
        clase_nombre: claseInfo.nombre,
        tipo_conexion: claseInfo.tipo_conexion,
        estado: "PLANIFICADA",
        motivo: motivo || null,
        tarifa_hora: claseInfo.tipo_conexion === "TELEMATICA" ? 2500 : null,
        tarifa_dia: claseInfo.tipo_conexion === "PRESENCIAL" ? 20000 : null
      })
      .select()
      .single();

    if (errIns || !inserted) {
      console.error("Error creando reunión", errIns);
      alert("No se pudo crear la reunión.");
      return;
    }

    // 5) Refrescar listado y resumen, luego abrir detalle
    await agendaRefrescarListado();

    if (esAdminMEC()) {
      if (typeof agendaCargarResumenPagosClase === "function") {
        await agendaCargarResumenPagosClase();
      }
      if (typeof agendaCargarResumenPagosDirector === "function") {
        await agendaCargarResumenPagosDirector();
      }
    }

    abrirDetalleReunionAgenda(inserted.id);
  } catch (err) {
    console.error("agendaNuevaReunion error", err);
    alert("Error creando reunión.");
  }
}


// ------------------------------------------------------
// Abrir detalle de reunión
// ------------------------------------------------------
async function abrirDetalleReunionAgenda(id) {
  try {
    agendaAsegurarOpcionesClase();

    // 1) Cargar reunión
    const { data: reunion, error: errR } = await supabase
      .from('reunion_federacion')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (errR || !reunion) {
      console.error('Error cargando reunión', errR);
      alert('Error cargando reunión.');
      return;
    }

    agendaReunionActual = reunion;

    // 2) Cargar asistentes
    const { data: asistentes, error: errA } = await supabase
      .from('reunion_federacion_asistente')
      .select('*')
      .eq('reunion_id', id)
      .order('creado_en', { ascending: true });

    if (errA) {
      console.warn('Error cargando asistentes', errA);
    }

    // 3) Cargar directores + tesorero desde socios
    const { data: sociosDirectores, error: errD } = await supabase
      .from('socios')
      .select('id, nombre, rol')
      .or('rol.ilike.DIRECTOR_%,rol.eq.TESORERO');

    if (errD) {
      console.warn('Error cargando directores', errD);
    }

    // 4) Poblar datos generales
    const selClase = document.getElementById('ag-clase');
    if (selClase) selClase.value = reunion.clase || '';

    const spanTipo = document.getElementById('ag-tipo');
    if (spanTipo) spanTipo.textContent = reunion.tipo_conexion || '';

    const inpFecha = document.getElementById('ag-fecha');
    if (inpFecha) inpFecha.value = reunion.fecha ? reunion.fecha.slice(0, 10) : '';

    const selEstado = document.getElementById('ag-estado');
    if (selEstado) selEstado.value = reunion.estado || 'PLANIFICADA';

    const txtMotivo = document.getElementById('ag-motivo');
    if (txtMotivo) txtMotivo.value = reunion.motivo || '';

    const bloqueTele = document.getElementById('ag-bloque-tele');
    const bloquePres = document.getElementById('ag-bloque-presencial');
    const txtPres = document.getElementById('ag-presencial-texto');
    const bloqueDias = document.getElementById('ag-bloque-dias-plenaria');
    const inpDias = document.getElementById('ag-dias-plenaria');

    if (reunion.tipo_conexion === 'TELEMATICA') {
      if (bloqueTele) bloqueTele.style.display = 'block';
      if (bloquePres) bloquePres.style.display = 'none';
      const hi = document.getElementById('ag-hora-inicio');
      const hf = document.getElementById('ag-hora-final');
      if (hi) hi.value = reunion.hora_inicio || '';
      if (hf) hf.value = reunion.hora_final || '';
      if (bloqueDias) bloqueDias.style.display = 'none';
    } else {
      if (bloqueTele) bloqueTele.style.display = 'none';
      if (bloquePres) bloquePres.style.display = 'block';

      // Clase C: Plenarias Director S/SB
      if (reunion.clase === 'C') {
        if (txtPres) txtPres.textContent = 'Esta reunión paga $20.000 por día al director sin SB (1 a 3 días).';
        if (bloqueDias) bloqueDias.style.display = 'block';
        if (inpDias) {
          const dias = Number(reunion.duracion_horas || 1);
          inpDias.value = Math.min(3, Math.max(1, dias || 1));
        }
      } else {
        if (txtPres) txtPres.innerHTML = 'Pago día por asistente: <strong>$20.000</strong>';
        if (bloqueDias) bloqueDias.style.display = 'none';
        if (inpDias) inpDias.value = 1;
      }
    }


    // 5) Render de directores con checkboxes
    const contDir = document.getElementById('ag-lista-directores');
    if (contDir) contDir.innerHTML = '';

    const asistMap = new Map(
      (asistentes || [])
        .filter(a => a.socio_id != null && a.tipo_asistente === 'DIRECTOR')
        .map(a => [String(a.socio_id), a])
    );

    (sociosDirectores || []).forEach(sd => {
      const checked = asistMap.has(String(sd.id));
      const div = document.createElement('div');
      div.innerHTML = `
        <label>
          <input type="checkbox"
                 class="ag-director-checkbox"
                 data-socio-id="${sd.id}"
                 data-socio-rol="${sd.rol || ''}"
                 data-socio-nombre="${sd.nombre || ''}"
                 ${checked ? 'checked' : ''}>
          ${sd.nombre} (${sd.rol})
        </label>
      `;
      if (contDir) contDir.appendChild(div);
    });

    // 6) Invitados (INVITADO_1 e INVITADO_2 por rol_interno)
    const inv1Row = (asistentes || []).find(
      a => a.tipo_asistente === 'INVITADO' && a.rol_interno === 'INVITADO_1'
    );
    const inv2Row = (asistentes || []).find(
      a => a.tipo_asistente === 'INVITADO' && a.rol_interno === 'INVITADO_2'
    );

    const inv1NombreInput = document.getElementById('ag-inv1-nombre');
    const inv1AsistioInput = document.getElementById('ag-inv1-asistio');
    const inv2NombreInput = document.getElementById('ag-inv2-nombre');
    const inv2AsistioInput = document.getElementById('ag-inv2-asistio');

    if (inv1NombreInput && inv1AsistioInput) {
      inv1NombreInput.value = inv1Row?.nombre_mostrado || '';
      inv1AsistioInput.checked = !!inv1Row?.asistio;
    }
    if (inv2NombreInput && inv2AsistioInput) {
      inv2NombreInput.value = inv2Row?.nombre_mostrado || '';
      inv2AsistioInput.checked = !!inv2Row?.asistio;
    }

    // 7) Resumen de pago
    const linea1 = document.getElementById('ag-resumen-linea1');
    const linea2 = document.getElementById('ag-resumen-linea2');
    if (linea1) linea1.textContent =
      `Asistentes pagados: ${reunion.total_asistentes_pagados || 0}`;
    if (linea2) linea2.textContent =
      `Total pagado: ${formatearCLP(reunion.total_monto || 0)}`;

    // 8) Mostrar/ocultar acciones admin
    const acciones = document.getElementById('agenda-detalle-acciones-admin');
    if (acciones) {
      acciones.style.display = esAdminMEC() ? 'block' : 'none';
    }

    // 9) Mostrar pantalla detalle
    mostrarPantalla('pantalla-agenda-detalle');
  } catch (err) {
    console.error('abrirDetalleReunionAgenda error', err);
    alert('Error al abrir detalle.');
  }
}


// ------------------------------------------------------
// Guardar reunión + asistentes + RPC recálculo
// ------------------------------------------------------
async function agendaGuardarReunion() {
  try {
    if (!agendaReunionActual) {
      alert('No hay reunión cargada.');
      return;
    }

    // Solo admin MEC puede editar
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user || user.email !== 'christorfu@gmail.com') {
      alert('Solo ADMIN MEC puede editar reuniones.');
      return;
    }

    const id = agendaReunionActual.id;

    // 1) Actualizar datos generales
    const fechaVal = document.getElementById('ag-fecha')?.value || null;
    const estadoVal = document.getElementById('ag-estado')?.value || 'PLANIFICADA';
    const motivoVal = document.getElementById('ag-motivo')?.value || '';

    let horaInicioVal = null;
    let horaFinalVal = null;
    if (agendaReunionActual.tipo_conexion === 'TELEMATICA') {
      horaInicioVal = document.getElementById('ag-hora-inicio')?.value || null;
      horaFinalVal = document.getElementById('ag-hora-final')?.value || null;
    }

    // para clase C usamos duracion_horas como "días de plenaria"
    let diasPlenaria = null;
    if (agendaReunionActual.tipo_conexion === 'PRESENCIAL' && agendaReunionActual.clase === 'C') {
      const inpDias = document.getElementById('ag-dias-plenaria');
      const val = Number(inpDias?.value || 1);
      diasPlenaria = Math.min(3, Math.max(1, val || 1));
    }

    const { error: errUpd } = await supabase
      .from('reunion_federacion')
      .update({
        fecha: fechaVal,
        estado: estadoVal,
        motivo: motivoVal,
        hora_inicio: horaInicioVal,
        hora_final: horaFinalVal,
        duracion_horas: diasPlenaria  // null en otras clases
      })
      .eq('id', id);

    if (errUpd) {
      console.error('Error actualizando reunión', errUpd);
      alert('Error guardando datos de reunión.');
      return;
    }

    // 2) Asistentes DIRECTOR
    const { data: currentAsist = [] } = await supabase
      .from('reunion_federacion_asistente')
      .select('*')
      .eq('reunion_id', id);

    const checkboxes = Array.from(document.querySelectorAll('.ag-director-checkbox'));
    const seleccionados = checkboxes
      .filter(c => c.checked)
      .map(c => ({
        socioId: c.getAttribute('data-socio-id'),
        rolSocio: c.getAttribute('data-socio-rol') || '',
        nombreSocio: c.getAttribute('data-socio-nombre') || ''
      }));

    // Crear/actualizar DIRECTOR
    for (const sel of seleccionados) {
      const socioId = sel.socioId;
      const row = currentAsist.find(
        a => String(a.socio_id) === String(socioId) && a.tipo_asistente === 'DIRECTOR'
      );
      const rolInterno = (sel.rolSocio && [
        'DIRECTOR_1','DIRECTOR_2','DIRECTOR_3',
        'PRESIDENTE','SECRETARIO','SEC_ACTAS',
        'TESORERO','VICE_NORTE','VICE_SUR'
      ].includes(sel.rolSocio))
        ? sel.rolSocio
        : 'DIRECTOR_1'; // fallback simple

      if (!row) {
        const { error: errIns } = await supabase
          .from('reunion_federacion_asistente')
          .insert({
            reunion_id: id,
            socio_id: socioId,
            tipo_asistente: 'DIRECTOR',
            rol_interno: rolInterno,
            nombre_mostrado: sel.nombreSocio,
            asistio: true,
            pago_calculado: 0
          });
        if (errIns) console.warn('Error insert asistente director', errIns);
      } else {
        const { error: errUp } = await supabase
          .from('reunion_federacion_asistente')
          .update({
            asistio: true,
            rol_interno: rolInterno,
            nombre_mostrado: sel.nombreSocio
          })
          .eq('id', row.id);
        if (errUp) console.warn('Error update asistente director', errUp);
      }
    }

    // Eliminar DIRECTOR que ya no están seleccionados
    for (const row of currentAsist) {
      if (row.tipo_asistente === 'DIRECTOR') {
        const sigue = seleccionados.some(sel => String(sel.socioId) === String(row.socio_id));
        if (!sigue) {
          const { error: errDel } = await supabase
            .from('reunion_federacion_asistente')
            .delete()
            .eq('id', row.id);
          if (errDel) console.warn('Error delete asistente director', errDel);
        }
      }
    }

    // 3) Invitados: borrar todos los INVITADO y recrear desde inputs
    const { error: errDelInv } = await supabase
      .from('reunion_federacion_asistente')
      .delete()
      .eq('reunion_id', id)
      .eq('tipo_asistente', 'INVITADO');

    if (errDelInv) {
      console.warn('Error borrando invitados previos', errDelInv);
    }

    async function crearInvitado(nombreInputId, asistioInputId, rolInternoInvitado) {
      const nombre = document.getElementById(nombreInputId)?.value.trim() || '';
      const asistio = document.getElementById(asistioInputId)?.checked || false;
      if (!nombre) return;

      const { error } = await supabase
        .from('reunion_federacion_asistente')
        .insert({
          reunion_id: id,
          socio_id: null,
          tipo_asistente: 'INVITADO',
          rol_interno: rolInternoInvitado,
          nombre_mostrado: nombre,
          asistio: asistio,
          pago_calculado: 0
        });
      if (error) {
        console.warn('Error insert invitado', rolInternoInvitado, error);
      }
    }

    await crearInvitado('ag-inv1-nombre', 'ag-inv1-asistio', 'INVITADO_1');
    await crearInvitado('ag-inv2-nombre', 'ag-inv2-asistio', 'INVITADO_2');

    // 4) Llamar RPC para recálculo
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc('recalcular_totales_reunion_federacion', { p_reunion_id: id });

    if (rpcErr) {
      console.error('Error RPC recálculo', rpcErr);
      alert('Reunión guardada, pero falló el recálculo de totales.');
    } else {
      const resumen = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const linea1 = document.getElementById('ag-resumen-linea1');
      const linea2 = document.getElementById('ag-resumen-linea2');
      if (linea1) linea1.textContent =
        `Asistentes pagados: ${resumen.total_asistentes_pagados || 0}`;
      if (linea2) linea2.textContent =
        `Total pagado: ${formatearCLP(resumen.total_monto || 0)}`;
      alert('Reunión guardada y totales recalculados.');
    }

    // 5) Actualizar resúmenes (si existen) y volver al listado
    if (esAdminMEC()) {
      if (typeof agendaCargarResumenPagosClase === 'function') {
        await agendaCargarResumenPagosClase();
      }
      if (typeof agendaCargarResumenPagosDirector === 'function') {
        await agendaCargarResumenPagosDirector();
      }
    }

    await agendaRefrescarListado();
    mostrarPantalla('pantalla-agenda-federacion');
  } catch (err) {
    console.error('agendaGuardarReunion error', err);
    alert('Error guardando reunión.');
  }
}


// ------------------------------------------------------
// Eliminar reunión (solo admin MEC)
// ------------------------------------------------------
async function agendaEliminarReunion() {
  try {
    if (!agendaReunionActual) {
      alert('No hay reunión cargada.');
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user || user.email !== 'christorfu@gmail.com') {
      alert('Solo ADMIN MEC puede eliminar reuniones.');
      return;
    }

    const confirmar = confirm('¿Eliminar esta reunión y sus asistentes?');
    if (!confirmar) return;

    const { error } = await supabase
      .from('reunion_federacion')
      .delete()
      .eq('id', agendaReunionActual.id);

    if (error) {
      console.error('Error eliminando reunión', error);
      alert('No se pudo eliminar la reunión.');
      return;
    }

    agendaReunionActual = null;
    alert('Reunión eliminada.');
    await agendaRefrescarListado();

        if (esAdminMEC()) {
      await agendaCargarResumenPagosClase();
      await agendaCargarResumenPagosDirector();
    }

    mostrarPantalla('pantalla-agenda-federacion');
  } catch (err) {
    console.error('agendaEliminarReunion error', err);
    alert('Error eliminando reunión.');
  }
}

function volverDesdeDetalleAgenda() {
  mostrarPantalla("pantalla-agenda-federacion");
}

// ------------------------------------------------------
// Resumen pagos por director (solo admin)
// ------------------------------------------------------
async function agendaCargarResumenPagosDirector() {
  try {
    if (!esAdminMEC()) {
      return;
    }

    const cont = document.getElementById('agenda-resumen-director');
    if (!cont) return;

    // Unir asistentes con reunión para filtrar solo REALIZADAS
    const { data, error } = await supabase
      .from('reunion_federacion_asistente')
      .select('socio_id, nombre_mostrado, tipo_asistente, pago_calculado, reunion_federacion!inner(estado)')
      .eq('tipo_asistente', 'DIRECTOR')
      .eq('reunion_federacion.estado', 'REALIZADA');

    if (error) {
      console.error('Error resumen por director', error);
      cont.innerHTML = '<p>Error cargando resumen por director.</p>';
      return;
    }

    const mapa = new Map();
    (data || []).forEach(a => {
      const key = a.socio_id || a.nombre_mostrado;
      if (!key) return;
      const nombre = a.nombre_mostrado || 'Director sin nombre';
      const monto = Number(a.pago_calculado || 0);
      if (!mapa.has(key)) {
        mapa.set(key, { nombre, total: 0 });
      }
      const item = mapa.get(key);
      item.total += monto;
    });

    if (mapa.size === 0) {
      cont.innerHTML = '<p>No hay pagos a directores registrados aún.</p>';
      return;
    }

    let html = '<h4>Pagos por director</h4><ul>';
    Array.from(mapa.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(item => {
        html += `<li><strong>${item.nombre}:</strong> ${formatearCLP(item.total)}</li>`;
      });
    html += '</ul>';

    cont.innerHTML = html;
  } catch (err) {
    console.error('agendaCargarResumenPagosDirector error', err);
  }
}

// ------------------------------------------------------
// Resumen pagos por director (solo admin, solo REALIZADAS)
// ------------------------------------------------------
async function agendaCargarResumenPagosDirector() {
  try {
    if (!esAdminMEC()) return;

    const cont = document.getElementById('agenda-resumen-director');
    if (!cont) return;

    // 1) Obtener IDs de reuniones REALIZADAS
    const { data: reuniones, error: errR } = await supabase
      .from('reunion_federacion')
      .select('id')
      .eq('estado', 'REALIZADA');

    if (errR) {
      console.error('Error cargando reuniones REALIZADAS', errR);
      cont.innerHTML = '<p>Error cargando resumen por director.</p>';
      return;
    }

    const ids = (reuniones || []).map(r => r.id);
    if (!ids.length) {
      cont.innerHTML = '<p>No hay pagos a directores registrados aún.</p>';
      return;
    }

    // 2) Asistentes DIRECTOR solo en esas reuniones
    const { data, error } = await supabase
      .from('reunion_federacion_asistente')
      .select('reunion_id, socio_id, nombre_mostrado, tipo_asistente, pago_calculado')
      .eq('tipo_asistente', 'DIRECTOR')
      .in('reunion_id', ids);

    if (error) {
      console.error('Error resumen por director', error);
      cont.innerHTML = '<p>Error cargando resumen por director.</p>';
      return;
    }

    const mapa = new Map();
    let totalGeneral = 0;

    (data || []).forEach(a => {
      const key = a.socio_id || a.nombre_mostrado;
      if (!key) return;
      const nombre = a.nombre_mostrado || 'Director sin nombre';
      const monto = Number(a.pago_calculado || 0);
      if (!mapa.has(key)) {
        mapa.set(key, { nombre, total: 0 });
      }
      const item = mapa.get(key);
      item.total += monto;
      totalGeneral += monto;
    });

    if (mapa.size === 0) {
      cont.innerHTML = '<p>No hay pagos a directores registrados aún.</p>';
      return;
    }

    let html = '<h4>Pagos por director</h4><ul>';
    Array.from(mapa.values())
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(item => {
        html += `<li><strong>${item.nombre}:</strong> ${formatearCLP(item.total)}</li>`;
      });
    html += '</ul>';
    html += `<p><strong>Total general reuniones realizadas:</strong> ${formatearCLP(totalGeneral)}</p>`;

    cont.innerHTML = html;
  } catch (err) {
    console.error('agendaCargarResumenPagosDirector error', err);
  }
}


// Exponer global
window.agendaInicializar = agendaInicializar;
window.agendaFiltrarPorEstado = agendaFiltrarPorEstado;
window.agendaRefrescarListado = agendaRefrescarListado;
window.agendaNuevaReunion = agendaNuevaReunion;
window.abrirDetalleReunionAgenda = abrirDetalleReunionAgenda;
window.volverDesdeDetalleAgenda = volverDesdeDetalleAgenda;
window.agendaGuardarReunion = agendaGuardarReunion;
window.agendaEliminarReunion = agendaEliminarReunion;

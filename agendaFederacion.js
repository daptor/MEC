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

    const fechaStr = new Date(r.fecha).toLocaleDateString('es-CL');
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

    div.innerHTML = `
      <p><strong>${fechaStr}</strong> · ${claseNombre}</p>
      <p>${linea2}</p>
      <p>Motivo: ${r.motivo || ''}</p>
      ${linea4 ? `<p>${linea4}</p>` : ''}
    `;
    div.onclick = () => abrirDetalleReunionAgenda(r.id);
    cont.appendChild(div);
  });
}

// placeholders para completar más adelante
function agendaNuevaReunion() {
  alert("Crear reunión: lo implementamos en el siguiente paso.");
}

function abrirDetalleReunionAgenda(id) {
  alert("Detalle reunión " + id + " (lo implementamos después).");
}

function volverDesdeDetalleAgenda() {
  mostrarPantalla("pantalla-agenda-federacion");
}

// Exponer global
window.agendaInicializar = agendaInicializar;
window.agendaFiltrarPorEstado = agendaFiltrarPorEstado;
window.agendaRefrescarListado = agendaRefrescarListado;
window.agendaNuevaReunion = agendaNuevaReunion;
window.abrirDetalleReunionAgenda = abrirDetalleReunionAgenda;
window.volverDesdeDetalleAgenda = volverDesdeDetalleAgenda;

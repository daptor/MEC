import { supabase } from './supabaseClient.js';
import { v4 as uuidv4 } from 'https://cdn.skypack.dev/uuid';

const REMUNERACION_PRESENCIAL = 20000;
const REMUNERACION_ZOOM_POR_HORA = 2500;
const REMUNERACION_ZOOM_MAX_HORAS = 2;

const selectorReunion = document.getElementById('selector-reunion');
const infoFecha = document.getElementById('info-fecha');
const infoTipo = document.getElementById('info-tipo');
const bloqueHorario = document.getElementById('bloque-horario');
const horaInicioInput = document.getElementById('hora-inicio');
const horaFinInput = document.getElementById('hora-fin');
const tablaDirectoresGasto = document.getElementById('tabla-directores-gasto');
const formGastos = document.getElementById('form-gastos-directores');

let reuniones = [];
let directores = [];
let reunionSeleccionada = null;

function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  const fechaSolo = fechaStr.substr(0, 10);
  const [anio, mes, dia] = fechaSolo.split('-');
  return `${dia}/${mes}/${anio}`;
}

function extraerFechaSinHora(fechaStr) {
  return fechaStr?.substring(0, 10) || null;
}

async function cargarReuniones() {
  selectorReunion.innerHTML = '<option value="">-- Seleccione una reunión --</option>';
  const { data, error } = await supabase
    .from('agenda_reuniones')
    .select('id, fecha, tipo_reunion, participantes')
    .order('fecha', { ascending: true });
  if (error) {
    alert('Error al cargar reuniones');
    console.error(error);
    return;
  }
  reuniones = data || [];
  reuniones.forEach(r => {
    const fechaFormateada = formatearFecha(r.fecha);
    const option = document.createElement('option');
    option.value = r.id;
    option.textContent = `${fechaFormateada} - ${r.tipo_reunion}`;
    selectorReunion.appendChild(option);
  });
}

async function cargarDirectores() {
  const { data, error } = await supabase
    .from('socios')
    .select('id, nombre')
    .eq('estado', 'activo')
    .in('rol', [
      'DIRECTOR_1', 'DIRECTOR_2', 'DIRECTOR_3', 'DIRECTOR_4',
      'DIRECTOR_5', 'DIRECTOR_6', 'DIRECTOR_7', 'DIRECTOR_8', 'TESORERO'
    ]);
  if (error) {
    alert('Error al cargar directores');
    console.error(error);
    return;
  }
  directores = data || [];
}

function mostrarInfoReunion() {
  if (!reunionSeleccionada) {
    infoFecha.textContent = '';
    infoTipo.textContent = '';
    bloqueHorario.style.display = 'none';
    return;
  }
  infoFecha.textContent = formatearFecha(reunionSeleccionada.fecha);
  infoTipo.textContent = reunionSeleccionada.tipo_reunion;
  if (reunionSeleccionada.tipo_reunion.toLowerCase().includes('zoom')) {
    bloqueHorario.style.display = 'block';
  } else {
    bloqueHorario.style.display = 'none';
    horaInicioInput.value = '';
    horaFinInput.value = '';
  }
}

function calcularHoras(horaInicio, horaFin) {
  if (!horaInicio || !horaFin) return 0;
  const inicio = new Date(`1970-01-01T${horaInicio}:00`);
  const fin = new Date(`1970-01-01T${horaFin}:00`);
  let diff = (fin - inicio) / (1000 * 60 * 60);
  return diff < 0 ? 0 : diff;
}

function calcularRemuneracion(horas) {
  if (!horas || horas <= 0) return 0;
  return Math.min(horas, REMUNERACION_ZOOM_MAX_HORAS) * REMUNERACION_ZOOM_POR_HORA;
}

function construirTablaDirectores() {
  tablaDirectoresGasto.innerHTML = '';
  if (!reunionSeleccionada) return;
  const participantes = (reunionSeleccionada.participantes || []).map(String);
  directores.forEach(director => {
    if (!participantes.includes(String(director.id))) return;
    const tr = document.createElement('tr');
    const tdNombre = document.createElement('td');
    tdNombre.textContent = director.nombre;
    tr.appendChild(tdNombre);
    const tdRem = document.createElement('td');
    const inputRem = document.createElement('input');
    inputRem.type = 'number';
    inputRem.min = '0';
    inputRem.readOnly = true;
    inputRem.classList.add('input-remuneracion');
    tdRem.appendChild(inputRem);
    tr.appendChild(tdRem);
    const camposGastos = ['pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso'];
    camposGastos.forEach(campo => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.classList.add(`input-${campo}`);
      td.appendChild(input);
      tr.appendChild(td);
    });
    tr.dataset.directorId = director.id;
    tablaDirectoresGasto.appendChild(tr);
  });
  actualizarRemuneracion();
}

function actualizarRemuneracion() {
  if (!reunionSeleccionada) return;

  let remuneracion = 0;
  const tipo = reunionSeleccionada.tipo_reunion.toLowerCase();

  if (tipo.includes('zoom')) {
    const horas = calcularHoras(horaInicioInput.value, horaFinInput.value);
    remuneracion = calcularRemuneracion(horas);
  } else if (reunionSeleccionada.tipo_reunion === "PLENARIAS DIRECTOR S/SB") {
    remuneracion = REMUNERACION_PRESENCIAL * 3; // 3 días
  } else {
    remuneracion = REMUNERACION_PRESENCIAL;
  }

  const inputsRem = tablaDirectoresGasto.querySelectorAll('.input-remuneracion');
  inputsRem.forEach(input => {
    input.value = remuneracion;
  });
}

async function recuperarGastos() {
  if (!reunionSeleccionada) {
    alert('Seleccione una reunión primero');
    return;
  }

  const { data, error } = await supabase
    .from('gasto_real_directores')
    .select('*')
    .eq('id_reunion', reunionSeleccionada.id);

  if (error) {
    alert('Error al recuperar gastos');
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    // No sobreescribas valores existentes si no hay datos reales
    console.log("No hay gastos guardados. Se mantienen valores calculados.");
    return;
  }

  // Si hay datos guardados, sobreescribe los valores
  const filas = [...tablaDirectoresGasto.querySelectorAll('tr')];
  filas.forEach(fila => {
    const directorId = String(fila.dataset.directorId);
    const gasto = data.find(g => String(g.id_director) === directorId);
    const inputs = fila.querySelectorAll('input');
    if (gasto) {
      inputs[0].value = gasto.remuneracion ?? 0;
      inputs[1].value = gasto.pasajes ?? 0;
      inputs[2].value = gasto.colacion ?? 0;
      inputs[3].value = gasto.metro ?? 0;
      inputs[4].value = gasto.taxi_colectivo ?? 0;
      inputs[5].value = gasto.hotel ?? 0;
      inputs[6].value = gasto.reembolso ?? 0;
    }
  });
}

function limpiarTabla() {
  const inputs = tablaDirectoresGasto.querySelectorAll('input');
  inputs.forEach(input => {
    input.value = input.readOnly ? 0 : '';
  });
}

async function limpiarFormularioGastos() {
  tablaDirectoresGasto.innerHTML = '';
  selectorReunion.value = '';
  reunionSeleccionada = null;
  infoFecha.textContent = '';
  infoTipo.textContent = '';
  bloqueHorario.style.display = 'none';
  horaInicioInput.value = '';
  horaFinInput.value = '';
  await cargarReuniones();
  await cargarDirectores();
}
window.limpiarFormularioGastos = limpiarFormularioGastos;

async function guardarGastos(event) {
  event.preventDefault();
  if (!reunionSeleccionada) {
    alert('Seleccione una reunión primero');
    return;
  }
  if (reunionSeleccionada.tipo_reunion.toLowerCase().includes('zoom')) {
    if (!horaInicioInput.value || !horaFinInput.value) {
      alert('Debe ingresar hora inicio y término para reunión Zoom');
      return;
    }
    if (calcularHoras(horaInicioInput.value, horaFinInput.value) <= 0) {
      alert('La hora término debe ser mayor que hora inicio');
      return;
    }
  }
  const { error: errorDelete } = await supabase
    .from('gasto_real_directores')
    .delete()
    .eq('id_reunion', reunionSeleccionada.id);
  if (errorDelete) {
    alert('Error al borrar gastos antiguos');
    console.error(errorDelete);
    return;
  }
  const rows = [...tablaDirectoresGasto.querySelectorAll('tr')];
  const fechaLimpia = extraerFechaSinHora(reunionSeleccionada.fecha);
  const gastosParaInsertar = rows.map(row => {
    const inputs = row.querySelectorAll('input');
    return {
      id_reunion: reunionSeleccionada.id,
      id_director: row.dataset.directorId,
      fecha: fechaLimpia,
      remuneracion: Number(inputs[0].value) || 0,
      pasajes: Number(inputs[1].value) || 0,
      colacion: Number(inputs[2].value) || 0,
      metro: Number(inputs[3].value) || 0,
      taxi_colectivo: Number(inputs[4].value) || 0,
      hotel: Number(inputs[5].value) || 0,
      reembolso: Number(inputs[6].value) || 0
    };
  });
  const { error: errorInsert } = await supabase
    .from('gasto_real_directores')
    .insert(gastosParaInsertar);
  if (errorInsert) {
    alert('Error al guardar gastos');
    console.error(errorInsert);
    return;
  }
  alert('Gastos guardados correctamente');
  construirTablaDirectores();
}

selectorReunion.addEventListener('change', async () => {
  const id = selectorReunion.value;
  reunionSeleccionada = reuniones.find(r => r.id == id) || null;
  mostrarInfoReunion();
  if (reunionSeleccionada) {
    construirTablaDirectores();
    await recuperarGastos();
  } else {
    limpiarTabla();
  }
});

horaInicioInput.addEventListener('change', actualizarRemuneracion);
horaFinInput.addEventListener('change', actualizarRemuneracion);
formGastos.addEventListener('submit', guardarGastos);

window.addEventListener('DOMContentLoaded', async () => {
  await cargarReuniones();
  await cargarDirectores();
});

window.recuperarGastos = recuperarGastos;

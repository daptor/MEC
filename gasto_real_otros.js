import { supabase } from './supabaseClient.js';

// Elementos del DOM
const formOtros = document.getElementById('form-otros-gastos');
const btnGuardarOtros = document.getElementById('guardar-otros-gastos-btn');
const tbodyOtros = document.querySelector('#tabla-otros-gastos tbody');

btnGuardarOtros.addEventListener('click', guardarOtrosGastos);

// Guarda un nuevo registro en la tabla 'gasto_real_otros'
async function guardarOtrosGastos() {
  const fecha = document.getElementById('fecha-otros-gastos').value;
  const descripcion = document.getElementById('descripcion-otros-gastos').value.trim();
  const monto = parseFloat(document.getElementById('monto-otros-gastos').value);

  if (!fecha || !descripcion || isNaN(monto)) {
    alert('Todos los campos son obligatorios');
    return;
  }

  const { data, error } = await supabase
    .from('gasto_real_otros')
    .insert([{ fecha_registro: fecha, descripcion, monto }]);

  if (error) {
    console.error('Error guardando gasto:', error);
    alert('No se pudo guardar el gasto');
  } else {
    alert('Gasto guardado correctamente');
    limpiarFormularioOtrosGastos();
    cargarHistorialOtrosGastos();
  }
}

// Limpia el formulario
function limpiarFormularioOtrosGastos() {
  formOtros.reset();
}

// Carga y muestra el historial de otros gastos
async function cargarHistorialOtrosGastos() {
  const { data, error } = await supabase
    .from('gasto_real_otros')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error('Error al cargar historial de otros gastos:', error);
    return;
  }

  tbodyOtros.innerHTML = '';
  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.fecha_registro}</td>
      <td>${item.descripcion}</td>
      <td>${item.monto.toFixed(2)}</td>
    `;
    tbodyOtros.appendChild(tr);
  });

  actualizarTotales(data);
}

// Calcula totales mensual y anual
function actualizarTotales(data) {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();
  let totalMes = 0;
  let totalAnio = 0;

  data.forEach(item => {
    const fecha = new Date(item.fecha_registro);
    if (fecha.getFullYear() === anioActual) {
      totalAnio += item.monto;
      if (fecha.getMonth() + 1 === mesActual) {
        totalMes += item.monto;
      }
    }
  });

  document.getElementById('total-otros-gastos-mes').innerText = totalMes.toFixed(2);
  document.getElementById('total-otros-gastos-anio').innerText = totalAnio.toFixed(2);
}

// Inicialización al cargar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  cargarHistorialOtrosGastos();
});

window.limpiarFormularioOtrosGastos = limpiarFormularioOtrosGastos;

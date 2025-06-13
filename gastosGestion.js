import { supabase } from './supabaseClient.js';

function calcularGastosGestion() {
  const filas = document.querySelectorAll('#tabla-GastosGestion tbody tr');
  let totalGeneral = 0;

  filas.forEach(fila => {
    const costo = parseInt(fila.querySelector('.Costo')?.value || 0);
    const eventos = parseInt(fila.querySelector('.Cantidad')?.value || 0);
    const total = costo * eventos;

    fila.querySelector('.total-anual').textContent = `$${total.toLocaleString()}`;
    totalGeneral += total;
  });

  const totalPresupuesto = document.getElementById('total-presupuesto-gastos-gestion');
  if (totalPresupuesto) {
    totalPresupuesto.style.display = 'block';
    totalPresupuesto.textContent = `Total Presupuesto Gastos Gestión: $${totalGeneral.toLocaleString()}`;
  }
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#tabla-GastosGestion')) {
    calcularGastosGestion();
  }
});

export async function guardarPresupuestoGastosGestion() {
  const inputPeriodo = document.getElementById('input-periodo-gastos-gestion');
  if (!inputPeriodo) {
    alert("Falta el campo de período.");
    return;
  }

  const periodo = inputPeriodo.value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  const filas = document.querySelectorAll('#tabla-GastosGestion tbody tr');
  const datos = [];

  filas.forEach(fila => {
    const tipo = fila.querySelector('.tipo-reunion')?.textContent.trim();  // Corregido aquí
    const costo = parseInt(fila.querySelector('.Costo')?.value || 0);
    const eventos = parseInt(fila.querySelector('.Cantidad')?.value || 0);

    const total = costo * eventos;

    datos.push({
      tipo,
      costo,
      eventos,
      total_anual: total,
      periodo
    });

    // Reiniciar inputs después de guardar
    fila.querySelector('.Costo').value = 0;
    fila.querySelector('.Cantidad').value = 0;
    fila.querySelector('.total-anual').textContent = '$0';
  });

  const tieneDatos = datos.some(d => d.costo > 0 || d.eventos > 0);
  if (!tieneDatos) {
    alert("No hay datos para guardar. Por favor completa al menos una fila.");
    return;
  }

  try {
    const { error } = await supabase.from('plan_gastos_gestion').insert(datos);
    if (error) throw error;

    alert("Presupuesto de Gastos Gestión guardado exitosamente.");
    calcularGastosGestion();
  } catch (err) {
    console.error("Error al guardar:", err);
    alert("Error inesperado al guardar los datos.");
  }
}

export async function cargarPresupuestoGastosGestion() {
  const inputPeriodo = document.getElementById('input-periodo-gastos-gestion');
  if (!inputPeriodo) {
    alert("Falta el campo de período.");
    return;
  }

  const periodo = inputPeriodo.value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  try {
    const { data, error } = await supabase
      .from('plan_gastos_gestion')
      .select('*')
      .eq('periodo', periodo);

    if (error) throw error;

    const filas = document.querySelectorAll('#tabla-GastosGestion tbody tr');

    if (!data || data.length === 0) {
      filas.forEach(fila => {
        fila.querySelector('.Costo').value = 0;
        fila.querySelector('.Cantidad').value = 0;
        fila.querySelector('.total-anual').textContent = '$0';
      });
      calcularGastosGestion();
      return;
    }

    data.forEach(item => {
      const fila = Array.from(filas).find(f =>
        f.querySelector('.tipo-reunion')?.textContent.trim() === item.tipo  // Corregido aquí
      );
      if (fila) {
        fila.querySelector('.Costo').value = item.costo;
        fila.querySelector('.Cantidad').value = item.eventos;
        fila.querySelector('.total-anual').textContent = `$${(item.total_anual ?? 0).toLocaleString()}`;
      }
    });

    calcularGastosGestion();
  } catch (err) {
    console.error("Error al cargar los datos:", err);
    alert("Error al recuperar los datos.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  calcularGastosGestion();
});

window.guardarPresupuestoGastosGestion = guardarPresupuestoGastosGestion;
window.cargarPresupuestoGastosGestion = cargarPresupuestoGastosGestion;

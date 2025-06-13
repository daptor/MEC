import { supabase } from './supabaseClient.js';

function calcularCostoPlenarias() {
  const filas = document.querySelectorAll('#tabla-Plenarias tbody tr');
  let totalGeneral = 0;

  filas.forEach(fila => {
    const costo = parseInt(fila.querySelector('.Costo')?.value || 0);
    const eventos = parseInt(fila.querySelector('.Eventos')?.value || 0);
    const total = costo * eventos;

    fila.querySelector('.total-anual').textContent = `$${total.toLocaleString()}`;
    totalGeneral += total;
  });

  const totalPresupuesto = document.getElementById('total-presupuesto-Plenarias');
  if (totalPresupuesto) {
    totalPresupuesto.style.display = 'block';
    totalPresupuesto.textContent = `Total Presupuesto Plenarias: $${totalGeneral.toLocaleString()}`;
  }
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#tabla-Plenarias')) {
    calcularCostoPlenarias();
  }
});

export async function guardarPresupuestoPlenarias() {
  const inputPeriodo = document.getElementById('input-periodo-Plenarias');
  if (!inputPeriodo) {
    alert("Falta el campo de período.");
    return;
  }

  const periodo = inputPeriodo.value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  const filas = document.querySelectorAll('#tabla-Plenarias tbody tr');
  const datos = [];

  filas.forEach(fila => {
    const tipo = fila.querySelector('.tipo-reunion')?.textContent.trim();
    const costo = parseInt(fila.querySelector('.Costo')?.value || 0);
    const eventos = parseInt(fila.querySelector('.Eventos')?.value || 0);
    const total = costo * eventos;

    datos.push({
      tipo,
      costo,
      eventos,
      total_anual: total,
      periodo
    });

    // Reiniciar a cero después de guardar
    fila.querySelector('.Costo').value = 0;
    fila.querySelector('.Eventos').value = 0;
  });

  const tieneDatos = datos.some(d => d.costo > 0 || d.eventos > 0);
  if (!tieneDatos) {
    alert("No hay datos para guardar. Por favor completa al menos una fila.");
    return;
  }

  try {
    const { error } = await supabase.from('plan_gastos_plenarias').insert(datos);
    if (error) throw error;

    alert("Presupuesto de Plenarias guardado exitosamente.");
    calcularCostoPlenarias();
  } catch (err) {
    console.error("Error al guardar:", err);
    alert("Error inesperado al guardar los datos.");
  }
}

export async function cargarPresupuestoPlenarias() {
  const inputPeriodo = document.getElementById('input-periodo-Plenarias');
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
      .from('plan_gastos_plenarias')
      .select('*')
      .eq('periodo', periodo);

    const filas = document.querySelectorAll('#tabla-Plenarias tbody tr');
    if (error) throw error;

    // Si no hay datos, limpiar tabla
    if (!data || data.length === 0) {
      filas.forEach(fila => {
        fila.querySelector('.Costo').value = 0;
        fila.querySelector('.Eventos').value = 0;
      });
      calcularCostoPlenarias();
      return;
    }

    data.forEach(item => {
      const fila = Array.from(filas).find(f =>
        f.querySelector('.tipo-reunion')?.textContent.trim() === item.tipo
      );
      if (fila) {
        fila.querySelector('.Costo').value = item.costo;
        fila.querySelector('.Eventos').value = item.eventos;
      }
    });

    calcularCostoPlenarias();
  } catch (err) {
    console.error("Error al cargar los datos:", err);
    alert("Error al recuperar los datos.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  calcularCostoPlenarias();
});

window.guardarPresupuestoPlenarias = guardarPresupuestoPlenarias;
window.cargarPresupuestoPlenarias = cargarPresupuestoPlenarias;

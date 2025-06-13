import { supabase } from './supabaseClient.js';

function calcularComisiones() {
  const filas = document.querySelectorAll('#tabla-Comisiones tbody tr');
  let totalGeneral = 0;

  filas.forEach(fila => {
    const personas = parseInt(fila.querySelector('.Personas')?.value || 0);
    const horas = parseInt(fila.querySelector('.Horas')?.value || 0);
    const valorHora = parseInt(fila.querySelector('.ValorHora')?.value || 0);
    const total = personas * horas * valorHora;

    fila.querySelector('.total-anual').textContent = `$${total.toLocaleString()}`;
    totalGeneral += total;
  });

  const totalPresupuesto = document.getElementById('total-presupuesto-comisiones');
  if (totalPresupuesto) {
    totalPresupuesto.style.display = 'block';
    totalPresupuesto.textContent = `Total Presupuesto Comisiones: $${totalGeneral.toLocaleString()}`;
  }
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#tabla-Comisiones')) {
    calcularComisiones();
  }
});

export async function guardarPresupuestoComisiones() {
  const inputPeriodo = document.getElementById('input-periodo-comisiones');
  if (!inputPeriodo) {
    alert("Falta el campo de período.");
    return;
  }

  const periodo = inputPeriodo.value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  const filas = document.querySelectorAll('#tabla-Comisiones tbody tr');
  const datos = [];

  filas.forEach(fila => {
    const tipo = fila.querySelector('.tipo-reunion')?.textContent.trim();
    const personas = parseInt(fila.querySelector('.Personas')?.value || 0);
    const horas = parseInt(fila.querySelector('.Horas')?.value || 0);
    const valorHora = parseInt(fila.querySelector('.ValorHora')?.value || 0);
    const total = personas * horas * valorHora;

    datos.push({
      tipo,
      personas,
      horas,
      valor_hora: valorHora,
      total_anual: total,
      periodo
    });

    // Reiniciar valores después de guardar
    fila.querySelector('.Personas').value = 0;
    fila.querySelector('.Horas').value = 0;
    fila.querySelector('.ValorHora').value = 0;
  });

  const tieneDatos = datos.some(d => d.personas > 0 || d.horas > 0 || d.valor_hora > 0);
  if (!tieneDatos) {
    alert("No hay datos para guardar. Por favor completa al menos una fila.");
    return;
  }

  try {
    const { error } = await supabase.from('plan_gastos_comisiones').insert(datos);
    if (error) throw error;

    alert("Presupuesto de Comisiones guardado exitosamente.");
    calcularComisiones();
  } catch (err) {
    console.error("Error al guardar:", err);
    alert("Error inesperado al guardar los datos.");
  }
}

export async function cargarPresupuestoComisiones() {
  const inputPeriodo = document.getElementById('input-periodo-comisiones');
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
      .from('plan_gastos_comisiones')
      .select('*')
      .eq('periodo', periodo);

    const filas = document.querySelectorAll('#tabla-Comisiones tbody tr');
    if (error) throw error;

    // Si no hay datos, limpiar tabla
    if (!data || data.length === 0) {
      filas.forEach(fila => {
        fila.querySelector('.Personas').value = 0;
        fila.querySelector('.Horas').value = 0;
        fila.querySelector('.ValorHora').value = 0;
        fila.querySelector('.total-anual').textContent = "$0";
      });

      const totalPresupuesto = document.getElementById('total-presupuesto-comisiones');
      if (totalPresupuesto) {
        totalPresupuesto.style.display = 'none';
        totalPresupuesto.textContent = "Total Presupuesto Comisiones: $0";
      }

      alert("No se encontró presupuesto guardado para este período.");
      return;
    }

    data.forEach(item => {
      const fila = Array.from(filas).find(f =>
        f.querySelector('.tipo-reunion')?.textContent.trim() === item.tipo
      );
      if (fila) {
        fila.querySelector('.Personas').value = item.personas;
        fila.querySelector('.Horas').value = item.horas;
        fila.querySelector('.ValorHora').value = item.valor_hora;
      }
    });

    calcularComisiones();
  } catch (err) {
    console.error("Error al cargar los datos:", err);
    alert("Error al recuperar los datos.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  calcularComisiones();
});

export function limpiarTablaComisiones() {
  const filas = document.querySelectorAll('#tabla-Comisiones tbody tr');

  filas.forEach(fila => {
    fila.querySelector('.Personas').value = 0;
    fila.querySelector('.Horas').value = 0;
    fila.querySelector('.ValorHora').value = 0;
    fila.querySelector('.total-anual').textContent = "$0";
  });

  const totalPresupuesto = document.getElementById('total-presupuesto-comisiones');
  if (totalPresupuesto) {
    totalPresupuesto.style.display = 'none';
    totalPresupuesto.textContent = "Total Presupuesto Comisiones: $0";
  }

  const inputPeriodo = document.getElementById('input-periodo-comisiones');
  if (inputPeriodo) inputPeriodo.value = '';
}
window.limpiarTablaComisiones = limpiarTablaComisiones;
window.guardarPresupuestoComisiones = guardarPresupuestoComisiones;
window.cargarPresupuestoComisiones = cargarPresupuestoComisiones;

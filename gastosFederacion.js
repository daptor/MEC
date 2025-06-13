import { supabase } from './supabaseClient.js';

export function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.pantalla, .menu').forEach(el => el.style.display = 'none');
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}
window.mostrarPantalla = mostrarPantalla;

function calcularRemuneraciones() {
  const filas = document.querySelectorAll('#tabla-remuneraciones tbody tr');
  let totalPresupuestoAnual = 0;

  filas.forEach(fila => {
    const eventos = parseInt(fila.querySelector('.eventos')?.value || 0);
    const dias = parseInt(fila.querySelector('.dias')?.value || 0);
    const participantes = parseInt(fila.querySelector('.participantes')?.value || 0);
    const valorDia = parseInt(fila.querySelector('.valor-dia')?.value || 0);

    const valorMes = Math.round(dias * participantes * valorDia);
    const totalAnual = Math.round(valorMes * eventos);
    totalPresupuestoAnual += totalAnual;

    fila.querySelector('.valor-mes').textContent = `$${valorMes.toLocaleString()}`;
    fila.querySelector('.total-anual').textContent = `$${totalAnual.toLocaleString()}`;
  });

  const totalDiv = document.getElementById('total-presupuesto-director');
  if (totalDiv) {
    if (totalPresupuestoAnual > 0) {
      totalDiv.style.display = 'block';
      totalDiv.textContent = `Total Presupuesto Director-Reunión: $${totalPresupuestoAnual.toLocaleString()}`;
    } else {
      totalDiv.style.display = 'none';
    }
  }
}

function reiniciarTabla() {
  const filas = document.querySelectorAll('#tabla-remuneraciones tbody tr');
  filas.forEach(fila => {
    fila.querySelector('.eventos').value = 0;
    fila.querySelector('.dias').value = 0;
    fila.querySelector('.participantes').value = 0;
    fila.querySelector('.valor-dia').value = 0;
    fila.querySelector('.valor-mes').textContent = '$0';
    fila.querySelector('.total-anual').textContent = '$0';
  });

  const totalDiv = document.getElementById('total-presupuesto-director');
  if (totalDiv) {
    totalDiv.style.display = 'none';
    totalDiv.textContent = '';
  }
}

export async function guardarPresupuesto() {
  const periodo = document.getElementById('input-periodo').value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  const filas = document.querySelectorAll('#tabla-remuneraciones tbody tr');
  const datos = [];

  filas.forEach(fila => {
    const tipoReunion = fila.cells[0].textContent.trim();
    const eventos = parseInt(fila.querySelector('.eventos')?.value || 0);
    const dias = parseInt(fila.querySelector('.dias')?.value || 0);
    const participantes = parseInt(fila.querySelector('.participantes')?.value || 0);
    const valorDia = parseInt(fila.querySelector('.valor-dia')?.value || 0);
    const valorMes = Math.round(dias * participantes * valorDia);
    const totalAnual = Math.round(valorMes * eventos);

    datos.push({
      tipo_reunion: tipoReunion,
      eventos,
      dias,
      participantes,
      valor_dia: valorDia,
      valor_mes: valorMes,
      total_anual: totalAnual,
      periodo
    });
  });

  const tieneDatos = datos.some(d => d.eventos > 0 || d.dias > 0 || d.participantes > 0 || d.valor_dia > 0);
  if (!tieneDatos) {
    alert("No hay datos para guardar.");
    return;
  }

  try {
    const { error } = await supabase.from('plan_gastos_remuneracion').insert(datos);
    if (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los datos.");
    } else {
      alert("Presupuesto guardado exitosamente.");
      reiniciarTabla();  // ✅ Limpiar tabla luego de guardar
    }
  } catch (err) {
    console.error("Excepción:", err);
    alert("Error inesperado al guardar los datos.");
  }
}

export async function cargarPresupuesto() {
  const periodo = document.getElementById('input-periodo').value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos.");
    return;
  }

  try {
    const { data, error } = await supabase
      .from('plan_gastos_remuneracion')
      .select('*')
      .eq('periodo', periodo);

    if (error) {
      console.error("Error al cargar:", error);
      alert("Error al recuperar datos.");
      return;
    }

    const filas = document.querySelectorAll('#tabla-remuneraciones tbody tr');
    filas.forEach(fila => {
      const tipoReunion = fila.cells[0].textContent.trim();
      const filaData = data.find(d => d.tipo_reunion === tipoReunion);
      if (filaData) {
        fila.querySelector('.eventos').value = filaData.eventos;
        fila.querySelector('.dias').value = filaData.dias;
        fila.querySelector('.participantes').value = filaData.participantes;
        fila.querySelector('.valor-dia').value = filaData.valor_dia;
      } else {
        fila.querySelector('.eventos').value = 0;
        fila.querySelector('.dias').value = 0;
        fila.querySelector('.participantes').value = 0;
        fila.querySelector('.valor-dia').value = 0;
      }
    });

    calcularRemuneraciones(); // ✅ Actualiza celdas automáticas
  } catch (err) {
    console.error("Excepción al cargar:", err);
    alert("Error inesperado al recuperar los datos.");
  }
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#tabla-remuneraciones')) {
    calcularRemuneraciones();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  calcularRemuneraciones();
});

window.guardarPresupuesto = guardarPresupuesto;
window.cargarPresupuesto = cargarPresupuesto;

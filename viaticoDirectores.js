import { supabase } from './supabaseClient.js';

export function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.pantalla, .menu').forEach(el => el.style.display = 'none');
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}
window.mostrarPantalla = mostrarPantalla;

function calcularViaticos() {
  const filas = document.querySelectorAll('#tabla-viaticos tbody tr');
  let totalGeneral = 0;

  filas.forEach(fila => {
    const eventos = parseInt(fila.querySelector('.eventos')?.value || 0);
    const dias = parseInt(fila.querySelector('.dias')?.value || 0);
    const participantes = parseInt(fila.querySelector('.participantes')?.value || 0);
    const valorDia = parseInt(fila.querySelector('.valor-dia')?.value || 0);

    const valorMes = Math.round(dias * participantes * valorDia);
    const totalAnual = Math.round(valorMes * eventos);

    fila.querySelector('.valor-mes').textContent = `$${valorMes.toLocaleString()}`;
    fila.querySelector('.total-anual').textContent = `$${totalAnual.toLocaleString()}`;

    totalGeneral += totalAnual;
  });

  const totalPresupuesto = document.getElementById('total-presupuesto-viaticos');
  if (totalPresupuesto) {
    totalPresupuesto.style.display = 'block';
    totalPresupuesto.textContent = `Total Presupuesto Viaticos-Reunión: $${totalGeneral.toLocaleString()}`;
  }
}

document.addEventListener('input', (e) => {
  if (e.target.closest('#tabla-viaticos')) {
    calcularViaticos();
  }
});

export async function guardarPresupuestoViaticos() {
  const inputPeriodo = document.getElementById('input-periodo-viaticos');
  if (!inputPeriodo) {
    alert("Falta el campo de período.");
    return;
  }

  const periodo = inputPeriodo.value.trim();
  if (!/^\d{4}$/.test(periodo)) {
    alert("Ingresa un período válido de 4 dígitos (ej: 2025).");
    return;
  }

  const filas = document.querySelectorAll('#tabla-viaticos tbody tr');
  const datos = [];

  filas.forEach(fila => {
    const tipoReunion = fila.querySelector('.tipo-reunion')?.textContent.trim();
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

    // Reiniciar a cero luego de guardar
    fila.querySelector('.eventos').value = 0;
    fila.querySelector('.dias').value = 0;
    fila.querySelector('.participantes').value = 0;
    fila.querySelector('.valor-dia').value = 0;
  });

  const tieneDatos = datos.some(d => d.eventos > 0 || d.dias > 0 || d.participantes > 0 || d.valor_dia > 0);
  if (!tieneDatos) {
    alert("No hay datos para guardar. Por favor completa al menos una fila.");
    return;
  }

  try {
    const { error } = await supabase.from('plan_gastos_viaticos').insert(datos);
    if (error) throw error;

    alert("Presupuesto de viáticos guardado exitosamente.");
    calcularViaticos();
  } catch (err) {
    console.error("Error al guardar:", err);
    alert("Error inesperado al guardar los datos.");
  }
}

// ✅ Nueva función para cargar datos guardados desde Supabase
export async function cargarPresupuestoViaticos() {
  const inputPeriodo = document.getElementById('input-periodo-viaticos');
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
      .from('plan_gastos_viaticos')
      .select('*')
      .eq('periodo', periodo);

    if (error) throw error;

    const filas = document.querySelectorAll('#tabla-viaticos tbody tr');

    // Reiniciar todos los campos a cero
    filas.forEach(fila => {
      fila.querySelector('.eventos').value = 0;
      fila.querySelector('.dias').value = 0;
      fila.querySelector('.participantes').value = 0;
      fila.querySelector('.valor-dia').value = 0;
    });

    // Si hay datos, cargarlos encima de los ceros
    if (data && data.length > 0) {
      data.forEach(item => {
        const fila = Array.from(filas).find(f =>
          f.querySelector('.tipo-reunion')?.textContent.trim() === item.tipo_reunion
        );
        if (fila) {
          fila.querySelector('.eventos').value = item.eventos;
          fila.querySelector('.dias').value = item.dias;
          fila.querySelector('.participantes').value = item.participantes;
          fila.querySelector('.valor-dia').value = item.valor_dia;
        }
      });
    }

    // Siempre recalcular después de cargar (ya sea ceros o datos reales)
    calcularViaticos();

  } catch (err) {
    console.error("Error al cargar los datos:", err);
    alert("Error al recuperar los datos.");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  calcularViaticos();
});

window.guardarPresupuestoViaticos = guardarPresupuestoViaticos;
window.cargarPresupuestoViaticos = cargarPresupuestoViaticos;

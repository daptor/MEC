// ingresos_plan.js

import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  // Referencias a inputs y párrafos totales
  const sociosInput            = document.getElementById('socios');
  const valorCuotaInput        = document.getElementById('valorCuota');
  const plenariasInput         = document.getElementById('plenarias');
  const directoresPlenariaInput= document.getElementById('directoresPlenaria');
  const valorPlenariaInput     = document.getElementById('valorPlenaria');
  const mesesAporteInput       = document.getElementById('mesesAporte');
  const directoresAporteInput  = document.getElementById('directoresAporte');
  const valorAporteInput       = document.getElementById('valorAporte');
  const otrosIngresosInput     = document.getElementById('otrosIngresos');

  const totalCuotaP     = document.getElementById('totalCuota');
  const totalPlenariasP = document.getElementById('totalPlenarias');
  const totalAporteP    = document.getElementById('totalAporte');
  const totalOtrosP     = document.getElementById('totalOtros');
  const totalGeneralP   = document.getElementById('totalGeneral');

  // Verificar existencia de todos los elementos
  if (![sociosInput, valorCuotaInput, plenariasInput,
        directoresPlenariaInput, valorPlenariaInput,
        mesesAporteInput, directoresAporteInput, valorAporteInput,
        otrosIngresosInput,
        totalCuotaP, totalPlenariasP, totalAporteP, totalOtrosP, totalGeneralP]
       .every(el => el !== null)) {
    console.error('Faltan elementos del DOM para el Plan de Ingresos');
    return;
  }

  function calcularTotales() {
    const socios         = Number(sociosInput.value) || 0;
    const valorCuota     = Number(valorCuotaInput.value) || 0;
    const plenarias      = Number(plenariasInput.value) || 0;
    const dirsPlenaria   = Number(directoresPlenariaInput.value) || 0;
    const valorPlenaria  = Number(valorPlenariaInput.value) || 0;
    const mesesAporte    = Number(mesesAporteInput.value) || 0;
    const dirsAporte     = Number(directoresAporteInput.value) || 0;
    const valorAporte    = Number(valorAporteInput.value) || 0;
    const otrosIngresos  = Number(otrosIngresosInput.value) || 0;

    const mensualCuota = socios * valorCuota;
    const anualCuota   = mensualCuota * 12;
    const anualPlen    = plenarias * dirsPlenaria * valorPlenaria;
    const anualAporte  = mesesAporte * dirsAporte * valorAporte;

    const totalAnual   = anualCuota + anualPlen + anualAporte + otrosIngresos;

    // Mostrar resultados
    totalCuotaP.textContent     = `Cuota mensual: $${mensualCuota.toLocaleString()}`;
    totalPlenariasP.textContent = `Total plenarias: $${anualPlen.toLocaleString()}`;
    totalAporteP.textContent    = `Total aporte: $${anualAporte.toLocaleString()}`;
    totalOtrosP.textContent     = `Otros ingresos: $${otrosIngresos.toLocaleString()}`;
    totalGeneralP.textContent   = `Ingreso proyectado anual: $${totalAnual.toLocaleString()}`;

    return { anualCuota, anualPlen, anualAporte, otrosIngresos, totalAnual };
  }

  function limpiarFormulario() {
    [
      sociosInput, valorCuotaInput,
      plenariasInput, directoresPlenariaInput, valorPlenariaInput,
      mesesAporteInput, directoresAporteInput, valorAporteInput,
      otrosIngresosInput
    ].forEach(i => i.value = '');

    [
      totalCuotaP, totalPlenariasP, totalAporteP, totalOtrosP, totalGeneralP
    ].forEach(p => p.textContent = '');
  }

  async function guardarPlanIngresos() {
    const { anualCuota, anualPlen, anualAporte, otrosIngresos, totalAnual } = calcularTotales();

    const inputAnioPlan = document.getElementById('anioPlan');
    const año = parseInt(inputAnioPlan?.value, 10);

    if (!año || año < 2000 || año > 2100) {
      alert('Por favor ingresa un año válido para el plan.');
      return;
    }

    const { error } = await supabase
      .from('plan_ingresos')
      .insert([{
        cuota_sindicato: anualCuota,
        plenarias: anualPlen,
        aporte_director: anualAporte,
        otros: otrosIngresos,
        total: totalAnual,
        año: año,
        creado_en: new Date()
      }]);

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Plan de ingresos guardado correctamente.');
      limpiarFormulario();
      mostrarPantalla('pantalla-tesoreria');
    }
  }

  // Recalcular al modificar campos
  [
    sociosInput, valorCuotaInput,
    plenariasInput, directoresPlenariaInput, valorPlenariaInput,
    mesesAporteInput, directoresAporteInput, valorAporteInput,
    otrosIngresosInput
  ].forEach(input => input.addEventListener('input', calcularTotales));

  // Exponer función al ámbito global
  window.guardarPlanIngresos = guardarPlanIngresos;
});

// Export por si usas navegación de pantallas externa
export function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.style.display = 'none');
  const p = document.getElementById(idPantalla);
  if (p) p.style.display = 'block';
}

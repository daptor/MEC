import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnGenerarInforme');
  if (!btn) return console.warn('Botón no encontrado');
  btn.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const input = document.getElementById('informe-anio-base');
  const anioBase = parseInt(input.value);
  if (isNaN(anioBase)) return alert('Año inválido');

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  const meses = [
    { nombre: 'Abr', numero: 4, anio: anioBase },
    { nombre: 'May', numero: 5, anio: anioBase },
    { nombre: 'Jun', numero: 6, anio: anioBase },
    { nombre: 'Jul', numero: 7, anio: anioBase },
    { nombre: 'Ago', numero: 8, anio: anioBase },
    { nombre: 'Sep', numero: 9, anio: anioBase },
    { nombre: 'Oct', numero: 10, anio: anioBase },
    { nombre: 'Nov', numero: 11, anio: anioBase },
    { nombre: 'Dic', numero: 12, anio: anioBase },
    { nombre: 'Ene', numero: 1, anio: anioBase + 1 },
    { nombre: 'Feb', numero: 2, anio: anioBase + 1 },
    { nombre: 'Mar', numero: 3, anio: anioBase + 1 }
  ];

  const ingresos = Array(12).fill(0);
  const gastos = {
    Directores: Array(12).fill(0),
    Plenarias: Array(12).fill(0),
    Gestion: Array(12).fill(0),
    Comisiones: Array(12).fill(0)
  };

  try {
    // Ingresos desde ingreso_plenarias
    const { data: ingPlen } = await supabase
      .from('ingreso_plenarias')
      .select('año, mes_nombre, cuota');
    for (const row of ingPlen || []) {
      const idx = meses.findIndex(m =>
        m.anio === row.año &&
        m.nombre.toUpperCase() === row.mes_nombre.toUpperCase().slice(0, 3)
      );
      if (idx >= 0) ingresos[idx] += Number(row.cuota || 0);
    }

    // Gastos Directores
    const { data: gastosDir } = await supabase
      .from('gasto_real_directores')
      .select('*');
    for (const row of gastosDir || []) {
      const d = new Date(row.fecha);
      const idx = meses.findIndex(m => m.anio === d.getFullYear() && m.numero === (d.getMonth() + 1));
      const total = ['remuneracion', 'pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso']
        .reduce((s, k) => s + (Number(row[k]) || 0), 0);
      if (idx >= 0) gastos.Directores[idx] += total;
    }

    // Gastos Plenarias
    const { data: gastosPlen } = await supabase
      .from('gasto_real_plenarias')
      .select('fecha, costo_total');
    for (const row of gastosPlen || []) {
      const d = new Date(row.fecha);
      const idx = meses.findIndex(m => m.anio === d.getFullYear() && m.numero === (d.getMonth() + 1));
      if (idx >= 0) gastos.Plenarias[idx] += Number(row.costo_total || 0);
    }

    // Gastos Gestión
    const { data: gastosGes } = await supabase
      .from('gasto_real_gestion')
      .select('fecha, total');
    for (const row of gastosGes || []) {
      const d = new Date(row.fecha);
      const idx = meses.findIndex(m => m.anio === d.getFullYear() && m.numero === (d.getMonth() + 1));
      if (idx >= 0) gastos.Gestion[idx] += Number(row.total || 0);
    }

    // Gastos Comisiones
    const { data: gastosCom } = await supabase
      .from('gasto_real_comisiones')
      .select('fecha_registro, monto');
    for (const row of gastosCom || []) {
      const d = new Date(row.fecha_registro);
      const idx = meses.findIndex(m => m.anio === d.getFullYear() && m.numero === (d.getMonth() + 1));
      if (idx >= 0) gastos.Comisiones[idx] += Number(row.monto || 0);
    }

  } catch (err) {
    alert('Error al obtener datos: ' + err.message);
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
    return;
  }

  // Crear Excel
  const header = ['Mes', ...meses.map(m => m.nombre)];
  const resumen = [
    header,
    ['Ingresos', ...ingresos],
    ['Directores', ...gastos.Directores],
    ['Plenarias', ...gastos.Plenarias],
    ['Gestion', ...gastos.Gestion],
    ['Comisiones', ...gastos.Comisiones]
  ];

  const ws = XLSX.utils.aoa_to_sheet(resumen);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Informe');
  XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}_${anioBase + 1}.xlsx`);

  btn.disabled = false;
  btn.textContent = '📊 Generar Informe Excel';
}

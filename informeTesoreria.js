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

  const desde = `${anioBase}-04-01`;
  const hasta = `${anioBase + 1}-03-31`;
  const meses = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'];

  const ingresos = Array(12).fill(0);
  const gastos = {
    Directores: Array(12).fill(0),
    Plenarias: Array(12).fill(0),
    Gestion: Array(12).fill(0),
    Comisiones: Array(12).fill(0)
  };

  const mapMes = {
    ABRIL: 4, MAYO: 5, JUNIO: 6, JULIO: 7, AGOSTO: 8,
    SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
    ENERO: 1, FEBRERO: 2, MARZO: 3
  };

  // INGRESOS → ingreso_plenarias
  const { data: ingPlen, error: err1 } = await supabase
    .from('ingreso_plenarias')
    .select('año, mes_nombre, cuota')
    .or(`año.eq.${anioBase},año.eq.${anioBase + 1}`);
  if (err1) return alert('Error en ingresos: ' + err1.message);
  for (const row of ingPlen || []) {
    const mes = mapMes[(row.mes_nombre || '').toUpperCase()];
    const idx = (row.año === anioBase) ? mes - 4 : mes + 8;
    if (idx >= 0 && idx < 12) ingresos[idx] += Number(row.cuota || 0);
  }

  // GASTOS → gasto_real_directores
  const { data: gastosDir } = await supabase
    .from('gasto_real_directores')
    .select('*')
    .gte('fecha', desde).lte('fecha', hasta);
  for (const row of gastosDir || []) {
    const d = new Date(row.fecha);
    const idx = (d.getMonth() + 12 - 3) % 12;
    const total = ['remuneracion', 'pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso']
      .reduce((s, k) => s + (Number(row[k]) || 0), 0);
    gastos.Directores[idx] += total;
  }

  // GASTOS → gasto_real_plenarias
  const { data: gastosPlen } = await supabase
    .from('gasto_real_plenarias')
    .select('fecha, costo_total')
    .gte('fecha', desde).lte('fecha', hasta);
  for (const row of gastosPlen || []) {
    const d = new Date(row.fecha);
    const idx = (d.getMonth() + 12 - 3) % 12;
    gastos.Plenarias[idx] += Number(row.costo_total || 0);
  }

  // GASTOS → gasto_real_gestion
  const { data: gastosGes } = await supabase
    .from('gasto_real_gestion')
    .select('fecha, total')
    .gte('fecha', desde).lte('fecha', hasta);
  for (const row of gastosGes || []) {
    const d = new Date(row.fecha);
    const idx = (d.getMonth() + 12 - 3) % 12;
    gastos.Gestion[idx] += Number(row.total || 0);
  }

  // GASTOS → gasto_real_comisiones
  const { data: gastosCom } = await supabase
    .from('gasto_real_comisiones')
    .select('fecha_registro, monto')
    .gte('fecha_registro', desde).lte('fecha_registro', hasta);
  for (const row of gastosCom || []) {
    const d = new Date(row.fecha_registro);
    const idx = (d.getMonth() + 12 - 3) % 12;
    gastos.Comisiones[idx] += Number(row.monto || 0);
  }

  // ARMAR EXCEL
  const resumen = [['Mes', ...meses], ['Ingresos', ...ingresos]];
  for (const [categoria, valores] of Object.entries(gastos)) {
    resumen.push([categoria, ...valores]);
  }

  const ws = XLSX.utils.aoa_to_sheet(resumen);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Informe');
  XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}_${anioBase + 1}.xlsx`);

  btn.disabled = false;
  btn.textContent = '📊 Generar Informe Excel';
}

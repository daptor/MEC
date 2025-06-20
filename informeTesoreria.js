import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerarInforme')?.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const input = document.getElementById('informe-anio-base');
  const anioBase = parseInt(input.value);
  if (isNaN(anioBase)) return alert('Año inválido');

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  const meses = [
    { nombre: 'ABR', num: 4, anio: anioBase },
    { nombre: 'MAY', num: 5, anio: anioBase },
    { nombre: 'JUN', num: 6, anio: anioBase },
    { nombre: 'JUL', num: 7, anio: anioBase },
    { nombre: 'AGO', num: 8, anio: anioBase },
    { nombre: 'SEP', num: 9, anio: anioBase },
    { nombre: 'OCT', num: 10, anio: anioBase },
    { nombre: 'NOV', num: 11, anio: anioBase },
    { nombre: 'DIC', num: 12, anio: anioBase },
    { nombre: 'ENE', num: 1, anio: anioBase + 1 },
    { nombre: 'FEB', num: 2, anio: anioBase + 1 },
    { nombre: 'MAR', num: 3, anio: anioBase + 1 }
  ];

  try {
    // Carga todos los datos reales desde Supabase
    const [
      { data: planIngresos },
      { data: planGCom }, { data: planGGest }, { data: planGPlen },
      { data: planGRem }, { data: planGVia },
      { data: ingresoPlen }, { data: ingresoMens },
      { data: otrosIngr }, { data: aporteDir },
      { data: gdirect }, { data: gplen }, { data: ggest },
      { data: gcom }, { data: gotros }
    ] = await Promise.all([
      supabase.from('plan_ingresos').select('*').eq('año', anioBase),
      supabase.from('plan_gastos_comisiones').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_gestion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_plenarias').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_remuneracion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_viaticos').select('*').eq('periodo', `${anioBase}`),
      supabase.from('ingreso_plenarias').select('año, mes_nombre, cuota, nombre_sindicato').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('ingresos_mensuales').select('año, mes_nombre, cuota, nombre_sindicato').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('otros_ingresos').select('anio, mes, monto, tipo_ingreso').eq('anio', anioBase),
      supabase.from('aporte_director').select('fecha, monto').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase + 1}-03-31`),
      supabase.from('gasto_real_directores').select('fecha, remuneracion, pasajes, colacion, metro, taxi_colectivo, hotel, reembolso'),
      supabase.from('gasto_real_plenarias').select('fecha, costo_total'),
      supabase.from('gasto_real_gestion').select('fecha, total'),
      supabase.from('gasto_real_comisiones').select('fecha_registro, monto'),
      supabase.from('gasto_real_otros').select('fecha_registro, monto, descripcion')
    ]);

    // Crear libro Excel
    const wb = XLSX.utils.book_new();

    // Hoja 1: Plan Ingresos y Gastos
    const hoja1 = [];
    hoja1.push(['PLAN INGRESOS']);
    hoja1.push(Object.keys(planIngresos[0] || {}));
    planIngresos.forEach(r => hoja1.push(Object.values(r)));
    hoja1.push([]);

    [
      ['PLAN GASTOS COMISIONES', planGCom],
      ['PLAN GESTIÓN', planGGest],
      ['PLAN PLENARIAS', planGPlen],
      ['PLAN REMUNERACIÓN', planGRem],
      ['PLAN VIÁTICOS', planGVia]
    ].forEach(([titulo, datos]) => {
      hoja1.push([titulo]);
      hoja1.push(Object.keys(datos[0] || {}));
      datos.forEach(r => hoja1.push(Object.values(r)));
      hoja1.push([]);
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hoja1), 'Plan Ingresos y Gastos');
    // 🧮 Hoja 2: Resumen Tesorería (con fórmulas embebidas)
    const { aoa, formulas } = construirResumenTesoreriaConFormulas({
      ingresoMens, ingresoPlen, otrosIngr, aporteDir,
      gdirect, gplen, ggest, gcom, gotros, meses
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    formulas.forEach(({ celda, formula }) => {
      if (!ws[celda]) ws[celda] = {};
      ws[celda].f = formula;
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Tesorería');
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`);

  } catch (err) {
    console.error(err);
    alert('Error al generar informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// ✅ Helper: convierte fecha o nombre de mes a índice 0–11
function mesIndex(año, mes, meses) {
  if (typeof mes === 'string') {
    const idx = meses.findIndex(m => m.nombre.toLowerCase() === mes.toLowerCase() && m.anio === año);
    return idx >= 0 ? idx : -1;
  } else {
    const idx = meses.findIndex(m => m.anio === año && m.num === mes);
    return idx >= 0 ? idx : -1;
  }
}

// ✅ Helper principal para construir la hoja resumen
function construirResumenTesoreriaConFormulas({ ingresoMens, ingresoPlen, otrosIngr, aporteDir, gdirect, gplen, ggest, gcom, gotros, meses }) {
  const aoa = [];
  const formulas = [];
  const header = ['Categoría', ...meses.map(m => m.nombre), 'ANUAL'];
  aoa.push(header);

  const mapa = {};
  const filas = [];

  function agregarFila(nombre) {
    const arr = Array(12).fill(0);
    mapa[nombre] = arr;
    filas.push([nombre, arr]);
  }

  // 👉 Ingresos mensuales
  const todos = [...(ingresoMens || []), ...(ingresoPlen || [])];
  todos.forEach(r => {
    const key = r.nombre_sindicato || 'SIN NOMBRE';
    if (!mapa[key]) agregarFila(key);
    const idx = mesIndex(r.año, r.mes_nombre, meses);
    if (idx >= 0) mapa[key][idx] += Number(r.cuota || 0);
  });

  // 👉 Otros ingresos
  const tiposOtros = Array.from(new Set((otrosIngr || []).map(o => o.tipo_ingreso)));
  tiposOtros.forEach(tipo => agregarFila(tipo));
  otrosIngr.forEach(r => {
    const idx = mesIndex(r.anio, parseInt(r.mes), meses);
    if (idx >= 0) mapa[r.tipo_ingreso][idx] += Number(r.monto || 0);
  });

  // 👉 Aporte director
  agregarFila('APORTE DIRECTORES');
  (aporteDir || []).forEach(r => {
    const d = new Date(r.fecha);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    if (idx >= 0) mapa['APORTE DIRECTORES'][idx] += Number(r.monto || 0);
  });

  // 👉 Gastos
  const gastos = {
    REMUNERACION: 'remuneracion',
    PASAJES: 'pasajes',
    COLACION: 'colacion',
    METRO: 'metro',
    'TAXI / COLECTIVO': 'taxi_colectivo',
    HOTEL: 'hotel',
    REEMBOLSO: 'reembolso'
  };
  Object.entries(gastos).forEach(([label, campo]) => agregarFila(label));
  (gdirect || []).forEach(r => {
    const d = new Date(r.fecha);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    Object.entries(gastos).forEach(([label, campo]) => {
      if (idx >= 0) mapa[label][idx] += Number(r[campo] || 0);
    });
  });

  agregarFila('GASTO PLENARIAS');
  (gplen || []).forEach(r => {
    const d = new Date(r.fecha);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    if (idx >= 0) mapa['GASTO PLENARIAS'][idx] += Number(r.costo_total || 0);
  });

  agregarFila('GASTO GESTION');
  (ggest || []).forEach(r => {
    const d = new Date(r.fecha);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    if (idx >= 0) mapa['GASTO GESTION'][idx] += Number(r.total || 0);
  });

  agregarFila('GASTO COMISIONES');
  (gcom || []).forEach(r => {
    const d = new Date(r.fecha_registro);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    if (idx >= 0) mapa['GASTO COMISIONES'][idx] += Number(r.monto || 0);
  });

  const descOtros = Array.from(new Set((gotros || []).map(r => r.descripcion)));
  descOtros.forEach(d => agregarFila(d));
  (gotros || []).forEach(r => {
    const d = new Date(r.fecha_registro);
    const idx = mesIndex(d.getFullYear(), d.getMonth() + 1, meses);
    if (idx >= 0) mapa[r.descripcion][idx] += Number(r.monto || 0);
  });

  // 👉 Escribir filas y fórmulas de “ANUAL”
  let fila = 2;
  filas.forEach(([label, arr]) => {
    aoa.push([label, ...arr, null]);
    formulas.push({ celda: `N${fila}`, formula: `SUM(B${fila}:M${fila})` });
    fila++;
  });

  // 👉 TOTAL INGRESOS
  const filaTotIng = fila++;
  aoa.push(['TOTAL INGRESOS', ...Array(12).fill(null), null]);
  for (let c = 0; c < 12; c++) {
    const col = String.fromCharCode(66 + c);
    formulas.push({ celda: `${col}${filaTotIng}`, formula: `SUM(${col}2:${col}${filaTotIng - 1})` });
  }
  formulas.push({ celda: `N${filaTotIng}`, formula: `SUM(B${filaTotIng}:M${filaTotIng})` });

  // 👉 TOTAL GASTOS
  const filaTotGast = fila++;
  aoa.push(['TOTAL GASTOS', ...Array(12).fill(null), null]);
  for (let c = 0; c < 12; c++) {
    const col = String.fromCharCode(66 + c);
    formulas.push({ celda: `${col}${filaTotGast}`, formula: `SUM(${col}${filaTotIng + 1}:${col}${filaTotGast - 1})` });
  }
  formulas.push({ celda: `N${filaTotGast}`, formula: `SUM(B${filaTotGast}:M${filaTotGast})` });

  // 👉 AHORRO O DÉFICIT
  const filaAhorro = fila++;
  aoa.push(['AHORRO O DÉFICIT', ...Array(12).fill(null), null]);
  for (let c = 0; c < 12; c++) {
    const col = String.fromCharCode(66 + c);
    formulas.push({ celda: `${col}${filaAhorro}`, formula: `${col}${filaTotIng}-${col}${filaTotGast}` });
  }
  formulas.push({ celda: `N${filaAhorro}`, formula: `SUM(B${filaAhorro}:M${filaAhorro})` });

  // 👉 SALDO FINAL Y CUADRATURA
  const filaSaldoFinal = fila + 7;
  const filaCuadra = filaSaldoFinal + 1;
  aoa[filaSaldoFinal - 1] = ['SALDO FINAL', ...Array(13).fill(null)];
  aoa[filaCuadra - 1] = ['CUADRATURA FINAL', ...Array(13).fill(null)];
  formulas.push({ celda: `B${filaSaldoFinal}`, formula: `SALDO_INICIAL+N${filaAhorro}` });
  formulas.push({ celda: `B${filaCuadra}`, formula: `B${filaSaldoFinal}-B${filaSaldoFinal - 3}` });

  return { aoa, formulas };
}

import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('btnGenerarInforme')
    ?.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(
    document.getElementById('informe-anio-base').value,
    10
  );
  if (isNaN(anioBase)) return alert('Año inválido');

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  // Meses Abril–Marzo
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
    // 1) Planes
    const [
      { data: planIngresos },
      { data: planGCom },
      { data: planGGest },
      { data: planGPlen },
      { data: planGRem },
      { data: planGVia }
    ] = await Promise.all([
      supabase.from('plan_ingresos').select('*').eq('año', anioBase),
      supabase.from('plan_gastos_comisiones').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_gestion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_plenarias').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_remuneracion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_viaticos').select('*').eq('periodo', `${anioBase}`)
    ]);

    // 2) Reales: ingresos y gastos
    const [
      { data: ingresoPlen },
      { data: ingresoMens },
      { data: otrosIngr },
      { data: aporteDir },
      { data: gdirect },
      { data: gplen },
      { data: ggest },
      { data: gcom },
      { data: gotros }
    ] = await Promise.all([
      supabase.from('ingreso_plenarias')
        .select('año, mes_nombre, cuota, nombre_sindicato')
        .gte('año', meses[0].anio).lte('año', meses[11].anio),
      supabase.from('ingresos_mensuales')
        .select('año, mes_nombre, cuota, nombre_sindicato')
        .gte('año', meses[0].anio).lte('año', meses[11].anio),
      supabase.from('otros_ingresos')
        .select('anio, mes, monto, tipo_ingreso')
        .eq('anio', anioBase),
      supabase.from('aporte_director')
        .select('fecha, monto')
        .gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase+1}-03-31`),
      supabase.from('gasto_real_directores')
        .select('fecha, remuneracion, pasajes, colacion, metro, taxi_colectivo, hotel, reembolso'),
      supabase.from('gasto_real_plenarias')
        .select('fecha, costo_total'),
      supabase.from('gasto_real_gestion')
        .select('fecha, total'),
      supabase.from('gasto_real_comisiones')
        .select('fecha_registro, monto'),
      supabase.from('gasto_real_otros')
        .select('fecha_registro, monto, descripcion')
    ]);

    // 3) Armar workbook
    const wb = XLSX.utils.book_new();

    // Hoja 1: Plan Ingresos y Gastos
    const sheet1 = [];
    sheet1.push(['PLAN INGRESOS']);
    sheet1.push(Object.keys(planIngresos[0] || {}));
    planIngresos.forEach(r => sheet1.push(Object.values(r)));
    sheet1.push([]);
    [
      ['PLAN GASTOS COMISIONES', planGCom],
      ['PLAN GASTOS GESTION', planGGest],
      ['PLAN GASTOS PLENARIAS', planGPlen],
      ['PLAN GASTOS REMUNERACION', planGRem],
      ['PLAN GASTOS VIATICOS', planGVia]
    ].forEach(([title, data]) => {
      sheet1.push([title]);
      sheet1.push(Object.keys(data[0] || {}));
      data.forEach(r => sheet1.push(Object.values(r)));
      sheet1.push([]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1), 'Plan Ingresos y Gastos');

    // Hoja 2: Resumen Tesorería con fórmulas embebidas
    const { aoa, formulas } = construirResumenConFormulas(
      ingresoMens, ingresoPlen, otrosIngr, aporteDir,
      gdirect, gplen, ggest, gcom, gotros,
      meses
    );
    const ws2 = XLSX.utils.aoa_to_sheet(aoa);
    formulas.forEach(({ celda, formula }) => {
      if (!ws2[celda]) ws2[celda] = {};
      ws2[celda].f = formula;
    });
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen Tesorería');

    // Descargar
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);
  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  } finally {
    const btn = document.getElementById('btnGenerarInforme');
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// Construye AOA y fórmulas para "Resumen Tesorería"
function construirResumenConFormulas(
  mens, plen, otros, aportes,
  direct, plen2, gest, com, otrosG,
  meses
) {
  const aoa = [];
  const formulas = [];

  // Header
  aoa.push(['Categoría', ...meses.map(m => m.nombre), 'ANUAL']);

  // --- Ingresos ---
  const filasIngr = buildResumenIngresos(mens, plen, otros, aportes, meses);
  filasIngr.slice(1).forEach((row, i) => {
    const fila = i + 2;
    aoa.push(row.concat(null));
    formulas.push({ celda: `N${fila}`, formula: `SUM(B${fila}:M${fila})` });
  });
  const endIngr = filasIngr.length + 1;
  aoa.push(['TOTAL INGRESOS', ...Array(12).fill(null), null]);

  // --- Gastos ---
  const filasGast = buildResumenGastos(direct, plen2, gest, com, otrosG, meses);
  filasGast.slice(1).forEach((row, i) => {
    const fila = endIngr + i + 2;
    aoa.push(row.concat(null));
    formulas.push({ celda: `N${fila}`, formula: `SUM(B${fila}:M${fila})` });
  });
  const endGast = endIngr + filasGast.length + 1;
  aoa.push(['TOTAL GASTOS', ...Array(12).fill(null), null]);

  // --- Extra rows ---
  const labels = [
    'AHORRO O DÉFICIT',
    'VARIACIONES TESORERÍA',
    'SALDO DISPONIBLE',
    'CARTOLA',
    'CONTROL',
    'SALDO INICIAL',
    'SALDO FINAL',
    'CUADRATURA FINAL'
  ];
  labels.forEach((lab, idx) => {
    const fila = endGast + idx + 1;
    if (lab === 'SALDO INICIAL') {
      const saldoIni = aportes.reduce((s, r) => s + Number(r.monto || 0), 0);
      aoa.push([lab, saldoIni, ...Array(11).fill(null), null]);
    } else {
      aoa.push([lab, ...Array(12).fill(null), null]);
    }
  });

  // Positions
  const pIn = { start: 2, end: endIngr - 1 };
  const pGa = { start: endIngr + 1, end: endGast - 1 };
  const fAh = pGa.end + 2;
  const fVa = fAh + 1;
  const fDi = fVa + 1;
  const fCa = fDi + 1;
  const fCo = fCa + 1;
  const fSi = fCo + 1;
  const fSf = fSi + 1;
  const fCu = fSf + 1;

  meses.forEach((m, i) => {
    const col = String.fromCharCode(66 + i); // B..M
    formulas.push({
      celda: `${col}${endIngr}`,
      formula: `SUM(${col}${pIn.start}:${col}${pIn.end})`
    });
    formulas.push({
      celda: `${col}${endGast}`,
      formula: `SUM(${col}${pGa.start}:${col}${pGa.end})`
    });
    formulas.push({
      celda: `${col}${fAh}`,
      formula: `${col}${endIngr}-${col}${endGast}`
    });

    if (i === 0) {
      formulas.push({
        celda: `${col}${fVa}`,
        formula: `${col}${fAh}`
      });
      formulas.push({
        celda: `${col}${fDi}`,
        formula: `B${fSi}+${col}${fVa}`
      });
    } else {
      const prev = String.fromCharCode(col.charCodeAt(0) - 1);
      formulas.push({
        celda: `${col}${fVa}`,
        formula: `${prev}${fVa}+${col}${fAh}`
      });
      formulas.push({
        celda: `${col}${fDi}`,
        formula: `${prev}${fDi}+${col}${fVa}`
      });
    }
    formulas.push({
      celda: `${col}${fCo}`,
      formula: `${col}${fDi}-${col}${fCa}`
    });
  });

  // Annual formulas in column N
  formulas.push({ celda: `N${endIngr}`, formula: `SUM(B${endIngr}:M${endIngr})` });
  formulas.push({ celda: `N${endGast}`, formula: `SUM(B${endGast}:M${endGast})` });
  formulas.push({ celda: `N${fAh}`, formula: `N${endIngr}-N${endGast}` });
  formulas.push({ celda: `N${fSf}`, formula: `B${fSi}+N${fAh}` });
  formulas.push({ celda: `N${fCu}`, formula: `N${fDi}-N${fSf}` });

  return { aoa, formulas };
}

// Helpers to build raw rows (without ANUAL column)
function buildResumenIngresos(mens, plen, otros, aportes, meses) {
  const sindicatos = Array.from(new Set([
    ...(mens || []).map(r => r.nombre_sindicato),
    ...(plen || []).map(r => r.nombre_sindicato)
  ]));
  const data = sindicatos.reduce((acc, s) => {
    acc[s] = Array(12).fill(0);
    return acc;
  }, {});
  mens.forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, data[r.nombre_sindicato]));
  plen.forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, data[r.nombre_sindicato]));

  const filas = sindicatos.map(s => [s, ...data[s]]);
  // INGRESO SINDICATOS
  const suma = Array(12).fill(0);
  filas.forEach(r => r.slice(1).forEach((v, i) => suma[i] += v));
  filas.push(['INGRESO SINDICATOS', ...suma]);

  // Otros ingresos
  const tipos = Array.from(new Set((otros || []).map(r => r.tipo_ingreso)));
  const otrosData = tipos.reduce((a, t) => {
    a[t] = Array(12).fill(0);
    return a;
  }, {});
  otros.forEach(r => acum(r.anio, parseInt(r.mes, 10), r.monto, meses, otrosData[r.tipo_ingreso]));
  tipos.forEach(t => filas.push([t, ...otrosData[t]]));

  // Aporte directores
  const aporteArr = Array(12).fill(0);
  aportes.forEach(r => {
    const d = new Date(r.fecha);
    acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, aporteArr);
  });
  filas.push(['APORTE DIRECTORES', ...aporteArr]);

  return [['Categoría', ...meses.map(m => m.nombre)], ...filas];
}

function buildResumenGastos(direct, plen, gest, com, otros, meses) {
  // Gastos directores
  const keys = ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso'];
  const dirData = keys.reduce((a,k)=>{ a[k]=Array(12).fill(0); return a; }, {});
  direct.forEach(r => {
    const d = new Date(r.fecha);
    keys.forEach(k => acum(d.getFullYear(), d.getMonth()+1, r[k], meses, dirData[k]));
  });
  const filas = keys.map(k => [k.toUpperCase(), ...dirData[k]]);

  // Totales director
  const totDir = Array(12).fill(0);
  filas.forEach(r => r.slice(1).forEach((v,i)=> totDir[i]+=v));
  filas.push(['GASTO DIRECTOR', ...totDir]);

  // Plenarias, gestión, comisiones
  const mapea = (arr, prop) => {
    const tmp = Array(12).fill(0);
    arr.forEach(r => {
      const d = new Date(r.fecha || r.fecha_registro);
      const val = prop==='costo_total'? r.costo_total : (prop==='total'? r.total : r.monto);
      acum(d.getFullYear(), d.getMonth()+1, val, meses, tmp);
    });
    return tmp;
  };
  filas.push(['GASTO PLENARIAS', ...mapea(plen,'costo_total')]);
  filas.push(['GASTO GESTION', ...mapea(gest,'total')]);
  filas.push(['GASTO COMISIONES', ...mapea(com,'monto')]);

  // Otros gastos por descripción
  const descs = Array.from(new Set((otros||[]).map(r=>r.descripcion)));
  const dataO = descs.reduce((a,t)=>{ a[t]=Array(12).fill(0); return a; }, {});
  otros.forEach(r=>{
    const d = new Date(r.fecha_registro);
    acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataO[r.descripcion]);
  });
  descs.forEach(t=> filas.push([t.toUpperCase(), ...dataO[t]]));

  return [['Categoría', ...meses.map(m=>m.nombre)], ...filas];
}

// Helper de acumulación
function acum(anio, mes, monto, meses, arr) {
  const idx = meses.findIndex(mobj =>
    typeof mes==='string'
      ? mobj.nombre.toLowerCase() === mes.toLowerCase()
      : mobj.anio === anio && mobj.num === mes
  );
  if (idx >= 0) arr[idx] += Number(monto) || 0;
}

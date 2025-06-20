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

    // Hoja 1: Plan Ingresos y Gastos (igual que antes)
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
    wb.SheetNames.push('Plan Ingresos y Gastos');
    wb.Sheets['Plan Ingresos y Gastos'] = XLSX.utils.aoa_to_sheet(sheet1);

    // Hoja 2: Resumen Tesorería con fórmulas embebidas
    const { aoa, formulas } = construirResumenConFormulas(
      ingresoMens, ingresoPlen, otrosIngr, aporteDir,
      gdirect, gplen, ggest, gcom, gotros,
      meses
    );
    const ws2 = XLSX.utils.aoa_to_sheet(aoa);
    // Insertar todas las fórmulas
    formulas.forEach(({ celda, formula }) => {
      if (!ws2[celda]) ws2[celda] = {};
      ws2[celda].f = formula;
    });
    wb.SheetNames.push('Resumen Tesorería');
    wb.Sheets['Resumen Tesorería'] = ws2;

    // Descargar archivo
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);

  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

/**
 * Construye el AOA y lista de fórmulas para la hoja "Resumen Tesorería"
 */
function construirResumenConFormulas(
  ingresoMens, ingresoPlen, otrosIngr, aporteDir,
  gdirect, gplen, ggest, gcom, gotros,
  meses
) {
  const aoa = [];
  const formulas = [];

  // Header
  aoa.push(['Categoría', ...meses.map(m => m.nombre), 'ANUAL']);

  // --- 1) Ingresos ---
  // Reusa tu lógica de buildResumenIngresos pero sin el cálculo anual inline
  const filasIngr = buildResumenIngresos(ingresoMens, ingresoPlen, otrosIngr, aporteDir, meses);
  filasIngr.slice(1).forEach((row, i) => {
    const fila = i + 2;
    aoa.push(row);
    // Fórmula anual
    formulas.push({ celda: `N${fila}`, formula: `SUM(B${fila}:M${fila})` });
  });
  const filaTotalIngr = filasIngr.length + 1;  // header + rowsIngr

  // --- 2) Gastos ---
  const filasGast = buildResumenGastos(gdirect, gplen, ggest, gcom, gotros, meses);
  filasGast.slice(1).forEach((row, i) => {
    const fila = filaTotalIngr + i + 2;
    aoa.push(row);
    // Fórmula anual
    formulas.push({ celda: `N${fila}`, formula: `SUM(B${fila}:M${fila})` });
  });
  const filaTotalGast = filaTotalIngr + filasGast.length + 1;

  // --- 3) Ahorro/Déficit, Variaciones, Saldos, Control, Saldo Inicial, Final y Cuadratura ---
  const extraLabels = [
    'AHORRO O DÉFICIT',
    'VARIACIONES TESORERÍA',
    'SALDO DISPONIBLE',
    'CARTOLA',
    'CONTROL',
    'SALDO INICIAL',
    'SALDO FINAL',
    'CUADRATURA FINAL'
  ];
  extraLabels.forEach((label, idx) => {
    const fila = filaTotalGast + idx + 1;
    // Para SALDO INICIAL, el único valor está en B de esa fila:
    if (label === 'SALDO INICIAL') {
      const saldoInicial = aporteDir.reduce((sum,r)=>sum + Number(r.monto||0), 0);
      aoa.push([label, saldoInicial, ...Array(11).fill(null), null]);
    } else {
      aoa.push([label, ...Array(12).fill(null), null]);
    }
    // Luego iremos a insertar fórmulas mes a mes y anual
  });

  // Ahora llenamos fórmulas para cada mes (columnas B–M) en esos bloques:
  const filasBase = {
    ingresos: { start: 2, end: filaTotalIngr - 1 },
    gastos:   { start: filaTotalIngr + 1, end: filaTotalGast - 1 },
  };
  const filaAhorro     = filasBase.gastos.end + 2;
  const filaVariacion  = filaAhorro + 1;
  const filaSaldoDisp  = filaVariacion + 1;
  const filaCartola    = filaSaldoDisp + 1;
  const filaControl    = filaCartola + 1;
  const filaSaldoInit  = filaControl + 1;
  const filaSaldoFinal = filaSaldoInit + 1;
  const filaCuadFinal  = filaSaldoFinal + 1;

  meses.forEach((m, idx) => {
    const col = String.fromCharCode(66 + idx); // B..M
    // Total Ingresos mes
    formulas.push({
      celda: `${col}${filaTotalIngr}`,
      formula: `SUM(${col}${filasBase.ingresos.start}:${col}${filasBase.ingresos.end})`
    });
    // Total Gastos mes
    formulas.push({
      celda: `${col}${filaTotalGast}`,
      formula: `SUM(${col}${filasBase.gastos.start}:${col}${filasBase.gastos.end})`
    });
    // Ahorro/Déficit
    formulas.push({
      celda: `${col}${filaAhorro}`,
      formula: `${col}${filaTotalIngr}-${col}${filaTotalGast}`
    });
    // Variaciones acumuladas
    if (idx === 0) {
      formulas.push({
        celda: `${col}${filaVariacion}`,
        formula: `${col}${filaAhorro}`
      });
      formulas.push({
        celda: `${col}${filaSaldoDisp}`,
        formula: `B${filaSaldoInit}+${col}${filaVariacion}`
      });
    } else {
      const prev = String.fromCharCode(col.charCodeAt(0) - 1);
      formulas.push({
        celda: `${col}${filaVariacion}`,
        formula: `${prev}${filaVariacion}+${col}${filaAhorro}`
      });
      formulas.push({
        celda: `${col}${filaSaldoDisp}`,
        formula: `${prev}${filaSaldoDisp}+${col}${filaVariacion}`
      });
    }
    // Control = Disponible – Cartola
    formulas.push({
      celda: `${col}${filaControl}`,
      formula: `${col}${filaSaldoDisp}-${col}${filaCartola}`
    });
  });

  // Fórmulas ANUALES (columna N)
  const anual = col => `SUM(${col}${filasBase.ingresos.start}:${col}${filaCuadFinal})`;
  formulas.push({ celda: `N${filaTotalIngr}`,   formula: `SUM(B${filaTotalIngr}:M${filaTotalIngr})` });
  formulas.push({ celda: `N${filaTotalGast}`,   formula: `SUM(B${filaTotalGast}:M${filaTotalGast})` });
  formulas.push({ celda: `N${filaAhorro}`,      formula: `N${filaTotalIngr}-N${filaTotalGast}` });
  formulas.push({ celda: `N${filaSaldoFinal}`,  formula: `B${filaSaldoInit}+N${filaAhorro}` });
  formulas.push({ celda: `N${filaCuadFinal}`,   formula: `N${filaSaldoDisp}-N${filaSaldoFinal}` });

  return { aoa, formulas };
}

// Reutiliza tus helpers para generar filas de datos
function buildResumenIngresos(mens, plen, otros, aportes, meses) {
  const sindicatos = Array.from(new Set([
    ...(mens||[]).map(r=>r.nombre_sindicato),
    ...(plen||[]).map(r=>r.nombre_sindicato)
  ]));
  const data = sindicatos.reduce((a,s)=>{ a[s]=Array(12).fill(0); return a; }, {});
  const acumula = r => acum(r.año, r.mes_nombre, r.cuota, meses, data[r.nombre_sindicato]);
  mens.forEach(acumula); plen.forEach(acumula);

  const filas = sindicatos.map(s => {
    const vals = data[s];
    return [s, ...vals];
  });
  // INGRESO SINDICATOS
  const suma = Array(12).fill(0);
  filas.forEach(r=>r.slice(1).forEach((v,i)=>suma[i]+=v));
  filas.push(['INGRESO SINDICATOS', ...suma]);
  // OTROS y APORTE DIRECTORES igual que antes...
  // Luego TOTAL INGRESOS
  return [['Categoría', ...meses.map(m=>m.nombre)], ...filas];
}
function buildResumenGastos(direct, plen, gest, com, otros, meses) {
  // similar a buildResumenIngresos, pero para gastos
  return [['Categoría', ...meses.map(m=>m.nombre)], /* filas */];
}
function acum(anio, mes, monto, meses, arr) {
  const idx = meses.findIndex(mobj =>
    typeof mes==='string'
      ? mobj.nombre.toLowerCase()===mes.toLowerCase()
      : mobj.anio===anio && mobj.num===mes
  );
  if (idx>=0) arr[idx]+=Number(monto)||0;
}

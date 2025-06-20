import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnGenerarInforme');
  if (!btn) return console.warn('Botón no encontrado');
  btn.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const input = document.getElementById('informe-anio-base');
  const anioBase = parseInt(input.value, 10);
  if (isNaN(anioBase)) return alert('Año inválido');

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  // Definir meses Abril–Marzo
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
    // 1) Planes de ingresos y gastos
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

    // 2) Ingresos reales
    const [
      { data: ingresoPlen },
      { data: ingresoMens },
      { data: otrosIngr },
      { data: aporteDir }
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
        .gte('fecha', `${anioBase}-04-01`)
        .lte('fecha', `${anioBase+1}-03-31`)
    ]);

    // 3) Gastos reales
    const [
      { data: gdirect },
      { data: gplen },
      { data: ggest },
      { data: gcom },
      { data: gotros }
    ] = await Promise.all([
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

    // Crear workbook y hojas crudas
    const wb = XLSX.utils.book_new();
    const hojas = [
      ['Plan Ingresos', planIngresos],
      ['Plan Gastos Com.', planGCom],
      ['Plan Gastos Gest.', planGGest],
      ['Plan Gastos Plen.', planGPlen],
      ['Plan Gastos Rem.', planGRem],
      ['Plan Gastos Via.', planGVia],
      ['Raw Ingr Plen.', ingresoPlen],
      ['Raw Ingr Mens.', ingresoMens],
      ['Raw Otros Ingr', otrosIngr],
      ['Raw Aportes Dir', aporteDir],
      ['Raw Gasto Dir', gdirect],
      ['Raw Gasto Plen', gplen],
      ['Raw Gasto Gest', ggest],
      ['Raw Gasto Com.', gcom],
      ['Raw Gasto Otros', gotros]
    ];
    hojas.forEach(([name, data]) => {
      wb.SheetNames.push(name);
      wb.Sheets[name] = XLSX.utils.json_to_sheet(data || []);
    });

    // Resumen Ingresos
    const resumenIngr = buildResumenIngresos(
      ingresoMens, ingresoPlen, otrosIngr, aporteDir, meses
    );
    wb.SheetNames.push('Resumen Ingresos');
    wb.Sheets['Resumen Ingresos'] = XLSX.utils.aoa_to_sheet(resumenIngr);

    // Resumen Gastos
    const resumenGast = buildResumenGastos(
      gdirect, gplen, ggest, gcom, gotros, meses
    );
    wb.SheetNames.push('Resumen Gastos');
    wb.Sheets['Resumen Gastos'] = XLSX.utils.aoa_to_sheet(resumenGast);

    // Descargar archivo
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);

  } catch (err) {
    console.error(err);
    alert('Error al generar informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// Genera la tabla de resumen de ingresos
function buildResumenIngresos(mens, plen, otros, aportes, meses) {
  const sindicatos = Array.from(new Set([
    ...(mens || []).map(r => r.nombre_sindicato),
    ...(plen || []).map(r => r.nombre_sindicato)
  ]));

  // Datos por sindicato
  const dataSit = sindicatos.reduce((acc, s) => {
    acc[s] = Array(12).fill(0);
    return acc;
  }, {});
  (mens || []).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, dataSit[r.nombre_sindicato]));
  (plen || []).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, dataSit[r.nombre_sindicato]));

  // Ingreso Sindicatos
  const sumaSind = Array(12).fill(0);
  Object.values(dataSit).forEach(arr => arr.forEach((v,i)=> sumaSind[i]+=v));

  // Aporte Directores
  const dataAport = Array(12).fill(0);
  (aportes || []).forEach(r => {
    const d = new Date(r.fecha);
    acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataAport);
  });

  // Otros ingresos dinámicos
  const tiposOtros = Array.from(new Set((otros || []).map(r => r.tipo_ingreso)));
  const dataOtros = tiposOtros.reduce((acc, t) => {
    acc[t] = Array(12).fill(0);
    return acc;
  }, {});
  (otros || []).forEach(r => {
    const m = parseInt(r.mes,10);
    acum(r.anio, m, r.monto, meses, dataOtros[r.tipo_ingreso]);
  });

  // Armar filas
  const header = ['Categoria', ...meses.map(m=>m.nombre), 'ANUAL'];
  const filas = [];

  // Sindicatos
  sindicatos.forEach(s => {
    const vals = dataSit[s];
    filas.push([s, ...vals, vals.reduce((a,b)=>a+b,0)]);
  });
  filas.push(['INGRESO SINDICATOS', ...sumaSind, sumaSind.reduce((a,b)=>a+b,0)]);

  // Otros ingresos
  tiposOtros.forEach(t => {
    const vals = dataOtros[t];
    filas.push([t, ...vals, vals.reduce((a,b)=>a+b,0)]);
  });

  // Aporte Directores
  filas.push(['APORTE DIRECTORES', ...dataAport, dataAport.reduce((a,b)=>a+b,0)]);

  // Total Ingresos
  const totalIngr = Array(12).fill(0);
  filas.forEach(r => r.slice(1,13).forEach((v,i)=> totalIngr[i]+=Number(v)||0));
  filas.push(['TOTAL INGRESOS', ...totalIngr, totalIngr.reduce((a,b)=>a+b,0)]);

  return [header, ...filas];
}

// Genera la tabla de resumen de gastos
function buildResumenGastos(direct, plen, gest, com, otros, meses) {
  const keysDir = ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso'];
  const dataDirDet = keysDir.reduce((acc,k)=>{ acc[k]=Array(12).fill(0); return acc; }, {});
  (direct || []).forEach(r => {
    const d = new Date(r.fecha);
    keysDir.forEach(k => acum(d.getFullYear(), d.getMonth()+1, r[k], meses, dataDirDet[k]));
  });

  // Totales director
  const dataGDirTot = Array(12).fill(0);
  keysDir.forEach(k => dataDirDet[k].forEach((v,i)=> dataGDirTot[i]+=v ));

  // Plenarias, Gestión, Comisiones
  const dataPlen = Array(12).fill(0);
  (plen || []).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.costo_total, meses, dataPlen); });

  const dataGest = Array(12).fill(0);
  (gest || []).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.total, meses, dataGest); });

  const dataCom = Array(12).fill(0);
  (com || []).forEach(r => { const d=new Date(r.fecha_registro); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataCom); });

  // Otros gastos dinámicos
  const tiposOtros = Array.from(new Set((otros || []).map(r => r.descripcion)));
  const dataOtros = tiposOtros.reduce((acc,t)=>{ acc[t]=Array(12).fill(0); return acc; }, {});
  (otros || []).forEach(r => {
    const d=new Date(r.fecha_registro);
    acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataOtros[r.descripcion]);
  });

  // Construir filas
  const header = ['Categoria', ...meses.map(m=>m.nombre), 'ANUAL'];
  const filas = [];

  // Detalle director
  keysDir.forEach(k => {
    const vals = dataDirDet[k];
    filas.push([k.toUpperCase(), ...vals, vals.reduce((a,b)=>a+b,0)]);
  });
  filas.push(['GASTO DIRECTOR', ...dataGDirTot, dataGDirTot.reduce((a,b)=>a+b,0)]);

  // Plenarias, Gestión, Comisiones
  [['GASTO PLENARIAS', dataPlen], ['GASTO GESTION', dataGest], ['GASTO COMISIONES', dataCom]]
    .forEach(([label, arr]) => filas.push([label, ...arr, arr.reduce((a,b)=>a+b,0)]));

  // Otros gastos
  tiposOtros.forEach(t => {
    const vals = dataOtros[t];
    filas.push([t.toUpperCase(), ...vals, vals.reduce((a,b)=>a+b,0)]);
  });

  // Total Gastos
  const totalGast = Array(12).fill(0);
  filas.forEach(r => r.slice(1,13).forEach((v,i)=> totalGast[i]+=Number(v)||0));
  filas.push(['TOTAL GASTOS', ...totalGast, totalGast.reduce((a,b)=>a+b,0)]);

  return [header, ...filas];
}

// Acumula un monto en el índice de mes correspondiente
function acum(anio, mes, monto, meses, arr) {
  const idx = meses.findIndex(mobj =>
    typeof mes === 'string'
      ? mobj.nombre.toLowerCase() === mes.toLowerCase()
      : mobj.anio === anio && mobj.num === mes
  );
  if (idx >= 0) arr[idx] += Number(monto) || 0;
}

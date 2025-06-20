import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('btnGenerarInforme')
    ?.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(document.getElementById('informe-anio-base').value, 10);
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
    // Plan Ingresos
    sheet1.push(['PLAN INGRESOS']);
    sheet1.push(Object.keys(planIngresos[0] || {}));
    planIngresos.forEach(r => sheet1.push(Object.values(r)));
    sheet1.push([]);
    // Plan Gastos
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

    // Hoja 2: Resumen Tesorería
    const resumenIngr = buildResumenIngresos(
      ingresoMens, ingresoPlen, otrosIngr, aporteDir, meses
    );
    const resumenGast = buildResumenGastos(
      gdirect, gplen, ggest, gcom, gotros, meses
    );
    const sheet2 = [
      [`RESUMEN TESORERÍA ${anioBase}-${anioBase+1}`],
      [],
      ...resumenIngr,
      [],
      ...resumenGast
    ];
    wb.SheetNames.push('Resumen Tesorería');
    wb.Sheets['Resumen Tesorería'] = XLSX.utils.aoa_to_sheet(sheet2);

    // Descargar
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);

  } catch (err) {
    console.error(err);
    alert('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// --- Helpers para resumen de ingresos ---
function buildResumenIngresos(mens, plen, otros, aportes, meses) {
  const sindicatos = Array.from(new Set([
    ...(mens || []).map(r => r.nombre_sindicato),
    ...(plen || []).map(r => r.nombre_sindicato)
  ]));
  const dataSit = sindicatos.reduce((acc, s) => { acc[s]=Array(12).fill(0); return acc; }, {});
  (mens || []).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, dataSit[r.nombre_sindicato]));
  (plen || []).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, dataSit[r.nombre_sindicato]));

  const sumaSind = Array(12).fill(0);
  Object.values(dataSit).forEach(arr => arr.forEach((v,i)=> sumaSind[i]+=v));

  const dataAport = Array(12).fill(0);
  (aportes || []).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataAport); });

  const tiposOtros = Array.from(new Set((otros||[]).map(r=>r.tipo_ingreso)));
  const dataOtros = tiposOtros.reduce((a,t)=>{ a[t]=Array(12).fill(0); return a; }, {});
  (otros||[]).forEach(r => { const m=parseInt(r.mes,10); acum(r.anio, m, r.monto, meses, dataOtros[r.tipo_ingreso]); });

  const header = ['Categoria', ...meses.map(m=>m.nombre), 'ANUAL'];
  const filas = [];

  sindicatos.forEach(s => {
    const vals=dataSit[s];
    filas.push([s, ...vals, vals.reduce((a,b)=>a+b,0)]);
  });
  filas.push(['INGRESO SINDICATOS', ...sumaSind, sumaSind.reduce((a,b)=>a+b,0)]);
  tiposOtros.forEach(t => {
    const vals=dataOtros[t];
    filas.push([t, ...vals, vals.reduce((a,b)=>a+b,0)]);
  });
  filas.push(['APORTE DIRECTORES', ...dataAport, dataAport.reduce((a,b)=>a+b,0)]);

  const totalIngr=Array(12).fill(0);
  filas.forEach(r=>r.slice(1,13).forEach((v,i)=> totalIngr[i]+=Number(v)||0));
  filas.push(['TOTAL INGRESOS', ...totalIngr, totalIngr.reduce((a,b)=>a+b,0)]);

  return [header, ...filas];
}

// --- Helpers para resumen de gastos ---
function buildResumenGastos(direct, plen, gest, com, otros, meses) {
  const keysDir=['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso'];
  const dataDirDet = keysDir.reduce((a,k)=>{ a[k]=Array(12).fill(0); return a; }, {});
  (direct||[]).forEach(r => {
    const d=new Date(r.fecha);
    keysDir.forEach(k => acum(d.getFullYear(), d.getMonth()+1, r[k], meses, dataDirDet[k]));
  });

  const dataGDirTot = Array(12).fill(0);
  keysDir.forEach(k=>dataDirDet[k].forEach((v,i)=>dataGDirTot[i]+=v));

  const dataPlen=Array(12).fill(0);
  (plen||[]).forEach(r=>{ const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.costo_total, meses, dataPlen); });
  const dataGest=Array(12).fill(0);
  (gest||[]).forEach(r=>{ const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.total, meses, dataGest); });
  const dataCom=Array(12).fill(0);
  (com||[]).forEach(r=>{ const d=new Date(r.fecha_registro); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataCom); });

  const tiposOtros=Array.from(new Set((otros||[]).map(r=>r.descripcion)));
  const dataOtros=tiposOtros.reduce((a,t)=>{ a[t]=Array(12).fill(0); return a; }, {});
  (otros||[]).forEach(r=>{ const d=new Date(r.fecha_registro); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, dataOtros[r.descripcion]); });

  const header=['Categoria', ...meses.map(m=>m.nombre), 'ANUAL'];
  const filas=[];

  keysDir.forEach(k=>{
    const vals=dataDirDet[k];
    filas.push([k.toUpperCase(), ...vals, vals.reduce((a,b)=>a+b,0)]);
  });
  filas.push(['GASTO DIRECTOR', ...dataGDirTot, dataGDirTot.reduce((a,b)=>a+b,0)]);

  [['GASTO PLENARIAS', dataPlen], ['GASTO GESTION', dataGest], ['GASTO COMISIONES', dataCom]]
    .forEach(([lbl,arr])=>filas.push([lbl, ...arr, arr.reduce((a,b)=>a+b,0)]));

  tiposOtros.forEach(t=>{
    const vals=dataOtros[t];
    filas.push([t.toUpperCase(), ...vals, vals.reduce((a,b)=>a+b,0)]);
  });

  const totalGast=Array(12).fill(0);
  filas.forEach(r=>r.slice(1,13).forEach((v,i)=> totalGast[i]+=Number(v)||0));
  filas.push(['TOTAL GASTOS', ...totalGast, totalGast.reduce((a,b)=>a+b,0)]);

  return [header, ...filas];
}

// --- Helper de acumulación ---
function acum(anio, mes, monto, meses, arr) {
  const idx = meses.findIndex(mobj =>
    typeof mes==='string'
      ? mobj.nombre.toLowerCase()===mes.toLowerCase()
      : mobj.anio===anio && mobj.num===mes
  );
  if(idx>=0) arr[idx]+=Number(monto)||0;
}

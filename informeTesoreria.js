import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnGenerarInforme');
  btn?.addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const input = document.getElementById('informe-anio-base');
  const anioBase = parseInt(input.value, 10);
  if (isNaN(anioBase)) return alert('Año inválido');

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true; btn.textContent = 'Generando...';

  // meses abril–marzo
  const meses = [
    { nombre: 'Abr', num: 4, anio: anioBase },
    { nombre: 'May', num: 5, anio: anioBase },
    { nombre: 'Jun', num: 6, anio: anioBase },
    { nombre: 'Jul', num: 7, anio: anioBase },
    { nombre: 'Ago', num: 8, anio: anioBase },
    { nombre: 'Sep', num: 9, anio: anioBase },
    { nombre: 'Oct', num: 10, anio: anioBase },
    { nombre: 'Nov', num: 11, anio: anioBase },
    { nombre: 'Dic', num: 12, anio: anioBase },
    { nombre: 'Ene', num: 1, anio: anioBase + 1 },
    { nombre: 'Feb', num: 2, anio: anioBase + 1 },
    { nombre: 'Mar', num: 3, anio: anioBase + 1 }
  ];

  try {
    // ——————————————————————————————
    // 1) PLANES DE INGRESOS Y GASTOS
    // ——————————————————————————————
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

    // ——————————————————————————————
    // 2) INGRESOS REALES (todas las tablas)
    // ——————————————————————————————
    const [
      { data: ingresoPlen },
      { data: ingresoMens },
      { data: otrosIngr },
      { data: aporteDir }
    ] = await Promise.all([
      supabase.from('ingreso_plenarias').select('*').gte('año', meses[0].anio).lte('año', meses[11].anio),
      supabase.from('ingresos_mensuales').select('*').gte('año', meses[0].anio).lte('año', meses[11].anio),
      supabase.from('otros_ingresos').select('*').eq('anio', anioBase),
      supabase.from('aporte_director').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase+1}-03-31`)
    ]);

    // ——————————————————————————————
    // 3) GASTOS REALES (todas las tablas)
    // ——————————————————————————————
    const [
      { data: gdirect },
      { data: gplen },
      { data: ggest },
      { data: gcom },
      { data: gotros }
    ] = await Promise.all([
      supabase.from('gasto_real_directores').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase+1}-03-31`),
      supabase.from('gasto_real_plenarias').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase+1}-03-31`),
      supabase.from('gasto_real_gestion').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase+1}-03-31`),
      supabase.from('gasto_real_comisiones').select('*').gte('fecha_registro', `${anioBase}-04-01`).lte('fecha_registro', `${anioBase+1}-03-31`),
      supabase.from('gasto_real_otros').select('*').gte('fecha_registro', `${anioBase}-04-01`).lte('fecha_registro', `${anioBase+1}-03-31`)
    ]);

    // ——————————————————————————————
    // 4) CREAR LIBRO & HOJAS
    // ——————————————————————————————
    const wb = XLSX.utils.book_new();

    // Hojas crudas de Planes
    wb.SheetNames.push('Plan Ingresos');
    wb.Sheets['Plan Ingresos'] = XLSX.utils.json_to_sheet(planIngresos || []);
    wb.SheetNames.push('Plan Gastos Com.');
    wb.Sheets['Plan Gastos Com.'] = XLSX.utils.json_to_sheet(planGCom || []);
    wb.SheetNames.push('Plan Gastos Gest.');
    wb.Sheets['Plan Gastos Gest.'] = XLSX.utils.json_to_sheet(planGGest || []);
    wb.SheetNames.push('Plan Gastos Plen.');
    wb.Sheets['Plan Gastos Plen.'] = XLSX.utils.json_to_sheet(planGPlen || []);
    wb.SheetNames.push('Plan Gastos Rem.');
    wb.Sheets['Plan Gastos Rem.'] = XLSX.utils.json_to_sheet(planGRem || []);
    wb.SheetNames.push('Plan Gastos Via.');
    wb.Sheets['Plan Gastos Via.'] = XLSX.utils.json_to_sheet(planGVia || []);

    // Hojas crudas de Ingresos Reales
    wb.SheetNames.push('Raw Ingr Plenarias');
    wb.Sheets['Raw Ingr Plenarias'] = XLSX.utils.json_to_sheet(ingresoPlen || []);
    wb.SheetNames.push('Raw Ingr Mensuales');
    wb.Sheets['Raw Ingr Mensuales'] = XLSX.utils.json_to_sheet(ingresoMens || []);
    wb.SheetNames.push('Raw Otros Ingresos');
    wb.Sheets['Raw Otros Ingresos'] = XLSX.utils.json_to_sheet(otrosIngr || []);
    wb.SheetNames.push('Raw Aporte Director');
    wb.Sheets['Raw Aporte Director'] = XLSX.utils.json_to_sheet(aporteDir || []);

    // Hojas crudas de Gastos Reales
    wb.SheetNames.push('Raw Gasto Directores');
    wb.Sheets['Raw Gasto Directores'] = XLSX.utils.json_to_sheet(gdirect || []);
    wb.SheetNames.push('Raw Gasto Plenarias');
    wb.Sheets['Raw Gasto Plenarias'] = XLSX.utils.json_to_sheet(gplen || []);
    wb.SheetNames.push('Raw Gasto Gestion');
    wb.Sheets['Raw Gasto Gestion'] = XLSX.utils.json_to_sheet(ggest || []);
    wb.SheetNames.push('Raw Gasto Comisiones');
    wb.Sheets['Raw Gasto Comisiones'] = XLSX.utils.json_to_sheet(gcom || []);
    wb.SheetNames.push('Raw Gasto Otros');
    wb.Sheets['Raw Gasto Otros'] = XLSX.utils.json_to_sheet(gotros || []);

    // Resumen mensual
    const resumenIngresos = generarResumen(ingresoMens, ingresoPlen, otrosIngr, aporteDir, meses);
    const resumenGastos   = generarResumenGastos(gdirect, gplen, ggest, gcom, gotros, meses);

    wb.SheetNames.push('Resumen Ingresos');
    wb.Sheets['Resumen Ingresos'] = XLSX.utils.aoa_to_sheet(resumenIngresos);
    wb.SheetNames.push('Resumen Gastos');
    wb.Sheets['Resumen Gastos'] = XLSX.utils.aoa_to_sheet(resumenGastos);

    // Descargar
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);

  } catch (err) {
    console.error(err);
    alert('Error al generar informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// Construye resumen mensual de ingresos
function generarResumen(mensuales, plenarias, otros, aportes, meses) {
  const cat = { cuota: Array(12).fill(0), plenarias: Array(12).fill(0), otros: Array(12).fill(0), aporte_director: Array(12).fill(0) };
  // Cuotas
  (mensuales||[]).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, cat.cuota));
  // Plenarias
  (plenarias||[]).forEach(r => acum(r.año, r.mes_nombre, r.cuota, meses, cat.plenarias));
  // Otros ingresos
  (otros||[]).forEach(r => acum(r.anio, r.mes, r.monto, meses, cat.otros));
  // Aporte directores
  (aportes||[]).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, cat.aporte_director); });

  const header = ['Mes', ...meses.map(m=>m.nombre)];
  return [
    header,
    ['Cuotas', ...cat.cuota],
    ['Plenarias', ...cat.plenarias],
    ['Otros', ...cat.otros],
    ['Aporte Director', ...cat.aporte_director]
  ];
}

// Construye resumen mensual de gastos
function generarResumenGastos(direct, plen, gest, com, otrs, meses) {
  const cat = { Directores: Array(12).fill(0), Plenarias: Array(12).fill(0), Gestion: Array(12).fill(0), Comisiones: Array(12).fill(0), Otros: Array(12).fill(0) };
  // Directores
  (direct||[]).forEach(r => { const total = sumaProps(r, ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']); const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, total, meses, cat.Directores); });
  // Plenarias
  (plen||[]).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.costo_total, meses, cat.Plenarias); });
  // Gestion
  (gest||[]).forEach(r => { const d=new Date(r.fecha); acum(d.getFullYear(), d.getMonth()+1, r.total, meses, cat.Gestion); });
  // Comisiones
  (com||[]).forEach(r => { const d=new Date(r.fecha_registro); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, cat.Comisiones); });
  // Otros gastos
  (otrs||[]).forEach(r => { const d=new Date(r.fecha_registro); acum(d.getFullYear(), d.getMonth()+1, r.monto, meses, cat.Otros); });

  const header = ['Mes', ...meses.map(m=>m.nombre)];
  return [
    header,
    ['Directores', ...cat.Directores],
    ['Plenarias', ...cat.Plenarias],
    ['Gestion', ...cat.Gestion],
    ['Comisiones', ...cat.Comisiones],
    ['Otros', ...cat.Otros]
  ];
}

// auxiliares
function acum(anio, mes, monto, meses, arr) {
  const idx = typeof mes === 'string'
    ? meses.findIndex(m=>m.mes_nombre?.toLowerCase()===mes.toLowerCase()) // si viene texto
    : meses.findIndex(m=>m.anio===anio && m.num===mes);
  if (idx>=0) arr[idx] += Number(monto)||0;
}
function sumaProps(obj, keys) {
  return keys.reduce((s,k)=>s + (Number(obj[k])||0), 0);
}

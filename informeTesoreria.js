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

  // meses del año comercial (Abril–Marzo)
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

  try {
    // PLANES DE INGRESOS
    const { data: planIngresos } = await supabase
      .from('plan_ingresos')
      .select('*')
      .eq('año', anioBase);

    // PLANES DE GASTOS (varias tablas)
    const [{ data: planComisiones }, { data: planGestion },
           { data: planPlenarias }, { data: planRemuneracion },
           { data: planViaticos }] = await Promise.all([
      supabase.from('plan_gastos_comisiones').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_gestion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_plenarias').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_remuneracion').select('*').eq('periodo', `${anioBase}`),
      supabase.from('plan_gastos_viaticos').select('*').eq('periodo', `${anioBase}`)
    ]);

    // INGRESOS REALES
    const ingresosReales = await obtenerIngresosReales(meses);

    // GASTOS REALES
    const gastosReales = await obtenerGastosReales(meses);

    // crear libro de Excel
    const wb = XLSX.utils.book_new();

    // hoja Plan Ingresos
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(planIngresos || []),
      'Plan Ingresos'
    );

    // hojas Plan Gastos por tipo
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planComisiones || []), 'Plan Gastos Com.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planGestion    || []), 'Plan Gastos Gest.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planPlenarias  || []), 'Plan Gastos Plen.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planRemuneracion|| []), 'Plan Gastos Rem.');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(planViaticos   || []), 'Plan Gastos Via.');

    // hoja Ingresos Reales
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(generarTablaMensual('Ingresos', meses, ingresosReales)),
      'Ingresos Reales'
    );

    // hoja Gastos Reales
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(generarTablaMensual('Gastos', meses, gastosReales)),
      'Gastos Reales'
    );

    // guardar
    const fileName = `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`;
    XLSX.writeFile(wb, fileName);

  } catch (error) {
    console.error(error);
    alert('Error al generar informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

// tablas mensuales
function generarTablaMensual(_, meses, datos) {
  const header = ['Mes', ...meses.map(m => m.nombre)];
  return [
    header,
    ...Object.entries(datos).map(([cat, vals]) => [cat, ...vals])
  ];
}

// ingresos reales
async function obtenerIngresosReales(meses) {
  const tipos = ['cuota', 'plenarias', 'aporte_director', 'otros'];
  const result = tipos.reduce((acc, t) => ({ ...acc, [t]: Array(12).fill(0) }), {});

  // ingreso_plenarias
  const { data: plenarias } = await supabase
    .from('ingreso_plenarias')
    .select('año, mes_nombre')
    .gte('año', meses[0].anio)
    .lte('año', meses[11].anio);
  (plenarias || []).forEach(r => {
    const mesNum = meses.find(m => m.mes_nombre?.toLowerCase() === r.mes_nombre.toLowerCase())?.numero;
    acumular(r.año, mesNum, r.cuota, meses, result.plenarias);
  });

  // ingresos_mensuales (cuotas)
  const { data: cuotas } = await supabase
    .from('ingresos_mensuales')
    .select('año, mes_nombre, cuota')
    .gte('año', meses[0].anio)
    .lte('año', meses[11].anio);
  (cuotas || []).forEach(r => {
    const mesNum = meses.find(m => m.mes_nombre?.toLowerCase() === r.mes_nombre.toLowerCase())?.numero;
    acumular(r.año, mesNum, r.cuota, meses, result.cuota);
  });

  // otros_ingresos
  const { data: otros } = await supabase
    .from('otros_ingresos')
    .select('anio, mes, monto');
  (otros || []).forEach(r => acumular(r.anio, parseInt(r.mes,10), r.monto, meses, result.otros));

  // aporte_director
  const { data: aportes } = await supabase
    .from('aporte_director')
    .select('fecha, monto');
  (aportes || []).forEach(r => {
    const d = new Date(r.fecha);
    acumular(d.getFullYear(), d.getMonth()+1, r.monto, meses, result.aporte_director);
  });

  return result;
}

// gastos reales
async function obtenerGastosReales(meses) {
  const cats = ['Directores','Plenarias','Gestion','Comisiones','Otros'];
  const result = cats.reduce((acc, c) => ({ ...acc, [c]: Array(12).fill(0) }), {});

  // gasto_real_directores
  const { data: gd } = await supabase
    .from('gasto_real_directores')
    .select('fecha, remuneracion,pasajes,colacion,metro,taxi_colectivo,hotel,reembolso');
  (gd || []).forEach(r => {
    const total = ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']
      .reduce((s,k)=>s+Number(r[k]||0),0);
    const d=new Date(r.fecha);
    acumular(d.getFullYear(),d.getMonth()+1,total,meses,result.Directores);
  });

  // gasto_real_plenarias
  const { data: gp } = await supabase
    .from('gasto_real_plenarias')
    .select('fecha, costo_total');
  (gp || []).forEach(r=>{
    const d=new Date(r.fecha);
    acumular(d.getFullYear(),d.getMonth()+1,r.costo_total,meses,result.Plenarias);
  });

  // gasto_real_gestion
  const { data: gg } = await supabase
    .from('gasto_real_gestion')
    .select('fecha, total');
  (gg || []).forEach(r=>{
    const d=new Date(r.fecha);
    acumular(d.getFullYear(),d.getMonth()+1,r.total,meses,result.Gestion);
  });

  // gasto_real_comisiones
  const { data: gc } = await supabase
    .from('gasto_real_comisiones')
    .select('fecha_registro, monto');
  (gc || []).forEach(r=>{
    const d=new Date(r.fecha_registro);
    acumular(d.getFullYear(),d.getMonth()+1,r.monto,meses,result.Comisiones);
  });

  // gasto_real_otros
  const { data: go } = await supabase
    .from('gasto_real_otros')
    .select('fecha_registro, monto');
  (go || []).forEach(r=>{
    const d=new Date(r.fecha_registro);
    acumular(d.getFullYear(),d.getMonth()+1,r.monto,meses,result.Otros);
  });

  return result;
}

// helper de acumulación
function acumular(anio, mes, monto, meses, arr) {
  const idx = meses.findIndex(m => m.anio === anio && m.numero === mes);
  if (idx >= 0) arr[idx] += Number(monto) || 0;
}

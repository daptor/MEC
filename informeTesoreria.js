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

  // Definimos el rango de meses del año comercial (Abr-Mar)
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
    // 1. Planes de Ingresos
    const { data: planIngresos } = await supabase
      .from('plan_ingresos')
      .select('*')
      .eq('anio', anioBase);

    // 2. Planes de Gastos
    const { data: planGastos } = await supabase
      .from('plan_gastos')
      .select('*')
      .eq('anio', anioBase);

    // 3. Ingresos Reales (dividido por tipo)
    const ingresosReales = await obtenerIngresosReales(meses);

    // 4. Gastos Reales (dividido por categoría)
    const gastosReales = await obtenerGastosReales(meses);

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();

    // Hoja Plan Ingresos
    const wsPlanIngresos = XLSX.utils.json_to_sheet(planIngresos || []);
    XLSX.utils.book_append_sheet(wb, wsPlanIngresos, 'Plan Ingresos');

    // Hoja Plan Gastos
    const wsPlanGastos = XLSX.utils.json_to_sheet(planGastos || []);
    XLSX.utils.book_append_sheet(wb, wsPlanGastos, 'Plan Gastos');

    // Hoja Ingresos Reales
    const wsIngresos = XLSX.utils.aoa_to_sheet(
      generarTablaMensual('Ingresos', meses, ingresosReales)
    );
    XLSX.utils.book_append_sheet(wb, wsIngresos, 'Ingresos Reales');

    // Hoja Gastos Reales
    const wsGastos = XLSX.utils.aoa_to_sheet(
      generarTablaMensual('Gastos', meses, gastosReales)
    );
    XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos Reales');

    // Guardar archivo
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

// Función para construir tablas mensuales
function generarTablaMensual(titulo, meses, datosMensuales) {
  const header = ['Mes', ...meses.map(m => m.nombre)];
  const filas = Object.entries(datosMensuales).map(
    ([categoria, valores]) => [categoria, ...valores]
  );
  return [header, ...filas];
}

// Obtiene ingresos reales de Supabase y los organiza por tipo y mes
async function obtenerIngresosReales(meses) {
  const tipos = ['cuota', 'plenarias', 'aporte_director', 'otros'];
  const result = tipos.reduce((acc, tipo) => ({ ...acc, [tipo]: Array(12).fill(0) }), {});

  // Cuotas
  const { data: cuotas } = await supabase
    .from('ingreso_cuota')
    .select('anio, mes, monto')
    .gte('anio', meses[0].anio)
    .lte('anio', meses[11].anio);
  (cuotas || []).forEach(r =>
    acumular(r.anio, r.mes, r.monto, meses, result.cuota)
  );

  // Plenarias
  const { data: plenarias } = await supabase
    .from('ingreso_plenarias')
    .select('año, mes, cuota as monto');
  (plenarias || []).forEach(r =>
    acumular(r.año, r.mes, r.monto, meses, result.plenarias)
  );

  // Aporte Director
  const { data: aportes } = await supabase
    .from('ingreso_directores')
    .select('fecha, monto');
  (aportes || []).forEach(r => {
    const d = new Date(r.fecha);
    acumular(d.getFullYear(), d.getMonth() + 1, r.monto, meses, result.aporte_director);
  });

  // Otros Ingresos
  const { data: otros } = await supabase
    .from('otros_ingresos')
    .select('anio, mes, monto');
  (otros || []).forEach(r =>
    acumular(r.anio, r.mes, r.monto, meses, result.otros)
  );

  return result;
}

// Obtiene gastos reales y los organiza por categoría y mes
async function obtenerGastosReales(meses) {
  const categorias = ['Directores', 'Plenarias', 'Gestion', 'Comisiones', 'Otros'];
  const result = categorias.reduce((acc, cat) => ({ ...acc, [cat]: Array(12).fill(0) }), {});

  // Gasto Directores
  const { data: gd } = await supabase
    .from('gasto_real_directores')
    .select('fecha, remuneracion, pasajes, colacion, metro, taxi_colectivo, hotel, reembolso');
  (gd || []).forEach(r => {
    const total = ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']
      .reduce((s, k) => s + Number(r[k] || 0), 0);
    const d = new Date(r.fecha);
    acumular(d.getFullYear(), d.getMonth() + 1, total, meses, result.Directores);
  });

  // Gasto Plenarias
  const { data: gp } = await supabase
    .from('gasto_real_plenarias')
    .select('fecha, costo_total');
  (gp || []).forEach(r => {
    const d = new Date(r.fecha);
    acumular(d.getFullYear(), d.getMonth() + 1, r.costo_total, meses, result.Plenarias);
  });

  // Gastos Gestion
  const { data: gg } = await supabase
    .from('gasto_real_gestion')
    .select('fecha, total');
  (gg || []).forEach(r => {
    const d = new Date(r.fecha);
    acumular(d.getFullYear(), d.getMonth() + 1, r.total, meses, result.Gestion);
  });

  // Gastos Comisiones
  const { data: gc } = await supabase
    .from('gasto_real_comisiones')
    .select('fecha_registro, monto');
  (gc || []).forEach(r => {
    const d = new Date(r.fecha_registro);
    acumular(d.getFullYear(), d.getMonth() + 1, r.monto, meses, result.Comisiones);
  });

  // Otros Gastos
  const { data: og } = await supabase
    .from('otros_gastos')
    .select('anio, mes, monto');
  (og || []).forEach(r =>
    acumular(r.anio, r.mes, r.monto, meses, result.Otros)
  );

  return result;
}

// Helper para acumular montos en arrays según mes y año
function acumular(anio, mes, monto, meses, array) {
  const idx = meses.findIndex(m => m.anio === anio && m.numero === mes);
  if (idx >= 0) array[idx] += Number(monto) || 0;
}

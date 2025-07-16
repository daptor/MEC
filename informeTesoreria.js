import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerarInforme').addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(document.getElementById('informe-anio-base').value, 10);
  if (isNaN(anioBase)) {
    alert('Año inválido');
    return;
  }

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    // Meses desde ABR anioBase hasta MAR anioBase+1
    const meses = [
      { nombre: 'ABR', mes: 4, anio: anioBase },
      { nombre: 'MAY', mes: 5, anio: anioBase },
      { nombre: 'JUN', mes: 6, anio: anioBase },
      { nombre: 'JUL', mes: 7, anio: anioBase },
      { nombre: 'AGO', mes: 8, anio: anioBase },
      { nombre: 'SEP', mes: 9, anio: anioBase },
      { nombre: 'OCT', mes: 10, anio: anioBase },
      { nombre: 'NOV', mes: 11, anio: anioBase },
      { nombre: 'DIC', mes: 12, anio: anioBase },
      { nombre: 'ENE', mes: 1, anio: anioBase + 1 },
      { nombre: 'FEB', mes: 2, anio: anioBase + 1 },
      { nombre: 'MAR', mes: 3, anio: anioBase + 1 }
    ];

    // === Cargar datos desde Supabase ===
    // Ajusta los nombres y filtros según tus tablas y campos
    const [
      { data: ingresosMensuales, error: errIM },
      { data: ingresosPlenarias, error: errIP },
      { data: otrosIngresos, error: errOI },
      { data: aporteDirectores, error: errAD },
      { data: gastoDirectores, error: errGD },
      { data: gastoPlenarias, error: errGP },
      { data: gastoGestion, error: errGG },
      { data: gastoComisiones, error: errGC },
      { data: gastoOtros, error: errGO }
    ] = await Promise.all([
      supabase.from('ingresos_mensuales').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('ingreso_plenarias').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('otros_ingresos').select('*').gte('anio', anioBase).lte('anio', anioBase + 1),
      supabase.from('aporte_director').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase + 1}-03-31`),
      supabase.from('gasto_real_directores').select('*'),
      supabase.from('gasto_real_plenarias').select('*'),
      supabase.from('gasto_real_gestion').select('*'),
      supabase.from('gasto_real_comisiones').select('*'),
      supabase.from('gasto_real_otros').select('*')
    ]);

    // Manejo de errores
    if (errIM || errIP || errOI || errAD || errGD || errGP || errGG || errGC || errGO) {
      throw new Error('Error al obtener datos desde Supabase.');
    }

    // === Funciones auxiliares para acumular datos ===

    // Acumula monto por sindicato, mes y año en arreglo 12 meses
    function acumularPorSindicato(arr, campoSindicato, campoMesNombre, campoAnio, campoMonto) {
      const res = {};
      for (const item of arr) {
        const sindicato = item[campoSindicato];
        const mesNombre = (item[campoMesNombre] || '').toUpperCase();
        const anio = item[campoAnio];
        const monto = Number(item[campoMonto]) || 0;
        if (!res[sindicato]) res[sindicato] = Array(12).fill(0);
        const idx = meses.findIndex(m => m.nombre === mesNombre && m.anio === anio);
        if (idx !== -1) res[sindicato][idx] += monto;
      }
      return res;
    }

    // Acumula monto por tipo, mes num y anio en arreglo 12 meses
    function acumularPorTipo(arr, campoTipo, campoMes, campoAnio, campoMonto) {
      const res = {};
      for (const item of arr) {
        const tipo = item[campoTipo];
        const mes = Number(item[campoMes]);
        const anio = Number(item[campoAnio]);
        const monto = Number(item[campoMonto]) || 0;
        if (!res[tipo]) res[tipo] = Array(12).fill(0);
        const idx = meses.findIndex(m => m.mes === mes && m.anio === anio);
        if (idx !== -1) res[tipo][idx] += monto;
      }
      return res;
    }

    // Acumula monto por mes a partir de fechas
    function acumularPorMesFecha(arr, campoFecha, campoMonto) {
      const res = Array(12).fill(0);
      for (const item of arr) {
        const fecha = new Date(item[campoFecha]);
        const monto = Number(item[campoMonto]) || 0;
        const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
        if (idx !== -1) res[idx] += monto;
      }
      return res;
    }

    // === Acumular ingresos ===
    const ingresosMensualesPorSind = acumularPorSindicato(ingresosMensuales, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');
    const ingresosPlenariasPorSind = acumularPorSindicato(ingresosPlenarias, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');

    const sindicatos = Array.from(new Set([...Object.keys(ingresosMensualesPorSind), ...Object.keys(ingresosPlenariasPorSind)])).sort();

    const otrosIngresosPorTipo = acumularPorTipo(otrosIngresos, 'tipo_ingreso', 'mes', 'anio', 'monto');

    const aporteDirectoresPorMes = acumularPorMesFecha(aporteDirectores, 'fecha', 'monto');

    // === Construir matriz de datos para SheetJS ===
    const sheet = [];

    // --- INGRESOS ---
    sheet.push(['INGRESOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);

    // Ingresos por sindicato
    sindicatos.forEach((sindicato, i) => {
      const fila = [sindicato];
      meses.forEach((m, idx) => {
        const val = (ingresosMensualesPorSind[sindicato]?.[idx] || 0) + (ingresosPlenariasPorSind[sindicato]?.[idx] || 0);
        fila.push(val);
      });
      fila.push({ f: `SUM(B${i + 2}:M${i + 2})` }); // anual
      sheet.push(fila);
    });

    // Total ingreso sindicatos
    const filaTotalSind = ['INGRESO SINDICATOS'];
    for (let col = 2; col <= 13; col++) {
      filaTotalSind.push({ f: `SUM(${String.fromCharCode(64 + col)}2:${String.fromCharCode(64 + col)}${sindicatos.length + 1})` });
    }
    filaTotalSind.push({ f: `SUM(N2:N${sindicatos.length + 1})` });
    sheet.push(filaTotalSind);

    // Otros ingresos por tipo
    const startOtros = sheet.length + 1;
    Object.entries(otrosIngresosPorTipo).forEach(([tipo, valores], idx) => {
      const fila = [tipo];
      valores.forEach(v => fila.push(v));
      fila.push({ f: `SUM(B${startOtros + idx}:M${startOtros + idx})` });
      sheet.push(fila);
    });

    // Aporte directores fila
    const filaAporte = ['APORTE DIRECTORES', ...aporteDirectoresPorMes];
    filaAporte.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
    sheet.push(filaAporte);

    // Total ingresos generales
    const startIngreso = 2;
    const endIngreso = sheet.length;
    const filaTotalIngreso = ['TOTAL INGRESOS'];
    for (let col = 2; col <= 13; col++) {
      filaTotalIngreso.push({ f: `SUM(${String.fromCharCode(64 + col)}${startIngreso}:${String.fromCharCode(64 + col)}${endIngreso})` });
    }
    filaTotalIngreso.push({ f: `SUM(N${startIngreso}:N${endIngreso})` });
    sheet.push(filaTotalIngreso);

    sheet.push([]); // fila vacía entre ingresos y gastos

    // --- GASTOS ---
    sheet.push(['GASTOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);

    // Gastos directores por rubro
    const rubrosDir = ['remuneracion', 'pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso'];
    const gastosDirPorRubro = {};
    rubrosDir.forEach(rubro => gastosDirPorRubro[rubro] = Array(12).fill(0));

    for (const gasto of gastoDirectores) {
      const fecha = new Date(gasto.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx === -1) continue;
      rubrosDir.forEach(rubro => {
        gastosDirPorRubro[rubro][idx] += Number(gasto[rubro]) || 0;
      });
    }

    rubrosDir.forEach((rubro, i) => {
      const fila = [rubro.toUpperCase()];
      gastosDirPorRubro[rubro].forEach(val => fila.push(val));
      fila.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
      sheet.push(fila);
    });

    // Total gasto director
    const startGD = sheet.length - rubrosDir.length + 1;
    const endGD = sheet.length;
    const filaTotalGD = ['GASTO DIRECTOR'];
    for (let col = 2; col <= 13; col++) {
      filaTotalGD.push({ f: `SUM(${String.fromCharCode(64 + col)}${startGD}:${String.fromCharCode(64 + col)}${endGD})` });
    }
    filaTotalGD.push({ f: `SUM(N${startGD}:N${endGD})` });
    sheet.push(filaTotalGD);

    // Gastos plenarias
    const gastosPlenariasPorMes = acumularPorMesFecha(gastoPlenarias, 'fecha', 'costo_total');
    const filaGP = ['GASTO PLENARIAS', ...gastosPlenariasPorMes];
    filaGP.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
    sheet.push(filaGP);

    // Gastos gestion
    const gastosGestionPorMes = acumularPorMesFecha(gastoGestion, 'fecha', 'total');
    const filaGG = ['GASTO GESTION', ...gastosGestionPorMes];
    filaGG.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
    sheet.push(filaGG);

    // Gastos comisiones
    const gastosComisionesPorMes = acumularPorMesFecha(gastoComisiones, 'fecha_registro', 'monto');
    const filaGC = ['GASTO COMISIONES', ...gastosComisionesPorMes];
    filaGC.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
    sheet.push(filaGC);

    // Otros gastos por descripción
    const gastosOtrosPorDesc = {};
    for (const gasto of gastoOtros) {
      const fecha = new Date(gasto.fecha_registro);
      const desc = gasto.descripcion || 'SIN DESCRIPCIÓN';
      const monto = Number(gasto.monto) || 0;
      if (!gastosOtrosPorDesc[desc]) gastosOtrosPorDesc[desc] = Array(12).fill(0);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosOtrosPorDesc[desc][idx] += monto;
    }
    Object.entries(gastosOtrosPorDesc).forEach(([desc, valores]) => {
      const fila = [desc.toUpperCase()];
      valores.forEach(v => fila.push(v));
      fila.push({ f: `SUM(B${sheet.length + 1}:M${sheet.length + 1})` });
      sheet.push(fila);
    });

    // Total gastos
    const startGastos = sheet.findIndex(r => r[0] === 'GASTO DIRECTOR') + 1;
    const endGastos = sheet.length;
    const filaTotalGastos = ['TOTAL GASTOS'];
    for (let col = 2; col <= 13; col++) {
      filaTotalGastos.push({ f: `SUM(${String.fromCharCode(64 + col)}${startGastos}:${String.fromCharCode(64 + col)}${endGastos})` });
    }
    filaTotalGastos.push({ f: `SUM(N${startGastos}:N${endGastos})` });
    sheet.push(filaTotalGastos);

    // Ahorro o déficit (TOTAL INGRESOS - TOTAL GASTOS)
    const filaAhorro = ['AHORRO O DÉFICIT'];
    for (let col = 2; col <= 13; col++) {
      const colLetra = String.fromCharCode(64 + col);
      // La fila total ingresos está antes que total gastos
      const filaTotalIngresoNum = sheet.length - 2; // asumiendo última fila total gastos +1 y ahorro al final
      const filaTotalGastosNum = sheet.length - 1;
      filaAhorro.push({ f: `${colLetra}${filaTotalIngresoNum} - ${colLetra}${filaTotalGastosNum}` });
    }
    filaAhorro.push({ f: `N${sheet.length - 1} - N${sheet.length}` });
    sheet.push(filaAhorro);

    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Tesorería');

    // Descargar archivo
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

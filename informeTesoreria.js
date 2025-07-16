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

    // 1) Cargar datos de Supabase (tablas y campos según tu esquema)
    const [
      { data: ingresosMensuales },
      { data: ingresoPlenarias },
      { data: otrosIngresos },
      { data: aporteDirectores },
      { data: gastoDirectores },
      { data: gastoPlenarias },
      { data: gastoGestion },
      { data: gastoComisiones },
      { data: gastoOtros }
    ] = await Promise.all([
      supabase.from('ingresos_mensuales').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('ingreso_plenarias').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('otros_ingresos').select('*').gte('anio', anioBase).lte('anio', anioBase + 1),
      supabase.from('aporte_director').select('*').gte('fecha', ${anioBase}-04-01).lte('fecha', ${anioBase + 1}-03-31),
      supabase.from('gasto_real_directores').select('*'),
      supabase.from('gasto_real_plenarias').select('*'),
      supabase.from('gasto_real_gestion').select('*'),
      supabase.from('gasto_real_comisiones').select('*'),
      supabase.from('gasto_real_otros').select('*')
    ]);

    // --- Helpers para acumular montos por sindicato, mes y año ---
    function acumularMonto(arr, campoSindicato, campoMes, campoAnio, campoMonto) {
      const res = {};
      for (const item of arr) {
        const sindicato = item[campoSindicato];
        const mes = typeof item[campoMes] === 'string' ? item[campoMes].toUpperCase() : '';
        const anio = item[campoAnio];
        const monto = Number(item[campoMonto]) || 0;
        if (!res[sindicato]) res[sindicato] = Array(12).fill(0);
        const idx = meses.findIndex(m => m.nombre === mes && m.anio === anio);
        if (idx !== -1) res[sindicato][idx] += monto;
      }
      return res;
    }

    // Acumular ingresos mensuales y plenarias por sindicato
    const ingresosMensualesPorSind = acumularMonto(ingresosMensuales, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');
    const ingresosPlenariasPorSind = acumularMonto(ingresoPlenarias, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');

    // Unión de sindicatos
    const sindicatosSet = new Set([
      ...Object.keys(ingresosMensualesPorSind),
      ...Object.keys(ingresosPlenariasPorSind)
    ]);
    const sindicatos = Array.from(sindicatosSet).sort();

    // Acumular otros ingresos por tipo y mes (mes num y año)
    function acumularPorTipoMes(arr, campoTipo, campoMes, campoAnio, campoMonto) {
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
    const otrosIngresosPorTipo = acumularPorTipoMes(otrosIngresos, 'tipo_ingreso', 'mes', 'anio', 'monto');

    // Acumular aporte directores por mes (fecha)
    const aporteDirectoresPorMes = Array(12).fill(0);
    for (const item of aporteDirectores) {
      const fecha = new Date(item.fecha);
      const monto = Number(item.monto) || 0;
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) aporteDirectoresPorMes[idx] += monto;
    }

    // --- Construir filas de Excel ---
    const sheet = [];

    // Cabecera ingresos
    sheet.push(['INGRESOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);

    // Ingresos por sindicatos (mensual + plenarias)
    sindicatos.forEach((sindicato, i) => {
      const fila = [sindicato];
      meses.forEach(({ nombre, anio }, idx) => {
        const val = (ingresosMensualesPorSind[sindicato]?.[idx] || 0) + (ingresosPlenariasPorSind[sindicato]?.[idx] || 0);
        fila.push(val);
      });
      // fórmula anual
      fila.push({ f: SUM(B${i + 2}:M${i + 2}) });
      sheet.push(fila);
    });

    // Total Ingreso Sindicatos fila
    const filaTotalSind = ['INGRESO SINDICATOS'];
    for (let col = 2; col <= 13; col++) {
      filaTotalSind.push({ f: SUM(${String.fromCharCode(64 + col)}2:${String.fromCharCode(64 + col)}${sindicatos.length + 1}) });
    }
    filaTotalSind.push({ f: SUM(N2:N${sindicatos.length + 1}) });
    sheet.push(filaTotalSind);

    // Otros ingresos por tipo
    Object.entries(otrosIngresosPorTipo).forEach(([tipo, valores], idx) => {
      const fila = [tipo];
      valores.forEach(val => fila.push(val));
      // fórmula anual
      fila.push({ f: SUM(B${sindicatos.length + 3 + idx}:M${sindicatos.length + 3 + idx}) });
      sheet.push(fila);
    });

    // Aporte Directores fila
    {
      const fila = ['APORTE DIRECTORES', ...aporteDirectoresPorMes];
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    }

    // Total ingresos generales fila
    {
      const startFila = 2;
      const endFila = sheet.length;
      const fila = ['TOTAL INGRESOS'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ f: SUM(${String.fromCharCode(64 + col)}${startFila}:${String.fromCharCode(64 + col)}${endFila}) });
      }
      fila.push({ f: SUM(N${startFila}:N${endFila}) });
      sheet.push(fila);
    }

    sheet.push([]); // fila vacía entre ingresos y gastos

    // --- Construir gastos ---

    // Cabecera gastos
    sheet.push(['GASTOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);

    // Gastos director por rubros
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

    // Agregar filas gastos director
    rubrosDir.forEach((rubro, i) => {
      const fila = [rubro.toUpperCase()];
      gastosDirPorRubro[rubro].forEach(val => fila.push(val));
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    });

    // Total gasto director fila
    {
      const start = sheet.length - rubrosDir.length + 1;
      const end = sheet.length;
      const fila = ['GASTO DIRECTOR'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ f: SUM(${String.fromCharCode(64 + col)}${start}:${String.fromCharCode(64 + col)}${end}) });
      }
      fila.push({ f: SUM(N${start}:N${end}) });
      sheet.push(fila);
    }

    // Gastos plenarias
    const gastosPlenariasPorMes = Array(12).fill(0);
    gastoPlenarias.forEach(gp => {
      const fecha = new Date(gp.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosPlenariasPorMes[idx] += Number(gp.costo_total) || 0;
    });
    {
      const fila = ['GASTO PLENARIAS', ...gastosPlenariasPorMes];
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    }

    // Gastos gestion
    const gastosGestionPorMes = Array(12).fill(0);
    gastoGestion.forEach(gg => {
      const fecha = new Date(gg.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosGestionPorMes[idx] += Number(gg.total) || 0;
    });
    {
      const fila = ['GASTO GESTION', ...gastosGestionPorMes];
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    }

    // Gastos comisiones
    const gastosComisionesPorMes = Array(12).fill(0);
    gastoComisiones.forEach(gc => {
      const fecha = new Date(gc.fecha_registro);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosComisionesPorMes[idx] += Number(gc.monto) || 0;
    });
    {
      const fila = ['GASTO COMISIONES', ...gastosComisionesPorMes];
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    }

    // Otros gastos por descripción
    const gastosOtrosPorDesc = {};
    gastoOtros.forEach(go => {
      const fecha = new Date(go.fecha_registro);
      const desc = go.descripcion || 'SIN DESCRIPCIÓN';
      const monto = Number(go.monto) || 0;
      if (!gastosOtrosPorDesc[desc]) gastosOtrosPorDesc[desc] = Array(12).fill(0);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosOtrosPorDesc[desc][idx] += monto;
    });
    Object.entries(gastosOtrosPorDesc).forEach(([desc, valores], i) => {
      const fila = [desc.toUpperCase()];
      valores.forEach(v => fila.push(v));
      fila.push({ f: SUM(B${sheet.length + 1}:M${sheet.length + 1}) });
      sheet.push(fila);
    });

    // Total gastos fila
    {
      const start = sheet.findIndex(r => r[0] === 'GASTO DIRECTOR') + 1;
      const end = sheet.length;
      const fila = ['TOTAL GASTOS'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ f: SUM(${String.fromCharCode(64 + col)}${start}:${String.fromCharCode(64 + col)}${end}) });
      }
      fila.push({ f: SUM(N${start}:N${end}) });
      sheet.push(fila);
    }

    // Ahorro o déficit fila (TOTAL INGRESOS - TOTAL GASTOS)
    {
      const fila = ['AHORRO O DÉFICIT'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ f: B${sheet.length} - B${sheet.length - 1}.replace(/B/g, String.fromCharCode(64 + col)) });
      }
      fila.push({ f: N${sheet.length} - N${sheet.length - 1} });
      sheet.push(fila);
    }

    // Construir libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheet);
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Tesorería');

    // Descargar archivo
    XLSX.writeFile(wb, Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

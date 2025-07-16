import { supabase } from './supabaseClient.js';
import * as ExcelJS from 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';

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

    // Carga datos desde Supabase (ajusta tablas y campos según tu base)
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
      supabase.from('aporte_director').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase + 1}-03-31`),
      supabase.from('gasto_real_directores').select('*'),
      supabase.from('gasto_real_plenarias').select('*'),
      supabase.from('gasto_real_gestion').select('*'),
      supabase.from('gasto_real_comisiones').select('*'),
      supabase.from('gasto_real_otros').select('*')
    ]);

    // Funciones para acumular datos (igual que antes)
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

    const ingresosMensualesPorSind = acumularMonto(ingresosMensuales, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');
    const ingresosPlenariasPorSind = acumularMonto(ingresoPlenarias, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');

    const sindicatosSet = new Set([
      ...Object.keys(ingresosMensualesPorSind),
      ...Object.keys(ingresosPlenariasPorSind)
    ]);
    const sindicatos = Array.from(sindicatosSet).sort();

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

    const aporteDirectoresPorMes = Array(12).fill(0);
    for (const item of aporteDirectores) {
      const fecha = new Date(item.fecha);
      const monto = Number(item.monto) || 0;
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) aporteDirectoresPorMes[idx] += monto;
    }

    // --- Crear Workbook y hojas ---
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen Tesorería (como en tu código original)
    const sheetResumen = workbook.addWorksheet('Resumen Tesorería');

    // Preparar matriz con datos para la hoja resumen
    const resumenData = [];

    resumenData.push(['INGRESOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);
    sindicatos.forEach((sindicato, i) => {
      const fila = [sindicato];
      meses.forEach(({ nombre, anio }, idx) => {
        const val = (ingresosMensualesPorSind[sindicato]?.[idx] || 0) + (ingresosPlenariasPorSind[sindicato]?.[idx] || 0);
        fila.push(val);
      });
      fila.push({ formula: `SUM(B${i + 2}:M${i + 2})` });
      resumenData.push(fila);
    });

    const filaTotalSind = ['INGRESO SINDICATOS'];
    for (let col = 2; col <= 13; col++) {
      filaTotalSind.push({ formula: `SUM(${String.fromCharCode(64 + col)}2:${String.fromCharCode(64 + col)}${sindicatos.length + 1})` });
    }
    filaTotalSind.push({ formula: `SUM(N2:N${sindicatos.length + 1})` });
    resumenData.push(filaTotalSind);

    Object.entries(otrosIngresosPorTipo).forEach(([tipo, valores], idx) => {
      const fila = [tipo];
      valores.forEach(val => fila.push(val));
      fila.push({ formula: `SUM(B${sindicatos.length + 3 + idx}:M${sindicatos.length + 3 + idx})` });
      resumenData.push(fila);
    });

    {
      const fila = ['APORTE DIRECTORES', ...aporteDirectoresPorMes];
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    }

    {
      const startFila = 2;
      const endFila = resumenData.length;
      const fila = ['TOTAL INGRESOS'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ formula: `SUM(${String.fromCharCode(64 + col)}${startFila}:${String.fromCharCode(64 + col)}${endFila})` });
      }
      fila.push({ formula: `SUM(N${startFila}:N${endFila})` });
      resumenData.push(fila);
    }

    resumenData.push([]);

    // GASTOS
    resumenData.push(['GASTOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);

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

    rubrosDir.forEach((rubro) => {
      const fila = [rubro.toUpperCase()];
      gastosDirPorRubro[rubro].forEach(val => fila.push(val));
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    });

    {
      const start = resumenData.length - rubrosDir.length + 1;
      const end = resumenData.length;
      const fila = ['GASTO DIRECTOR'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ formula: `SUM(${String.fromCharCode(64 + col)}${start}:${String.fromCharCode(64 + col)}${end})` });
      }
      fila.push({ formula: `SUM(N${start}:N${end})` });
      resumenData.push(fila);
    }

    // Gastos Plenarias
    const gastosPlenariasPorMes = Array(12).fill(0);
    gastoPlenarias.forEach(gp => {
      const fecha = new Date(gp.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosPlenariasPorMes[idx] += Number(gp.costo_total) || 0;
    });
    {
      const fila = ['GASTO PLENARIAS', ...gastosPlenariasPorMes];
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    }

    // Gastos Gestion
    const gastosGestionPorMes = Array(12).fill(0);
    gastoGestion.forEach(gg => {
      const fecha = new Date(gg.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosGestionPorMes[idx] += Number(gg.total) || 0;
    });
    {
      const fila = ['GASTO GESTION', ...gastosGestionPorMes];
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    }

    // Gastos Comisiones
    const gastosComisionesPorMes = Array(12).fill(0);
    gastoComisiones.forEach(gc => {
      const fecha = new Date(gc.fecha_registro);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosComisionesPorMes[idx] += Number(gc.monto) || 0;
    });
    {
      const fila = ['GASTO COMISIONES', ...gastosComisionesPorMes];
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    }

    // Otros Gastos
    const gastosOtrosPorDesc = {};
    gastoOtros.forEach(go => {
      const fecha = new Date(go.fecha_registro);
      const desc = go.descripcion || 'SIN DESCRIPCIÓN';
      const monto = Number(go.monto) || 0;
      if (!gastosOtrosPorDesc[desc]) gastosOtrosPorDesc[desc] = Array(12).fill(0);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosOtrosPorDesc[desc][idx] += monto;
    });
    Object.entries(gastosOtrosPorDesc).forEach(([desc, valores]) => {
      const fila = [desc.toUpperCase()];
      valores.forEach(v => fila.push(v));
      fila.push({ formula: `SUM(B${resumenData.length + 1}:M${resumenData.length + 1})` });
      resumenData.push(fila);
    });

    {
      const start = resumenData.findIndex(r => r[0] === 'GASTO DIRECTOR') + 1;
      const end = resumenData.length;
      const fila = ['TOTAL GASTOS'];
      for (let col = 2; col <= 13; col++) {
        fila.push({ formula: `SUM(${String.fromCharCode(64 + col)}${start}:${String.fromCharCode(64 + col)}${end})` });
      }
      fila.push({ formula: `SUM(N${start}:N${end})` });
      resumenData.push(fila);
    }

    // Ahorro o Déficit (TOTAL INGRESOS - TOTAL GASTOS)
    {
      const fila = ['AHORRO O DÉFICIT'];
      for (let col = 2; col <= 13; col++) {
        // Resta fila TOTAL INGRESOS - fila TOTAL GASTOS (últimas dos filas)
        const letraCol = String.fromCharCode(64 + col);
        const rowTotalIngresos = resumenData.length - 1;
        const rowTotalGastos = resumenData.length - 2;
        fila.push({ formula: `${letraCol}${rowTotalIngresos} - ${letraCol}${rowTotalGastos}` });
      }
      const lastCol = 'N';
      const rowTotalIngresos = resumenData.length - 1;
      const rowTotalGastos = resumenData.length - 2;
      fila.push({ formula: `${lastCol}${rowTotalIngresos} - ${lastCol}${rowTotalGastos}` });
      resumenData.push(fila);
    }

    // Añadir datos a hoja Resumen Tesorería
    resumenData.forEach((fila, i) => {
      fila.forEach((celda, j) => {
        const cell = sheetResumen.getCell(i + 1, j + 1);
        if (celda && typeof celda === 'object' && celda.formula) {
          cell.value = { formula: celda.formula };
        } else {
          cell.value = celda;
        }
      });
    });

    // --- Hoja 2: Plan Ingresos y Gastos ---

    const sheetPlan = workbook.addWorksheet('Plan Ingresos y Gastos');

    // Encabezados
    sheetPlan.mergeCells('A1:G1');
    sheetPlan.getCell('A1').value = 'PLAN INGRESOS';
    sheetPlan.getRow(2).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];

    let currentRow = 3;

    // Datos dinámicos de PLAN INGRESOS
    // Ejemplo: Cuota Sindicato
    const totalCuotas = ingresosMensuales.length;
    const totalAfiliados = 730; // puedes hacer dinámico si tienes el dato
    const valorCuota = ingresosMensuales[0]?.cuota || 1000;
    sheetPlan.getRow(currentRow).values = [
      'cuota_sindicato',
      totalCuotas,
      totalAfiliados,
      valorCuota,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ];
    currentRow++;

    // Plenarias
    const numPlenarias = ingresoPlenarias.length;
    const asistentes = 25;
    const valorPlenaria = ingresoPlenarias[0]?.cuota || 20000;
    sheetPlan.getRow(currentRow).values = [
      'plenarias',
      numPlenarias,
      asistentes,
      valorPlenaria,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ];
    currentRow++;

    // Aporte directores
    const numAportes = aporteDirectores.length;
    const directores = 25;
    const montoAporte = aporteDirectores[0]?.monto || 1000;
    sheetPlan.getRow(currentRow).values = [
      'aporte_director',
      numAportes,
      directores,
      montoAporte,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ];
    currentRow++;

    // Otros ingresos
    sheetPlan.getRow(currentRow).values = [
      'otros_ingresos',
      otrosIngresos.length,
      null,
      null,
      { formula: `SUM(E${currentRow - 3}:E${currentRow - 1})` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ];
    currentRow++;

    // PLAN GASTOS
    sheetPlan.mergeCells(`A${currentRow}:G${currentRow}`);
    sheetPlan.getCell(`A${currentRow}`).value = 'PLAN GASTOS';
    currentRow++;

    sheetPlan.getRow(currentRow).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];
    currentRow++;

    // Gasto Director (solo ejemplo con suma de rubros)
    let totalGastoDirector = 0;
    rubrosDir.forEach(rubro => {
      const sumaRubro = gastoDirectores.reduce((acc, g) => acc + (Number(g[rubro]) || 0), 0);
      sheetPlan.getRow(currentRow).values = [
        rubro,
        null,
        null,
        null,
        sumaRubro,
        null,
        null
      ];
      currentRow++;
      totalGastoDirector += sumaRubro;
    });

    // Gastos adicionales (plenarias, gestión, comisiones, otros)
    const sumaGastoPlenarias = gastoPlenarias.reduce((acc, g) => acc + (Number(g.costo_total) || 0), 0);
    sheetPlan.getRow(currentRow).values = ['gasto_plenarias', null, null, null, sumaGastoPlenarias, null, null];
    currentRow++;

    const sumaGastoGestion = gastoGestion.reduce((acc, g) => acc + (Number(g.total) || 0), 0);
    sheetPlan.getRow(currentRow).values = ['gasto_gestion', null, null, null, sumaGastoGestion, null, null];
    currentRow++;

    const sumaGastoComisiones = gastoComisiones.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    sheetPlan.getRow(currentRow).values = ['gasto_comisiones', null, null, null, sumaGastoComisiones, null, null];
    currentRow++;

    const sumaGastoOtros = gastoOtros.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    sheetPlan.getRow(currentRow).values = ['otros_gastos', null, null, null, sumaGastoOtros, null, null];
    currentRow++;

    // Total gastos
    const totalGastos = totalGastoDirector + sumaGastoPlenarias + sumaGastoGestion + sumaGastoComisiones + sumaGastoOtros;
    sheetPlan.getRow(currentRow).values = ['TOTAL GASTOS', null, null, null, totalGastos, null, null];
    currentRow++;

    // Guardar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

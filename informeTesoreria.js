import { supabase } from './supabaseClient.js';
import ExcelJS from 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';

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

    // 1) Cargar datos desde Supabase
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

    // --- Funciones para acumular montos por mes ---
    function acumularPorMes(arr, campoFecha, campoMonto) {
      const res = Array(12).fill(0);
      for (const item of arr) {
        const fecha = new Date(item[campoFecha]);
        const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
        if (idx !== -1) {
          res[idx] += Number(item[campoMonto]) || 0;
        }
      }
      return res;
    }

    // Acumular gastos directores por mes (sumando campos remuneracion, pasajes, colacion, etc.)
    const rubrosDir = ['remuneracion', 'pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso'];
    const gastosDirPorMes = Array(12).fill(0);
    for (const gasto of gastoDirectores) {
      const fecha = new Date(gasto.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) {
        rubrosDir.forEach(rubro => {
          gastosDirPorMes[idx] += Number(gasto[rubro]) || 0;
        });
      }
    }

    // Gastos plenarias, gestion, comisiones, otros gastos acumulados por mes
    const gastosPlenariasPorMes = acumularPorMes(gastoPlenarias, 'fecha', 'costo_total');
    const gastosGestionPorMes = acumularPorMes(gastoGestion, 'fecha', 'total');
    const gastosComisionesPorMes = acumularPorMes(gastoComisiones, 'fecha_registro', 'monto');

    // Acumular otros gastos por descripción y mes
    const gastosOtrosPorDesc = {};
    for (const go of gastoOtros) {
      const fecha = new Date(go.fecha_registro);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) {
        const desc = go.descripcion || 'SIN DESCRIPCIÓN';
        if (!gastosOtrosPorDesc[desc]) gastosOtrosPorDesc[desc] = Array(12).fill(0);
        gastosOtrosPorDesc[desc][idx] += Number(go.monto) || 0;
      }
    }

    // Ingresos sindicales y plenarias por sindicato y mes
    // Puedes adaptar para que esta info vaya en resumen o en Plan Ingresos y Gastos según lo necesites

    // === Crear libro Excel ===
    const workbook = new ExcelJS.Workbook();

    // --- Hoja 1: Resumen Tesorería ---
    const wsResumen = workbook.addWorksheet('Resumen Tesorería');

    // Armar cabecera
    const cabecera = ['Concepto', ...meses.map(m => m.nombre), 'ANUAL'];
    wsResumen.addRow(cabecera);

    // Agregar ingresos (ejemplo simplificado)
    // Aquí puedes replicar tu lógica original agregando filas para ingresos y gastos con fórmulas SUM en anual

    // Para ejemplo, agrego una fila de gastos directores
    wsResumen.addRow(['GASTOS DIRECTORES', ...gastosDirPorMes, { formula: `SUM(B2:M2)` }]);

    // Otros gastos agregados:
    let filaIndex = wsResumen.lastRow.number;

    // Gastos Plenarias
    wsResumen.addRow(['GASTOS PLENARIAS', ...gastosPlenariasPorMes, { formula: `SUM(B${filaIndex + 1}:M${filaIndex + 1})` }]);
    filaIndex++;

    // Gastos Gestión
    wsResumen.addRow(['GASTOS GESTIÓN', ...gastosGestionPorMes, { formula: `SUM(B${filaIndex + 1}:M${filaIndex + 1})` }]);
    filaIndex++;

    // Gastos Comisiones
    wsResumen.addRow(['GASTOS COMISIONES', ...gastosComisionesPorMes, { formula: `SUM(B${filaIndex + 1}:M${filaIndex + 1})` }]);
    filaIndex++;

    // Otros gastos dinámicos
    for (const [desc, valores] of Object.entries(gastosOtrosPorDesc)) {
      wsResumen.addRow([desc, ...valores, { formula: `SUM(B${filaIndex + 1}:M${filaIndex + 1})` }]);
      filaIndex++;
    }

    // Total gastos (fórmula sumando filas anteriores)
    const primeraFilaGastos = 2;
    const ultimaFilaGastos = wsResumen.lastRow.number;
    const letras = ['B','C','D','E','F','G','H','I','J','K','L','M'];
    const totalGastosRow = wsResumen.addRow([
      'TOTAL GASTOS',
      ...letras.map(col => ({ formula: `SUM(${col}${primeraFilaGastos}:${col}${ultimaFilaGastos})` })),
      { formula: `SUM(N${primeraFilaGastos}:N${ultimaFilaGastos})` }
    ]);

    // --- Hoja 2: Plan Ingresos y Gastos ---
    const wsPlan = workbook.addWorksheet('Plan Ingresos y Gastos');

    // Títulos
    wsPlan.getCell('A1').value = 'PLAN INGRESOS';
    wsPlan.mergeCells('A1:G1');
    wsPlan.getCell('A1').font = { bold: true, size: 14 };

    // Encabezados
    const headers = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];
    wsPlan.addRow(headers).font = { bold: true };

    let currentRow = 3;

    // Ejemplo dinámico: cuota sindicato (puedes ajustar con tus datos)
    const totalEventosCuota = ingresosMensuales.length;
    const participantesCuota = 730; // o lo que venga de datos
    const valorCuota = ingresosMensuales[0]?.cuota || 1000;
    wsPlan.addRow([
      'cuota_sindicato',
      totalEventosCuota,
      participantesCuota,
      valorCuota,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Ejemplo: plenarias
    const eventosPlenarias = ingresoPlenarias.length;
    const participantesPlenarias = 25;
    const valorPlenarias = ingresoPlenarias[0]?.cuota || 20000;
    wsPlan.addRow([
      'plenarias',
      eventosPlenarias,
      participantesPlenarias,
      valorPlenarias,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Aporte directores
    const eventosAporte = aporteDirectores.length;
    const participantesAporte = 25;
    const valorAporte = aporteDirectores[0]?.monto || 1000;
    wsPlan.addRow([
      'aporte_director',
      eventosAporte,
      participantesAporte,
      valorAporte,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Otros ingresos (puedes adaptar para sumar otrosIngresos si los tienes categorizados)
    wsPlan.addRow([
      'otros',
      0,
      0,
      0,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Total ingresos
    wsPlan.getCell(`A${currentRow}`).value = 'Total';
    wsPlan.getCell(`E${currentRow}`).value = { formula: `SUM(E3:E${currentRow - 1})` };
    wsPlan.getCell(`F${currentRow}`).value = { formula: `SUM(F3:F${currentRow - 1})` };
    wsPlan.getCell(`G${currentRow}`).value = { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` };

    currentRow += 2;

    // --- PLAN GASTOS ---
    wsPlan.getCell(`A${currentRow}`).value = 'PLAN GASTOS';
    wsPlan.mergeCells(`A${currentRow}:G${currentRow}`);
    wsPlan.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow++;

    wsPlan.addRow(headers);
    currentRow++;

    // Ejemplo gastos directores
    const eventosGastoDir = gastoDirectores.length;
    const participantesGastoDir = 5;
    const valorGastoDir = 50000;
    wsPlan.addRow([
      'remuneracion_directores',
      eventosGastoDir,
      participantesGastoDir,
      valorGastoDir,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Viáticos (ejemplo fijo)
    wsPlan.addRow([
      'viaticos',
      8,
      5,
      20000,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Gastos plenarias
    wsPlan.addRow([
      'plenarias',
      gastoPlenarias.length,
      25,
      15000,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Gestión
    wsPlan.addRow([
      'gestion',
      1,
      1,
      300000,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Comisiones
    wsPlan.addRow([
      'comisiones',
      gastoComisiones.length,
      3,
      10000,
      { formula: `B${currentRow}*C${currentRow}*D${currentRow}` },
      null,
      { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` }
    ]);
    currentRow++;

    // Total gastos
    wsPlan.getCell(`A${currentRow}`).value = 'Total';
    wsPlan.getCell(`E${currentRow}`).value = { formula: `SUM(E${currentRow - 5}:E${currentRow - 1})` };
    wsPlan.getCell(`F${currentRow}`).value = { formula: `SUM(F${currentRow - 5}:F${currentRow - 1})` };
    wsPlan.getCell(`G${currentRow}`).value = { formula: `IF(E${currentRow}=0,0,F${currentRow}/E${currentRow})` };

    // --- Estilos básicos para columnas ---
    [wsPlan, wsResumen].forEach(ws => {
      ws.columns.forEach(col => {
        col.alignment = { vertical: 'middle', horizontal: 'center' };
        col.width = 15;
      });
    });

    // Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Error generando informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

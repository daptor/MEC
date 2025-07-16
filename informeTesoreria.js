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
    // --- Carga datos Supabase dinámicos ---

    // Ingresos mensuales (para cuota sindicato)
    const { data: ingresosMensuales } = await supabase
      .from('ingresos_mensuales')
      .select('cuota,año')
      .gte('año', anioBase)
      .lte('año', anioBase + 1);

    // Plenarias ingreso
    const { data: ingresoPlenarias } = await supabase
      .from('ingreso_plenarias')
      .select('cuota,año')
      .gte('año', anioBase)
      .lte('año', anioBase + 1);

    // Aporte directores (filtrado por fecha)
    const { data: aporteDirectores } = await supabase
      .from('aporte_director')
      .select('monto,fecha')
      .gte('fecha', `${anioBase}-04-01`)
      .lte('fecha', `${anioBase + 1}-03-31`);

    // Gastos
    const { data: gastoDirectores } = await supabase.from('gasto_real_directores').select('monto,fecha');
    const { data: gastoPlenarias } = await supabase.from('gasto_real_plenarias').select('monto,fecha');
    const { data: gastoGestion } = await supabase.from('gasto_real_gestion').select('monto,fecha');
    const { data: gastoComisiones } = await supabase.from('gasto_real_comisiones').select('monto,fecha');

    // Datos dinámicos para Plan Ingresos y Gastos

    // Ejemplo supuestos para participantes (puedes ajustar según tus datos reales)
    const participantesCuotaSindicato = 730; // o calcula dinámico si tienes dato
    const participantesPlenarias = 25;
    const participantesDirectores = 25;
    const participantesGastoDirectores = 5;
    const participantesGastoPlenarias = 25;
    const participantesGastoComisiones = 3;

    // Valores unitarios promedio o únicos (promedio para dinámica)
    const valorCuota = ingresosMensuales.length > 0 ? promedio(ingresosMensuales.map(i => i.cuota)) : 1000;
    const valorPlenaria = ingresoPlenarias.length > 0 ? promedio(ingresoPlenarias.map(i => i.cuota)) : 20000;
    const valorAporteDirector = aporteDirectores.length > 0 ? promedio(aporteDirectores.map(a => a.monto)) : 1000;
    const valorGastoDirector = gastoDirectores.length > 0 ? promedio(gastoDirectores.map(g => g.monto)) : 50000;
    const valorGastoPlenaria = gastoPlenarias.length > 0 ? promedio(gastoPlenarias.map(g => g.monto)) : 15000;
    const valorGastoGestion = gastoGestion.length > 0 ? promedio(gastoGestion.map(g => g.monto)) : 300000;
    const valorGastoComisiones = gastoComisiones.length > 0 ? promedio(gastoComisiones.map(g => g.monto)) : 10000;

    function promedio(arr) {
      if (!arr.length) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    // --- Crear Workbook ---
    const workbook = new ExcelJS.Workbook();

    // --- Hoja Plan Ingresos y Gastos ---
    const sheetPlan = workbook.addWorksheet('Plan Ingresos y Gastos');

    sheetPlan.getCell('A1').value = 'PLAN INGRESOS';
    sheetPlan.mergeCells('A1:G1');
    sheetPlan.getRow(2).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];

    let row = 3;

    // Cuota Sindicato
    sheetPlan.getRow(row).values = [
      'cuota_sindicato',
      ingresosMensuales.length,
      participantesCuotaSindicato,
      valorCuota,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Plenarias
    sheetPlan.getRow(row).values = [
      'plenarias',
      ingresoPlenarias.length,
      participantesPlenarias,
      valorPlenaria,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Aporte Directores
    sheetPlan.getRow(row).values = [
      'aporte_director',
      aporteDirectores.length,
      participantesDirectores,
      valorAporteDirector,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Otros ingresos (vacío dinámico)
    sheetPlan.getRow(row).values = [
      'otros',
      0,
      0,
      0,
      { formula: `0` },
      null,
      { formula: `0` }
    ];
    row++;

    // Total ingresos
    sheetPlan.getCell(`A${row}`).value = 'Total';
    sheetPlan.getCell(`E${row}`).value = { formula: `SUM(E3:E${row - 1})` };
    sheetPlan.getCell(`F${row}`).value = { formula: `SUM(F3:F${row - 1})` };
    sheetPlan.getCell(`G${row}`).value = { formula: `IF(E${row}=0,0,F${row}/E${row})` };

    row += 2;

    // PLAN GASTOS
    sheetPlan.getCell(`A${row}`).value = 'PLAN GASTOS';
    sheetPlan.mergeCells(`A${row}:G${row}`);
    row++;
    sheetPlan.getRow(row).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];
    row++;

    // Remuneracion directores
    sheetPlan.getRow(row).values = [
      'remuneracion_directores',
      gastoDirectores.length,
      participantesGastoDirectores,
      valorGastoDirector,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Viaticos (ejemplo estático, ajusta si tienes datos)
    sheetPlan.getRow(row).values = [
      'viaticos',
      8,
      participantesGastoDirectores,
      20000,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Plenarias gastos
    sheetPlan.getRow(row).values = [
      'plenarias',
      gastoPlenarias.length,
      participantesGastoPlenarias,
      valorGastoPlenaria,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Gestion
    sheetPlan.getRow(row).values = [
      'gestion',
      gastoGestion.length,
      1,
      valorGastoGestion,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Comisiones
    sheetPlan.getRow(row).values = [
      'comisiones',
      gastoComisiones.length,
      participantesGastoComisiones,
      valorGastoComisiones,
      { formula: `B${row}*C${row}*D${row}` },
      null,
      { formula: `IF(E${row}=0,0,F${row}/E${row})` }
    ];
    row++;

    // Total gastos
    sheetPlan.getCell(`A${row}`).value = 'Total';
    sheetPlan.getCell(`E${row}`).value = { formula: `SUM(E${row - 5}:E${row - 1})` };
    sheetPlan.getCell(`F${row}`).value = { formula: `SUM(F${row - 5}:F${row - 1})` };
    sheetPlan.getCell(`G${row}`).value = { formula: `IF(E${row}=0,0,F${row}/E${row})` };

    // --- Hoja 2: Resumen Tesorería ---
    const sheetResumen = workbook.addWorksheet('Resumen Tesorería');

    // Encabezados resumen mensual
    const meses = ['ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'ENE', 'FEB', 'MAR'];
    sheetResumen.getRow(1).values = ['Mes', 'Ingresos', 'Gastos'];

    // Para simplificar, se reparte total anual / 12 en cada mes (ajustar si tienes datos mensuales reales)
    for (let i = 0; i < meses.length; i++) {
      const mes = meses[i];
      const fila = i + 2;
      sheetResumen.getCell(`A${fila}`).value = mes;
      sheetResumen.getCell(`B${fila}`).value = { formula: `${sheetPlan.getCell(`E${row - 7}`).address}/12` };
      sheetResumen.getCell(`C${fila}`).value = { formula: `${sheetPlan.getCell(`E${row}`).address}/12` };
    }

    const filaTotalResumen = meses.length + 2;
    sheetResumen.getCell(`A${filaTotalResumen}`).value = 'Total';
    sheetResumen.getCell(`B${filaTotalResumen}`).value = { formula: `SUM(B2:B${filaTotalResumen - 1})` };
    sheetResumen.getCell(`C${filaTotalResumen}`).value = { formula: `SUM(C2:C${filaTotalResumen - 1})` };

    // --- Descargar archivo ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Tesoreria_${anioBase}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Error generando informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

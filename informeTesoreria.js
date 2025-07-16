import { supabase } from './supabaseClient.js';
import ExcelJS from 'https://esm.sh/exceljs';

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
    const meses = ['ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC', 'ENE', 'FEB', 'MAR'];

    // === Cargar datos desde Supabase ===
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

    const workbook = new ExcelJS.Workbook();

    // === Hoja 1: Plan Ingresos y Gastos ===
    const planSheet = workbook.addWorksheet('Plan Ingresos y Gastos');
    planSheet.columns = [
      { header: 'tipo', key: 'tipo', width: 25 },
      { header: 'eventos', key: 'eventos', width: 10 },
      { header: 'participantes', key: 'participantes', width: 15 },
      { header: 'valor', key: 'valor', width: 12 },
      { header: 'total_anual', key: 'total', width: 15 },
      { header: 'Actual', key: 'actual', width: 12 },
      { header: '% Cumpl.', key: 'cumpl', width: 12 }
    ];

    let row = 1;
    planSheet.mergeCells(`A${row}:G${row}`);
    planSheet.getCell(`A${row}`).value = 'PLAN INGRESOS';
    row += 2;

    const ingresos = [
      {
        tipo: 'cuota_sindicato',
        eventos: ingresosMensuales.length,
        participantes: 730,
        valor: ingresosMensuales[0]?.cuota || 1000
      },
      {
        tipo: 'plenarias',
        eventos: ingresoPlenarias.length,
        participantes: 25,
        valor: ingresoPlenarias[0]?.cuota || 20000
      },
      {
        tipo: 'aporte_director',
        eventos: aporteDirectores.length,
        participantes: 25,
        valor: aporteDirectores[0]?.monto || 1000
      },
      {
        tipo: 'otros',
        eventos: 0,
        participantes: 0,
        valor: 0
      }
    ];

    for (const item of ingresos) {
      const excelRow = planSheet.getRow(row++);
      excelRow.values = [
        item.tipo,
        item.eventos,
        item.participantes,
        item.valor,
        { formula: `B${row - 1}*C${row - 1}*D${row - 1}` },
        null,
        { formula: `IF(E${row - 1}=0,0,F${row - 1}/E${row - 1})` }
      ];
    }

    planSheet.getCell(`A${row}`).value = 'Total Ingresos';
    planSheet.getCell(`E${row}`).value = { formula: `SUM(E4:E${row - 1})` };
    planSheet.getCell(`F${row}`).value = { formula: `SUM(F4:F${row - 1})` };
    planSheet.getCell(`G${row}`).value = { formula: `IF(E${row}=0,0,F${row}/E${row})` };
    row += 2;

    const inicioGastos = row;
    planSheet.mergeCells(`A${row}:G${row}`);
    planSheet.getCell(`A${row}`).value = 'PLAN GASTOS';
    row += 2;

    const gastos = [
      {
        tipo: 'remuneracion_directores',
        eventos: gastoDirectores.length,
        participantes: 5,
        valor: 50000
      },
      {
        tipo: 'viaticos',
        eventos: 8,
        participantes: 5,
        valor: 20000
      },
      {
        tipo: 'plenarias',
        eventos: gastoPlenarias.length,
        participantes: 25,
        valor: 15000
      },
      {
        tipo: 'gestion',
        eventos: 1,
        participantes: 1,
        valor: 300000
      },
      {
        tipo: 'comisiones',
        eventos: gastoComisiones.length,
        participantes: 3,
        valor: 10000
      }
    ];

    for (const item of gastos) {
      const excelRow = planSheet.getRow(row++);
      excelRow.values = [
        item.tipo,
        item.eventos,
        item.participantes,
        item.valor,
        { formula: `B${row - 1}*C${row - 1}*D${row - 1}` },
        null,
        { formula: `IF(E${row - 1}=0,0,F${row - 1}/E${row - 1})` }
      ];
    }

    planSheet.getCell(`A${row}`).value = 'Total Gastos';
    planSheet.getCell(`E${row}`).value = { formula: `SUM(E${inicioGastos + 2}:E${row - 1})` };
    planSheet.getCell(`F${row}`).value = { formula: `SUM(F${inicioGastos + 2}:F${row - 1})` };
    planSheet.getCell(`G${row}`).value = { formula: `IF(E${row}=0,0,F${row}/E${row})` };

    // === Segunda hoja: Resumen Tesorería (solo encabezado por ahora) ===
    const resumenSheet = workbook.addWorksheet('Resumen Tesorería');
    resumenSheet.addRow(['Aquí puedes pegar tu lógica original para construir esta hoja.']);

    // === Descargar archivo Excel ===
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

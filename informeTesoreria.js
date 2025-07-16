import { supabase } from './supabaseClient.js';
import ExcelJS from 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/+esm';

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

    // === DATOS REALES DESDE SUPABASE ===
    const [
      { data: ingresosMensuales },
      { data: ingresoPlenarias },
      { data: aporteDirectores },
      { data: gastoDirectores },
      { data: gastoPlenarias },
      { data: gastoGestion },
      { data: gastoComisiones }
    ] = await Promise.all([
      supabase.from('ingresos_mensuales').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('ingreso_plenarias').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('aporte_director').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase + 1}-03-31`),
      supabase.from('gasto_real_directores').select('*'),
      supabase.from('gasto_real_plenarias').select('*'),
      supabase.from('gasto_real_gestion').select('*'),
      supabase.from('gasto_real_comisiones').select('*')
    ]);

    const workbook = new ExcelJS.Workbook();

    // === HOJA 1: Plan Ingresos y Gastos ===
    const hojaPlan = workbook.addWorksheet('Plan Ingresos y Gastos');
    hojaPlan.getRow(1).values = ['PLAN INGRESOS'];
    hojaPlan.mergeCells('A1:G1');
    hojaPlan.getRow(2).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];

    let fila = 3;

    hojaPlan.getRow(fila++).values = [
      'cuota_sindicato', 12, 730, 1000,
      { formula: 'B3*C3*D3' }, null, { formula: 'IF(E3=0,0,F3/E3)' }
    ];
    hojaPlan.getRow(fila++).values = [
      'plenarias', ingresoPlenarias.length, 25, 20000,
      { formula: 'B4*C4*D4' }, null, { formula: 'IF(E4=0,0,F4/E4)' }
    ];
    hojaPlan.getRow(fila++).values = [
      'aporte_director', aporteDirectores.length, 25, 1000,
      { formula: 'B5*C5*D5' }, null, { formula: 'IF(E5=0,0,F5/E5)' }
    ];
    hojaPlan.getRow(fila++).values = [
      'otros', 0, 0, 0,
      { formula: 'B6*C6*D6' }, null, { formula: 'IF(E6=0,0,F6/E6)' }
    ];

    hojaPlan.getRow(fila).values = [
      'Total', '', '', '',
      { formula: 'SUM(E3:E6)' },
      { formula: 'SUM(F3:F6)' },
      { formula: 'IF(E7=0,0,F7/E7)' }
    ];

    fila += 2;
    hojaPlan.getRow(fila++).values = ['PLAN GASTOS'];
    hojaPlan.mergeCells(`A${fila - 1}:G${fila - 1}`);
    hojaPlan.getRow(fila++).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];

    hojaPlan.getRow(fila++).values = [
      'remuneracion_directores', gastoDirectores.length, 5, 50000,
      { formula: `B10*C10*D10` }, null, { formula: `IF(E10=0,0,F10/E10)` }
    ];
    hojaPlan.getRow(fila++).values = [
      'viaticos', 8, 5, 20000,
      { formula: `B11*C11*D11` }, null, { formula: `IF(E11=0,0,F11/E11)` }
    ];
    hojaPlan.getRow(fila++).values = [
      'plenarias', gastoPlenarias.length, 25, 15000,
      { formula: `B12*C12*D12` }, null, { formula: `IF(E12=0,0,F12/E12)` }
    ];
    hojaPlan.getRow(fila++).values = [
      'gestion', 1, 1, 300000,
      { formula: `B13*C13*D13` }, null, { formula: `IF(E13=0,0,F13/E13)` }
    ];
    hojaPlan.getRow(fila++).values = [
      'comisiones', gastoComisiones.length, 3, 10000,
      { formula: `B14*C14*D14` }, null, { formula: `IF(E14=0,0,F14/E14)` }
    ];
    hojaPlan.getRow(fila).values = [
      'Total', '', '', '',
      { formula: 'SUM(E10:E14)' },
      { formula: 'SUM(F10:F14)' },
      { formula: 'IF(E15=0,0,F15/E15)' }
    ];

    // === HOJA 2: Resumen Tesorería mensual por sindicato ===
    const hojaResumen = workbook.addWorksheet('Resumen Tesorería');
    hojaResumen.addRow(['SINDICATO', ...meses, 'TOTAL']);

    const sindicatosSet = new Set(ingresosMensuales.map(i => i.nombre_sindicato));
    const sindicatos = Array.from(sindicatosSet).sort();

    sindicatos.forEach((sind) => {
      const fila = [sind];
      let total = 0;
      for (let mes of meses) {
        const item = ingresosMensuales.find(i => i.nombre_sindicato === sind && i.mes_nombre?.toUpperCase() === mes);
        const monto = item?.cuota || 0;
        fila.push(monto);
        total += monto;
      }
      fila.push(total);
      hojaResumen.addRow(fila);
    });

    // === DESCARGA ===
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
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

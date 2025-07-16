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

    const wb = new ExcelJS.Workbook();
    const moneda = '#,##0';

    // === HOJA 1: Plan Ingresos y Gastos ===
    const ws = wb.addWorksheet('Plan Ingresos y Gastos');
    ws.getCell('A1').value = 'PLAN INGRESOS';
    ws.mergeCells('A1:G1');
    ws.getRow(2).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];

    const ingresos = [
      {
        tipo: 'cuota_sindicato',
        eventos: 12,
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

    let fila = 3;
    ingresos.forEach((item) => {
      ws.getCell(`A${fila}`).value = item.tipo;
      ws.getCell(`B${fila}`).value = item.eventos;
      ws.getCell(`C${fila}`).value = item.participantes;
      ws.getCell(`D${fila}`).value = item.valor;
      ws.getCell(`D${fila}`).numFmt = moneda;
      ws.getCell(`E${fila}`).value = { formula: `B${fila}*C${fila}*D${fila}` };
      ws.getCell(`E${fila}`).numFmt = moneda;
      ws.getCell(`F${fila}`).value = null;
      ws.getCell(`F${fila}`).numFmt = moneda;
      ws.getCell(`G${fila}`).value = { formula: `IF(E${fila}=0,0,F${fila}/E${fila})` };
      fila++;
    });

    ws.getCell(`A${fila}`).value = 'Total';
    ws.getCell(`E${fila}`).value = { formula: `SUM(E3:E${fila - 1})` };
    ws.getCell(`F${fila}`).value = { formula: `SUM(F3:F${fila - 1})` };
    ws.getCell(`G${fila}`).value = { formula: `IF(E${fila}=0,0,F${fila}/E${fila})` };
    ws.getCell(`E${fila}`).numFmt = moneda;
    ws.getCell(`F${fila}`).numFmt = moneda;

    fila += 2;
    ws.getCell(`A${fila}`).value = 'PLAN GASTOS';
    ws.mergeCells(`A${fila}:G${fila}`);
    fila++;
    ws.getRow(fila).values = ['tipo', 'eventos', 'participantes', 'valor', 'total_anual', 'Actual', '% Cumpl.'];
    fila++;

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

    gastos.forEach((item) => {
      ws.getCell(`A${fila}`).value = item.tipo;
      ws.getCell(`B${fila}`).value = item.eventos;
      ws.getCell(`C${fila}`).value = item.participantes;
      ws.getCell(`D${fila}`).value = item.valor;
      ws.getCell(`D${fila}`).numFmt = moneda;
      ws.getCell(`E${fila}`).value = { formula: `B${fila}*C${fila}*D${fila}` };
      ws.getCell(`E${fila}`).numFmt = moneda;
      ws.getCell(`F${fila}`).value = null;
      ws.getCell(`F${fila}`).numFmt = moneda;
      ws.getCell(`G${fila}`).value = { formula: `IF(E${fila}=0,0,F${fila}/E${fila})` };
      fila++;
    });

    ws.getCell(`A${fila}`).value = 'Total';
    ws.getCell(`E${fila}`).value = { formula: `SUM(E${fila - gastos.length}:E${fila - 1})` };
    ws.getCell(`F${fila}`).value = { formula: `SUM(F${fila - gastos.length}:F${fila - 1})` };
    ws.getCell(`G${fila}`).value = { formula: `IF(E${fila}=0,0,F${fila}/E${fila})` };
    ws.getCell(`E${fila}`).numFmt = moneda;
    ws.getCell(`F${fila}`).numFmt = moneda;

    // === HOJA 2: Resumen Sindicatos Mensual ===
    const hojaResumen = wb.addWorksheet('Resumen Sindicatos');
    hojaResumen.addRow(['SINDICATO', ...meses.map(m => m.nombre), 'TOTAL']);

    const sindicatosSet = new Set(ingresosMensuales.map(i => i.nombre_sindicato));
    const sindicatos = Array.from(sindicatosSet).sort();

    sindicatos.forEach((sind) => {
      const fila = [sind];
      let total = 0;
      for (let i = 0; i < meses.length; i++) {
        const { mes, anio } = meses[i];
        const item = ingresosMensuales.find(x => x.nombre_sindicato === sind && x.mes === mes && x.año === anio);
        const monto = item?.cuota || 0;
        fila.push(monto);
        total += monto;
      }
      fila.push(total);
      hojaResumen.addRow(fila);
    });

    // === DESCARGA ===
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Tesoreria_${anioBase}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

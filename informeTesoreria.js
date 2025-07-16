import { supabase } from './supabaseClient.js';
import { Workbook } from 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';

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
    // Definir meses ABR–MAR
    const meses = ['ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC','ENE','FEB','MAR'];
    const rango = { from: `${anioBase}-04-01`, to: `${anioBase+1}-03-31` };

    // 1) Cargar datos de Supabase en paralelo
    const [
      { data: ingMen },
      { data: ingPlen },
      { data: otrosIng },
      { data: aporteDir },
      { data: gDir },
      { data: gPlen },
      { data: gGest },
      { data: gCom },
      { data: gOtr }
    ] = await Promise.all([
      supabase.from('ingresos_mensuales').select('*').gte('año', anioBase).lte('año', anioBase+1),
      supabase.from('ingreso_plenarias').select('*').gte('año', anioBase).lte('año', anioBase+1),
      supabase.from('otros_ingresos').select('*').gte('anio', anioBase).lte('anio', anioBase+1),
      supabase.from('aporte_director').select('*').gte('fecha', rango.from).lte('fecha', rango.to),
      supabase.from('gasto_real_directores').select('*').gte('fecha', rango.from).lte('fecha', rango.to),
      supabase.from('gasto_real_plenarias').select('*').gte('fecha', rango.from).lte('fecha', rango.to),
      supabase.from('gasto_real_gestion').select('*').gte('fecha', rango.from).lte('fecha', rango.to),
      supabase.from('gasto_real_comisiones').select('*').gte('fecha_registro', rango.from).lte('fecha_registro', rango.to),
      supabase.from('gasto_real_otros').select('*').gte('fecha_registro', rango.from).lte('fecha_registro', rango.to)
    ]);

    // 2) Crear workbook y hojas
    const wb = new Workbook();
    const wsResumen = wb.addWorksheet('Resumen Tesorería');
    const wsPlan    = wb.addWorksheet('Plan Ingresos y Gastos');

    // 3) Definir estilos
    const styleHeader = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern:'solid', fgColor:{ argb:'FF1F4E78' } },
      alignment: { horizontal:'center', vertical:'middle' },
      border: { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }
    };
    const styleSub = {
      font: { bold:true }, fill:{ type:'pattern', pattern:'solid', fgColor:{ argb:'FFD9E1F2' } },
      border:{ top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }
    };
    const styleTot = {
      font: { bold:true, color:{ argb:'FFFFFFFF' } },
      fill:{ type:'pattern', pattern:'solid', fgColor:{ argb:'FF002060' } },
      border:{ top:{style:'medium'}, left:{style:'medium'}, bottom:{style:'medium'}, right:{style:'medium'} }
    };
    const styleMoney = {
      numFmt:'"$"#,##0.00;[Red]\\-"$"#,##0.00',
      alignment:{ horizontal:'right' },
      border:{ top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} }
    };

    // 4) Helpers de acumulación
    const idxMes = name => meses.indexOf(name.toUpperCase());
    function acum(arr, key, mesField, anioField, montoField) {
      const o = {};
      arr.forEach(it => {
        const k = it[key];
        const idx = idxMes(it[mesField]);
        if (idx < 0) return;
        o[k] = o[k] || Array(12).fill(0);
        o[k][idx] += Number(it[montoField])||0;
      });
      return o;
    }
    function acumFecha(arr, dateField, montoField) {
      const A = Array(12).fill(0);
      arr.forEach(it => {
        const d = new Date(it[dateField]);
        // convertir abril→enero índice 0: (month+9)%12
        const idx = (d.getMonth()+9)%12;
        A[idx] += Number(it[montoField])||0;
      });
      return A;
    }

    // 5) Acumular datos
    const ingMenPor = acum(ingMen,'nombre_sindicato','mes_nombre','año','cuota');
    const ingPlPor  = acum(ingPlen,'nombre_sindicato','mes_nombre','año','cuota');
    const sindicSet = new Set([...Object.keys(ingMenPor),...Object.keys(ingPlPor)]);
    const sindic = Array.from(sindicSet).sort();
    const otrosPor  = acum(otrosIng,'tipo_ingreso','mes','anio','monto');
    const aportePor = acumFecha(aporteDir,'fecha','monto');
    const gDirPor   = acumFecha(gDir,'fecha','monto');
    const gPlPor    = acumFecha(gPlen,'fecha','costo_total');
    const gGePor    = acumFecha(gGest,'fecha','total');
    const gCoPor    = acumFecha(gCom,'fecha_registro','monto');
    const gOtPor    = acumFecha(gOtr,'fecha_registro','monto');

    // === Construir "Resumen Tesorería" ===
    wsResumen.columns = [{ width:25 }, ...Array(12).fill({ width:12 }), { width:14 }];
    // Encabezado
    wsResumen.addRow([`INGRESOS ${anioBase}-${anioBase+1}`, ...meses, 'ANUAL'])
      .eachCell(c => c.style = styleHeader);
    let rowNum = 2;
    // Ingresos por sindicato
    sindic.forEach(s => {
      const vals = meses.map((_,i)=>(ingMenPor[s]?.[i]||0)+(ingPlPor[s]?.[i]||0));
      const row = wsResumen.addRow([s, ...vals, { formula:`SUM(B${rowNum}:M${rowNum})` }]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style = styleMoney; });
      rowNum++;
    });
    // Total sindicato
    wsResumen.addRow([
      'INGRESO SINDICATOS',
      ...meses.map((_,i)=>({ formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${rowNum-1})` })),
      { formula:`SUM(N2:N${rowNum-1})` }
    ]).eachCell(c=>c.style=styleSub);
    rowNum++;
    // Otros ingresos
    Object.entries(otrosPor).forEach(([t,arr])=>{
      const row = wsResumen.addRow([t, ...arr, { formula:`SUM(B${rowNum}:M${rowNum})` }]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      rowNum++;
    });
    // Aporte directores
    wsResumen.addRow([ 'APORTE DIRECTORES', ...aportePor, { formula:`SUM(B${rowNum}:M${rowNum})` } ])
      .eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
    rowNum++;
    // Total ingresos generales
    wsResumen.addRow([
      'TOTAL INGRESOS',
      ...meses.map((_,i)=>({ formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${rowNum-1})` })),
      { formula:`SUM(N2:N${rowNum-1})` }
    ]).eachCell(c=>c.style=styleTot);
    rowNum++;
    wsResumen.addRow([]); rowNum++;
    // Encabezado Gastos
    wsResumen.addRow([`GASTOS ${anioBase}-${anioBase+1}`, ...meses, 'ANUAL'])
      .eachCell(c=>c.style=styleHeader);
    rowNum++;
    // Gastos directores por rubro
    ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']
      .forEach(rubro=>{
        const row = wsResumen.addRow([rubro.toUpperCase(), ...gDirPor, { formula:`SUM(B${rowNum}:M${rowNum})` }]);
        row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
        rowNum++;
      });
    // Plenarias, gestión, comisiones
    [
      ['GASTO PLENARIAS', gPlPor],
      ['GASTO GESTION',   gGePor],
      ['GASTO COMISIONES',gCoPor]
    ].forEach(([tit,arr])=>{
      const row = wsResumen.addRow([tit, ...arr, { formula:`SUM(B${rowNum}:M${rowNum})` }]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      rowNum++;
    });
    // Otros gastos
    Object.entries(gOtPor).forEach(([desc,arr])=>{
      const row = wsResumen.addRow([desc.toUpperCase(), ...arr, { formula:`SUM(B${rowNum}:M${rowNum})` }]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      rowNum++;
    });
    // Total gastos
    wsResumen.addRow([
      'TOTAL GASTOS',
      ...meses.map((_,i)=>({ formula:`SUM(${String.fromCharCode(66+i)}${rowNum-7}:${String.fromCharCode(66+i)}${rowNum-1})` })),
      { formula:`SUM(N${rowNum-7}:N${rowNum-1})` }
    ]).eachCell(c=>c.style=styleSub);
    rowNum++;
    // Ahorro/Déficit
    wsResumen.addRow([
      'AHORRO O DÉFICIT',
      ...meses.map((_,i)=>({ formula:`${String.fromCharCode(66+i)}${rowNum-1}-${String.fromCharCode(66+i)}${rowNum-2}` })),
      { formula:`N${rowNum-1}-N${rowNum-2}` }
    ]).eachCell(c=>c.style=styleTot);

    // === Construir "Plan Ingresos y Gastos" ===
    wsPlan.columns = [
      { width:20 },{ width:10 },{ width:10 },
      { width:12 },{ width:14 },{ width:12 },{ width:12 }
    ];
    wsPlan.addRow(['PLAN INGRESOS']).mergeCells('A1:G1').getCell(1).style = styleHeader;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.'])
      .eachCell(c=>c.style=styleHeader);
    let pr = 3;
    [
      { tipo:'cuota_sindicato', ev:ingMen.length, pt:730, vl:ingMen[0]?.cuota||0 },
      { tipo:'plenarias',      ev:ingPlen.length, pt:25,  vl:ingPlen[0]?.cuota||0 },
      { tipo:'aporte_director',ev:aporteDir.length,pt:25, vl:aporteDir[0]?.monto||0 },
      { tipo:'otros',           ev:0,               pt:0,   vl:0 }
    ].forEach(g=>{
      const row = wsPlan.addRow([
        g.tipo, g.ev, g.pt, g.vl,
        { formula:`B${pr}*C${pr}*D${pr}` },
        null,
        { formula:`IF(E${pr}=0,0,F${pr}/E${pr})` }
      ]);
      row.eachCell((c,ci)=>{ if(ci>=2) c.style = styleMoney; });
      pr++;
    });
    wsPlan.addRow([
      'Total', null,null,null,
      { formula:`SUM(E3:E${pr-1})` },
      { formula:`SUM(F3:F${pr-1})` },
      { formula:`IF(E${pr}=0,0,F${pr}/E${pr})` }
    ]).eachCell(c=>c.style=styleTot);
    pr+=2;
    wsPlan.addRow(['PLAN GASTOS']).mergeCells(`A${pr}:G${pr}`).getCell(1).style=styleHeader;
    pr++;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.'])
      .eachCell(c=>c.style=styleHeader);
    pr++;
    [
      { tipo:'remuneracion_directores', ev:gDir.length, pt:5, vl:50000 },
      { tipo:'viaticos',                ev:8,            pt:5, vl:20000 },
      { tipo:'plenarias',               ev:gPlen.length, pt:25,vl:15000 },
      { tipo:'gestion',                 ev:1,            pt:1, vl:300000 },
      { tipo:'comisiones',              ev:gCom.length,  pt:3, vl:10000 }
    ].forEach(g=>{
      const row = wsPlan.addRow([
        g.tipo, g.ev, g.pt, g.vl,
        { formula:`B${pr}*C${pr}*D${pr}` },
        null,
        { formula:`IF(E${pr}=0,0,F${pr}/E${pr})` }
      ]);
      row.eachCell((c,ci)=>{ if(ci>=2) c.style=styleMoney; });
      pr++;
    });
    wsPlan.addRow([
      'Total', null,null,null,
      { formula:`SUM(E${pr-5}:E${pr-1})` },
      { formula:`SUM(F${pr-5}:F${pr-1})` },
      { formula:`IF(E${pr}=0,0,F${pr}/E${pr})` }
    ]).eachCell(c=>c.style=styleTot);

    // 6) Descargar
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Error generando informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

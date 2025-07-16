import { supabase } from './supabaseClient.js';
import * as ExcelJS from 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerarInforme').addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(document.getElementById('informe-anio-base').value, 10);
  if (isNaN(anioBase)) { alert('Año inválido'); return; }
  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true; btn.textContent = 'Generando...';

  try {
    const meses = ['ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC','ENE','FEB','MAR'];
    const rango = { from: `${anioBase}-04-01`, to: `${anioBase+1}-03-31` };

    // 1) Traer datos
    const [
      { data: ingMen }, { data: ingPlen },
      { data: otrosIng }, { data: aporteDir },
      { data: gDir }, { data: gPlen },
      { data: gGest }, { data: gCom }, { data: gOtr }
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

    // 2) Crear workbook
    const wb = new ExcelJS.Workbook();
    const wsResumen = wb.addWorksheet('Resumen Tesorería');
    const wsPlan    = wb.addWorksheet('Plan Ingresos y Gastos');

    // 3) Estilos
    const styleHeader = { font:{bold:true,color:{argb:'FFFFFFFF'}}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF1F4E78'}}, alignment:{horizontal:'center',vertical:'middle'}, border:{top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}} };
    const styleSub    = { font:{bold:true}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FFD9E1F2'}}, border:{top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}} };
    const styleTot    = { font:{bold:true,color:{argb:'FFFFFFFF'}}, fill:{type:'pattern',pattern:'solid',fgColor:{argb:'FF002060'}}, border:{top:{style:'medium'},left:{style:'medium'},bottom:{style:'medium'},right:{style:'medium'}} };
    const styleMoney  = { numFmt:'"$"#,##0.00;[Red]\\-"$"#,##0.00', alignment:{horizontal:'right'}, border:{top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}} };

    // 4) Helpers
    const idxMes = nombre => meses.indexOf(nombre.toUpperCase());
    function acum(arr,key,mesCampo,anioCampo,montoCampo){
      const o={};
      arr.forEach(it=>{
        const k=it[key], m=idxMes(it[mesCampo]);
        if(m<0) return;
        if(!o[k]) o[k]=Array(12).fill(0);
        o[k][m]+=Number(it[montoCampo])||0;
      });
      return o;
    }
    function acumF(arr,dateCampo,montoCampo){
      const A=Array(12).fill(0);
      arr.forEach(it=>{
        const d=new Date(it[dateCampo]), m=(d.getMonth()+9)%12;
        A[m]+=Number(it[montoCampo])||0;
      });
      return A;
    }

    // 5) Acumular
    const ingMenPor = acum(ingMen,'nombre_sindicato','mes_nombre','año','cuota');
    const ingPlPor  = acum(ingPlen,'nombre_sindicato','mes_nombre','año','cuota');
    const sinds     = Array.from(new Set([...Object.keys(ingMenPor),...Object.keys(ingPlPor)])).sort();
    const otrosPor  = acum(otrosIng,'tipo_ingreso','mes','anio','monto');
    const aportePor = acumF(aporteDir,'fecha','monto');
    const gDirPor   = acumF(gDir,'fecha','monto');
    const gPlPor    = acumF(gPlen,'fecha','costo_total');
    const gGePor    = acumF(gGest,'fecha','total');
    const gCoPor    = acumF(gCom,'fecha_registro','monto');
    const gOtPor    = acumF(gOtr,'fecha_registro','monto');

    // === Resumen Tesorería ===
    wsResumen.columns = [{width:25},...Array(12).fill({width:12}),{width:14}];
    wsResumen.addRow(['INGRESOS '+anioBase+'-'+(anioBase+1),...meses,'ANUAL']).eachCell(c=>c.style=styleHeader);
    let r=2;
    sinds.forEach(s=>{
      const vals = meses.map((_,i)=>(ingMenPor[s]?.[i]||0)+(ingPlPor[s]?.[i]||0));
      const row = wsResumen.addRow([s,...vals,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    wsResumen.addRow([
      'INGRESO SINDICATOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N2:N${r-1})`}
    ]).eachCell(c=>c.style=styleSub);
    r++;
    Object.entries(otrosPor).forEach(([t,arr])=>{
      const row = wsResumen.addRow([t,...arr,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    wsResumen.addRow(['APORTE DIRECTORES',...aportePor,{formula:`SUM(B${r}:M${r})`}]).eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
    r++;
    wsResumen.addRow([
      'TOTAL INGRESOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N2:N${r-1})`}
    ]).eachCell(c=>c.style=styleTot);
    r++;
    wsResumen.addRow([]); r++;
    wsResumen.addRow(['GASTOS '+anioBase+'-'+(anioBase+1),...meses,'ANUAL']).eachCell(c=>c.style=styleHeader);
    r++;
    ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso'].forEach(t=>{
      const row = wsResumen.addRow([t.toUpperCase(),...gDirPor,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    [['GASTO PLENARIAS',gPlPor],['GASTO GESTION',gGePor],['GASTO COMISIONES',gCoPor]].forEach(([tit,arr])=>{
      const row = wsResumen.addRow([tit,...arr,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    Object.entries(gOtPor).forEach(([d,arr])=>{
      const row = wsResumen.addRow([d,...arr,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    wsResumen.addRow([
      'TOTAL GASTOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}${r-7}:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N${r-7}:N${r-1})`}
    ]).eachCell(c=>c.style=styleSub);
    r++;
    wsResumen.addRow([
      'AHORRO O DÉFICIT',
      ...meses.map((_,i)=>({formula:`${String.fromCharCode(66+i)}${r-1}-${String.fromCharCode(66+i)}${r-2}`})),
      {formula:`N${r-1}-N${r-2}`}
    ]).eachCell(c=>c.style=styleTot);

    // === Plan Ingresos y Gastos ===
    wsPlan.columns = [{width:20},{width:10},{width:10},{width:12},{width:14},{width:12},{width:12}];
    wsPlan.addRow(['PLAN INGRESOS']).mergeCells('A1:G1'); wsPlan.getRow(1).getCell(1).style=styleHeader;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.']).eachCell(c=>c.style=styleHeader);
    let rp=3;
    [
      {tipo:'cuota_sindicato',ev:ingMen.length,pt:730,vl:ingMen[0]?.cuota||0},
      {tipo:'plenarias',ev:ingPlen.length,pt:25,vl:ingPlen[0]?.cuota||0},
      {tipo:'aporte_director',ev:aporteDir.length,pt:25,vl:aporteDir[0]?.monto||0},
      {tipo:'otros',ev:0,pt:0,vl:0}
    ].forEach(g=>{
      const row = wsPlan.addRow([
        g.tipo,g.ev,g.pt,g.vl,
        {formula:`B${rp}*C${rp}*D${rp}`},null,
        {formula:`IF(E${rp}=0,0,F${rp}/E${rp})`}
      ]);
      row.eachCell((c,ci)=>{ if(ci>=2) c.style=styleMoney; });
      rp++;
    });
    wsPlan.addRow(['Total',null,null,null,
      {formula:`SUM(E3:E${rp-1})`},
      {formula:`SUM(F3:F${rp-1})`},
      {formula:`IF(E${rp+1}=0,0,F${rp+1}/E${rp+1})`}
    ]).eachCell(c=>c.style=styleTot);
    rp+=2;
    wsPlan.addRow(['PLAN GASTOS']).mergeCells(`A${rp}:G${rp}`); wsPlan.getRow(rp).getCell(1).style=styleHeader;
    rp++;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.']).eachCell(c=>c.style=styleHeader);
    rp++;
    [
      {tipo:'remuneracion_directores',ev:gDir.length,pt:5,vl:50000},
      {tipo:'viaticos',ev:8,pt:5,vl:20000},
      {tipo:'plenarias',ev:gPlen.length,pt:25,vl:15000},
      {tipo:'gestion',ev:1,pt:1,vl:300000},
      {tipo:'comisiones',ev:gCom.length,pt:3,vl:10000}
    ].forEach(g=>{
      const row = wsPlan.addRow([
        g.tipo,g.ev,g.pt,g.vl,
        {formula:`B${rp}*C${rp}*D${rp}`},null,
        {formula:`IF(E${rp}=0,0,F${rp}/E${rp})`}
      ]);
      row.eachCell((c,ci)=>{ if(ci>=2) c.style=styleMoney; });
      rp++;
    });
    wsPlan.addRow(['Total',null,null,null,
      {formula:`SUM(E${rp-5}:E${rp-1})`},
      {formula:`SUM(F${rp-5}:F${rp-1})`},
      {formula:`IF(E${rp}=0,0,F${rp}/E${rp})`}
    ]).eachCell(c=>c.style=styleTot);

    // Descargar
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Error generando informe: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

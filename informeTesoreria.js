// informeTesoreria.js
import { supabase } from './supabaseClient.js';

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerarInforme')
    .addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(
    document.getElementById('informe-anio-base').value, 10
  );
  if (isNaN(anioBase)) {
    alert('Año inválido');
    return;
  }
  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    // 1) Meses y rango
    const meses = ['ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC','ENE','FEB','MAR'];
    const from = `${anioBase}-04-01`;
    const to   = `${anioBase+1}-03-31`;

    // 2) Traer datos de Supabase
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
      supabase.from('aporte_director').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('gasto_real_directores').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('gasto_real_plenarias').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('gasto_real_gestion').select('*').gte('fecha', from).lte('fecha', to),
      supabase.from('gasto_real_comisiones').select('*').gte('fecha_registro', from).lte('fecha_registro', to),
      supabase.from('gasto_real_otros').select('*').gte('fecha_registro', from).lte('fecha_registro', to),
    ]);

    // 3) Crear workbook y hojas
    const wb = new ExcelJS.Workbook();
    const wsResumen = wb.addWorksheet('Resumen Tesorería');
    const wsPlan    = wb.addWorksheet('Plan Ingresos y Gastos');

    // 4) Estilos profesionales
    const styleHeader = {
      font: { bold: true, color:{ argb:'FFFFFFFF' } },
      fill: { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1F4E78' } },
      alignment: { horizontal:'center', vertical:'middle' },
      border: { top:{style:'thin'}, left:{style:'thin'},
                bottom:{style:'thin'}, right:{style:'thin'} }
    };
    const styleSub = {
      font: { bold:true }, fill:{ type:'pattern', pattern:'solid', fgColor:{ argb:'FFD9E1F2' } },
      border:{ top:{style:'thin'}, left:{style:'thin'},
               bottom:{style:'thin'}, right:{style:'thin'} }
    };
    const styleTot = {
      font: { bold:true, color:{ argb:'FFFFFFFF' } },
      fill:{ type:'pattern', pattern:'solid', fgColor:{ argb:'FF002060' } },
      border:{ top:{style:'medium'}, left:{style:'medium'},
               bottom:{style:'medium'}, right:{style:'medium'} }
    };
    const styleMoney = {
      numFmt:'"$"#,##0.00;[Red]\\-"$"#,##0.00',
      alignment:{ horizontal:'right' },
      border:{ top:{style:'thin'}, left:{style:'thin'},
               bottom:{style:'thin'}, right:{style:'thin'} }
    };

    // 5) Helpers de acumulación
    const idxMes = n => meses.indexOf(n.toUpperCase());
    function acum(arr, key, mesF, montF) {
      const o = {};
      arr.forEach(it => {
        const k = it[key], idx = idxMes(it[mesF]);
        if (idx<0) return;
        o[k] = o[k]||Array(12).fill(0);
        o[k][idx] += Number(it[montF])||0;
      });
      return o;
    }
    function acumFecha(arr, dateF, montF) {
      const A = Array(12).fill(0);
      arr.forEach(it => {
        const d = new Date(it[dateF]);
        const idx = (d.getMonth()+9)%12; // ABR→0…MAR→11
        A[idx] += Number(it[montF])||0;
      });
      return A;
    }

    // 6) Acumular
    const ingM  = acum(ingMen,'nombre_sindicato','mes_nombre','cuota');
    const ingP  = acum(ingPlen,'nombre_sindicato','mes_nombre','cuota');
    const sindicatos = Array.from(
      new Set([...Object.keys(ingM),...Object.keys(ingP)])
    ).sort();
    const otros  = acum(otrosIng,'tipo_ingreso','mes','monto');
    const aporte = acumFecha(aporteDir,'fecha','monto');
    const gDirA  = acumFecha(gDir,'fecha','monto');
    const gPlA   = acumFecha(gPlen,'fecha','costo_total');
    const gGeA   = acumFecha(gGest,'fecha','total');
    const gCoA   = acumFecha(gCom,'fecha_registro','monto');
    const gOtA   = acumFecha(gOtr,'fecha_registro','monto');

    // === "Resumen Tesorería" ===
    wsResumen.columns = [{width:25},...Array(12).fill({width:12}),{width:14}];
    // Header Ingresos
    wsResumen.addRow([`INGRESOS ${anioBase}-${anioBase+1}`,...meses,'ANUAL'])
      .eachCell(c=>c.style = styleHeader);
    let r=2;
    // Por sindicato
    sindicatos.forEach(s=>{
      const vals = meses.map((_,i)=>(ingM[s]?.[i]||0)+(ingP[s]?.[i]||0));
      const row = wsResumen.addRow([s,...vals,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    // Total sindicato
    wsResumen.addRow([
      'INGRESO SINDICATOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N2:N${r-1})`}
    ]).eachCell(c=>c.style=styleSub);
    r++;
    // Otros ingresos
    Object.entries(otros).forEach(([t,arr])=>{
      const row = wsResumen.addRow([t,...arr,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    // Aporte directores
    wsResumen.addRow(['APORTE DIRECTORES',...aporte,{formula:`SUM(B${r}:M${r})`}])
      .eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
    r++;
    // TOTAL INGRESOS
    wsResumen.addRow([
      'TOTAL INGRESOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N2:N${r-1})`}
    ]).eachCell(c=>c.style=styleTot);
    r+=2;
    // Header Gastos
    wsResumen.addRow([`GASTOS ${anioBase}-${anioBase+1}`,...meses,'ANUAL'])
      .eachCell(c=>c.style=styleHeader);
    r++;
    // Gasto directores
    ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']
      .forEach(_=>{
        const row = wsResumen.addRow([_.toUpperCase(),...gDirA,{formula:`SUM(B${r}:M${r})`}]);
        row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
        r++;
      });
    // Plenarias, gestión, comisiones
    [['GASTO PLENARIAS',gPlA],['GASTO GESTION',gGeA],['GASTO COMISIONES',gCoA]]
      .forEach(([t,a])=>{
        const row = wsResumen.addRow([t,...a,{formula:`SUM(B${r}:M${r})`}]);
        row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
        r++;
      });
    // Otros gastos
    Object.entries(gOtA).forEach(([d,a])=>{
      const row = wsResumen.addRow([d.toUpperCase(),...a,{formula:`SUM(B${r}:M${r})`}]);
      row.eachCell((c,ci)=>{ if(ci>1) c.style=styleMoney; });
      r++;
    });
    // Total gastos
    wsResumen.addRow([
      'TOTAL GASTOS',
      ...meses.map((_,i)=>({formula:`SUM(${String.fromCharCode(66+i)}${r-7}:${String.fromCharCode(66+i)}${r-1})`})),
      {formula:`SUM(N${r-7}:N${r-1})`}
    ]).eachCell(c=>c.style=styleSub);
    r++;
    // Ahorro/Déficit
    wsResumen.addRow([
      'AHORRO O DÉFICIT',
      ...meses.map((_,i)=>({formula:`${String.fromCharCode(66+i)}${r-1}-${String.fromCharCode(66+i)}${r-2}`})),
      {formula:`N${r-1}-N${r-2}`}
    ]).eachCell(c=>c.style=styleTot);

    // === "Plan Ingresos y Gastos" ===
    wsPlan.columns = [
      {width:20},{width:10},{width:10},
      {width:12},{width:14},{width:12},{width:12}
    ];
    // Ingresos
    wsPlan.addRow(['PLAN INGRESOS']).mergeCells('A1:G1').getCell(1).style = styleHeader;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.'])
      .eachCell(c=>c.style=styleHeader);
    let p=3;
    [
      {t:'cuota_sindicato',e:ingMen.length,pt:730,v:ingMen[0]?.cuota||0},
      {t:'plenarias',e:ingPlen.length,pt:25,v:ingPlen[0]?.cuota||0},
      {t:'aporte_director',e:aporteDir.length,pt:25,v:aporteDir[0]?.monto||0},
      {t:'otros',e:0,pt:0,v:0}
    ].forEach(x=>{
      const rrow = wsPlan.addRow([
        x.t,x.e,x.pt,x.v,
        {formula:`B${p}*C${p}*D${p}`},null,
        {formula:`IF(E${p}=0,0,F${p}/E${p})`}
      ]);
      rrow.eachCell((c,ci)=>{ if(ci>=2) c.style=styleMoney; });
      p++;
    });
    wsPlan.addRow([
      'Total',null,null,null,
      {formula:`SUM(E3:E${p-1})`},
      {formula:`SUM(F3:F${p-1})`},
      {formula:`IF(E${p}=0,0,F${p}/E${p})`}
    ]).eachCell(c=>c.style=styleTot);
    p+=2;
    // Gastos
    wsPlan.addRow(['PLAN GASTOS']).mergeCells(`A${p}:G${p}`).getCell(1).style = styleHeader;
    p++;
    wsPlan.addRow(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.'])
      .eachCell(c=>c.style=styleHeader);
    p++;
    [
      {t:'remuneracion_directores',e:gDir.length,pt:5,v:50000},
      {t:'viaticos',e:8,pt:5,v:20000},
      {t:'plenarias',e:gPlen.length,pt:25,v:15000},
      {t:'gestion',e:1,pt:1,v:300000},
      {t:'comisiones',e:gCom.length,pt:3,v:10000}
    ].forEach(x=>{
      const rrow = wsPlan.addRow([
        x.t,x.e,x.pt,x.v,
        {formula:`B${p}*C${p}*D${p}`},null,
        {formula:`IF(E${p}=0,0,F${p}/E${p})`}
      ]);
      rrow.eachCell((c,ci)=>{ if(ci>=2) c.style=styleMoney; });
      p++;
    });
    wsPlan.addRow([
      'Total',null,null,null,
      {formula:`SUM(E${p-5}:E${p-1})`},
      {formula:`SUM(F${p-5}:F${p-1})`},
      {formula:`IF(E${p}=0,0,F${p}/E${p})`}
    ]).eachCell(c=>c.style=styleTot);

    // 7) Descargar
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf],{ type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Error generando informe: '+err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

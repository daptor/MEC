import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

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
    // 1) Defino meses y rango
    const meses = [
      'ABR','MAY','JUN','JUL','AGO','SEP',
      'OCT','NOV','DIC','ENE','FEB','MAR'
    ];
    const from = `${anioBase}-04-01`;
    const to   = `${anioBase+1}-03-31`;

    // 2) Traigo todos los datos de Supabase
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

    // 3) Helpers de acumulación
    const idxMes = nm => meses.indexOf(nm.toUpperCase());
    function acum(arr, key, mesF, montF) {
      const o = {};
      arr.forEach(it => {
        const k = it[key], i = idxMes(it[mesF]);
        if (i<0) return;
        if (!o[k]) o[k] = Array(12).fill(0);
        o[k][i] += Number(it[montF])||0;
      });
      return o;
    }
    function acumFecha(arr, dateF, montF) {
      const A = Array(12).fill(0);
      arr.forEach(it => {
        const d = new Date(it[dateF]);
        const i = (d.getMonth()+9)%12; // abril=0 → marzo=11
        A[i] += Number(it[montF])||0;
      });
      return A;
    }
    function acumDesc(arr, descF, dateF, montF) {
      const o = {};
      arr.forEach(it => {
        const desc = (it[descF]||'SIN DESCRIPCIÓN').toUpperCase();
        const d = new Date(it[dateF]);
        const i = (d.getMonth()+9)%12;
        if (i<0) return;
        if (!o[desc]) o[desc] = Array(12).fill(0);
        o[desc][i] += Number(it[montF])||0;
      });
      return o;
    }

    // 4) Acumulo todos los montos
    const ingM  = acum(ingMen, 'nombre_sindicato','mes_nombre','cuota');
    const ingP  = acum(ingPlen, 'nombre_sindicato','mes_nombre','cuota');
    const sindicatos = Array.from(
      new Set([...Object.keys(ingM),...Object.keys(ingP)])
    ).sort();
    const otros   = acum(otrosIng,'tipo_ingreso','mes','monto');
    const aporte  = acumFecha(aporteDir,'fecha','monto');
    const gDirA   = acumFecha(gDir,'fecha','monto');
    const gPlA    = acumFecha(gPlen,'fecha','costo_total');
    const gGeA    = acumFecha(gGest,'fecha','total');
    const gCoA    = acumFecha(gCom,'fecha_registro','monto');
    const gOtA    = acumDesc(gOtr,'descripcion','fecha_registro','monto');

    // 5) Construyo libros y hojas
    const wb = XLSX.utils.book_new();

    // — Resumen Tesorería —
    const s1 = [];
    s1.push([`INGRESOS ${anioBase}-${anioBase+1}`, ...meses, 'ANUAL']);
    sindicatos.forEach((s,i) => {
      const vals = meses.map((_,j)=>
        (ingM[s]?.[j]||0)+(ingP[s]?.[j]||0)
      );
      s1.push([s, ...vals, { f:`SUM(B${i+2}:M${i+2})` }]);
    });
    s1.push([
      'INGRESO SINDICATOS',
      ...meses.map((_,j)=>({ f:`SUM(${String.fromCharCode(66+j)}2:${String.fromCharCode(66+j)}${1+sindicatos.length})` })),
      {f:`SUM(N2:N${1+sindicatos.length})`}
    ]);
    let r = 2 + sindicatos.length + 1;
    Object.entries(otros).forEach(([t,arr])=>{
      s1.push([t, ...arr, {f:`SUM(B${r}:M${r})`}]);
      r++;
    });
    s1.push(['APORTE DIRECTORES', ...aporte, {f:`SUM(B${r}:M${r})`}]); r++;
    s1.push([
      'TOTAL INGRESOS',
      ...meses.map((_,j)=>({ f:`SUM(${String.fromCharCode(66+j)}2:${String.fromCharCode(66+j)}${r-1})` })),
      {f:`SUM(N2:N${r-1})`}
    ]);
    r+=2;
    s1.push([`GASTOS ${anioBase}-${anioBase+1}`, ...meses, 'ANUAL']);
    ['remuneracion','pasajes','colacion','metro','taxi_colectivo','hotel','reembolso']
      .forEach(_=>{
        s1.push([_.toUpperCase(), ...gDirA, {f:`SUM(B${r}:M${r})`}]);
        r++;
      });
    [['GASTO PLENARIAS',gPlA],['GASTO GESTION',gGeA],['GASTO COMISIONES',gCoA]]
      .forEach(([t,a])=>{
        s1.push([t, ...a, {f:`SUM(B${r}:M${r})`}]);
        r++;
      });
    Object.entries(gOtA).forEach(([d,arr])=>{
      s1.push([d, ...arr, {f:`SUM(B${r}:M${r})`}]);
      r++;
    });
    s1.push([
      'TOTAL GASTOS',
      ...meses.map((_,j)=>({ f:`SUM(${String.fromCharCode(66+j)}${r-Object.keys(gOtA).length-4}:${String.fromCharCode(66+j)}${r-1})` })),
      {f:`SUM(N${r-Object.keys(gOtA).length-4}:N${r-1})`}
    ]);
    r++;
    s1.push([
      'AHORRO O DÉFICIT',
      ...meses.map((_,j)=>({ f:`${String.fromCharCode(66+j)}${r-1}-${String.fromCharCode(66+j)}${r-2}` })),
      {f:`N${r-1}-N${r-2}`}
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Tesorería');

    // — Plan Ingresos y Gastos —
    const s2 = [];
    s2.push(['PLAN INGRESOS','','','','','','']);
    s2.push(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.']);
    s2.push([
      'cuota_sindicato', ingMen.length, 730,
      ingMen[0]?.cuota||0, {f:'B3*C3*D3'}, '', {f:'IF(E3=0,0,F3/E3)'}
    ]);
    s2.push([
      'plenarias', ingPlen.length, 25,
      ingPlen[0]?.cuota||0, {f:'B4*C4*D4'}, '', {f:'IF(E4=0,0,F4/E4)'}
    ]);
    s2.push([
      'aporte_director', aporteDir.length, 25,
      aporteDir[0]?.monto||0, {f:'B5*C5*D5'}, '', {f:'IF(E5=0,0,F5/E5)'}
    ]);
    s2.push(['otros',0,0,0,{f:'B6*C6*D6'},'',{f:'IF(E6=0,0,F6/E6)'}]);
    s2.push(['Total','','','',{f:'SUM(E3:E6)'},{f:'SUM(F3:F6)'},{f:'IF(E7=0,0,F7/E7)'}]);
    s2.push([]);
    s2.push(['PLAN GASTOS','','','','','','']);
    s2.push(['tipo','eventos','participantes','valor','total_anual','Actual','% Cumpl.']);
    s2.push(['remuneracion_directores', gDir.length,5,50000,{f:'B10*C10*D10'},'',{f:'IF(E10=0,0,F10/E10)'}]);
    s2.push(['viaticos',8,5,20000,{f:'B11*C11*D11'},'',{f:'IF(E11=0,0,F11/E11)'}]);
    s2.push(['plenarias', gPlen.length,25,15000,{f:'B12*C12*D12'},'',{f:'IF(E12=0,0,F12/E12)'}]);
    s2.push(['gestion',1,1,300000,{f:'B13*C13*D13'},'',{f:'IF(E13=0,0,F13/E13)'}]);
    s2.push(['comisiones', gCom.length,3,10000,{f:'B14*C14*D14'},'',{f:'IF(E14=0,0,F14/E14)'}]);
    s2.push(['Total','','','',{f:'SUM(E10:E14)'},{f:'SUM(F10:F14)'},{f:'IF(E15=0,0,F15/E15)'}]);

    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    XLSX.utils.book_append_sheet(wb, ws2, 'Plan Ingresos y Gastos');

    // 6) Descarga
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase+1}.xlsx`);

  } catch (e) {
    alert('Error generando informe: '+e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnAbrir = document.getElementById('btnResultadoGastos');
  if (btnAbrir) {
    btnAbrir.addEventListener('click', () => mostrarPantalla('pantalla-resultados-gastos'));
  }

  const btnCargar = document.getElementById('btnCargarResultadoGastos');
  if (btnCargar) {
    btnCargar.addEventListener('click', cargarResultadoGastos);
  }

  const btnVolver = document.getElementById('btnVolverResultadoGastos');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => mostrarPantalla('pantalla-menu-tesoreria'));
  }
});

async function cargarResultadoGastos() {
  const inputAnio = document.getElementById('resultado-gastos-anio');
  const tbody = document.getElementById('tabla-resultado-gastos');
  const btn = document.getElementById('btnCargarResultadoGastos');
  const anio = parseInt(inputAnio.value, 10);
  if (isNaN(anio) || anio < 2000) return alert('Ingresa un año válido.');
  if (btn) { btn.disabled = true; btn.textContent = 'Cargando...'; }
  if (tbody) tbody.innerHTML = '';
  const inicio = `${anio}-01-01`, fin = `${anio}-12-31`;

  try {
    let resultados = [];

    // 1. Remuneración Directores
    let presupuestoRem = 0, gastoRealRem = 0;
    {
      const { data: plan, error: errPlan } = await supabase.from('plan_gastos_remuneracion').select('total_anual').eq('periodo', String(anio));
      if (errPlan) throw errPlan;
      presupuestoRem = plan.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      const { data: real, error: errReal } = await supabase.from('gasto_real_directores')
        .select('remuneracion, pasajes, colacion, metro, taxi_colectivo, hotel, reembolso, fecha')
        .gte('fecha', inicio).lte('fecha', fin);
      if (errReal) throw errReal;
      real.forEach(r => {
        gastoRealRem += Number(r.remuneracion || 0) + Number(r.pasajes || 0) + Number(r.colacion || 0) +
                        Number(r.metro || 0) + Number(r.taxi_colectivo || 0) + Number(r.hotel || 0) + Number(r.reembolso || 0);
      });
    }
    resultados.push({
      categoria: 'Remuneración Directores',
      presupuesto: presupuestoRem,
      gastoReal: gastoRealRem,
      porcentaje: presupuestoRem > 0 ? ((gastoRealRem / presupuestoRem) * 100).toFixed(1) + '%' : 'N/A'
    });

    // 2. Plenarias
    let presupuestoPlen = 0, gastoRealPlen = 0;
    {
      const { data: plan, error: errPlan } = await supabase.from('plan_gastos_plenarias').select('total_anual').eq('periodo', String(anio));
      if (errPlan) throw errPlan;
      presupuestoPlen = plan.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      const { data: real, error: errReal } = await supabase.from('gasto_real_plenarias')
        .select('costo_total, fecha').gte('fecha', inicio).lte('fecha', fin);
      if (errReal) throw errReal;
      real.forEach(r => { gastoRealPlen += Number(r.costo_total || 0); });
    }
    resultados.push({
      categoria: 'Plenarias',
      presupuesto: presupuestoPlen,
      gastoReal: gastoRealPlen,
      porcentaje: presupuestoPlen > 0 ? ((gastoRealPlen / presupuestoPlen) * 100).toFixed(1) + '%' : 'N/A'
    });

    // 3. Gastos Gestión
    let presupuestoOp = 0, gastoRealOp = 0;
    {
      const { data: plan, error: errPlan } = await supabase.from('plan_gastos_operacional').select('total_anual').eq('periodo', String(anio));
      if (!errPlan && plan) presupuestoOp = plan.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      const { data: real, error: errReal } = await supabase.from('gasto_real_operacional')
        .select('total, fecha_registro').gte('fecha_registro', inicio).lte('fecha_registro', fin);
      if (!errReal && real) gastoRealOp = real.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
    }
    resultados.push({
      categoria: 'Gastos Gestión',
      presupuesto: presupuestoOp,
      gastoReal: gastoRealOp,
      porcentaje: presupuestoOp > 0 ? ((gastoRealOp / presupuestoOp) * 100).toFixed(1) + '%' : 'N/A'
    });

    // 4. Comisiones
    let presupuestoCom = 0, gastoRealCom = 0;
    {
      const { data: plan, error: errPlan } = await supabase.from('plan_gastos_comisiones').select('total_anual').eq('periodo', String(anio));
      if (!errPlan && plan) presupuestoCom = plan.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      const { data: real, error: errReal } = await supabase.from('gasto_real_comisiones')
        .select('monto, fecha_registro').gte('fecha_registro', inicio).lte('fecha_registro', fin);
      if (!errReal && real) gastoRealCom = real.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    }
    resultados.push({
      categoria: 'Comisiones',
      presupuesto: presupuestoCom,
      gastoReal: gastoRealCom,
      porcentaje: presupuestoCom > 0 ? ((gastoRealCom / presupuestoCom) * 100).toFixed(1) + '%' : 'N/A'
    });

    // 5. Otros Gastos
    let presupuestoOtros = 0, gastoRealOtros = 0;
    {
      const { data: real, error: errReal } = await supabase.from('gasto_real_otros')
        .select('monto, fecha_registro').gte('fecha_registro', inicio).lte('fecha_registro', fin);
      if (!errReal && real) gastoRealOtros = real.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
    }
    resultados.push({
      categoria: 'Otros Gastos',
      presupuesto: presupuestoOtros,
      gastoReal: gastoRealOtros,
      porcentaje: presupuestoOtros > 0 ? ((gastoRealOtros / presupuestoOtros) * 100).toFixed(1) + '%' : 'N/A'
    });

    resultados.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.categoria}</td>
        <td>${item.presupuesto ? '$' + item.presupuesto.toLocaleString() : '$0'}</td>
        <td>$${item.gastoReal.toLocaleString()}</td>
        <td>${item.porcentaje}</td>`;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error al cargar Resultado de Gastos:', error);
    alert('Ocurrió un error al obtener los datos.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Actualizar Resultado'; }
  }
}

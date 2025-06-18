// resultado_gasto.js
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
  // Listener para abrir la pantalla Resultado de Gastos
  const btnAbrir = document.getElementById('btnResultadoGastos');
  if (btnAbrir) {
    btnAbrir.addEventListener('click', () => mostrarPantalla('pantalla-resultados-gastos'));
  }

  // Listener para “Actualizar Resultado”
  const btnCargar = document.getElementById('btnCargarResultadoGastos');
  if (btnCargar) {
    btnCargar.addEventListener('click', cargarResultadoGastos);
  }

  // Listener para volver al menú Tesorería
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
  if (isNaN(anio) || anio < 2000) {
    alert('Ingresa un año válido.');
    return;
  }
  // Deshabilitar botón y mostrar estado de carga
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cargando...';
  }
  if (tbody) tbody.innerHTML = '';

  const inicio = `${anio}-01-01`;
  const fin = `${anio}-12-31`;

  try {
    // 1. Remuneración Directores
    let presupuestoRem = 0, gastoRealRem = 0;
    {
      // Plan Remuneración Directores
      const { data: planRows, error: errPlan } = await supabase
        .from('plan_gastos_remuneracion')
        .select('total_anual')
        .eq('periodo', String(anio));
      if (errPlan) throw errPlan;
      presupuestoRem = planRows.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      // Gasto Real Directores: consulta solo columnas existentes sin alias mal formados
      // Asegúrate de usar nombres reales: ej. si la columna de colación se llama 'gasto_colacion'
      const { data: realRows, error: errReal } = await supabase
        .from('gasto_real_directores')
        // Lista los nombres reales de columna; quita cualquier alias AS. Ej:
        .select('remuneracion, pasajes, gasto_colacion, metro, taxi_colectivo, hotel, reembolso, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (errReal) throw errReal;
      realRows.forEach(row => {
        gastoRealRem += Number(row.remuneracion || 0)
                     + Number(row.pasajes || 0)
                     + Number(row.gasto_colacion || 0)
                     + Number(row.metro || 0)
                     + Number(row.taxi_colectivo || 0)
                     + Number(row.hotel || 0)
                     + Number(row.reembolso || 0);
      });
    }
    const pctRem = presupuestoRem > 0
      ? ((gastoRealRem / presupuestoRem) * 100).toFixed(1) + '%'
      : 'N/A';

    // 2. Viáticos Directores (opcional; si existen tablas)
    let presupuestoVia = 0, gastoRealVia = 0;
    /* Si tienes tabla plan_gastos_viaticos y gasto_real_viaticos, descomenta y ajusta nombres de columnas:
    {
      const { data: planViaRows, error: errPlanVia } = await supabase
        .from('plan_gastos_viaticos')
        .select('total_anual')
        .eq('periodo', String(anio));
      if (!errPlanVia && planViaRows) {
        presupuestoVia = planViaRows.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);
      }
      const { data: realViaRows, error: errRealVia } = await supabase
        .from('gasto_real_viaticos')
        .select('transporte, hospedaje, alimentacion, otros, fecha_registro')
        .gte('fecha_registro', inicio)
        .lte('fecha_registro', fin);
      if (!errRealVia && realViaRows) {
        realViaRows.forEach(r => {
          gastoRealVia += Number(r.transporte || 0)
                       + Number(r.hospedaje || 0)
                       + Number(r.alimentacion || 0)
                       + Number(r.otros || 0);
        });
      }
    }
    */
    const pctVia = presupuestoVia > 0
      ? ((gastoRealVia / presupuestoVia) * 100).toFixed(1) + '%'
      : 'N/A';

    // 3. Plenarias (usamos costo_total)
    let presupuestoPlen = 0, gastoRealPlen = 0;
    {
      // Plan Plenarias: total_anual ya incluye Recinto, Colación y Propina fija 15000×eventos
      const { data: planPlenRows, error: errPlanPlen } = await supabase
        .from('plan_gastos_plenarias')
        .select('total_anual')
        .eq('periodo', String(anio));
      if (errPlanPlen) throw errPlanPlen;
      presupuestoPlen = planPlenRows.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);

      // Gasto Real Plenarias: sumamos costo_total de cada registro
      const { data: realPlenRows, error: errRealPlen } = await supabase
        .from('gasto_real_plenarias')
        // Selecciona solo 'costo_total' y 'fecha'
        .select('costo_total, fecha')
        .gte('fecha', inicio)
        .lte('fecha', fin);
      if (errRealPlen) throw errRealPlen;
      realPlenRows.forEach(row => {
        gastoRealPlen += Number(row.costo_total || 0);
      });
    }
    const pctPlen = presupuestoPlen > 0
      ? ((gastoRealPlen / presupuestoPlen) * 100).toFixed(1) + '%'
      : 'N/A';

    // 4. Gastos de Gestión (Operacional)
    let presupuestoOp = 0, gastoRealOp = 0;
    {
      const { data: planOpRows, error: errPlanOp } = await supabase
        .from('plan_gastos_operacional')
        .select('total_anual')
        .eq('periodo', String(anio));
      if (!errPlanOp && planOpRows) {
        presupuestoOp = planOpRows.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);
      }
      const { data: realOpRows, error: errRealOp } = await supabase
        .from('gasto_real_operacional')
        .select('total, fecha_registro')
        .gte('fecha_registro', inicio)
        .lte('fecha_registro', fin);
      if (!errRealOp && realOpRows) {
        gastoRealOp = realOpRows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
      }
    }
    const pctOp = presupuestoOp > 0
      ? ((gastoRealOp / presupuestoOp) * 100).toFixed(1) + '%'
      : 'N/A';

    // 5. Comisiones
    let presupuestoCom = 0, gastoRealCom = 0;
    {
      const { data: planComRows, error: errPlanCom } = await supabase
        .from('plan_gastos_comisiones')
        .select('total_anual')
        .eq('periodo', String(anio));
      if (!errPlanCom && planComRows) {
        presupuestoCom = planComRows.reduce((sum, r) => sum + (Number(r.total_anual) || 0), 0);
      }
      const { data: realComRows, error: errRealCom } = await supabase
        .from('gasto_real_comisiones')
        .select('monto, fecha_registro')
        .gte('fecha_registro', inicio)
        .lte('fecha_registro', fin);
      if (!errRealCom && realComRows) {
        gastoRealCom = realComRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
      }
    }
    const pctCom = presupuestoCom > 0
      ? ((gastoRealCom / presupuestoCom) * 100).toFixed(1) + '%'
      : 'N/A';

    // 6. Otros Gastos (no hay plan; presupuesto = 0)
    let presupuestoOtros = 0;
    let gastoRealOtros = 0;
    {
      const { data: realOtrosRows, error: errRealOtros } = await supabase
        .from('gasto_real_otros')
        .select('monto, fecha_registro')
        .gte('fecha_registro', inicio)
        .lte('fecha_registro', fin);
      if (!errRealOtros && realOtrosRows) {
        gastoRealOtros = realOtrosRows.reduce((sum, r) => sum + (Number(r.monto) || 0), 0);
      }
    }
    const pctOtros = presupuestoOtros > 0
      ? ((gastoRealOtros / presupuestoOtros) * 100).toFixed(1) + '%'
      : 'N/A';

    // Construir resultados
    const resultados = [];
    resultados.push({ categoria: 'Remuneración Directores', presupuesto: presupuestoRem, gastoReal: gastoRealRem, porcentaje: pctRem });
    // Si usas viáticos separados, descomenta:
    // resultados.push({ categoria: 'Viáticos Directores', presupuesto: presupuestoVia, gastoReal: gastoRealVia, porcentaje: pctVia });
    resultados.push({ categoria: 'Plenarias', presupuesto: presupuestoPlen, gastoReal: gastoRealPlen, porcentaje: pctPlen });
    resultados.push({ categoria: 'Gastos Gestión', presupuesto: presupuestoOp, gastoReal: gastoRealOp, porcentaje: pctOp });
    resultados.push({ categoria: 'Comisiones', presupuesto: presupuestoCom, gastoReal: gastoRealCom, porcentaje: pctCom });
    resultados.push({ categoria: 'Otros Gastos', presupuesto: presupuestoOtros, gastoReal: gastoRealOtros, porcentaje: pctOtros });

    // Renderizar en la tabla
    resultados.forEach(item => {
      const tr = document.createElement('tr');
      const tdCat = document.createElement('td');
      tdCat.textContent = item.categoria;
      const tdPres = document.createElement('td');
      tdPres.textContent = (item.presupuesto != null && item.presupuesto > 0)
        ? `$${item.presupuesto.toLocaleString()}`
        : (item.presupuesto === 0 ? '$0' : '-');
      const tdGasto = document.createElement('td');
      tdGasto.textContent = `$${item.gastoReal.toLocaleString()}`;
      const tdPct = document.createElement('td');
      tdPct.textContent = item.porcentaje;
      tr.append(tdCat, tdPres, tdGasto, tdPct);
      if (tbody) tbody.appendChild(tr);
    });

  } catch (error) {
    console.error('Error al cargar Resultado de Gastos:', error);
    alert('Ocurrió un error al obtener los datos de Gastos.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Actualizar Resultado';
    }
  }
}

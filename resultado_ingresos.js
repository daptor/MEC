async function cargarResultadoIngresos() {
  const anio = parseInt(document.getElementById('resultado-anio').value, 10);
  if (!anio) {
    alert('Por favor ingresa un año válido.');
    return;
  }

  // Obtener datos del plan de ingresos (proyecciones) filtrando por "año"
  const { data: plan, error: errorPlan } = await supabase
    .from('plan_ingresos')
    .select('*')
    .eq('año', anio);

  if (errorPlan) {
    console.error('Error al cargar proyecciones:', errorPlan);
    return;
  }

  // Si no hay plan para ese año, dejar todo en 0
  const proyeccion = plan?.[0] || {};

  // Variables para acumular ingresos reales
  const acumulado = {
    cuota: 0,
    plenarias: 0,
    aporte: 0,
    otros: 0
  };

  // Ingresos reales cuota
  const { data: ingresosCuota, error: errorCuota } = await supabase
    .from('ingresos_mensuales')
    .select('cuota')
    .eq('año', anio);

  if (!errorCuota && ingresosCuota) {
    acumulado.cuota = ingresosCuota.reduce((sum, item) => sum + Number(item.cuota || 0), 0);
  }

  // Ingresos reales plenarias
  const { data: ingresosPlenarias, error: errorPlenarias } = await supabase
    .from('ingreso_plenarias')
    .select('cuota')
    .eq('año', anio);

  if (!errorPlenarias && ingresosPlenarias) {
    acumulado.plenarias = ingresosPlenarias.reduce((sum, item) => sum + Number(item.cuota || 0), 0);
  }

  // Ingresos reales aporte (campo correcto: "anio")
  const { data: ingresosAporte, error: errorAporte } = await supabase
    .from('aporte_director')
    .select('monto')
    .eq('anio', anio);

  if (!errorAporte && ingresosAporte) {
    acumulado.aporte = ingresosAporte.reduce((sum, item) => sum + Number(item.monto || 0), 0);
  }

  // Ingresos reales otros
  const { data: ingresosOtros, error: errorOtros } = await supabase
    .from('otros_ingresos')
    .select('monto')
    .eq('anio', anio);

  if (!errorOtros && ingresosOtros) {
    acumulado.otros = ingresosOtros.reduce((sum, item) => sum + Number(item.monto || 0), 0);
  }

  // Construir tabla resultado
  const tbody = document.getElementById('tabla-resultado-ingresos');
  tbody.innerHTML = '';

  const categorias = [
    { nombre: 'Cuota Sindicato Federado', clave: 'cuota_sindicato', acumuladoKey: 'cuota' },
    { nombre: 'Plenarias Federación', clave: 'plenarias', acumuladoKey: 'plenarias' },
    { nombre: 'Aporte Director', clave: 'aporte_director', acumuladoKey: 'aporte' },
    { nombre: 'Otros Ingresos', clave: 'otros', acumuladoKey: 'otros' },
  ];

  // Variables para totalizar
  let totalProyeccion = 0;
  let totalReal = 0;

  categorias.forEach(cat => {
    const valorProyeccion = Number(proyeccion[cat.clave]) || 0;
    const valorReal = acumulado[cat.acumuladoKey] || 0;

    totalProyeccion += valorProyeccion;
    totalReal += valorReal;

    const porcentajeNum = valorProyeccion > 0
      ? (valorReal / valorProyeccion) * 100
      : 0;

    const porcentaje = porcentajeNum.toFixed(1) + '%';

    let claseColor = '';
    if (porcentajeNum >= 90) claseColor = 'color-verde';
    else if (porcentajeNum >= 60) claseColor = 'color-amarillo';
    else claseColor = 'color-rojo';

    const fila = `
      <tr>
        <td>${cat.nombre}</td>
        <td>${valorProyeccion.toLocaleString()}</td>
        <td>${valorReal.toLocaleString()}</td>
        <td class="${claseColor}">${porcentaje}</td>
      </tr>
    `;
    tbody.innerHTML += fila;
  });

  // Fila total
  const porcentajeTotalNum = totalProyeccion > 0 ? (totalReal / totalProyeccion) * 100 : 0;
  const porcentajeTotal = porcentajeTotalNum.toFixed(1) + '%';

  let claseColorTotal = '';
  if (porcentajeTotalNum >= 90) claseColorTotal = 'color-verde';
  else if (porcentajeTotalNum >= 60) claseColorTotal = 'color-amarillo';
  else claseColorTotal = 'color-rojo';

  const filaTotal = `
    <tr style="font-weight: bold; background-color: #eee;">
      <td>Total</td>
      <td>${totalProyeccion.toLocaleString()}</td>
      <td>${totalReal.toLocaleString()}</td>
      <td class="${claseColorTotal}">${porcentajeTotal}</td>
    </tr>
  `;
  tbody.innerHTML += filaTotal;
}

// Listeners para botones
document.addEventListener('DOMContentLoaded', () => {
  const btnResultadoIngresos = document.getElementById('btnResultadoIngresos');
  if (btnResultadoIngresos) {
    btnResultadoIngresos.addEventListener('click', () => {
      mostrarPantalla('pantalla-resultado-ingresos');
    });
  }

  const btnCargar = document.getElementById('btnCargarResultado');
  if (btnCargar) {
    btnCargar.addEventListener('click', cargarResultadoIngresos);
  }

  const btnVolver = document.getElementById('btnVolverResultadoIngresos');
  if (btnVolver) {
    btnVolver.addEventListener('click', () => {
      mostrarPantalla('pantalla-menu-tesoreria');
    });
  }
});

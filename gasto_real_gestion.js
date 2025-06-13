import { supabase } from './supabaseClient.js';

const itemsGestion = [
  "celular_presidente", "material_oficina", "asesoria", "aniversario", "caja_chica",
  "pagina_web_teams", "representacion", "uniformes", "almuerzo_ejecutivo_6",
  "atencion_invitados", "capacitacion", "gastos_varios", "imprevistos"
];
const itemsNombres = [
  "CELULAR PDTE.", "MATERIAL OFICINA", "ASESORIA", "ANIVERSARIO", "CAJA CHICA",
  "PÁGINA WEB (TEAMS)", "REPRESENTACIÓN", "UNIFORMES", "ALMUERZO EJC. (6)",
  "ATENCIÓN INVITADOS", "CAPACITACIÓN", "GASTOS VARIOS", "IMPREVISTOS"
];

/* ——————————————————————————————————————————————————————————————————————————————————————— */
/* 1) Función que se llama CUANDO el usuario ingresa una fecha en el input #fecha-gestion */
function onFechaIngresada() {
  // Generamos el dropdown de “Mes Comercial”
  generarMesesComerciales();
  // Y, puesto que el usuario está iniciando UN NUEVO INGRESO, mostramos la tabla de ítems:
  mostrarTablaItems();
}

/* 2) Función que se llama CUANDO el usuario selecciona un mes en #mes-comercial
   (solo si está ingresando un gasto manualmente) */
function onMesSeleccionado() {
  const mes = document.getElementById('mes-comercial').value;
  if (mes) {
    // El usuario ya eligió mes luego de haber ingresado fecha → mantengo la tabla visible
    mostrarTablaItems();
  }
}

/* 3) Genera opciones del selector "mes-comercial" según la fecha ingresada. */
function generarMesesComerciales() {
  const fechaInput = document.getElementById('fecha-gestion').value;
  const selectMes = document.getElementById('mes-comercial');
  selectMes.innerHTML = '<option value="">Seleccione un mes</option>';
  if (!fechaInput) return;
  const fecha = new Date(fechaInput);
  let año = fecha.getFullYear();
  const meses = [
    'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE',
    'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE', 'ENERO', 'FEBRERO', 'MARZO'
  ];
  meses.forEach((mes, i) => {
    let mesAño = i < 9 ? `${mes} ${año}` : `${mes} ${año + 1}`;
    const opcion = document.createElement('option');
    opcion.value = mesAño;
    opcion.textContent = mesAño;
    selectMes.appendChild(opcion);
  });
}

/* 4) Genera la tabla de ítems (inputs) DENTRO de <tbody id="tbody-gasto-operacional"> */
function generarTablaItems() {
  const tbody = document.getElementById('tbody-gasto-operacional');
  tbody.innerHTML = '';
  for (let i = 0; i < itemsGestion.length; i++) {
    const tr = document.createElement('tr');

    const tdNombre = document.createElement('td');
    tdNombre.textContent = itemsNombres[i];
    tr.appendChild(tdNombre);

    const tdMonto = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.min = 0;
    input.step = '0.01';
    input.value = '';
    input.id = 'input-' + itemsGestion[i];
    input.dataset.item = itemsGestion[i];
    input.style.width = '100%';
    input.addEventListener('input', actualizarTotal);
    tdMonto.appendChild(input);

    tr.appendChild(tdMonto);
    tbody.appendChild(tr);
  }
  actualizarTotal();
}

/* 5) Suma todos los valores ingresados y actualiza el total */
function actualizarTotal() {
  let total = 0;
  for (let item of itemsGestion) {
    const val = parseFloat(document.getElementById('input-' + item).value);
    if (!isNaN(val)) total += val;
  }
  document.getElementById('total-gasto').value = total.toFixed(2);
}

/* 6) Mostrar la tabla de ítems (quita display:none de #contenedor-tabla-items) */
function mostrarTablaItems() {
  document.getElementById('contenedor-tabla-items').style.display = 'block';
}

/* 7) Ocultar la tabla de ítems (pone display:none en #contenedor-tabla-items) */
function ocultarTablaItems() {
  document.getElementById('contenedor-tabla-items').style.display = 'none';
}

/* 8) Limpia todo el formulario:
     - Resetea fecha-gestion y mes-comercial
     - Vacía los inputs numéricos
     - Oculta la mini-pantalla de “Registros guardados en este mes”
     - Oculta la tabla de ítems
     - Recarga la lista de meses en “selector-mes-guardado”
*/
async function limpiarFormularioGestion() {
  // 8.1) Limpiamos campo fecha + mes comercial
  document.getElementById('fecha-gestion').value = '';
  document.getElementById('mes-comercial').innerHTML = '<option value="">Seleccione un mes</option>';

  // 8.2) Vaciamos inputs de ítems y recalculamos total
  for (let item of itemsGestion) {
    const input = document.getElementById('input-' + item);
    if (input) input.value = '';
  }
  actualizarTotal();

  // 8.3) Recargamos meses guardados en Supabase (para el selector de meses)
  await cargarMesesGuardados();

  // 8.4) Ocultamos la mini-pantalla de “Registros guardados en este mes”
  document.getElementById('tabla-registros-mes').style.display = 'none';
  document.getElementById('tbody-registros-mes').innerHTML = '';

  // 8.5) Ocultamos la tabla de ítems porque ya no estamos ni ingresando ni consultando
  ocultarTablaItems();
}

/* 9) Guardar el registro actual en Supabase */
async function guardarGastoGestion() {
  const fecha = document.getElementById("fecha-gestion").value;
  const mes = document.getElementById("mes-comercial").value;
  if (!fecha || !mes) {
    alert("Por favor, completa la fecha y el mes comercial.");
    return;
  }

  const inputs = document.querySelectorAll('#tbody-gasto-operacional input[type="number"]');
  const data = {};
  inputs.forEach(input => {
    const key = input.dataset.item;
    let valor = input.value.trim();
    if (valor === '' || isNaN(valor)) {
      valor = 0;
    } else {
      valor = parseFloat(valor);
    }
    data[key] = valor;
  });

  const { error } = await supabase.from('gasto_real_gestion').insert([{
    fecha: fecha,
    mes_comercial: mes,
    ...data
  }]);

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("Gasto registrado correctamente.");
    await limpiarFormularioGestion();
  }
}

/* 10) Carga los MESES COMERCIALES que ya existen en la tabla y llena el selector #selector-mes-guardado#
      Además, asigna un onchange para detectar cuándo se elige un mes y disparar la carga de registros.
*/
async function cargarMesesGuardados() {
  const { data, error } = await supabase
    .from('gasto_real_gestion')
    .select('mes_comercial')
    .order('mes_comercial', { ascending: true });

  if (error) {
    console.error('Error cargando meses guardados:', error.message);
    return;
  }

  const selector = document.getElementById('selector-mes-guardado');
  selector.innerHTML = '<option value="">Seleccione un mes</option>';
  const mesesUnicos = [...new Set(data.map(d => d.mes_comercial))];
  mesesUnicos.forEach(mes => {
    const option = document.createElement('option');
    option.value = mes;
    option.textContent = mes;
    selector.appendChild(option);
  });

  // Cuando el usuario elige un “mes comercial”:
  selector.onchange = () => {
    const mesElegido = selector.value;

    // Siempre ocultamos la mini-pantalla de registros antes de recargar
    document.getElementById('tabla-registros-mes').style.display = 'none';
    document.getElementById('tbody-registros-mes').innerHTML = '';

    if (mesElegido) {
      cargarRegistrosDeMes(mesElegido);
    }
  };
}

/* 11) Consulta todos los registros de un MES dado y decide:
       - Si hay 1 solo, carga directamente ese registro
       - Si hay >1, muestra la mini-pantalla con la tabla de “Registros guardados en este mes”
*/
async function cargarRegistrosDeMes(mesSeleccionado) {
  // 11.1) Traemos fecha + todos los ítems para calcular totales
  const { data, error } = await supabase
    .from('gasto_real_gestion')
    .select('fecha, ' + itemsGestion.join(', '))
    .eq('mes_comercial', mesSeleccionado)
    .order('fecha', { ascending: true });

  if (error) {
    alert('Error al cargar registros de este mes: ' + error.message);
    return;
  }

  if (!data || data.length === 0) {
    // No hay registros en ese mes: no hacemos nada
    return;
  }

  if (data.length === 1) {
    // 11.2) Si solo hay UN registro, lo cargamos directamente
    const fila = data[0];
    cargarRegistroÚnico(mesSeleccionado, fila.fecha);
    return;
  }

  // 11.3) Si HAY MÁS DE UN registro en ese mes, renderizamos la mini-pantalla:
  const tbodyResumen = document.getElementById('tbody-registros-mes');
  tbodyResumen.innerHTML = '';

  data.forEach(row => {
    const tr = document.createElement('tr');

    // Columna Fecha (formateada)
    const tdFecha = document.createElement('td');
    const fechaObj = new Date(row.fecha);
    const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
    tdFecha.textContent = fechaObj.toLocaleDateString('es-ES', opciones);
    tr.appendChild(tdFecha);

    // Columna Total (sumamos todos los campos numéricos)
    const tdTotal = document.createElement('td');
    let suma = 0;
    for (let item of itemsGestion) {
      suma += row[item] || 0;
    }
    tdTotal.textContent = suma.toFixed(2);
    tr.appendChild(tdTotal);

    // Columna Acción (botón “Ver”)
    const tdAccion = document.createElement('td');
    const btnVer = document.createElement('button');
    btnVer.textContent = 'Ver';
    btnVer.onclick = () => {
      cargarRegistroÚnico(mesSeleccionado, row.fecha);
    };
    tdAccion.appendChild(btnVer);
    tr.appendChild(tdAccion);

    tbodyResumen.appendChild(tr);
  });

  // 11.4) Mostramos la mini-pantalla de registros
  document.getElementById('tabla-registros-mes').style.display = 'block';
}

/* 12) Carga un único registro (mes + fecha) y completa el formulario de ítems
       (¡LA TABLA PERMANECE VISIBLE para permitir ver otra fecha si hay varias!)*/
async function cargarRegistroÚnico(mes, fechaSeleccionada) {
  const { data, error } = await supabase
    .from('gasto_real_gestion')
    .select('*')
    .eq('mes_comercial', mes)
    .eq('fecha', fechaSeleccionada)
    .single();

  if (error || !data) {
    alert('No se encontró registro para esa fecha.');
    return;
  }

  // 12.1) Completo la parte superior: fecha + mes
  document.getElementById('fecha-gestion').value = data.fecha.split('T')[0];
  generarMesesComerciales();
  document.getElementById('mes-comercial').value = data.mes_comercial;

  // 12.2) Cargo cada ítem en su input numérico
  for (let item of itemsGestion) {
    document.getElementById('input-' + item).value = data[item] || 0;
  }
  actualizarTotal();

  // 12.3) MOSTRAMOS la tabla de ítems (en caso de que aún estuviera oculta)
  mostrarTablaItems();

  // — ¡NO OCULTAMOS la mini-pantalla de registros! Permite seguir presionando “Ver” en otra fecha.
}

/* 13) Volver al menú principal (sin cambios) */
function volverAlMenu() {
  document.getElementById('pantalla-rgasto-operacional').style.display = 'none';
  document.getElementById('pantalla-gastos').style.display = 'block';
}

/* 14) Inicialización al cargar la ventana: genera tabla de ítems en memoria y carga meses guardados */
window.onload = () => {
  generarTablaItems();
  cargarMesesGuardados();
};

// Exportamos funciones necesarias para llamados inline en el HTML
window.onFechaIngresada = onFechaIngresada;
window.onMesSeleccionado = onMesSeleccionado;
window.generarMesesComerciales = generarMesesComerciales;
window.limpiarFormularioGestion = limpiarFormularioGestion;
window.guardarGastoGestion = guardarGastoGestion;
window.actualizarTotal = actualizarTotal;
window.volverAlMenu = volverAlMenu;

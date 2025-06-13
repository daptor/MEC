import { supabase } from './supabaseClient.js';

let usuarioActual = null;

const selectorAcceso = document.getElementById('sindicatoTesoreria');
const selectorIngreso = document.getElementById('teso-sindicato');
const inputRut = document.getElementById('rutTesoreria');
const inputClave = document.getElementById('claveAdicional');
const contenedorClave = document.getElementById('claveAdicionalContainer');

const inputAnio = document.getElementById('teso-anio');
const selectorMes = document.getElementById('teso-mes');
const inputCuota = document.getElementById('teso-cuota');
const btnGuardarIngreso = document.getElementById('teso-guardar');

const mesesTexto = [
  'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre',
  'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo'
];

// Función para mostrar/ocultar pantallas
function mostrarPantalla(idPantalla) {
  const pantallas = document.querySelectorAll('.pantalla');
  pantallas.forEach(p => (p.style.display = 'none'));
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}

// Carga sindicatos activos en ambos selectores y agrega opciones para "Agregar" y "Eliminar"
async function cargarSindicatosEnSelectores() {
  try {
    const { data, error } = await supabase
      .from('sindicatos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    // Cargar sindicatos en ambos selectores, pero sin agregar opciones especiales en selectorAcceso
    [selectorAcceso, selectorIngreso].forEach(sel => {
      sel.innerHTML = '<option value="">Seleccione un sindicato</option>';
      data.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.nombre;
        sel.appendChild(option);
      });

      // Solo agregar opciones especiales en selectorIngreso
      if (sel === selectorIngreso) {
        const optAgregar = document.createElement('option');
        optAgregar.value = 'agregar';
        optAgregar.textContent = 'Agregar sindicato';
        sel.appendChild(optAgregar);

        const optEliminar = document.createElement('option');
        optEliminar.value = 'eliminar';
        optEliminar.textContent = 'Eliminar sindicato';
        sel.appendChild(optEliminar);
      }
    });

  } catch (err) {
    alert('Error cargando sindicatos: ' + err.message);
  }
}

async function manejarAgregarSindicato(event) {
  const sel = event.target;
  if (sel.value !== 'agregar') return;

  const nombreNuevo = prompt('Ingrese el nombre del nuevo sindicato:');
  if (!nombreNuevo || !nombreNuevo.trim()) {
    sel.value = '';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('sindicatos')
      .insert([{ nombre: nombreNuevo.trim(), activo: true }])
      .select()
      .single();

    if (error) throw error;

    alert(`Sindicato "${data.nombre}" agregado correctamente.`);
    await cargarSindicatosEnSelectores();
    sel.value = data.id;
  } catch (err) {
    alert('Error al agregar sindicato: ' + err.message);
    sel.value = '';
  }
}

async function manejarEliminarSindicato(event) {
  const sel = event.target;
  if (sel.value !== 'eliminar') return;

  const nombreEliminar = prompt('Ingrese el nombre EXACTO del sindicato a eliminar:');
  if (!nombreEliminar || !nombreEliminar.trim()) {
    sel.value = '';
    return;
  }

  try {
    const { data: sindicato, error } = await supabase
      .from('sindicatos')
      .select('id, nombre')
      .eq('nombre', nombreEliminar.trim())
      .eq('activo', true)
      .single();

    if (error || !sindicato) {
      alert('No se encontró el sindicato activo con ese nombre.');
      sel.value = '';
      return;
    }

    const confirmar = confirm(`¿Está seguro que desea eliminar el sindicato "${sindicato.nombre}"?`);
    if (!confirmar) {
      sel.value = '';
      return;
    }

    const { error: errorActualizar } = await supabase
      .from('sindicatos')
      .update({ activo: false })
      .eq('id', sindicato.id);

    if (errorActualizar) throw errorActualizar;

    alert(`Sindicato "${sindicato.nombre}" eliminado correctamente.`);
    await cargarSindicatosEnSelectores();
    sel.value = '';
  } catch (err) {
    alert('Error eliminando sindicato: ' + err.message);
    sel.value = '';
  }
}

window.validarAccesoTesoreria = async function () {
  const rut = inputRut.value.trim();
  const sindicatoId = selectorAcceso.value;
  const claveIngresada = inputClave.value.trim();

  if (!rut || !sindicatoId) {
    alert('Por favor ingrese su RUT y seleccione un sindicato.');
    return;
  }

  try {
    const { data: socio, error } = await supabase
      .from('socios')
      .select('*')
      .eq('rut', rut)
      .eq('sindicato_id', sindicatoId)
      .eq('estado', 'activo')
      .single();

    if (error || !socio) {
      alert('No se encontró el RUT asociado al sindicato seleccionado.');
      return;
    }

    usuarioActual = socio;
    const userRol = (socio.rol || socio.ROL || '').toLowerCase();

    if (userRol === 'socio') {
      contenedorClave.style.display = 'none';
      mostrarPantallaTesoreria();
      return;
    }

    if (userRol === 'tesorero' || userRol.startsWith('director')) {
      contenedorClave.style.display = 'block';
      // Ya no mostramos alerta si la clave está vacía, solo retornamos para esperar ingreso
      if (!claveIngresada) {
        return;
      }

      const res = await fetch('/api/keys', { method: 'GET' });
      if (!res.ok) {
        alert('Error al obtener las claves del sistema.');
        return;
      }
      const claves = await res.json();

      let claveSistema = null;
      if (userRol === 'tesorero') {
        claveSistema = claves.ADMIN_KEY;
      } else if (userRol.startsWith('director')) {
        const numDir = userRol.split('_')[1] || '';
        claveSistema = claves[`DIRECTOR_${numDir}`];
      }

      if (claveIngresada !== claveSistema) {
        alert('Clave adicional incorrecta para su rol.');
        return;
      }

      mostrarPantallaTesoreria();
      return;
    }

    alert('No tiene permisos para acceder a Tesorería.');
  } catch (err) {
    alert('Error validando acceso: ' + err.message);
  }
};

function mostrarPantallaTesoreria() {
  mostrarPantalla('pantalla-menu-tesoreria');
}

document.getElementById('btn-salir-tesoreria')?.addEventListener('click', () => {
  usuarioActual = null;
  inputClave.value = '';
  mostrarPantalla('menu-principal');
  resetFormularioAcceso();
});

function resetFormularioAcceso() {
  inputRut.value = '';
  selectorAcceso.selectedIndex = 0;
  inputClave.value = '';
  contenedorClave.style.display = 'none';
}

function cargarMeses() {
  selectorMes.innerHTML = '<option value="">-- Elige un mes --</option>';
  mesesTexto.forEach(mes => {
    const option = document.createElement('option');
    option.value = mes;
    option.textContent = mes;
    selectorMes.appendChild(option);
  });
}

async function guardarIngresoTesoreria() {
  const sindicatoId = selectorIngreso.value;
  const año = parseInt(inputAnio.value, 10);
  const mesNombre = selectorMes.value;
  const cuota = parseFloat(inputCuota.value);

  if (!sindicatoId) {
    alert('Selecciona un sindicato.');
    return;
  }
  if (!mesNombre) {
    alert('Selecciona un mes.');
    return;
  }
  if (isNaN(año) || año < 2000) {
    alert('Ingresa un año válido.');
    return;
  }
  if (isNaN(cuota) || cuota < 0) {
    alert('Ingresa un valor de cuota válido.');
    return;
  }

  try {
    const { data: sindicatoData, error: errorSind } = await supabase
      .from('sindicatos')
      .select('nombre')
      .eq('id', sindicatoId)
      .single();

    if (errorSind || !sindicatoData) {
      alert('Error al obtener nombre del sindicato.');
      return;
    }

    const { error } = await supabase
      .from('ingresos_mensuales')
      .insert([{
        sindicato_id: sindicatoId,
        nombre_sindicato: sindicatoData.nombre,
        año,
        mes_nombre: mesNombre,
        cuota
      }]);

    if (error) {
      alert('Error guardando ingreso: ' + error.message);
    } else {
      alert('Ingreso guardado correctamente.');
      inputCuota.value = '';
      selectorIngreso.selectedIndex = 0;
      selectorMes.selectedIndex = 0;
      inputAnio.value = '';
    }
  } catch (err) {
    alert('Error guardando ingreso: ' + err.message);
  }
}

selectorAcceso.addEventListener('change', (e) => {
  manejarAgregarSindicato(e);
  manejarEliminarSindicato(e);
});
selectorIngreso.addEventListener('change', (e) => {
  manejarAgregarSindicato(e);
  manejarEliminarSindicato(e);
});

btnGuardarIngreso.addEventListener('click', guardarIngresoTesoreria);

// ESTE BOTÓN ES CLAVE: Aquí debe llamarse a validarAccesoTesoreria()
document.getElementById('btn-ingresar')?.addEventListener('click', () => {
  mostrarPantalla('pantallaAccesoTesoreria'); // Mostrar pantalla de acceso
  resetFormularioAcceso(); // Limpiar campos y ocultar clave adicional
});

const btnTesoVolver = document.getElementById('teso-volver');
if (btnTesoVolver) {
  btnTesoVolver.addEventListener('click', () => {
    mostrarPantalla('pantalla-tesoreria');
  });
}

// Inicialización
window.addEventListener('load', () => {
  cargarSindicatosEnSelectores();
  cargarMeses();
  resetFormularioAcceso();
  contenedorClave.style.display = 'none';
});

// **************** plenarias *************

// Elementos del DOM
const selectorPlenariaSindicato = document.getElementById('plenaria-sindicato');
const selectorPlenariaMes       = document.getElementById('plenaria-mes');
const inputPlenariaAnio         = document.getElementById('plenaria-anio');
const checkboxPresidente        = document.getElementById('dir-presidente');
const checkboxSecretario        = document.getElementById('dir-secretario');
const checkboxTesorero          = document.getElementById('dir-tesorero');
const spanTotalPlenaria         = document.getElementById('plenaria-total');

const btnCuotaSindicato     = document.getElementById('btn-cuota-sindicato');
const btnPlenariasFederacion = document.getElementById('btn-plenarias-federacion');

// Valores por director y propina
const valorPorDirector  = 20000;
const propinaPorDirector = 1000;

// Carga sindicatos activos desde Supabase y llena el select
async function cargarSindicatosPlenaria() {
  try {
    const { data, error } = await supabase
      .from('sindicatos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) throw error;

    selectorPlenariaSindicato.innerHTML = '<option value="">Seleccione un sindicato</option>';
    data.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nombre;
      selectorPlenariaSindicato.appendChild(opt);
    });
  } catch (err) {
    alert('Error cargando sindicatos: ' + err.message);
  }
}

// Carga meses en el select de mes con valores numéricos
function cargarMesesPlenaria() {
  const meses = [
    { value: '4',  nombre: 'Abril' },
    { value: '5',  nombre: 'Mayo' },
    { value: '6',  nombre: 'Junio' },
    { value: '7',  nombre: 'Julio' },
    { value: '8',  nombre: 'Agosto' },
    { value: '9',  nombre: 'Septiembre' },
    { value: '10', nombre: 'Octubre' },
    { value: '11', nombre: 'Noviembre' },
    { value: '12', nombre: 'Diciembre' },
    { value: '1',  nombre: 'Enero' },
    { value: '2',  nombre: 'Febrero' },
    { value: '3',  nombre: 'Marzo' }
  ];

  selectorPlenariaMes.innerHTML = '<option value="">-- Elige un mes --</option>';
  meses.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.value;
    opt.textContent = m.nombre;
    selectorPlenariaMes.appendChild(opt);
  });
}

// Calcula el ingreso total
function calcularIngresoPlenaria() {
  let asistentes = 0;
  if (checkboxPresidente.checked) asistentes++;
  if (checkboxSecretario.checked) asistentes++;
  if (checkboxTesorero.checked) asistentes++;

  if (asistentes === 0) {
    spanTotalPlenaria.textContent = '0';
    alert('Debe seleccionar al menos un director asistente.');
    return 0;
  }

  const total = asistentes * valorPorDirector + asistentes * propinaPorDirector;
  spanTotalPlenaria.textContent = total.toLocaleString('es-CL');
  return total;
}

// Resetea formulario
function resetFormularioPlenaria() {
  selectorPlenariaSindicato.value = '';
  selectorPlenariaMes.value       = '';
  inputPlenariaAnio.value         = '';
  checkboxPresidente.checked      = false;
  checkboxSecretario.checked      = false;
  checkboxTesorero.checked        = false;
  spanTotalPlenaria.textContent   = '0';
}

// Guarda el ingreso en la tabla ingreso_plenarias
async function guardarIngresoPlenaria() {
  const sindicatoId = selectorPlenariaSindicato.value;
  const anio         = parseInt(inputPlenariaAnio.value, 10);
  const mes          = selectorPlenariaMes.value;
  const presidente   = checkboxPresidente.checked;
  const secretario   = checkboxSecretario.checked;
  const tesorero     = checkboxTesorero.checked;
  const total        = calcularIngresoPlenaria();

  // Validaciones
  if (!sindicatoId) { alert('Seleccione un sindicato.'); return; }
  if (!mes)         { alert('Seleccione un mes.');        return; }
  if (!anio || anio < 2000 || anio > 2100) {
    alert('Ingrese un año válido.'); return;
  }
  if (!(presidente || secretario || tesorero)) {
    alert('Seleccione al menos un director asistente.'); return;
  }
  if (total === 0) { alert('No hay ingreso para guardar.'); return; }

  try {
    const { data: sinData, error: sinError } = await supabase
      .from('sindicatos')
      .select('nombre')
      .eq('id', sindicatoId)
      .single();

    if (sinError || !sinData) {
      alert('Error al obtener nombre del sindicato.');
      return;
    }

    const { error } = await supabase
      .from('ingreso_plenarias')
      .insert([{
        sindicato_id:     sindicatoId,
        nombre_sindicato: sinData.nombre,
        año:              anio,
        mes_nombre:       mes,
        cuota:            total,
        tipo_ingreso:     'plenaria',
        presidente,
        secretario,
        tesorero
      }]);

    if (error) {
      alert('Error guardando ingreso: ' + error.message);
      return;
    }

    alert('Ingreso por plenaria guardado correctamente.');
    resetFormularioPlenaria();
    mostrarPantalla('pantalla-tesoreria');
  } catch (err) {
    alert('Error guardando ingreso: ' + err.message);
  }
}

// Inicialización de botones del menú Tesorería
window.addEventListener('DOMContentLoaded', () => {
  const btnCuotaSindicato = document.getElementById('btnCuotaSindicato');
  const btnPlenariasFederacion = document.getElementById('btnPlenariasFederacion');
  const btnAporteDirector = document.getElementById('btnAporteDirector');

  if (btnCuotaSindicato) {
    btnCuotaSindicato.addEventListener('click', () => mostrarPantalla('pantalla-cuota'));
  }

  if (btnPlenariasFederacion) {
    btnPlenariasFederacion.addEventListener('click', () => {
      mostrarPantalla('pantalla-plenarias');
      cargarSindicatosPlenaria();
      cargarMesesPlenaria();
      resetFormularioPlenaria();
    });
  }

  if (btnAporteDirector) {
    btnAporteDirector.addEventListener('click', () => mostrarPantalla('pantalla-aporte'));
  }
});

// Eventos botones
document.getElementById('plenaria-guardar').addEventListener('click', guardarIngresoPlenaria);
document.getElementById('plenaria-volver').addEventListener('click', () => {
  resetFormularioPlenaria();
  mostrarPantalla('pantalla-tesoreria');
});

// ****************** Aporte Director ****************
// Función para cargar sindicatos activos en el select
async function cargarSindicatosAporte() {
  const select = document.getElementById('aporte-sindicato');
  if (!select) {
    alert('No se encontró el elemento "aporte-sindicato". Verifica el HTML.');
    return;
  }

  select.innerHTML = '<option value="">Cargando sindicatos…</option>';

  try {
    const { data: sindicatos, error } = await supabase
      .from('sindicatos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

    if (!sindicatos || sindicatos.length === 0) {
      select.innerHTML = '<option value="">No hay sindicatos activos</option>';
      return;
    }

    select.innerHTML = '<option value="">Seleccione un sindicato</option>';
    sindicatos.forEach(s => {
      const option = document.createElement('option');
      option.value = s.id;
      option.textContent = s.nombre;
      select.appendChild(option);
    });

  } catch (err) {
    select.innerHTML = '<option value="">Error al cargar sindicatos</option>';
    alert('Error al cargar sindicatos: ' + err.message);
  }
}

// Al abrir pantalla aporte, asignar año actual si no hay valor
const anioInput = document.getElementById('aporte-anio');
if (anioInput && !anioInput.value) {
  anioInput.value = new Date().getFullYear();
}

// Función para cargar socios activos de un sindicato
async function cargarSociosActivos(sindicato_id) {
  const contenedor = document.getElementById('aporte-directores');
  if (!contenedor) {
    alert('No se encontró el contenedor "aporte-directores".');
    return;
  }
  contenedor.innerHTML = '';

  try {
    const { data: socios, error } = await supabase
      .from('socios')
      .select('nombre')
      .eq('sindicato_id', sindicato_id)
      .eq('estado', 'activo')
      .order('nombre', { ascending: true });

    if (error) throw error;

    if (!socios || socios.length === 0) {
      contenedor.textContent = 'No se encontraron socios activos para este sindicato.';
      return;
    }

    socios.forEach(socio => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = socio.nombre;
      checkbox.className = 'aporte-director-checkbox';
      checkbox.checked = true;
      checkbox.addEventListener('change', actualizarTotal);
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + socio.nombre));
      contenedor.appendChild(label);
    });

    actualizarTotal();
  } catch (err) {
    contenedor.textContent = 'Error al cargar socios: ' + err.message;
  }
}

// Función para cargar meses en el select
function cargarMesesAporte() {
  const meses = [
    { value: '4',  nombre: 'Abril' },
    { value: '5',  nombre: 'Mayo' },
    { value: '6',  nombre: 'Junio' },
    { value: '7',  nombre: 'Julio' },
    { value: '8',  nombre: 'Agosto' },
    { value: '9',  nombre: 'Septiembre' },
    { value: '10', nombre: 'Octubre' },
    { value: '11', nombre: 'Noviembre' },
    { value: '12', nombre: 'Diciembre' },
    { value: '1',  nombre: 'Enero' },
    { value: '2',  nombre: 'Febrero' },
    { value: '3',  nombre: 'Marzo' }
  ];
  const select = document.getElementById('aporte-mes');
  if (!select) return;
  select.innerHTML = '<option value="">-- Elige un mes --</option>';
  meses.forEach(m => {
    const option = document.createElement('option');
    option.value = m.value;
    option.textContent = m.nombre;
    select.appendChild(option);
  });
}

// Actualizar el total de aportes seleccionados
function actualizarTotal() {
  const checkboxes = document.querySelectorAll('.aporte-director-checkbox');
  const totalSpan = document.getElementById('aporte-total');
  if (!totalSpan) return;

  let total = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) total += 1000;
  });
  totalSpan.textContent = total.toLocaleString('es-CL');
}

// Función para mostrar una pantalla, se asume que existe 'mostrarPantalla' para otras pantallas
function mostrarPantallaAporte(nombrePantalla) {
  document.querySelectorAll('.pantalla').forEach(div => {
    div.style.display = div.id === nombrePantalla ? 'block' : 'none';
  });
}

// Reset formulario de aporte
function resetFormularioAporte() {
  const sindicatoSelect = document.getElementById('aporte-sindicato');
  if (sindicatoSelect) sindicatoSelect.value = '';
  const contenedor = document.getElementById('aporte-directores');
  if (contenedor) contenedor.innerHTML = '';
  const anioInput = document.getElementById('aporte-anio');
  if (anioInput) anioInput.value = new Date().getFullYear();
  const mesSelect = document.getElementById('aporte-mes');
  if (mesSelect) mesSelect.value = '';
  const totalSpan = document.getElementById('aporte-total');
  if (totalSpan) totalSpan.textContent = '0';
}

// Evento al seleccionar sindicato
const aporteSindicatoSelect = document.getElementById('aporte-sindicato');
if (aporteSindicatoSelect) {
  aporteSindicatoSelect.addEventListener('change', (e) => {
    const sindicato_id = e.target.value;
    if (sindicato_id) {
      cargarSociosActivos(sindicato_id);
    } else {
      const contenedor = document.getElementById('aporte-directores');
      if (contenedor) contenedor.innerHTML = '';
      const totalSpan = document.getElementById('aporte-total');
      if (totalSpan) totalSpan.textContent = '0';
    }
  });
}

// Botón para guardar aportes
const btnAporteGuardar = document.getElementById('aporte-guardar');
if (btnAporteGuardar) {
  btnAporteGuardar.addEventListener('click', async () => {
    const aporteSindicato = document.getElementById('aporte-sindicato');
    const aporteAnio = document.getElementById('aporte-anio');
    const aporteMes = document.getElementById('aporte-mes');

    if (!aporteSindicato || !aporteAnio || !aporteMes) {
      return alert('Faltan campos necesarios en el formulario.');
    }

    const sindicato_id = aporteSindicato.value;
    const anio = parseInt(aporteAnio.value);
    const mes = parseInt(aporteMes.value);

    if (!sindicato_id) return alert('Seleccione un sindicato.');
    if (!anio || anio < 2000 || anio > 2100) return alert('Ingrese un año válido.');
    if (!mes || mes < 1 || mes > 12) return alert('Seleccione un mes.');

    // Obtiene nombre sindicato para registro
    try {
      const { data: sindicatoData, error: sindicatoError } = await supabase
        .from('sindicatos')
        .select('nombre')
        .eq('id', sindicato_id)
        .single();

      if (sindicatoError || !sindicatoData) {
        return alert('Error al obtener sindicato: ' + (sindicatoError?.message || 'No encontrado'));
      }

      const nombreSindicato = sindicatoData.nombre;

      const checkboxes = document.querySelectorAll('.aporte-director-checkbox');
      const directoresSeleccionados = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

      if (directoresSeleccionados.length === 0) {
        return alert('Seleccione al menos un director.');
      }

      const fecha = new Date().toISOString();
      const montoPorDirector = 1000; // o el valor real que estés usando
      const registros = directoresSeleccionados.map(nombreDirector => ({
        nombre_director: nombreDirector,
        sindicato: nombreSindicato,
        mes,
        anio,
        fecha,
        monto: montoPorDirector
      }));

      const { error } = await supabase.from('aporte_director').insert(registros);
      if (error) throw error;

      alert('Aportes registrados correctamente.');
      resetFormularioAporte();
      mostrarPantallaAporte('pantalla-tesoreria');
    } catch (err) {
      alert('Error al guardar aportes: ' + err.message);
    }
  });
}

// Botón volver
const btnAporteVolver = document.getElementById('aporte-volver');
if (btnAporteVolver) {
  btnAporteVolver.addEventListener('click', () => {
    resetFormularioAporte();
    if (typeof mostrarPantalla === 'function') {
      mostrarPantalla('pantalla-tesoreria');
    } else {
      mostrarPantallaAporte('pantalla-tesoreria');
    }
  });
}

// Botón para abrir pantalla aporte
const btnAporteDirector = document.getElementById('btn-aporte-director');
if (btnAporteDirector) {
  btnAporteDirector.addEventListener('click', () => {
    resetFormularioAporte();
    cargarSindicatosAporte();
    cargarMesesAporte();
    mostrarPantallaAporte('pantalla-aporte');
  });
}

// *************** Función para mostrar la pantalla "Otros Ingresos" *************
// Función para ocultar todas las pantallas
function ocultarTodosLosFormularios() {
  document.querySelectorAll('.pantalla').forEach(div => {
    div.style.display = 'none';
  });
}

// Mostrar formulario "Otros Ingresos"
function mostrarFormularioOtrosIngresos() {
  ocultarTodosLosFormularios();
  document.getElementById('formulario-otros-ingresos').style.display = 'block';
}
window.mostrarFormularioOtrosIngresos = mostrarFormularioOtrosIngresos;

// Mostrar/ocultar campo descripción para "otro" y "error"
function toggleCampoDescripcionIngreso() {
  const tipoIngreso = document.getElementById('tipoIngreso').value;
  const campoDescripcion = document.getElementById('campoDescripcionIngreso');
  const inputDescripcion = document.getElementById('descripcionIngreso');

  if (tipoIngreso === 'otro' || tipoIngreso === 'error') {
    campoDescripcion.style.display = 'block';
    inputDescripcion.setAttribute('required', 'required');
  } else {
    campoDescripcion.style.display = 'none';
    inputDescripcion.removeAttribute('required');
    inputDescripcion.value = ''; // limpiar el campo si se oculta
  }
}

// ✅ Exponer la función globalmente para que funcione con el onchange del HTML
window.toggleCampoDescripcionIngreso = toggleCampoDescripcionIngreso;

// Arreglo para convertir número a nombre de mes, en orden desde abril a marzo
const meses = {
  1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
  7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
};

document.getElementById("otrosIngresosForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const tipoIngreso = document.getElementById("tipoIngreso").value;
  const descripcionIngreso = document.getElementById("descripcionIngreso").value || null;
  const anio = parseInt(document.getElementById("anio").value);
  const mesNumero = parseInt(document.getElementById("mes").value);
  const mesNombre = meses[mesNumero] || null;
  const monto = parseFloat(document.getElementById("montoIngreso").value);

  if (!tipoIngreso || !anio || !mesNombre || isNaN(monto)) {
    alert("Por favor complete todos los campos obligatorios.");
    return;
  }

  const { data, error } = await supabase
    .from("otros_ingresos")
    .insert([{
      tipo_ingreso: tipoIngreso,
      descripcion_otro: (tipoIngreso === "otro" || tipoIngreso === "error") ? descripcionIngreso : null,
      anio: anio,
      mes: mesNombre,
      monto: monto
    }]);

  if (error) {
    console.error("Error al guardar ingreso:", error);
    alert("Hubo un error al registrar el ingreso. Intente nuevamente.");
  } else {
    alert("Ingreso registrado correctamente.");
    document.getElementById("otrosIngresosForm").reset();
    toggleCampoDescripcionIngreso();
    mostrarPantalla("pantalla-tesoreria");
  }
});

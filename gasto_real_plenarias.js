// gasto_real_plenarias.js
import { supabase } from './supabaseClient.js';

/* ----------------------------------------------------------------------------------
   1. Mostrar u ocultar pantallas
---------------------------------------------------------------------------------- */
export function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.pantalla, .menu').forEach(el => el.style.display = 'none');
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';

  if (idPantalla === 'pantalla-rgasto-plenarias') {
    const fecha = document.getElementById('fecha-plenaria').value;
    if (fecha) cargarSociosActivos(); // se carga solo si hay fecha
  }

  if (idPantalla === 'pantalla-historial-plenarias') {
    mostrarHistorialPlenarias();
  }
}

/* ----------------------------------------------------------------------------------
   2. Cargar todos los socios activos para checklist de asistencia
---------------------------------------------------------------------------------- */
export async function cargarSociosActivos() {
  const contenedor = document.getElementById('lista-socios');
  if (!contenedor) return;

  contenedor.style.display = 'block';
  contenedor.innerHTML = 'Cargando socios...';

  const { data, error } = await supabase
    .from('socios')
    .select('id, nombre, sindicato_id')
    .eq('estado', 'activo')
    .order('nombre', { ascending: true });

  if (error) {
    contenedor.textContent = 'Error al cargar socios.';
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    contenedor.textContent = 'No hay socios activos para mostrar.';
    return;
  }

  contenedor.innerHTML = '';
  data.forEach(socio => {
    const fila = document.createElement('div');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `socio-${socio.id}`;
    checkbox.name = 'asistentes';
    checkbox.value = socio.id;
    checkbox.checked = true;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = socio.nombre;

    fila.appendChild(checkbox);
    fila.appendChild(label);
    contenedor.appendChild(fila);
  });
}

/* ----------------------------------------------------------------------------------
   3. Procesar y guardar los datos de la plenaria
---------------------------------------------------------------------------------- */
export async function procesarPlenaria(e) {
  e.preventDefault();

  const fechaInput = document.getElementById('fecha-plenaria').value;
  const recintoInput = document.getElementById('recinto-plenaria').value.trim();
  const costoPlenariaInput = parseFloat(document.getElementById('costo-plenaria').value) || 0;
  const colacionInput = parseFloat(document.getElementById('colacion-plenaria').value) || 0;

  if (!fechaInput || !recintoInput || costoPlenariaInput <= 0) {
    alert('Por favor completa: fecha, recinto y costo de las plenarias.');
    return;
  }

  const checkboxes = Array.from(document.querySelectorAll('input[name="asistentes"]:checked'));
  const idsAsistentes = checkboxes.map(cb => cb.value).filter(id => id);

  if (idsAsistentes.length === 0) {
    alert('Marca al menos un socio que haya asistido a las plenarias.');
    return;
  }

  const totalAsistentes = idsAsistentes.length;

  try {
    const { data: sociosSeleccionados, error: errorSocios } = await supabase
      .from('socios')
      .select('id, nombre, sindicato_id')
      .in('id', idsAsistentes);
    if (errorSocios) throw errorSocios;

    const { data: todosSindicatos, error: errorSindicatos } = await supabase
      .from('sindicatos')
      .select('id, nombre');
    if (errorSindicatos) throw errorSindicatos;

    const mapaSindicatos = {};
    todosSindicatos.forEach(s => { mapaSindicatos[s.id] = s.nombre });

    const conteoPorSindicato = {};
    sociosSeleccionados.forEach(socio => {
      const nombreSind = mapaSindicatos[socio.sindicato_id] || 'Sin sindicato';
      conteoPorSindicato[nombreSind] = (conteoPorSindicato[nombreSind] || 0) + 1;
    });

    const propinaFederacion = 15000;
    const propinaIndividualPorSocio = 1000;
    const propinaIndividualTotal = totalAsistentes * propinaIndividualPorSocio;
    const propinaTotal = propinaFederacion + propinaIndividualTotal;

    const costoTotal = costoPlenariaInput + colacionInput + propinaTotal;
    const costoPorPersona = Math.round(costoTotal / totalAsistentes);

    const nombresSindicatosPresentes = Object.keys(conteoPorSindicato);
    const nombresSindicatosTodos = todosSindicatos.map(s => s.nombre);
    const sindicatosAusentes = nombresSindicatosTodos.filter(n => !nombresSindicatosPresentes.includes(n));

    const { error: errorInsert } = await supabase.from('gasto_real_plenarias').insert([{
      fecha: fechaInput,
      recinto: recintoInput,
      asistentes: idsAsistentes,
      total_asistentes: totalAsistentes,
      sindicatos_presentes: nombresSindicatosPresentes,
      sindicatos_ausentes: sindicatosAusentes,
      costo_recinto: costoPlenariaInput,
      gasto_colacion: colacionInput,
      propina_total: propinaTotal,
      costo_total: costoTotal,
      costo_por_persona: costoPorPersona
    }]);

    if (errorInsert) {
      console.error('Error al guardar en Supabase:', errorInsert);
      alert('Se calculó correctamente, pero hubo un error al guardar en la base de datos.');
      return;
    }

    mostrarResumenPlenaria({
      fecha: fechaInput,
      recinto: recintoInput,
      totalAsistentes,
      costoRecinto: costoPlenariaInput,
      gastoColacion: colacionInput,
      propinaFederacion,
      propinaIndividualTotal,
      costoPorPersona,
      conteoPorSindicato
    });

    alert('¡Gastos de la plenaria registrados exitosamente!');
  } catch (err) {
    console.error(err);
    alert('Ocurrió un error al guardar la plenaria. Revisa la consola.');
  }
}

/* ----------------------------------------------------------------------------------
   4. Mostrar resumen en pantalla
---------------------------------------------------------------------------------- */
function mostrarResumenPlenaria({
  fecha,
  recinto,
  totalAsistentes,
  costoRecinto,
  gastoColacion,
  propinaFederacion,
  propinaIndividualTotal,
  costoPorPersona,
  conteoPorSindicato
}) {
  const contenedor = document.getElementById('resultado-plenaria');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  const [yyyy, mm, dd] = fecha.slice(0, 10).split('-');
  const fechaFormateada = `${dd}-${mm}-${yyyy}`;

  const crearP = texto => {
    const p = document.createElement('p');
    p.textContent = texto;
    return p;
  };

  contenedor.appendChild(crearP(`Fecha: ${fechaFormateada} | Recinto: ${recinto}`));
  contenedor.appendChild(crearP(`Total de asistentes: ${totalAsistentes}`));
  contenedor.appendChild(crearP(`Costo recinto: $${costoRecinto.toLocaleString()}`));
  contenedor.appendChild(crearP(`Gasto en colación: $${gastoColacion.toLocaleString()}`));
  contenedor.appendChild(crearP(`Propina federación: $${propinaFederacion.toLocaleString()} | Propina total individual: $${propinaIndividualTotal.toLocaleString()}`));
  contenedor.appendChild(crearP(`Costo final por persona: $${costoPorPersona.toLocaleString()}`));

  const encabezadoSind = crearP('Representatividad por sindicato:');
  contenedor.appendChild(encabezadoSind);

  const ul = document.createElement('ul');
  Object.entries(conteoPorSindicato).forEach(([nombre, cuenta]) => {
    const li = document.createElement('li');
    li.textContent = `${nombre}: ${cuenta} asistentes`;
    ul.appendChild(li);
  });
  contenedor.appendChild(ul);
}

/* ----------------------------------------------------------------------------------
   5. Función para limpiar el formulario
---------------------------------------------------------------------------------- */
function limpiarFormularioPlenaria() {
  const form = document.getElementById('form-plenarias');
  if (form) form.reset();

  const resumen = document.getElementById('resultado-plenaria');
  if (resumen) resumen.innerHTML = '';

  const listaSocios = document.getElementById('lista-socios');
  if (listaSocios) listaSocios.style.display = 'none';
}

/* ----------------------------------------------------------------------------------
   6. Listeners
---------------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const formPlenarias = document.getElementById('form-plenarias');
  if (formPlenarias) {
    formPlenarias.addEventListener('submit', procesarPlenaria);
  }

  const btnLimpiar = document.getElementById('btn-limpiar-plenaria');
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', limpiarFormularioPlenaria);
  }

  const inputFecha = document.getElementById('fecha-plenaria');
  if (inputFecha) {
    inputFecha.addEventListener('change', () => {
      if (inputFecha.value) {
        cargarSociosActivos();
      }
    });
  }
});


/* ----------------------------------------------------------------------------------
   7. Cargar historial de plenarias
---------------------------------------------------------------------------------- */
 // Cargar fechas únicas de plenarias en el historial
export async function mostrarHistorialPlenarias() {
  const selector = document.getElementById('selector-fechas-plenarias');
  const detalle = document.getElementById('detalle-plenaria-seleccionada');
  const lista = document.getElementById('lista-asistentes-plenaria');

  selector.innerHTML = '<option value="">-- Elige una fecha --</option>';
  detalle.innerHTML = '';
  lista.innerHTML = '';

  const { data, error } = await supabase
    .from('gasto_real_plenarias')
    .select('fecha')
    .order('fecha', { ascending: false });

  if (error) {
    selector.innerHTML = '<option>Error al cargar fechas</option>';
    console.error(error);
    return;
  }

  const fechasUnicas = [...new Set(data.map(r => r.fecha))];
  fechasUnicas.forEach(f => {
    const opt = document.createElement('option');
    const [y, m, d] = f.slice(0, 10).split('-');
    opt.value = f;
    opt.textContent = `${d}-${m}-${y}`;
    selector.appendChild(opt);
  });
}

// Al cambiar la fecha seleccionada
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('selector-fechas-plenarias');
  if (selector) {
    selector.addEventListener('change', async () => {
      const fecha = selector.value;
      if (!fecha) return;

      const detalle = document.getElementById('detalle-plenaria-seleccionada');
      const lista = document.getElementById('lista-asistentes-plenaria');

      detalle.innerHTML = 'Cargando...';
      lista.innerHTML = '';

      const { data, error } = await supabase
        .from('gasto_real_plenarias')
        .select('*')
        .eq('fecha', fecha)
        .limit(1);

      if (error || !data || data.length === 0) {
        detalle.textContent = 'Error al buscar datos.';
        console.error(error);
        return;
      }

      const p = data[0];

      const [yyyy, mm, dd] = fecha.slice(0, 10).split('-');
      const fechaFormateada = `${dd}-${mm}-${yyyy}`;

      detalle.innerHTML = `
        <p><strong>Fecha:</strong> ${fechaFormateada}</p>
        <p><strong>Recinto:</strong> ${p.recinto}</p>
        <p><strong>Total asistentes:</strong> ${p.total_asistentes}</p>
        <p><strong>Costo recinto:</strong> $${p.costo_recinto.toLocaleString()}</p>
        <p><strong>Colación:</strong> $${p.gasto_colacion.toLocaleString()}</p>
        <p><strong>Propina total:</strong> $${p.propina_total.toLocaleString()}</p>
        <p><strong>Costo total:</strong> $${p.costo_total.toLocaleString()}</p>
        <p><strong>Costo por persona:</strong> $${p.costo_por_persona.toLocaleString()}</p>
        <p><strong>Sindicatos presentes:</strong> ${p.sindicatos_presentes.join(', ')}</p>
        <p><strong>Sindicatos ausentes:</strong> ${p.sindicatos_ausentes.join(', ')}</p>
      `;

      // Obtener nombres de asistentes
      if (p.asistentes && p.asistentes.length > 0) {
        const { data: asistentes, error: errAsist } = await supabase
          .from('socios')
          .select('nombre')
          .in('id', p.asistentes);

        if (errAsist || !asistentes) {
          lista.textContent = 'Error al obtener nombres de asistentes.';
          return;
        }

        lista.innerHTML = '<h4>Asistentes:</h4><ul>' +
          asistentes.map(s => `<li>${s.nombre}</li>`).join('') +
          '</ul>';
      } else {
        lista.textContent = 'No se registraron asistentes.';
      }
    });
  }
});

/* ----------------------------------------------------------------------------------
   8. Exponer funciones globalmente
---------------------------------------------------------------------------------- */
window.mostrarPantalla = mostrarPantalla;
window.cargarSociosActivos = cargarSociosActivos;
window.procesarPlenaria = procesarPlenaria;
window.mostrarHistorialPlenarias = mostrarHistorialPlenarias;

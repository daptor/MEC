import { supabase } from './supabaseClient.js';

// Mostrar u ocultar pantallas
export function mostrarPantalla(idPantalla) {
  document.querySelectorAll('.pantalla, .menu').forEach(el => el.style.display = 'none');
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}

// Cargar directores activos para checklist de participantes
export async function cargarDirectores() {
  const contenedor = document.getElementById('lista-directores');
  if (!contenedor) return;

  contenedor.innerHTML = 'Cargando directores...';

  const { data, error } = await supabase
    .from('socios')
    .select('id, nombre, rol')
    .eq('estado', 'activo')
    .in('rol', [
      'DIRECTOR_1', 'DIRECTOR_2', 'DIRECTOR_3', 'DIRECTOR_4',
      'DIRECTOR_5', 'DIRECTOR_6', 'DIRECTOR_7', 'DIRECTOR_8', 'TESORERO'
    ]);

  if (error) {
    contenedor.textContent = 'Error al cargar directores';
    console.error(error);
    return;
  }

  contenedor.innerHTML = '';
  data.forEach(dir => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '6px';
    div.style.marginBottom = '6px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `director-${dir.id}`;
    checkbox.name = 'participantes';
    checkbox.value = dir.id;
    checkbox.style.width = '18px';
    checkbox.style.height = '18px';
    checkbox.style.margin = '0';

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = dir.nombre;
    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';

    div.appendChild(checkbox);
    div.appendChild(label);
    contenedor.appendChild(div);
  });
}

// Cargar reuniones y poblar selector de fechas + resultado por fecha
export async function cargarReuniones() {
  const selectorFechas = document.getElementById('selector-fechas');
  const resultadoReuniones = document.getElementById('resultado-reuniones');
  if (!selectorFechas || !resultadoReuniones) return;

  selectorFechas.innerHTML = '<option value="">-- Seleccione fecha --</option>';
  resultadoReuniones.innerHTML = '';

  const { data: reuniones, error } = await supabase
    .from('agenda_reuniones')
    .select('*')
    .order('fecha', { ascending: true });

  if (error) {
    resultadoReuniones.textContent = 'Error al cargar reuniones';
    console.error(error);
    return;
  }

  if (!reuniones || reuniones.length === 0) {
    resultadoReuniones.textContent = 'No hay reuniones agendadas.';
    return;
  }

  // Fechas únicas
  const fechasUnicas = Array.from(new Set(reuniones.map(r => r.fecha.slice(0, 10)))).sort();
  fechasUnicas.forEach(fecha => {
    const option = document.createElement('option');
    option.value = fecha;
    const [y, m, d] = fecha.split('-');
    option.textContent = `${d}-${m}-${y}`;
    selectorFechas.appendChild(option);
  });

  // Cargar nombres de socios
  const { data: socios } = await supabase.from('socios').select('id, nombre');
  const mapaSocios = {};
  socios?.forEach(s => mapaSocios[s.id] = s.nombre);

  function mostrarReunionesPorFecha(fechaSeleccionada) {
    resultadoReuniones.innerHTML = '';
    if (!fechaSeleccionada) {
      resultadoReuniones.textContent = 'Seleccione una fecha para ver reuniones.';
      return;
    }

    const reunionesFiltradas = reuniones.filter(r => r.fecha.slice(0, 10) === fechaSeleccionada);
    if (reunionesFiltradas.length === 0) {
      resultadoReuniones.textContent = 'No hay reuniones para esta fecha.';
      return;
    }

    reunionesFiltradas.forEach(reunion => {
      const [yy, mm, dd] = reunion.fecha.slice(0, 10).split('-');
      const fechaStr = `${dd}-${mm}-${yy}`;
      const participantes = (reunion.participantes || []).map(id => mapaSocios[id] || id).join(', ');
      const div = document.createElement('div');
      div.textContent = `${fechaStr} - ${reunion.tipo_reunion} - ${participantes}`;
      resultadoReuniones.appendChild(div);
    });
  }

  selectorFechas.onchange = () => {
    mostrarReunionesPorFecha(selectorFechas.value);
  };

  resultadoReuniones.textContent = 'Seleccione una fecha para ver reuniones.';
}

// Agregar nueva reunión
export async function agregarReunión(e) {
  e.preventDefault();

  const fecha = document.getElementById('fecha-reunion').value;
  const tipo = document.getElementById('tipo-reunion').value;
  const participantes = Array.from(document.querySelectorAll('input[name="participantes"]:checked')).map(cb => cb.value);

  if (!fecha || !tipo || participantes.length === 0) {
    alert('Completa todos los campos y selecciona al menos un participante.');
    return;
  }

  const { error } = await supabase
    .from('agenda_reuniones')
    .insert([{ fecha, tipo_reunion: tipo, participantes }]);

  if (error) {
    alert('Error al guardar la reunión.');
    console.error(error);
    return;
  }

  alert('Reunión agregada exitosamente.');
  e.target.reset();
  cargarReuniones();
}

// Al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const formAgenda = document.getElementById('form-agenda');
  if (formAgenda) {
    formAgenda.addEventListener('submit', agregarReunión);
  }

  // Carga datos de la agenda al iniciar, aunque esté oculta
  cargarDirectores();
  cargarReuniones();
});

// Exponer funciones globalmente si es necesario
window.mostrarPantalla = mostrarPantalla;
window.cargarDirectores = cargarDirectores;
window.cargarReuniones = cargarReuniones;
window.agregarReunión = agregarReunión;

import { supabase } from './supabaseClient.js';

const contenedorSocios = document.getElementById('contenedorSocios');
const formCrear = document.getElementById('form-crear-comision');
const errSocios = document.getElementById('error-socios');
const tblComsBody = document.querySelector('#tablaComisiones tbody');

let socios = [];
let checkboxes = [];

async function cargarSocios() {
  const { data, error } = await supabase
    .from('socios')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error || !data) {
    contenedorSocios.innerHTML = '<p style="color:red;">Error al cargar socios.</p>';
    return;
  }

  socios = data;
  contenedorSocios.innerHTML = '';

  data.forEach(s => {
    const div = document.createElement('div');
    div.classList.add('socio-item');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = s.id;
    cb.id = `socio-${s.id}`;

    const lbl = document.createElement('label');
    lbl.htmlFor = cb.id;
    lbl.textContent = s.nombre;

    div.append(cb, lbl);
    contenedorSocios.appendChild(div);
  });

  checkboxes = Array.from(contenedorSocios.querySelectorAll('input[type=checkbox]'));

  checkboxes.forEach(cb =>
    cb.addEventListener('change', () => {
      const sel = checkboxes.filter(c => c.checked);
      if (sel.length > 3) {
        cb.checked = false;
        alert('Solo puedes seleccionar hasta 3 directores.');
      }
      errSocios.style.display = 'none'; // Oculta error si se cambia selección
    })
  );
}

formCrear.addEventListener('submit', async e => {
  e.preventDefault();

  const nombre = document.getElementById('nombreComision').value.trim();
  const selIds = checkboxes.filter(c => c.checked).map(c => c.value);

  if (!nombre) {
    alert('Ingresa nombre de la comisión.');
    return;
  }
  if (selIds.length < 1 || selIds.length > 3) {
    errSocios.style.display = 'block';
    return;
  }
  errSocios.style.display = 'none';

  const { data: exist } = await supabase
    .from('comisiones')
    .select('id')
    .ilike('nombre', nombre);

  if (exist.length) {
    alert('Ya existe esa comisión.');
    return;
  }

  await supabase.from('comisiones').insert([{
    nombre,
    socio_1: selIds[0] || null,
    socio_2: selIds[1] || null,
    socio_3: selIds[2] || null
  }]);

  formCrear.reset();
  checkboxes.forEach(cb => cb.checked = false);
  cargarComisiones();
});

async function cargarComisiones() {
  const { data, error } = await supabase.from('comisiones').select('*').order('nombre');

  if (error || !data) {
    tblComsBody.innerHTML = '<tr><td colspan="5">Error cargando comisiones.</td></tr>';
    return;
  }

  tblComsBody.innerHTML = '';

  data.forEach(c => {
    const tr = document.createElement('tr');

    // Nombre de la comisión
    const tdNombre = document.createElement('td');
    tdNombre.style.border = '1px solid #ddd';
    tdNombre.style.padding = '4px';
    tdNombre.textContent = c.nombre;
    tr.appendChild(tdNombre);

    // Socios 1 a 3
    [c.socio_1, c.socio_2, c.socio_3].forEach(idSocio => {
      const td = document.createElement('td');
      td.style.border = '1px solid #ddd';
      td.style.padding = '4px';
      const socio = socios.find(s => s.id === idSocio);
      td.textContent = socio ? socio.nombre : '';
      tr.appendChild(td);
    });

    // Acción eliminar
    const tdAcc = document.createElement('td');
    tdAcc.style.border = '1px solid #ddd';
    tdAcc.style.padding = '4px';

    const btnDel = document.createElement('button');
    btnDel.textContent = 'Eliminar';
    btnDel.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la comisión "${c.nombre}"?`)) return;
      await supabase.from('comisiones').delete().eq('id', c.id);
      cargarComisiones();
    });

    tdAcc.appendChild(btnDel);
    tr.appendChild(tdAcc);

    tblComsBody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarSocios().then(() => cargarComisiones());
});

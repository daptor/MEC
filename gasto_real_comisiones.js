import { supabase } from './supabaseClient.js';

// 1) Formatea fecha ISO "YYYY-MM-DD" a "DD-MM-YYYY"
function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '-';
  const [y, m, d] = fechaISO.split('-');
  return `${d}-${m}-${y}`;
}

// 2) Determina año fiscal (abril-marzo)
function determineFiscalYear(fechaISO) {
  const [y, m] = fechaISO.split('-').map(Number);
  return m >= 4 ? `${y}-${y+1}` : `${y-1}-${y}`;
}

// 3) Calcula horas entre entrada y salida
function calcularHoras(entrada, salida) {
  const [h1, min1] = entrada.split(':').map(Number);
  const [h2, min2] = salida.split(':').map(Number);
  return Math.max(0, (h2 + min2/60) - (h1 + min1/60));
}

// 4) Meses fiscal abril-marzo
const MESES_FISCAL = [
  { num: 4, nombre: 'Abril' }, { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' }, { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' }, { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' }, { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' }, { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' }, { num: 3, nombre: 'Marzo' },
];

// 5) Poblar selector Mes Comercial según fechaRegistro
function poblarMesComercial() {
  const iso = document.getElementById('fechaRegistro').value; // ahora type=date
  const sel = document.getElementById('mesComercial');
  sel.innerHTML = '<option value="">-- Elige mes --</option>';
  if (!iso) return;

  const [year, month] = iso.split('-').map(Number);
  const inicioFiscal = (month >= 4 ? year : year - 1);
  const finFiscal = inicioFiscal + 1;

  // Abril (4) a Diciembre (12) de inicioFiscal
  for (let m = 4; m <= 12; m++) {
    const nom = MESES_FISCAL.find(x => x.num === m).nombre;
    sel.append(new Option(`${nom} ${inicioFiscal}`, m));
  }
  // Enero (1) a Marzo (3) de finFiscal
  for (let m = 1; m <= 3; m++) {
    const nom = MESES_FISCAL.find(x => x.num === m).nombre;
    sel.append(new Option(`${nom} ${finFiscal}`, m));
  }
}

// 6) Cargar comisiones en selector
async function cargarComisiones() {
  const sel = document.getElementById('comisionSelect');
  sel.innerHTML = '<option value="">-- Elige comisión --</option>';
  const { data, error } = await supabase.from('comisiones').select('id,nombre').order('nombre');
  if (error) return console.error(error);
  data.forEach(c => sel.append(new Option(c.nombre, c.id)));
}

// 7) Cargar directores asignados
async function cargarDirectoresAsignados() {
  const id = document.getElementById('comisionSelect').value;
  const cont = document.getElementById('bloquesDirectores');
  cont.innerHTML = '';
  if (!id) return;

  const { data: com } = await supabase.from('comisiones')
    .select('socio_1,socio_2,socio_3').eq('id', id).single();

  const sociosIds = [com.socio_1, com.socio_2, com.socio_3].filter(Boolean);
  if (!sociosIds.length) {
    cont.innerHTML = '<p><i>Debes ingresar Participantes.</i></p>';  // ← CAMBIO DE MENSAJE
    return;
  }

  const { data: socios } = await supabase.from('socios')
    .select('id,nombre').in('id', sociosIds);

  socios.forEach(s => {
    const div = document.createElement('div');
    div.className = 'director-block';
    div.dataset.id = s.id;
    div.innerHTML = `
      <h4>${s.nombre}</h4>
      <label>Fecha prestación: <input type="date" id="fechaPrest_${s.id}" /></label>
      <label>Hora entrada:   <input type="time" id="horaIn_${s.id}" /></label>
      <label>Hora salida:    <input type="time" id="horaOut_${s.id}" /></label>
    `;
    cont.appendChild(div);
  });
}

// 8) Guardar gasto
async function guardarGasto() {
  const fechaRegISO = document.getElementById('fechaRegistro').value;
  if (!fechaRegISO) return alert('Selecciona Fecha de registro');
  const mes = document.getElementById('mesComercial').value;
  const comId = document.getElementById('comisionSelect').value;
  if (!mes || !comId) return alert('Faltan datos obligatorios');

  const blocks = document.querySelectorAll('.director-block');
  if (!blocks.length) return alert('Selecciona una comisión con directores.');

  const regs = [];
  for (let b of blocks) {
    const sid = b.dataset.id;
    const fp = document.getElementById(`fechaPrest_${sid}`).value;
    const hi = document.getElementById(`horaIn_${sid}`).value;
    const ho = document.getElementById(`horaOut_${sid}`).value;
    if (!fp) return alert(`Selecciona Fecha prestación para socio ${sid}`);
    if (!hi || !ho) return alert('Completa todos los campos de hora.');

    const hrs = calcularHoras(hi, ho);
    regs.push({
      fecha_registro: fechaRegISO,
      mes_comercial: +mes,
      comision_id: comId,
      socio_id: sid,
      fecha_prestacion: fp,
      horas: hrs,
      monto: hrs * 2500,
      ano_fiscal: determineFiscalYear(fechaRegISO)
    });
  }

  const { error } = await supabase.from('gasto_real_comisiones').insert(regs);
  if (error) return alert('Error al guardar');
  alert('Guardado OK');
  cargarHistorial();
}

// 9) Cargar historial
async function cargarHistorial() {
  const mesValue = +document.getElementById('mesComercial').value || null;
  const comId = document.getElementById('comisionSelect').value || null;

  let q = supabase.from('gasto_real_comisiones')
    .select(`
      id,
      fecha_registro,
      mes_comercial,
      horas,
      monto,
      comision:comisiones(nombre),
      socio:socios(nombre),
      fecha_prestacion
    `).order('fecha_registro', { ascending: false });

  if (mesValue) q = q.eq('mes_comercial', mesValue);
  if (comId) q = q.eq('comision_id', comId);

  const { data, error } = await q;
  const tabla = document.getElementById('tablaGastosReales');
  const tbody = tabla.querySelector('tbody');
  const titulo = document.querySelector('#pantalla-rgasto-comisiones h3');
  tbody.innerHTML = '';
  document.getElementById('mensajeSinDatos')?.remove();

  if (error) return tabla.style.display = 'none';
  if (!data.length) {
    tabla.style.display = 'none';
    const p = document.createElement('p');
    p.id = 'mensajeSinDatos';
    p.textContent = 'No hay datos';
    p.style.fontStyle = 'italic';
    titulo.after(p);
    ['totalMes','totalMesMonto','totalAnio','totalAnioMonto'].forEach(id => document.getElementById(id).textContent = '0');
    return;
  }

  tabla.style.display = 'table';
  let tMes = 0, tMesM = 0, tA = 0, tAM = 0;

  data.forEach(r => {
    const mf = MESES_FISCAL.find(x => x.num === r.mes_comercial).nombre;
    const [y1, y2] = determineFiscalYear(r.fecha_registro).split('-');
    const añoEtiqueta = r.mes_comercial >= 4 ? y1 : y2;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDDMMYYYY(r.fecha_registro)}</td>
      <td>${mf} ${añoEtiqueta}</td>
      <td>${r.comision?.nombre || '-'}</td>
      <td>${r.socio?.nombre || '-'}</td>
      <td>${formatDDMMYYYY(r.fecha_prestacion)}</td>
      <td>${r.horas.toFixed(2)}</td>
      <td>${r.monto.toFixed(0)}</td>
      <td><button class="borrar" data-id="${r.id}">Borrar</button></td>
    `;
    tbody.appendChild(tr);

    tA += r.horas;
    tAM += r.monto;
    if (mesValue === r.mes_comercial) {
      tMes += r.horas;
      tMesM += r.monto;
    }
  });

  document.getElementById('totalMes').textContent = tMes.toFixed(2);
  document.getElementById('totalMesMonto').textContent = tMesM.toFixed(0);
  document.getElementById('totalAnio').textContent = tA.toFixed(2);
  document.getElementById('totalAnioMonto').textContent = tAM.toFixed(0);

  document.querySelectorAll('.borrar').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Borrar este gasto?')) return;
      await supabase.from('gasto_real_comisiones').delete().eq('id', btn.dataset.id);
      cargarHistorial();
    };
  });
}

// 10) Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const fr = document.getElementById('fechaRegistro');
  fr.value = '';
  fr.addEventListener('change', poblarMesComercial);
  if (fr.value) poblarMesComercial();

  document.getElementById('mesComercial').addEventListener('change', cargarHistorial);
  document.getElementById('comisionSelect').addEventListener('change', () => {
    cargarDirectoresAsignados();
    cargarHistorial();
  });
  document.getElementById('guardarGastoBtn').addEventListener('click', guardarGasto);

  cargarComisiones();
  cargarHistorial();
});

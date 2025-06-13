import { supabase } from './supabaseClient.js';

// === Utilidades de formato ===
function formatToISO(fechaTexto) {
  if (!fechaTexto || fechaTexto.length !== 10) return null;
  const [d, m, a] = fechaTexto.split('-');
  return `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '-';
  const [y, m, d] = fechaISO.split('-');
  return `${d}-${m}-${y}`;
}

function determineFiscalYear(fechaISO) {
  const [y, m] = fechaISO.split('-').map(Number);
  return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function calcularHoras(entrada, salida) {
  const [h1, min1] = entrada.split(':').map(Number);
  const [h2, min2] = salida.split(':').map(Number);
  return Math.max(0, (h2 + min2 / 60) - (h1 + min1 / 60));
}

const MESES_FISCAL = [
  { num: 4, nombre: 'Abril' }, { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' }, { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' }, { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' }, { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' }, { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' }, { num: 3, nombre: 'Marzo' },
];

// === Funciones principales ===

function poblarMesComercial() {
  const fechaTexto = document.getElementById('fechaRegistro').value;
  if (!fechaTexto || fechaTexto.length !== 10) return;

  const isoFecha = formatToISO(fechaTexto);
  if (!isoFecha) return;

  const [anio, mes] = isoFecha.split('-').map(Number);
  const inicioFiscal = mes >= 4 ? anio : anio - 1;
  const finFiscal = inicioFiscal + 1;

  const sel = document.getElementById('mesComercial');
  sel.innerHTML = '<option value="">-- Elige mes --</option>';

  for (let i = 4; i <= 12; i++) {
    const nombre = MESES_FISCAL.find(m => m.num === i).nombre.toUpperCase();
    const opt = new Option(`${nombre} ${inicioFiscal}`, i);
    sel.appendChild(opt);
  }
  for (let i = 1; i <= 3; i++) {
    const nombre = MESES_FISCAL.find(m => m.num === i).nombre.toUpperCase();
    const opt = new Option(`${nombre} ${finFiscal}`, i);
    sel.appendChild(opt);
  }
}

async function cargarComisiones() {
  const sel = document.getElementById('comisionSelect');
  sel.innerHTML = '<option value="">-- Elige comisión --</option>';
  const { data, error } = await supabase.from('comisiones').select('id,nombre').order('nombre');
  if (error) { console.error(error); return; }
  data.forEach(c => sel.appendChild(new Option(c.nombre, c.id)));
}

async function cargarDirectoresAsignados() {
  const id = document.getElementById('comisionSelect').value;
  const cont = document.getElementById('bloquesDirectores');
  cont.innerHTML = '';
  if (!id) return;

  const { data: com, error } = await supabase
    .from('comisiones').select('socio_1,socio_2,socio_3').eq('id', id).single();
  if (error || !com) { console.error(error); return; }

  const sociosIds = [com.socio_1, com.socio_2, com.socio_3].filter(Boolean);
  if (!sociosIds.length) {
    cont.innerHTML = '<p><i>Sin directores asignados.</i></p>';
    return;
  }

  const { data: socios, error: err2 } = await supabase
    .from('socios').select('id,nombre').in('id', sociosIds);
  if (err2) { console.error(err2); return; }

  socios.forEach(s => {
    const d = document.createElement('div');
    d.className = 'director-block';
    d.dataset.id = s.id;
    d.innerHTML = `
      <h4>${s.nombre}</h4>
      <label>Fecha prestación: <input type="text" id="fechaPrest_${s.id}" maxlength="10" placeholder="dd-mm-aaaa"/></label>
      <label>Hora entrada: <input type="time" id="horaIn_${s.id}"/></label>
      <label>Hora salida: <input type="time" id="horaOut_${s.id}"/></label>
    `;
    cont.appendChild(d);
    aplicarFormatoFechaTexto(d.querySelector(`#fechaPrest_${s.id}`));
  });
}

function aplicarFormatoFechaTexto(input) {
  input.addEventListener('input', e => {
    let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    if (val.length > 4) val = `${val.slice(0, 2)}-${val.slice(2, 4)}-${val.slice(4)}`;
    else if (val.length > 2) val = `${val.slice(0, 2)}-${val.slice(2)}`;
    e.target.value = val;
  });
}

async function guardarGasto() {
  const fechaTexto = document.getElementById('fechaRegistro').value;
  const fechaReg = formatToISO(fechaTexto);
  const mes = document.getElementById('mesComercial').value;
  const comId = document.getElementById('comisionSelect').value;

  if (!fechaReg || !mes || !comId) {
    alert('Faltan datos obligatorios o fecha registro inválida');
    return;
  }

  const blocks = document.querySelectorAll('.director-block');
  if (!blocks.length) { alert('Selecciona una comisión con directores.'); return; }

  const regs = [];
  for (let b of blocks) {
    const sid = b.dataset.id;
    const fpTexto = document.getElementById(`fechaPrest_${sid}`).value;
    const fpISO = formatToISO(fpTexto);
    const hi = document.getElementById(`horaIn_${sid}`).value;
    const ho = document.getElementById(`horaOut_${sid}`).value;
    if (!fpISO || !hi || !ho) { alert('Completa todos los campos'); return; }

    const hrs = calcularHoras(hi, ho);
    const mto = hrs * 2500;
    const afy = determineFiscalYear(fechaReg);

    regs.push({
      fecha_registro: fechaReg,
      mes_comercial: parseInt(mes),
      comision_id: comId,
      socio_id: sid,
      fecha_prestacion: fpISO,
      horas: hrs,
      monto: mto,
      ano_fiscal: afy
    });
  }

  const { error } = await supabase.from('gasto_real_comisiones').insert(regs);
  if (error) { console.error(error); alert('Error al guardar'); return; }
  alert('Guardado OK');
  cargarHistorial();
}

async function cargarHistorial() {
  const mesValue = document.getElementById('mesComercial').value;
  const comId = document.getElementById('comisionSelect').value;

  let q = supabase.from('gasto_real_comisiones').select(`
    id, fecha_registro, mes_comercial, monto,
    comision:comisiones(nombre), socio:socios(nombre),
    fecha_prestacion, horas
  `).order('fecha_registro', { ascending: false });

  if (mesValue) q = q.eq('mes_comercial', parseInt(mesValue));
  if (comId) q = q.eq('comision_id', comId);

  const { data, error } = await q;
  const tbody = document.querySelector('#tablaGastosReales tbody');
  const titulo = document.querySelector('#pantalla-rgasto-comisiones h3');
  tbody.innerHTML = '';
  document.getElementById('mensajeSinDatos')?.remove();

  if (error) {
    console.error(error);
    return;
  }
  if (!data || data.length === 0) {
    const mensaje = document.createElement('p');
    mensaje.id = 'mensajeSinDatos';
    mensaje.textContent = 'No hay datos';
    mensaje.style.fontStyle = 'italic';
    mensaje.style.marginTop = '0.5em';
    titulo.insertAdjacentElement('afterend', mensaje);
    actualizarTotales(0, 0, 0, 0);
    return;
  }

  let tMes = 0, tMesM = 0, tA = 0, tAM = 0;

  data.forEach(r => {
    const mf = MESES_FISCAL.find(x => x.num === r.mes_comercial);
    const añoFiscal = determineFiscalYear(r.fecha_registro).split('-');
    const añoEtiqueta = (r.mes_comercial >= 4 ? añoFiscal[0] : añoFiscal[1]);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDDMMYYYY(r.fecha_registro)}</td>
      <td>${(mf?.nombre.toUpperCase() || '-')} ${añoEtiqueta}</td>
      <td>${r.comision?.nombre || '-'}</td>
      <td>${r.socio?.nombre || '-'}</td>
      <td>${formatDDMMYYYY(r.fecha_prestacion)}</td>
      <td>${r.horas?.toFixed(2) || '0.00'}</td>
      <td>${r.monto?.toFixed(0) || '0'}</td>
      <td><button data-id="${r.id}" class="borrar">Borrar</button></td>
    `;
    tbody.appendChild(tr);

    tA += r.horas; tAM += r.monto;
    if (mesValue && String(r.mes_comercial) === mesValue) {
      tMes += r.horas; tMesM += r.monto;
    }
  });

  actualizarTotales(tMes, tMesM, tA, tAM);

  document.querySelectorAll('.borrar').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Borrar este gasto?')) return;
      await supabase.from('gasto_real_comisiones').delete().eq('id', btn.dataset.id);
      cargarHistorial();
    };
  });
}

function actualizarTotales(tMes, tMesM, tA, tAM) {
  document.getElementById('totalMes').textContent = tMes.toFixed(2);
  document.getElementById('totalMesMonto').textContent = tMesM.toFixed(0);
  document.getElementById('totalAnio').textContent = tA.toFixed(2);
  document.getElementById('totalAnioMonto').textContent = tAM.toFixed(0);
}

// === Inicialización ===
document.addEventListener('DOMContentLoaded', () => {
  const fr = document.getElementById('fechaRegistro');
  aplicarFormatoFechaTexto(fr);
  fr.addEventListener('input', () => {
    poblarMesComercial();
    cargarHistorial();
  });

  document.getElementById('mesComercial').addEventListener('change', cargarHistorial);
  document.getElementById('comisionSelect').addEventListener('change', () => {
    cargarDirectoresAsignados();
    cargarHistorial();
  });

  document.getElementById('guardarGastoBtn').addEventListener('click', guardarGasto);

  cargarComisiones();
  poblarMesComercial();
  cargarHistorial();
});

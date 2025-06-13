import { supabase } from './supabaseClient.js';

// 1) Formatea fecha ISO "YYYY-MM-DD" a "DD-MM-YYYY" para mostrar en tabla
function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '-';
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return '-';
  const [y, m, d] = partes;
  return `${d}-${m}-${y}`;
}

// 2) Determina año fiscal (abril-marzo) a partir de fecha ISO "YYYY-MM-DD"
function determineFiscalYear(fechaISO) {
  if (!fechaISO) return null;
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return null;
  const year = parseInt(partes[0], 10);
  const month = parseInt(partes[1], 10);
  if (isNaN(year) || isNaN(month)) return null;
  return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

// 3) Calcula horas entre hora entrada y salida
function calcularHoras(entrada, salida) {
  const [h1, min1] = entrada.split(':').map(Number);
  const [h2, min2] = salida.split(':').map(Number);
  return Math.max(0, (h2 + min2 / 60) - (h1 + min1 / 60));
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

// 5) Poblar selector Mes Comercial según fechaRegistro (input type="date")
function poblarMesComercial() {
  const iso = document.getElementById('fechaRegistro').value; // "YYYY-MM-DD" o ""
  if (!iso) return;
  const partes = iso.split('-');
  if (partes.length !== 3) return;
  const year = parseInt(partes[0], 10);
  const month = parseInt(partes[1], 10);
  if (isNaN(year) || isNaN(month)) return;

  const inicioFiscal = month >= 4 ? year : year - 1;
  const finFiscal = inicioFiscal + 1;

  const sel = document.getElementById('mesComercial');
  sel.innerHTML = '';

  const optEmpty = document.createElement('option');
  optEmpty.value = '';
  optEmpty.textContent = '-- Elige mes --';
  sel.appendChild(optEmpty);

  // Abril a Diciembre de inicioFiscal
  for (let i = 4; i <= 12; i++) {
    const nombre = MESES_FISCAL.find(m => m.num === i).nombre.toUpperCase();
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${nombre} ${inicioFiscal}`;
    sel.appendChild(opt);
  }
  // Enero a Marzo de finFiscal
  for (let i = 1; i <= 3; i++) {
    const nombre = MESES_FISCAL.find(m => m.num === i).nombre.toUpperCase();
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${nombre} ${finFiscal}`;
    sel.appendChild(opt);
  }
}

// 6) Cargar comisiones en selector
async function cargarComisiones() {
  const sel = document.getElementById('comisionSelect');
  sel.innerHTML = '<option value="">-- Elige comisión --</option>';
  const { data, error } = await supabase
    .from('comisiones')
    .select('id,nombre')
    .order('nombre');
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.nombre;
    sel.appendChild(o);
  });
}

// 7) Cargar directores asignados: crea inputs type="date" para fecha prestación
async function cargarDirectoresAsignados() {
  const id = document.getElementById('comisionSelect').value;
  const cont = document.getElementById('bloquesDirectores');
  cont.innerHTML = '';
  if (!id) return;

  const { data: com, error } = await supabase
    .from('comisiones')
    .select('socio_1,socio_2,socio_3')
    .eq('id', id)
    .single();
  if (error || !com) {
    console.error(error);
    return;
  }

  const sociosIds = [com.socio_1, com.socio_2, com.socio_3].filter(Boolean);
  if (!sociosIds.length) {
    cont.innerHTML = '<p><i>Sin directores asignados.</i></p>';
    return;
  }

  const { data: socios, error: err2 } = await supabase
    .from('socios')
    .select('id,nombre')
    .in('id', sociosIds);
  if (err2) {
    console.error(err2);
    return;
  }

  socios.forEach(s => {
    const d = document.createElement('div');
    d.className = 'director-block';
    d.dataset.id = s.id;
    // Input type="date" para fecha prestación
    d.innerHTML = `
      <h4>${s.nombre}</h4>
      <label>Fecha prestación: <input type="date" id="fechaPrest_${s.id}" /></label>
      <label>Hora entrada:    <input type="time" id="horaIn_${s.id}" /></label>
      <label>Hora salida:     <input type="time" id="horaOut_${s.id}" /></label>
    `;
    cont.appendChild(d);
    // No se necesita máscara: input type="date" maneja picker nativo
  });
}

// 8) Guardar gasto: leer valores ISO de input type="date"
async function guardarGasto() {
  const fechaRegISO = document.getElementById('fechaRegistro').value; // "YYYY-MM-DD"
  if (!fechaRegISO) {
    alert('Selecciona Fecha de registro');
    return;
  }
  const mes = document.getElementById('mesComercial').value;
  const comId = document.getElementById('comisionSelect').value;
  if (!mes || !comId) {
    alert('Faltan datos obligatorios');
    return;
  }

  const blocks = document.querySelectorAll('.director-block');
  if (!blocks.length) {
    alert('Selecciona una comisión con directores.');
    return;
  }

  const regs = [];
  for (let b of blocks) {
    const sid = b.dataset.id;
    const fpISO = document.getElementById(`fechaPrest_${sid}`).value; // "YYYY-MM-DD"
    const hi = document.getElementById(`horaIn_${sid}`).value;
    const ho = document.getElementById(`horaOut_${s.id}`) ? document.getElementById(`horaOut_${sid}`).value : '';
    // Nota: asegurar que use el id correcto
    if (!fpISO) {
      alert(`Selecciona Fecha prestación para socio ${sid}`);
      return;
    }
    if (!hi || !ho) {
      alert('Completa todos los campos de hora.');
      return;
    }
    // Calcular horas y monto
    const hrs = calcularHoras(hi, ho);
    const mto = hrs * 2500;
    // Año fiscal basado en fecha registro (ISO)
    const afy = determineFiscalYear(fechaRegISO);
    regs.push({
      fecha_registro: fechaRegISO,
      mes_comercial: parseInt(mes, 10),
      comision_id: comId,
      socio_id: sid,
      fecha_prestacion: fpISO,
      horas: hrs,
      monto: mto,
      ano_fiscal: afy
    });
  }

  const { error } = await supabase.from('gasto_real_comisiones').insert(regs);
  if (error) {
    console.error(error);
    alert('Error al guardar');
    return;
  }
  alert('Guardado OK');
  cargarHistorial();
}

// 9) Cargar historial: mostrar fechas formateadas
async function cargarHistorial() {
  const mesValue = document.getElementById('mesComercial').value;
  const comId = document.getElementById('comisionSelect').value;

  let q = supabase
    .from('gasto_real_comisiones')
    .select(`
      id,
      fecha_registro,
      mes_comercial,
      monto,
      comision:comisiones(nombre),
      socio:socios(nombre),
      fecha_prestacion,
      horas
    `)
    .order('fecha_registro', { ascending: false });

  if (mesValue) q = q.eq('mes_comercial', parseInt(mesValue, 10));
  if (comId) q = q.eq('comision_id', comId);

  const { data, error } = await q;
  const tabla = document.getElementById('tablaGastosReales');
  const tbody = tabla.querySelector('tbody');
  const titulo = document.querySelector('#pantalla-rgasto-comisiones h3');

  tbody.innerHTML = '';
  const msgPrev = document.getElementById('mensajeSinDatos');
  if (msgPrev) msgPrev.remove();

  if (error) {
    console.error(error);
    tabla.style.display = 'none';
    return;
  }
  if (!data || data.length === 0) {
    tabla.style.display = 'none';
    const mensaje = document.createElement('p');
    mensaje.id = 'mensajeSinDatos';
    mensaje.textContent = 'No hay datos';
    mensaje.style.fontStyle = 'italic';
    mensaje.style.marginTop = '0.5em';
    titulo.insertAdjacentElement('afterend', mensaje);
    document.getElementById('totalMes').textContent = '0.00';
    document.getElementById('totalMesMonto').textContent = '0';
    document.getElementById('totalAnio').textContent = '0.00';
    document.getElementById('totalAnioMonto').textContent = '0';
    return;
  }

  tabla.style.display = 'table';
  let tMes = 0, tMesM = 0, tA = 0, tAM = 0;

  data.forEach(r => {
    const mf = MESES_FISCAL.find(x => x.num === r.mes_comercial);
    const fechaRegForm = formatDDMMYYYY(r.fecha_registro);
    const fechaPrestForm = formatDDMMYYYY(r.fecha_prestacion);
    const añoFiscal = determineFiscalYear(r.fecha_registro).split('-');
    const añoEtiqueta = (r.mes_comercial >= 4 ? añoFiscal[0] : añoFiscal[1]);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fechaRegForm}</td>
      <td>${(mf?.nombre.toUpperCase() || '-')} ${añoEtiqueta}</td>
      <td>${r.comision?.nombre || '-'}</td>
      <td>${r.socio?.nombre || '-'}</td>
      <td>${fechaPrestForm}</td>
      <td>${r.horas?.toFixed(2) || '0.00'}</td>
      <td>${r.monto?.toFixed(0) || '0'}</td>
      <td><button data-id="${r.id}" class="borrar">Borrar</button></td>
    `;
    tbody.appendChild(tr);

    tA += r.horas;
    tAM += r.monto;
    if (mesValue && String(r.mes_comercial) === mesValue) {
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
  fr.value = ''; // inicia vacío

  // Al cambiar fechaRegistro, poblar Mes Comercial
  fr.addEventListener('change', () => {
    poblarMesComercial();
  });

  // Cargar historial al entrar
  cargarHistorial();

  // Listeners de mesComercial y comisión
  document.getElementById('mesComercial').addEventListener('change', cargarHistorial);
  document.getElementById('comisionSelect').addEventListener('change', () => {
    cargarDirectoresAsignados();
    cargarHistorial();
  });
  // Guardar
  document.getElementById('guardarGastoBtn').addEventListener('click', guardarGasto);

  // Cargar opciones de comisiones
  cargarComisiones();
});

import { supabase } from './supabaseClient.js';

// --- Utilidades de fecha y hora ---
function formatToISO(fechaTexto) {
  // fechaTexto en formato "yyyy-mm-dd" (input type="date")
  if (!fechaTexto) return null;
  return fechaTexto; // ya está en ISO
}

function formatDDMMYYYY(fechaISO) {
  if (!fechaISO) return '-';
  const [y, m, d] = fechaISO.split('-');
  return `${d.padStart(2,'0')}-${m.padStart(2,'0')}-${y}`;
}

function calcularHoras(entrada, salida) {
  if (!entrada || !salida) return 0;
  const [h1, min1] = entrada.split(':').map(Number);
  const [h2, min2] = salida.split(':').map(Number);
  const diff = (h2 + min2/60) - (h1 + min1/60);
  return diff > 0 ? diff : 0;
}

function determineFiscalYear(fechaISO) {
  // fechaISO "yyyy-mm-dd"
  if (!fechaISO) return '';
  const [yStr, mStr] = fechaISO.split('-');
  const y = Number(yStr), m = Number(mStr);
  return m >= 4 ? `${y}-${y+1}` : `${y-1}-${y}`;
}

const MESES_FISCAL = [
  { num: 4, nombre: 'Abril' }, { num: 5, nombre: 'Mayo' }, { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' }, { num: 8, nombre: 'Agosto' }, { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' }, { num: 11, nombre: 'Noviembre' }, { num: 12, nombre: 'Diciembre' },
  { num: 1, nombre: 'Enero' }, { num: 2, nombre: 'Febrero' }, { num: 3, nombre: 'Marzo' },
];

// --- Poblar Mes Comercial según Fecha Registro ---
function poblarMesComercial() {
  const fechaRegistroVal = document.getElementById('fechaRegistro').value; // yyyy-mm-dd
  const selectMes = document.getElementById('mesComercial');
  selectMes.innerHTML = '<option value="">-- Elige mes --</option>';
  if (!fechaRegistroVal) {
    // Sin fecha, no agregamos opciones
    return;
  }
  const iso = formatToISO(fechaRegistroVal); // yyyy-mm-dd
  if (!iso) return;
  const [anioStr, mesStr] = iso.split('-');
  const anio = Number(anioStr), mes = Number(mesStr);
  const inicioFiscal = mes >= 4 ? anio : anio - 1;
  const finFiscal = inicioFiscal + 1;
  // Abril a Diciembre del inicioFiscal
  MESES_FISCAL.filter(mObj => mObj.num >= 4).forEach(mObj => {
    const texto = `${mObj.nombre.toUpperCase()} ${inicioFiscal}`;
    // value: podemos usar formato "mes-año", p.ej. "4-2024"
    selectMes.appendChild(new Option(texto, `${mObj.num}-${inicioFiscal}`));
  });
  // Enero a Marzo del finFiscal
  MESES_FISCAL.filter(mObj => mObj.num <= 3).forEach(mObj => {
    const texto = `${mObj.nombre.toUpperCase()} ${finFiscal}`;
    selectMes.appendChild(new Option(texto, `${mObj.num}-${finFiscal}`));
  });
}

// --- Cargar Comisiones en <select> ---
async function cargarComisiones() {
  const sel = document.getElementById('comisionSelect');
  sel.innerHTML = '<option value="">-- Elige comisión --</option>';
  const { data, error } = await supabase
    .from('comisiones')
    .select('id,nombre')
    .order('nombre');
  if (error) {
    console.error('Error cargando comisiones:', error);
    return;
  }
  data.forEach(c => {
    sel.appendChild(new Option(c.nombre, c.id));
  });
}

// --- Cargar Directores según Comisión elegida ---
async function cargarDirectoresAsignados() {
  const comId = document.getElementById('comisionSelect').value;
  const cont = document.getElementById('bloquesDirectores');
  cont.innerHTML = ''; // limpiamos
  if (!comId) {
    // No hay comisión elegida: dejamos el div vacío
    return;
  }
  // Obtenemos socios/directores de la comisión
  const { data: com, error } = await supabase
    .from('comisiones')
    .select('socio_1,socio_2,socio_3')
    .eq('id', comId)
    .single();
  if (error) {
    console.error('Error buscando comisión:', error);
    return;
  }
  const sociosIds = [com.socio_1, com.socio_2, com.socio_3].filter(Boolean);
  if (sociosIds.length === 0) {
    // Mostrar mensaje EXACTO: "no tiene participantes asignados"
    const p = document.createElement('p');
    p.textContent = 'No tiene participantes asignados';
    cont.appendChild(p);
    return;
  }
  // Si hay IDs de socios, consultamos sus nombres
  const { data: socios, error: err2 } = await supabase
    .from('socios')
    .select('id,nombre')
    .in('id', sociosIds);
  if (err2) {
    console.error('Error cargando socios:', err2);
    return;
  }
  // Insertar un bloque por cada director
  socios.forEach(s => {
    const d = document.createElement('div');
    d.className = 'director-block';
    d.dataset.id = s.id;
    d.innerHTML = `
      <h4>${s.nombre}</h4>
      <label>Fecha prestación: <input type="text" id="fechaPrest_${s.id}" maxlength="10" placeholder="dd-mm-aaaa" autocomplete="off"/></label>
      <label>Hora entrada: <input type="time" id="horaIn_${s.id}"/></label>
      <label>Hora salida: <input type="time" id="horaOut_${s.id}"/></label>
    `;
    cont.appendChild(d);
    aplicarFormatoFechaTexto(d.querySelector(`#fechaPrest_${s.id}`));
  });
}

// --- Aplicar formato automático dd-mm-aaaa en inputs de texto ---
function aplicarFormatoFechaTexto(input) {
  input.addEventListener('input', e => {
    let val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    if (val.length > 4) {
      val = `${val.slice(0,2)}-${val.slice(2,4)}-${val.slice(4)}`;
    } else if (val.length > 2) {
      val = `${val.slice(0,2)}-${val.slice(2)}`;
    }
    e.target.value = val;
  });
}

// --- Guardar Gasto Real ---
async function guardarGasto() {
  const fechaRegInput = document.getElementById('fechaRegistro').value; // yyyy-mm-dd
  const isoFechaReg = formatToISO(fechaRegInput);
  const mesComVal = document.getElementById('mesComercial').value; // e.g. "4-2024"
  const comId = document.getElementById('comisionSelect').value;
  if (!isoFechaReg || !mesComVal || !comId) {
    alert('Faltan datos obligatorios o fecha registro inválida');
    return;
  }
  const blocks = document.querySelectorAll('.director-block');
  if (blocks.length === 0) {
    alert('Selecciona una comisión con directores asignados');
    return;
  }
  const regs = [];
  // mesComVal: "mesNum-año", p.ej. "4-2024"
  const [mesNumStr, anioFiscalStr] = mesComVal.split('-');
  const mesNum = parseInt(mesNumStr, 10);
  const anioFiscal = anioFiscalStr;
  for (let b of blocks) {
    const sid = b.dataset.id;
    const fpTexto = document.getElementById(`fechaPrest_${sid}`).value; // "dd-mm-aaaa"
    const fpISO = formatToISO(fpTexto.split('-').reverse().join('-'));
    // OJO: formatToISO espera "yyyy-mm-dd", si tu placeholder es "dd-mm-aaaa", primero convertir:
    // "dd-mm-yyyy" -> ["dd","mm","yyyy"] -> "yyyy-mm-dd"
    if (!fpTexto || fpTexto.length !== 10 || !fpISO) {
      alert('Completa todos los campos de fecha prestación correctamente');
      return;
    }
    const hi = document.getElementById(`horaIn_${sid}`).value;
    const ho = document.getElementById(`horaOut_${sid}`).value;
    if (!hi || !ho) {
      alert('Completa horas de entrada/salida');
      return;
    }
    const horas = calcularHoras(hi, ho);
    const monto = horas * 2500;
    regs.push({
      fecha_registro: isoFechaReg,
      mes_comercial: mesNum,
      comision_id: comId,
      socio_id: sid,
      fecha_prestacion: fpISO,
      horas: horas,
      monto: monto,
      ano_fiscal: determineFiscalYear(isoFechaReg) // o usar anioFiscal si prefieres constancia
    });
  }
  const { error } = await supabase.from('gasto_real_comisiones').insert(regs);
  if (error) {
    console.error('Error al guardar gasto:', error);
    alert('Error al guardar');
    return;
  }
  alert('Guardado OK');
  cargarHistorial();
}

// --- Cargar Historial (solo rellena <tbody>, no toca encabezados ni títulos) ---
async function cargarHistorial() {
  const mesComVal = document.getElementById('mesComercial').value; // "4-2024"
  const comId = document.getElementById('comisionSelect').value;
  let q = supabase.from('gasto_real_comisiones')
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
  if (mesComVal) {
    const [mesNumStr, anioFiscalStr] = mesComVal.split('-');
    const mesNum = parseInt(mesNumStr, 10);
    // Filtramos por mes y, opcionalmente, por año fiscal: se asume que en tu tabla tienes campo ano_fiscal para filtrar
    q = q.eq('mes_comercial', mesNum).eq('ano_fiscal', anioFiscalStr);
  }
  if (comId) {
    q = q.eq('comision_id', comId);
  }
  const { data, error } = await q;
  const tbody = document.querySelector('#tablaGastosReales tbody');
  tbody.innerHTML = '';
  if (error) {
    console.error('Error cargando historial:', error);
    // Ocultar tabla si falla o mostrar mensaje aparte si deseas
    document.getElementById('tablaGastosReales').style.display = 'none';
    return;
  }
  if (!data || data.length === 0) {
    // Mostrar solo una fila con "No hay datos"
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.style.textAlign = 'center';
    td.textContent = 'No hay datos';
    tr.appendChild(td);
    tbody.appendChild(tr);
    // Totales a cero:
    document.getElementById('totalMes').textContent = '0';
    document.getElementById('totalMesMonto').textContent = '0';
    document.getElementById('totalAnio').textContent = '0';
    document.getElementById('totalAnioMonto').textContent = '0';
    return;
  }
  // Si hay datos, mostrar la tabla
  document.getElementById('tablaGastosReales').style.display = 'table';
  let totalHorasMes = 0, totalMontoMes = 0;
  let totalHorasAnio = 0, totalMontoAnio = 0;
  // Extraer año fiscal seleccionado si aplica, para total anual
  const mesComSel = mesComVal ? parseInt(mesComVal.split('-')[0],10) : null;
  const anioFiscalSel = mesComVal ? mesComVal.split('-')[1] : null;

  data.forEach(r => {
    const tr = document.createElement('tr');
    // Fecha registro
    tr.innerHTML += `<td>${formatDDMMYYYY(r.fecha_registro)}</td>`;
    // Mes: buscamos nombre en MESES_FISCAL
    const mObj = MESES_FISCAL.find(x => x.num === r.mes_comercial);
    // Determinar año a mostrar: si r.fecha_registro pertenece a mes >=4 -> inicio fiscal, else anterior
    const añoFiscalComputed = determineFiscalYear(r.fecha_registro).split('-');
    const añoEtiqueta = (r.mes_comercial >= 4 ? añoFiscalComputed[0] : añoFiscalComputed[1]);
    tr.innerHTML += `<td>${(mObj?.nombre.toUpperCase()||'-')} ${añoEtiqueta}</td>`;
    // Com.
    tr.innerHTML += `<td>${r.comision?.nombre || '-'}</td>`;
    // Director
    tr.innerHTML += `<td>${r.socio?.nombre || '-'}</td>`;
    // Día (fecha prestación)
    tr.innerHTML += `<td>${formatDDMMYYYY(r.fecha_prestacion)}</td>`;
    // Hrs
    tr.innerHTML += `<td>${(r.horas!=null ? r.horas.toFixed(2) : '0.00')}</td>`;
    // Monto
    tr.innerHTML += `<td>${(r.monto!=null ? r.monto.toFixed(0) : '0')}</td>`;
    // Acción
    tr.innerHTML += `<td><button data-id="${r.id}" class="borrar">Borrar</button></td>`;

    tbody.appendChild(tr);

    // Totales: solo sumamos si coincide mes y año fiscal seleccionado
    if (mesComSel !== null && anioFiscalSel !== null) {
      // Filtrado ya aplicado en consulta, pero por si acaso:
      totalHorasMes += r.horas || 0;
      totalMontoMes += r.monto || 0;
    }
    // Total anual: sumar todos en ese año fiscalSel
    // Suponemos que r.ano_fiscal (en la base) coincide con anioEtiqueta; si no, podemos chequear:
    const rAnoFiscal = determineFiscalYear(r.fecha_registro);
    if (anioFiscalSel && rAnoFiscal === `${anioFiscalSel}-${Number(anioFiscalSel)+1}`) {
      totalHorasAnio += r.horas || 0;
      totalMontoAnio += r.monto || 0;
    }
  });

  document.getElementById('totalMes').textContent = totalHorasMes.toFixed(2);
  document.getElementById('totalMesMonto').textContent = totalMontoMes.toFixed(0);
  document.getElementById('totalAnio').textContent = totalHorasAnio.toFixed(2);
  document.getElementById('totalAnioMonto').textContent = totalMontoAnio.toFixed(0);

  // Botones borrar
  document.querySelectorAll('#tablaGastosReales .borrar').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('¿Borrar este gasto?')) return;
      const id = btn.dataset.id;
      await supabase.from('gasto_real_comisiones').delete().eq('id', id);
      cargarHistorial();
    };
  });
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  // Formateo automático de input fechaPrest en cargarDirectoresAsignados
  aplicarFormatoFechaTexto(document.getElementById('fechaRegistro')); // aunque es type=date

  // Listeners
  document.getElementById('fechaRegistro').addEventListener('input', () => {
    poblarMesComercial();
    // limpiamos selección de mes y comisión al cambiar fecha?
    // document.getElementById('mesComercial').value = '';
    cargarHistorial();
  });
  document.getElementById('mesComercial').addEventListener('change', cargarHistorial);
  document.getElementById('comisionSelect').addEventListener('change', () => {
    cargarDirectoresAsignados();
    cargarHistorial();
  });
  document.getElementById('guardarGastoBtn').addEventListener('click', guardarGasto);

  // Carga inicial
  poblarMesComercial();
  cargarComisiones().then(() => {
    // Opcional: si hay valor inicial en comisionSelect, cargar directores
    // cargarDirectoresAsignados();
  });
  cargarHistorial();
});

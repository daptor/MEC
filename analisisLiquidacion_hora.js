// analisisLiquidacion_hora.js
// Archivo autónomo unificado (MEC_HORA) — no modifica el original.
// Añade opción "Cálculo por hora (HRA)" al <select id="jornada"> y realiza todo el flujo HRA.

(function () {
  const NS = window.MEC_HORA = window.MEC_HORA || {};

  // ==================== CONFIG ====================
  const TOLERANCIA = 1; // tolerancia monetaria (CLP)
  const SEMANAS_POR_MES = 4.3;

  // IMM tabla (completa)
  const INGRESOS_MINIMOS = {
    2020: { ENERO: 301000, FEBRERO: 301000, MARZO: 301000, ABRIL: 301000, MAYO: 301000, JUNIO: 301000, JULIO: 320500, AGOSTO: 320500, SEPTIEMBRE: 326500, OCTUBRE: 326500, NOVIEMBRE: 326500, DICIEMBRE: 326500 },
    2021: { ENERO: 326500, FEBRERO: 326500, MARZO: 326500, ABRIL: 326500, MAYO: 337000, JUNIO: 337000, JULIO: 337000, AGOSTO: 337000, SEPTIEMBRE: 337000, OCTUBRE: 337000, NOVIEMBRE: 337000, DICIEMBRE: 350000 },
    2022: { ENERO: 350000, FEBRERO: 350000, MARZO: 350000, ABRIL: 350000, MAYO: 380000, JUNIO: 380000, JULIO: 380000, AGOSTO: 400000, SEPTIEMBRE: 400000, OCTUBRE: 400000, NOVIEMBRE: 400000, DICIEMBRE: 400000 },
    2023: { ENERO: 410000, FEBRERO: 410000, MARZO: 410000, ABRIL: 410000, MAYO: 440000, JUNIO: 440000, JULIO: 440000, AGOSTO: 440000, SEPTIEMBRE: 460000, OCTUBRE: 460000, NOVIEMBRE: 460000, DICIEMBRE: 460000 },
    2024: { ENERO: 460000, FEBRERO: 460000, MARZO: 460000, ABRIL: 460000, MAYO: 460000, JUNIO: 460000, JULIO: 500000, AGOSTO: 500000, SEPTIEMBRE: 500000, OCTUBRE: 500000, NOVIEMBRE: 500000, DICIEMBRE: 500000 },
    2025: { ENERO: 510636, FEBRERO: 510636, MARZO: 510636, ABRIL: 510500, MAYO: 510500, JUNIO: 510500, JULIO: 529000, AGOSTO: 529000, SEPTIEMBRE: 529000, OCTUBRE: 529000, NOVIEMBRE: 529000, DICIEMBRE: 529000 },
    2026: { ENERO: 539000, FEBRERO: 539000, MARZO: 539000, ABRIL: 539000, MAYO: 553553, JUNIO: 553553, JULIO: 553553, AGOSTO: 553553, SEPTIEMBRE: 553553, OCTUBRE: 553553, NOVIEMBRE: 553553, DICIEMBRE: 553553 }
  };

  // ==================== UTILIDADES ====================
  function procMonto(txt) {
    if (txt === null || txt === undefined) return 0;
    return parseFloat(String(txt).replace(/\./g, '').replace(',', '.')) || 0;
  }
  function fmtCLP(v) {
    if (v === null || v === undefined || isNaN(v)) return "$0";
    return "$" + Math.round(v).toLocaleString("es-CL");
  }
  function getIMMmensual(mes, año) {
    if (!mes || !año) return 0;
    const m = mes.toUpperCase();
    return (INGRESOS_MINIMOS[año] && INGRESOS_MINIMOS[año][m]) ? INGRESOS_MINIMOS[año][m] : 0;
  }
  function obtenerJornadaMaxima(mesStr, añoNum) {
    const mesesIdx = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
    const mi = mesesIdx[(mesStr||"ENERO").toUpperCase()] || 1;
    if (añoNum > 2026 || (añoNum === 2026 && mi >= 4)) return 42;
    if (añoNum > 2024 || (añoNum === 2024 && mi >= 5)) return 44;
    return 45;
  }
  function safePdfjs() {
    return typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib.getDocument;
  }

  // resumen interno
  function addResumen(modulo, estado, diferencia = 0) {
    window._resumenHora = window._resumenHora || [];
    window._resumenHora.push({ modulo, estado, diferencia });
  }

  // ==================== EXTRAER TEXTO PDF ====================
  async function extraerTextoDePDFArchivo(file) {
    if (!safePdfjs()) throw new Error("pdfjsLib no disponible");
    const data = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    let texto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      texto += content.items.map(it => it.str).join(' ') + '\n';
    }
    return texto;
  }

  // ==================== ANALIZADOR PRINCIPAL HRA ====================
  async function analizarArchivoPorHora_autonomo(texto, jornada) {
    jornada = Number(jornada) || 0;
    if (!texto || jornada <= 0) return null;

    // extraer S.BASE PART-TIME (HRA) o fallback SUELDO BASE
    const rxHRA = /S\.?BASE\s*PART-?TIME\s*\(HRA\)\s*\$?\s*([\d\.,]+)/i;
    const mH = texto.match(rxHRA);
    let sueldo = mH ? procMonto(mH[1]) : null;
    const rxSB = /SUELDO\s*BASE.*?\$?\s*([\d\.,]+)/i;
    const mSB = texto.match(rxSB);
    if (!sueldo && mSB) sueldo = procMonto(mSB[1]);
    if (!sueldo) return null;

    const valorHora = sueldo / (jornada * SEMANAS_POR_MES);

    // fecha
    const rxFecha = /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)\s*de\s*(\d{4})/i;
    const mf = texto.match(rxFecha);
    const mes = mf ? mf[1].toUpperCase() : "ENERO";
    const año = mf ? parseInt(mf[2]) : (new Date()).getFullYear();
    const jornadaMax = obtenerJornadaMaxima(mes, año);
    const inmMensual = getIMMmensual(mes, año);
    const immPorHora = inmMensual > 0 ? inmMensual / (jornadaMax * SEMANAS_POR_MES) : 0;

    let estado = "ok", diff = 0;
    if (immPorHora > 0 && valorHora < immPorHora) { estado = "error"; diff = Math.round((immPorHora - valorHora) * 100) / 100; }
    addResumen("Sueldo por hora (HRA)", estado, diff);

    return { sueldo, valorHora, immPorHora, estado, diff, mes, año, jornadaMax };
  }

  // ==================== HORAS EXTRAS & RECARGOS ====================
  function calcularHorasExtrasYRecargos(texto, jornada, valorHora) {
    const r = {};
    const proc = procMontoLocal => procMontoLocal; // alias

    // HE 50%
    let he50 = { horas:0, pagado:0, esperado:0 };
    const mHE = texto.match(/HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    if (mHE) {
      he50.horas = parseFloat(mHE[1].replace(',', '.')) || 0;
      he50.pagado = procMonto(mHE[2]);
      he50.esperado = Math.round(valorHora * 1.5 * he50.horas * 100)/100;
      addResumen("Horas Extras 50%", Math.abs(he50.pagado - he50.esperado) < TOLERANCIA ? "ok":"error", Math.round(he50.pagado - he50.esperado));
    } else addResumen("Horas Extras 50%", "info", 0);
    r.he50 = he50;

    // HE Domingo
    let hed = { horas:0, pagado:0, esperado:0 };
    const mHED = texto.match(/HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    if (mHED) {
      hed.horas = parseFloat(mHED[1].replace(',', '.')) || 0;
      hed.pagado = procMonto(mHED[2]);
      hed.esperado = Math.round(valorHora * 1.3 * 1.5 * hed.horas * 100)/100;
      addResumen("Horas Extras Domingo", Math.abs(hed.pagado - hed.esperado) < TOLERANCIA ? "ok":"error", Math.round(hed.pagado - hed.esperado));
    } else addResumen("Horas Extras Domingo", "info", 0);
    r.hed = hed;

    // Recargo Domingo 30%
    let rdom = { horas:0, pagado:0, esperado:0 };
    const mRD = texto.match(/HORAS\s*RECARGO\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    if (mRD) {
      rdom.horas = parseFloat(mRD[1].replace(',', '.')) || 0;
      rdom.pagado = procMonto(mRD[2]);
      rdom.esperado = Math.round(valorHora * 0.3 * rdom.horas * 100)/100;
      addResumen("Recargo Domingo", Math.abs(rdom.pagado - rdom.esperado) < TOLERANCIA ? "ok":"error", Math.round(rdom.pagado - rdom.esperado));
    } else {
      const mRDS = texto.match(/HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i);
      if (mRDS) { rdom.pagado = procMonto(mRDS[1]); addResumen("Recargo Domingo", "warning", 0); }
      else addResumen("Recargo Domingo", "info", 0);
    }
    r.rdom = rdom;

    // Recargo Festivo 50%
    let rfest = { horas:0, pagado:0, esperado:0 };
    const mRF = texto.match(/RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    if (mRF) {
      rfest.horas = parseFloat(mRF[1].replace(',', '.')) || 0;
      rfest.pagado = procMonto(mRF[2]);
      rfest.esperado = Math.round(valorHora * 1.5 * rfest.horas * 100)/100;
      addResumen("Recargo Festivo 50%", Math.abs(rfest.pagado - rfest.esperado) < TOLERANCIA ? "ok":"error", Math.round(rfest.pagado - rfest.esperado));
    } else addResumen("Recargo Festivo 50%", "info", 0);
    r.rfest = rfest;

    return r;
  }

  // ==================== SEMANA CORRIDA POR HORA ====================
  function calcularSemanaCorridaPorHora(texto, jornada, valorHora, diasTotalesMov = 21) {
    jornada = Number(jornada) || 0;
    valorHora = Number(valorHora) || 0;
    let totalCom = 0;
    const listaCom = window.listaComision || [
      "COM.EFECTIVAS","COMISION CYD","CONCURSO FPAY","COMISION DIGITA Y GANA","COMISIÓN SEGURO DE VIDA","COMI. KIOSCO OTRAS EMPRESAS"
    ];
    listaCom.forEach(c => {
      try {
        const rx = new RegExp(`${c.replace('.', '\\.')}(?:\\s|\\S)*?\\$\\s*((?:\\d{1,3}\\.){0,2}\\d{1,3}(?:,\\d{1,2})?)`, 'gi');
        const matches = [...texto.matchAll(rx)];
        matches.forEach(m => totalCom += procMonto(m[1]));
      } catch(e){}
    });

    const mSem = texto.match(/SEMANA\s*CORRIDA\s*\((\d+)\)\s*\$\s*([\d.,]+)/i);
    const diasSem = mSem ? parseInt(mSem[1])||0 : null;
    const pagSem = mSem ? procMonto(mSem[2]) : 0;

    if (totalCom <= 0) { addResumen("Semana Corrida","info",0); return { aplica:false, motivo:"No hay comisiones", totalComisiones:0 }; }

    let diasBase = Math.round(diasTotalesMov||21);
    if (diasBase > 23) diasBase = 21;
    const valorDiarioCom = Math.round((totalCom / diasBase) * 100) / 100;
    const valorHoraCom = jornada>0 ? Math.round((valorDiarioCom / jornada) * 100)/100 : 0;
    const diasAplic = (diasSem !== null && diasSem>0) ? diasSem : 1;
    const esperado = Math.round(valorHoraCom * jornada * diasAplic * 100)/100;

    let estado = "info", diff = 0;
    if (pagSem && pagSem>0) { diff = Math.round((pagSem - esperado)*100)/100; estado = Math.abs(diff) < TOLERANCIA ? "ok":"error"; } else estado="warning";
    addResumen("Semana Corrida", estado, Math.abs(diff));

    return { aplica:true, totalComisiones:Math.round(totalCom*100)/100, valorHoraCom, diasSemanaCorrida:diasSem, montoSemanaCorridaPagado:pagSem, montoEsperadoSemanaCorrida:esperado, diferencia:diff, estado };
  }

  // ==================== GRATIFICACIÓN POR HORA ====================
  function calcularGratificacionPorHora(texto, jornada, valorHora) {
    jornada = Number(jornada)||0; valorHora = Number(valorHora)||0;
    if (!texto || jornada<=0 || valorHora<=0) return null;
    const mf = texto.match(/(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)\s*de\s*(\d{4})/i);
    const mes = mf?mf[1].toUpperCase():"ENERO"; const año = mf?parseInt(mf[2]):(new Date()).getFullYear();
    const inm = getIMMmensual(mes,año);
    // detectar gratificables (intento básico)
    const lista = ["BONO","PREMIO","INCENTIVO","GRATIFICACION"];
    let totalG = 0;
    lista.forEach(it => {
      const m = texto.match(new RegExp(`${it}[^\\$]*\\$\\s*([\\d\\.,]+)`, 'i'));
      if (m) totalG += procMonto(m[1]);
    });
    const sueldoMensual = Math.round(valorHora * jornada * SEMANAS_POR_MES * 100)/100;
    const sumaHaberes = Math.round((sueldoMensual + totalG)*100)/100;
    const calculo25 = Math.round(sumaHaberes*0.25);
    const topeMens = Math.round((4.75 * inm)/12);
    const jornadaMax = obtenerJornadaMaxima(mes,año);
    const topeProp = jornada>30 ? topeMens : Math.round((topeMens / jornadaMax) * jornada);
    const valorConTope = Math.round(Math.min(calculo25, topeProp));
    const valorSinTope = calculo25;
    const mGr = texto.match(/GRATIFICACION\s*25\s*%\s*(?:\(?C\.?T\.?\)?|\(?S\.?T\.?\)?)\s*\$\s*([\d.,]+)/i);
    const pag = mGr?procMonto(mGr[1]):0;
    const dCon = Math.abs(pag - valorConTope), dSin = Math.abs(pag - valorSinTope);
    let estado="ok", diff=0;
    if (pag===0) { estado="warning"; diff=Math.min(dCon,dSin); }
    else if (dCon < TOLERANCIA || dSin < TOLERANCIA) { estado="ok"; diff=Math.min(dCon,dSin); }
    else if (Math.min(dCon,dSin) <= 100) { estado="warning"; diff=Math.min(dCon,dSin); }
    else { estado="error"; diff=Math.min(dCon,dSin); }
    addResumen("Gratificación (HRA)", estado, Math.round(diff));
    return { sumaTotalHaberes:sumaHaberes, resultadoCalculado:calculo25, valorSinTope, valorConTope, topeGratificacionMensual:topeMens, gratificacionPdf:pag, estado, diferencia:diff };
  }

  // ==================== FLUJO UI: insertar opción y ejecutar análisis completo ====================
  function insertarOpcionHoraYFlujoCompleto() {
    const sel = document.getElementById('jornada');
    if (!sel) return;
    if ([...sel.options].some(o => o.value === 'HORA')) return;
    const opt = document.createElement('option');
    opt.value = 'HORA';
    opt.text = 'Cálculo por hora (HRA)';
    sel.appendChild(opt);

    sel.addEventListener('change', async function () {
      if (sel.value !== 'HORA') return;

      // validar pdfjs
      if (!safePdfjs()) { alert('Error: pdfjsLib no está cargado.'); return; }

      const archivoEl = document.getElementById('fileInput');
      if (!archivoEl || !archivoEl.files?.length) { alert('Selecciona un PDF primero.'); return; }
      const file = archivoEl.files[0];

      // pedir jornada al usuario (porque la opción HORA no contiene horas concretas)
      let jornadaInput = prompt('Ingresa la jornada (horas por semana a usar para el cálculo). Ej: 30, 40, 45', '30');
      if (jornadaInput === null) { sel.value = ""; return; }
      jornadaInput = Number(jornadaInput);
      if (isNaN(jornadaInput) || jornadaInput <= 0) { alert('Jornada inválida'); sel.value = ""; return; }

      try {
        const texto = await extraerTextoDePDFArchivo(file);

        const base = await analizarArchivoPorHora_autonomo(texto, jornadaInput);
        if (!base) { alert('No se detectó S.BASE PART-TIME (HRA) ni SUELDO BASE.'); sel.value=''; return; }

        // horas extras
        const he = calcularHorasExtrasYRecargos(texto, jornadaInput, base.valorHora);
        // semana corrida
        const sc = calcularSemanaCorridaPorHora(texto, jornadaInput, base.valorHora);
        // gratificación
        const gr = calcularGratificacionPorHora(texto, jornadaInput, base.valorHora);

        // renderizar resultados consolidados en #resultadoAnalisis
        const cont = document.getElementById('resultadoAnalisis');
        if (cont) {
          const html = `
            <h2>Analisis HRA — Resultado</h2>
            <p><strong>S.Base HRA:</strong> ${fmtCLP(base.sueldo)}</p>
            <p><strong>Valor Hora Contractual:</strong> ${fmtCLP(base.valorHora)}</p>
          <p><strong>IMM por hora (estim):</strong> ${fmtCLP(base.immPorHora)}</p>
            <hr/>
            <h4>Horas Extras y Recargos</h4>
            <ul>
              <li>HE 50% — pagado: ${fmtCLP(he.he50.pagado)} | esperado: ${fmtCLP(he.he50.esperado)}</li>
              <li>HE Domingo — pagado: ${fmtCLP(he.hed.pagado)} | esperado: ${fmtCLP(he.hed.esperado)}</li>
              <li>Recargo Domingo — pagado: ${fmtCLP(he.rdom.pagado)} | esperado: ${fmtCLP(he.rdom.esperado)}</li>
              <li>Recargo Festivo 50% — pagado: ${fmtCLP(he.rfest.pagado)} | esperado: ${fmtCLP(he.rfest.esperado)}</li>
            </ul>
            <hr/>
            <h4>Semana Corrida</h4>
            <p>Total comisiones: ${fmtCLP(sc.totalComisiones)}</p>
            <p>Monto pagado (PDF): ${fmtCLP(sc.montoSemanaCorridaPagado)}</p>
            <p>Monto esperado (calc): ${fmtCLP(sc.montoEsperadoSemanaCorrida)}</p>
            <hr/>
            <h4>Gratificación</h4>
            <p>Suma total haberes (aprox): ${fmtCLP(gr.sumaTotalHaberes)}</p>
            <p>25% calculado: ${fmtCLP(gr.resultadoCalculado)}</p>
            <p>Valor con tope: ${fmtCLP(gr.valorConTope)} | Pagado (PDF): ${fmtCLP(gr.gratificacionPdf)}</p>
          `;
          cont.innerHTML = html;
        }

        // actualizar resumen global visual si existe contenedor original
        const resumenCont = document.getElementById('resumenMecContainer');
        if (resumenCont) {
          // generar simple HTML desde window._resumenHora
          const resumen = window._resumenHora || [];
          const resumenHTML = resumen.map(it => `<div style="padding:8px;border-left:4px solid ${it.estado==='error'?'#d32f2f':it.estado==='warning'?'#f57c00':'#388e3c'};"><strong>${it.modulo}</strong><div>${it.estado}${it.diferencia? ' — Dif: '+fmtCLP(it.diferencia):''}</div></div>`).join('');
          resumenCont.innerHTML = `<h3>Resumen MEC (HRA)</h3>${resumenHTML}`;
        }

        // limpiar selección HORA para volver a flujo normal
        sel.value = "";

      } catch (err) {
        console.error('Error análisis HRA:', err);
        alert('Error procesando el PDF. Revisa la consola.');
        sel.value = "";
      }
    });
  }

  // inicializar
  setTimeout(() => {
    insertarOpcionHoraYFlujoCompleto();
  }, 300);

  // exponer API limitada
  NS.extraerTexto = extraerTextoDePDFArchivo;
  NS.analizarPorHora = analizarArchivoPorHora_autonomo;
  NS.calcularHE = calcularHorasExtrasYRecargos;
  NS.calcularSC = calcularSemanaCorridaPorHora;
  NS.calcularGrat = calcularGratificacionPorHora;
})();

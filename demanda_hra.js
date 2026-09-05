// ======================================================
// MEC — MÓDULO DEMANDA (HRA / SUELDO BASE)
// Recalcula base demandable:
//
// SC = SUELDO BASE o S.BASE PART-TIME (HRA)
//      + BONO ASISTENCIA AUT.
//      + BONO PUNTUALIDAD AUT.
//
// Soporta:
// - SUELDO BASE (30) $ 465.785
// - S.BASE PART-TIME (HRA) (86.7) $ 215.351
//
// Criterio corregido:
// - Si es sueldo mensual: usa fórmula MEC mensual.
//   valorHoraBase = (SC / 30) * (28 / (jornada * 4))
//
// - Si es part-time HRA: NO infiere jornada.
//   Usa directamente las horas HRA del PDF.
//   valorHoraBase = SC / horasHRA
//
// Ítems de sobretiempo:
// - Si el PDF trae horas, usa horas detectadas.
// - Si el PDF trae solo monto pagado, estima horas usando valor hora empresa.
// - Luego recalcula esperado usando valor hora corregido con SC.
// ======================================================

(function () {
  // -------------------- Helpers --------------------
  function procesarMontoCLP(txt) {
    // "97.042" => 97042 ; "1.250" => 1250 ; "12.345,67" => 12345.67
    return parseFloat(String(txt || "").replace(/\./g, "").replace(",", ".")) || 0;
  }

  function formatearCLP(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return "$0";
    return "$" + Math.round(valor).toLocaleString("es-CL");
  }

  function formatearNumero(valor, decimales = 3) {
    if (valor === null || valor === undefined || isNaN(valor)) return "—";
    return Number(valor).toLocaleString("es-CL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimales,
    });
  }

  function normalizarTextoPlano(s) {
    return String(s || "")
      .replace(/[^\S\r\n]+/g, " ")
      .replace(/[^\x20-\x7EÁÉÍÓÚÜÑáéíóúüñ().,%$\/\-+]/g, " ")
      .trim();
  }

  async function leerPdfComoTextoCompleto(file) {
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;

    let textoCompleto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((it) => it.str);
      textoCompleto += strings.join(" ") + "\n";
    }

    return normalizarTextoPlano(textoCompleto);
  }

function obtenerJornadaSeleccionada() {
  const selectJornada = document.getElementById("jornada");

  if (selectJornada) {
    const valor = String(selectJornada.value || "").trim();
    const texto = String(
      selectJornada.options?.[selectJornada.selectedIndex]?.text || ""
    ).trim();

    const combinado = `${valor} ${texto}`.toLowerCase();

    if (combinado.includes("44")) return 44;
    if (combinado.includes("42")) return 42;
    if (combinado.includes("40")) return 40;
    if (combinado.includes("30")) return 30;
    if (combinado.includes("25")) return 25;
    if (combinado.includes("20")) return 20;

    const numero = Number(valor.replace(",", "."));
    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  const inputHorasJornada = document.getElementById("horas-jornada");

  if (inputHorasJornada) {
    const valor = String(inputHorasJornada.value || "").trim();
    const numero = Number(valor.replace(",", "."));

    if (Number.isFinite(numero) && numero > 0) {
      return numero;
    }
  }

  return 44;
}

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function numeroSeguro(n) {
    return Number.isFinite(n) ? n : null;
  }

  function parseHoras(txt) {
    if (txt === null || txt === undefined) return null;
    const n = parseFloat(String(txt).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  // -------------------- Identificación Liquidación --------------------
  function limpiarCampoIdentificacionDemandaHRA(valor) {
    return String(valor || "")
      .replace(/\s+/g, " ")
      .replace(/\s*:\s*/g, ": ")
      .trim();
  }

  function normalizarRutDemandaHRA(rut) {
    return String(rut || "")
      .replace(/\s+/g, "")
      .replace(/[^\dkK.\-]/g, "")
      .toUpperCase()
      .trim();
  }

  function extraerPeriodoLiquidacionDemandaHRA(textoCompleto) {
    const t = String(textoCompleto || "").replace(/\s+/g, " ").trim();

    const meses =
      "ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE";

    let m = t.match(
      new RegExp("\\b(" + meses + ")\\s+DE\\s+(20\\d{2}|19\\d{2})\\b", "i")
    );

    if (!m) {
      m = t.match(
        new RegExp("\\b(" + meses + ")\\s+(20\\d{2}|19\\d{2})\\b", "i")
      );
    }

    if (!m) {
      return {
        periodoTexto: "No detectado",
        mes: "No detectado",
        anio: "No detectado",
      };
    }

    let mes = String(m[1] || "").toUpperCase();
    if (mes === "SETIEMBRE") mes = "SEPTIEMBRE";

    const anio = String(m[2] || "");

    return {
      periodoTexto: mes + " DE " + anio,
      mes,
      anio,
    };
  }

  function extraerRutDemandaHRA(textoCompleto) {
    const t = String(textoCompleto || "").replace(/\s+/g, " ").trim();

    const m = t.match(/\b(\d{1,2}\.\d{3}\.\d{3}-[\dkK])\b/);

    if (!m) {
      const mSinPuntos = t.match(/\b(\d{7,8}-[\dkK])\b/);
      return mSinPuntos ? normalizarRutDemandaHRA(mSinPuntos[1]) : "";
    }

    return normalizarRutDemandaHRA(m[1]);
  }

  function extraerNombreTrabajadorDemandaHRA(textoCompleto, rutDetectado) {
    const t = String(textoCompleto || "").replace(/\s+/g, " ").trim();
    const rut = rutDetectado ? rutDetectado.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";

    const patrones = [
      /\bNOMBRE\s+RUT\s+SUELDO\s+BASE\s+([A-ZÁÉÍÓÚÜÑ\s]+?)\s+\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/i,
      /\bNOMBRE\s+RUT\s+([A-ZÁÉÍÓÚÜÑ\s]+?)\s+\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/i,
      /\bTRABAJADOR\s*:?\s*([A-ZÁÉÍÓÚÜÑ\s]+?)\s+\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/i,
      /\bNOMBRE\s*:?\s*([A-ZÁÉÍÓÚÜÑ\s]+?)\s+(?:RUT|RUN)\s*:?\s*\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/i,
    ];

    for (const re of patrones) {
      const m = t.match(re);
      if (m && m[1]) {
        const nombre = limpiarCampoIdentificacionDemandaHRA(m[1])
          .replace(/\b(SUELDO|BASE|RUT|RUN|FECHA|INGRESO|CARGO)\b.*$/i, "")
          .trim();

        if (nombre.length >= 5) return nombre;
      }
    }

    if (rut) {
      const idx = t.search(new RegExp(rut, "i"));
      if (idx > 0) {
        const antesRut = t.slice(Math.max(0, idx - 120), idx).trim();
        const palabras = antesRut.split(" ").filter(Boolean);

        const posibles = palabras
          .slice(-6)
          .join(" ")
          .replace(/\b(NOMBRE|RUT|RUN|SUELDO|BASE|LIQUIDACION|REMUNERACION|REMUNERACIONES)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        if (posibles.length >= 5) return posibles;
      }
    }

    return "No detectado";
  }

function extraerCargoDemandaHRA(textoCompleto) {
  const textoOriginal = String(textoCompleto || "");

  const lineas = textoOriginal
    .split(/\r?\n/)
    .map(function (linea) {
      return normalizarTextoPlano(linea || "")
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter(Boolean);

  function limpiarCargoDetectado(valor) {
    let cargo = String(valor || "")
      .replace(/\s+/g, " ")
      .trim();

    cargo = cargo
      .replace(/^\s*[:\-]\s*/, "")
      .replace(/\bCARGO\b\s*[:\-]?\s*/i, "")
      .replace(/\bAFP\b.*$/i, "")
      .replace(/\bFECHA\s+INGRESO\b.*$/i, "")
      .replace(/\b(PROVIDA|HABITAT|CAPITAL|CUPRUM|MODELO|PLANVITAL|UNO)\b.*$/i, "")
      .replace(/\b(FONASA|ISAPRE|CONSALUD|BANMEDICA|BANMÉDICA|CRUZ\s+BLANCA|COLMENA|VIDA\s+TRES|NUEVA\s+MASVIDA)\b.*$/i, "")
      .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cargo) return "";

    if (cargo.length < 3 || cargo.length > 80) return "";

    if (/^\d+$/.test(cargo)) return "";

    if (
      /\b(NOMBRE|RUT|RUN|SUELDO|BASE|CENTRO|COSTO|ISAPRE|DIAS|DÍAS|CARGAS|HABERES|DESCUENTOS|TOTAL|LIQUIDACION|LIQUIDACIÓN)\b/i.test(
        cargo
      )
    ) {
      return "";
    }

    return cargo.toUpperCase();
  }

  /*
    Caso Falabella observado:

    CARGO AFP FECHA INGRESO
    CAJERA(O) - EMPAQUE PROVIDA 20/09/2022

    El cargo está en la línea siguiente, antes de la AFP y la fecha.
  */
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    if (
      /\bCARGO\b/i.test(linea) &&
      /\bAFP\b/i.test(linea) &&
      /\bFECHA\s+INGRESO\b/i.test(linea)
    ) {
      const lineaValores = lineas[i + 1] || "";

      if (lineaValores) {
        const cargo = limpiarCargoDetectado(lineaValores);

        if (cargo) {
          return cargo;
        }
      }
    }
  }

  /*
    Caso directo:
    CARGO: CAJERA(O) - EMPAQUE
    o
    CARGO CAJERA(O) - EMPAQUE AFP PROVIDA
  */
  const textoPlano = normalizarTextoPlano(textoOriginal)
    .replace(/\s+/g, " ")
    .trim();

  const patronesDirectos = [
    /\bCARGO\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ0-9()\/.,\-\s]{3,80}?)(?=\s+(?:AFP|FECHA|RUT|RUN|NOMBRE|CENTRO|ISAPRE|FONASA|SUELDO|HABERES|DESCUENTOS|TOTAL)\b|$)/i,

    /\bPUESTO\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ0-9()\/.,\-\s]{3,80}?)(?=\s+(?:AFP|FECHA|RUT|RUN|NOMBRE|CENTRO|ISAPRE|FONASA|SUELDO|HABERES|DESCUENTOS|TOTAL)\b|$)/i,

    /\bFUNCI[OÓ]N\s*[:\-]?\s*([A-ZÁÉÍÓÚÜÑ0-9()\/.,\-\s]{3,80}?)(?=\s+(?:AFP|FECHA|RUT|RUN|NOMBRE|CENTRO|ISAPRE|FONASA|SUELDO|HABERES|DESCUENTOS|TOTAL)\b|$)/i,
  ];

  for (const re of patronesDirectos) {
    const m = textoPlano.match(re);

    if (m && m[1]) {
      const cargo = limpiarCargoDetectado(m[1]);

      if (cargo) {
        return cargo;
      }
    }
  }

  /*
    Fallback específico por estructura completa:
    NOMBRE RUT SUELDO BASE
    trabajador rut sueldo
    CARGO AFP FECHA INGRESO
    cargo afp fecha
  */
  const patronEstructuraFalabella =
    /\bCARGO\s+AFP\s+FECHA\s+INGRESO\s+([A-ZÁÉÍÓÚÜÑ0-9()\/.,\-\s]{3,80}?)\s+(?:PROVIDA|HABITAT|CAPITAL|CUPRUM|MODELO|PLANVITAL|UNO)\s+\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/i;

  const mFalabella = textoPlano.match(patronEstructuraFalabella);

  if (mFalabella && mFalabella[1]) {
    const cargo = limpiarCargoDetectado(mFalabella[1]);

    if (cargo) {
      return cargo;
    }
  }

  return "No detectado";
}


  function extraerIdentificacionLiquidacionDemandaHRA(textoCompleto) {
    const periodo = extraerPeriodoLiquidacionDemandaHRA(textoCompleto);
    const rutTrabajador = extraerRutDemandaHRA(textoCompleto);
    const nombreTrabajador = extraerNombreTrabajadorDemandaHRA(
      textoCompleto,
      rutTrabajador
    );
    const cargo = extraerCargoDemandaHRA(textoCompleto);

const identificacionIncompleta =
  nombreTrabajador === "No detectado" ||
  !rutTrabajador ||
  periodo.periodoTexto === "No detectado" ||
  cargo === "No detectado";

    return {
      nombreTrabajador: nombreTrabajador || "No detectado",
      rutTrabajador: rutTrabajador || "No detectado",
      periodoTexto: periodo.periodoTexto || "No detectado",
      mes: periodo.mes || "No detectado",
      anio: periodo.anio || "No detectado",
      cargo: cargo || "No detectado",
      identificacionIncompleta,
      advertenciaIdentificacion: identificacionIncompleta
        ? "No fue posible detectar todos los datos identificatorios de la liquidación. Revisa trabajador, RUT, periodo y cargo antes de usar este informe en un acumulado."
        : "",
    };
  }

  function slugArchivoDemandaHRA(valor) {
    return String(valor || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }


  // -------------------- Extractores Base Demanda --------------------
  function extraerMontoPorGlosa(textoCompleto, glosaRegex) {
    const m = String(textoCompleto || "").match(glosaRegex);
    if (!m) return 0;

    // Usa el último grupo capturado no vacío.
    for (let i = m.length - 1; i >= 1; i--) {
      if (m[i] !== undefined && m[i] !== null && String(m[i]).trim() !== "") {
        return procesarMontoCLP(m[i]);
      }
    }

    return 0;
  }

  function extraerSueldoBasePartTimeHRA(textoCompleto) {
    const t = String(textoCompleto || "");

    const re =
      /S\.?\s*BASE\s+PART-?TIME\s*\(HRA\)\s*\(?\s*([0-9]+(?:[.,][0-9]+)?)\s*\)?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i;

    const m = t.match(re);
    if (!m) return null;

    const horas = parseHoras(m[1]);
    const monto = procesarMontoCLP(m[2]);

    return {
      tipo: "part-time-hra",
      glosa: "S.BASE PART-TIME (HRA)",
      dias: null,
      horas: numeroSeguro(horas),
      monto: monto || 0,
    };
  }

  function extraerSueldoBaseMensual(textoCompleto) {
    const t = String(textoCompleto || "");

    const re =
      /\bSUELDO\s+BASE\s*(?:\(\s*([0-9]+(?:[.,][0-9]+)?)\s*\))?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i;

    const m = t.match(re);
    if (!m) return null;

    const dias = m[1] != null ? parseHoras(m[1]) : null;
    const monto = procesarMontoCLP(m[2]);

    return {
      tipo: "mensual",
      glosa: "SUELDO BASE",
      dias: numeroSeguro(dias),
      horas: null,
      monto: monto || 0,
    };
  }

  function extraerSueldoBaseDemanda(textoCompleto) {
    const sbHRA = extraerSueldoBasePartTimeHRA(textoCompleto);
    if (sbHRA && sbHRA.monto > 0) return sbHRA;

    const sbMensual = extraerSueldoBaseMensual(textoCompleto);
    if (sbMensual && sbMensual.monto > 0) return sbMensual;

    return {
      tipo: "no-detectado",
      glosa: "No detectado",
      dias: null,
      horas: null,
      monto: 0,
    };
  }

  function extraerBonoAsistenciaAut(textoCompleto) {
    return extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s+ASISTENCIA\s+AUT\.?.{0,50}?\$\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );
  }

  function extraerBonoPuntualidadAut(textoCompleto) {
    return extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s+PUNTUALIDAD\s+AUT\.?.{0,50}?\$\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );
  }

  function normalizarBonosPactados(baut, bpaut) {
    let bautNorm = baut || 0;
    let bpautNorm = bpaut || 0;

    if (bautNorm === 0 && bpautNorm > 0) {
      bautNorm = bpautNorm;
    }

    if (bpautNorm === 0 && bautNorm > 0) {
      bpautNorm = bautNorm;
    }

    const ambosCero = bautNorm === 0 && bpautNorm === 0;

    return {
      bautNorm,
      bpautNorm,
      ambosCero,
    };
  }

  function normalizarSueldoBaseMensualPorDias(sueldoBaseObj) {
  const tipo = sueldoBaseObj.tipo;
  const sueldoBaseDetectado = sueldoBaseObj.monto || 0;
  const diasBaseDetectados = sueldoBaseObj.dias ?? null;

  let sueldoBaseNormalizado = sueldoBaseDetectado;
  let sueldoBaseFueNormalizado = false;
  let advertenciaSueldoBase = "";

  if (
    tipo === "mensual" &&
    sueldoBaseDetectado > 0 &&
    diasBaseDetectados != null &&
    diasBaseDetectados > 0 &&
    diasBaseDetectados < 30
  ) {
    sueldoBaseNormalizado = Math.round((sueldoBaseDetectado / diasBaseDetectados) * 30);
    sueldoBaseFueNormalizado = true;

    advertenciaSueldoBase =
      "La liquidación informa menos de 30 días pagados. El sueldo base fue proyectado a 30 días para calcular correctamente el Sueldo Convenido.";
  }

  return {
    sueldoBaseNormalizado,
    sueldoBaseFueNormalizado,
    advertenciaSueldoBase,
  };
}


function extraerSC(textoCompleto) {
  const sueldoBaseObj = extraerSueldoBaseDemanda(textoCompleto);

  const sueldoBaseDetectado = sueldoBaseObj.monto || 0;
  const horasBaseDetectadas = sueldoBaseObj.horas ?? null;
  const diasBaseDetectados = sueldoBaseObj.dias ?? null;
  const tipoSueldoBase = sueldoBaseObj.tipo;
  const glosaSueldoBase = sueldoBaseObj.glosa;

  const normalizacionSB = normalizarSueldoBaseMensualPorDias(sueldoBaseObj);

  const sueldoBaseNormalizado = normalizacionSB.sueldoBaseNormalizado;
  const sueldoBaseFueNormalizado = normalizacionSB.sueldoBaseFueNormalizado;
  const advertenciaSueldoBase = normalizacionSB.advertenciaSueldoBase;

  const baut = extraerBonoAsistenciaAut(textoCompleto);
  const bpaut = extraerBonoPuntualidadAut(textoCompleto);

  const bonosDetectadosEnPdf = baut > 0 || bpaut > 0;

  /*
    Criterio corregido:
    Si la liquidación mensual tiene menos de 30 días pagados y el sueldo base fue
    normalizado a 30 días, los bonos de asistencia/puntualidad detectados en PDF
    pueden estar proporcionalizados.

    Por eso NO se usan automáticamente como bonos pactados mensuales.
    Se muestran como detectados en PDF, pero para el SC inicial se usan $0
    hasta que el usuario ingrese manualmente el monto pactado mensual.
  */
  const bonosProporcionalesPorLiquidacionParcial =
    tipoSueldoBase === "mensual" &&
    sueldoBaseFueNormalizado &&
    diasBaseDetectados != null &&
    diasBaseDetectados > 0 &&
    diasBaseDetectados < 30 &&
    bonosDetectadosEnPdf;

  let bautNorm = 0;
  let bpautNorm = 0;
  let ambosCero = false;
  let requiereBonosManual = false;
  let advertenciaBonos = "";

  if (bonosProporcionalesPorLiquidacionParcial) {
    bautNorm = 0;
    bpautNorm = 0;
    ambosCero = false;
    requiereBonosManual = true;

    advertenciaBonos =
      "La liquidación informa menos de 30 días pagados y contiene bonos de asistencia y/o puntualidad. Esos montos pueden estar proporcionalizados, por lo que no se consideran automáticamente como bonos pactados mensuales para el Sueldo Convenido. Ingresa manualmente los bonos pactados mensuales si corresponde.";
  } else {
    const bonosNorm = normalizarBonosPactados(baut, bpaut);

    bautNorm = bonosNorm.bautNorm;
    bpautNorm = bonosNorm.bpautNorm;
    ambosCero = bonosNorm.ambosCero;
    requiereBonosManual = ambosCero;

    advertenciaBonos = ambosCero
      ? "Ambos bonos aparecen en $0 en esta liquidación. No se debe asumir que no existen; pueden no haberse pagado por licencia, ausencia, atraso u otra causa. Ingresa los bonos pactados para recalcular el Sueldo Convenido."
      : "";
  }

  const sc = sueldoBaseNormalizado + bautNorm + bpautNorm;

  return {
    tipoSueldoBase,
    glosaSueldoBase,

    sueldoBaseDetectado,
    sueldoBaseNormalizado,
    sueldoBaseFueNormalizado,
    advertenciaSueldoBase,

    horasBaseDetectadas,
    diasBaseDetectados,

    sb11: sueldoBaseNormalizado,
    sbHRA_horas: horasBaseDetectadas,

    baut,
    bpaut,

    bautNorm,
    bpautNorm,
    ambosCero,
    requiereBonosManual,
    bonosProporcionalesPorLiquidacionParcial,
    advertenciaBonos,

    sc,
  };
}

  // -------------------- Extractores Sobretiempo --------------------
  function extraerItemConHoras(texto, regex) {
    const m = String(texto || "").match(regex);
    if (!m) {
      return {
        horas: null,
        pagado: 0,
        tieneHoras: false,
        encontrado: false,
      };
    }

    return {
      horas: parseHoras(m[1]),
      pagado: procesarMontoCLP(m[2]),
      tieneHoras: true,
      encontrado: true,
    };
  }

  function extraerItemSoloMonto(texto, regex) {
    const m = String(texto || "").match(regex);
    if (!m) {
      return {
        pagado: 0,
        encontrado: false,
      };
    }

    return {
      pagado: procesarMontoCLP(m[1]),
      encontrado: true,
    };
  }

  function extraerSobretiempoPagado(textoCompleto) {
    const t = String(textoCompleto || "");

    // HORAS EXTRAS 50%
    const hxConHoras = extraerItemConHoras(
      t,
      /HORAS\s*EXTRAS\s*50\s*%\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const hxSinHoras = !hxConHoras.encontrado
      ? extraerItemSoloMonto(
          t,
          /HORAS\s*EXTRAS\s*50\s*%\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
        )
      : { pagado: 0, encontrado: false };

    // HORAS EXTRAS DOMINGO
    const hxdConHoras = extraerItemConHoras(
      t,
      /HORAS\s*EXTRAS\s*DOMINGO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const hxdSinHoras = !hxdConHoras.encontrado
      ? extraerItemSoloMonto(
          t,
          /HORAS\s*EXTRAS\s*DOMINGO\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
        )
      : { pagado: 0, encontrado: false };

    // HORAS RECARGO DOMINGO
    const rdConHoras = extraerItemConHoras(
      t,
      /HORAS\s*RECARGO\s*DOMINGO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const rdSinHoras = !rdConHoras.encontrado
      ? extraerItemSoloMonto(
          t,
          /HORAS\s*RECARGO\s*DOMINGO\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
        )
      : { pagado: 0, encontrado: false };

    // RECARGO 50% FESTIVO
    const rfConHoras = extraerItemConHoras(
      t,
      /RECARGO\s*50\s*%\s*FESTIVO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const rfSinHoras = !rfConHoras.encontrado
      ? extraerItemSoloMonto(
          t,
          /RECARGO\s*50\s*%\s*FESTIVO\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
        )
      : { pagado: 0, encontrado: false };

    return {
      horasExtras50: hxConHoras.horas,
      pagadoHorasExtras50: hxConHoras.encontrado
        ? hxConHoras.pagado
        : hxSinHoras.pagado,
      horasExtras50TieneHoras: hxConHoras.tieneHoras,
      horasExtras50Encontrado: hxConHoras.encontrado || hxSinHoras.encontrado,

      horasExtrasDomingo: hxdConHoras.horas,
      pagadoHorasExtrasDomingo: hxdConHoras.encontrado
        ? hxdConHoras.pagado
        : hxdSinHoras.pagado,
      horasExtrasDomingoTieneHoras: hxdConHoras.tieneHoras,
      horasExtrasDomingoEncontrado:
        hxdConHoras.encontrado || hxdSinHoras.encontrado,

      horasRecargoDomingo: rdConHoras.horas,
      pagadoRecargoDomingo: rdConHoras.encontrado
        ? rdConHoras.pagado
        : rdSinHoras.pagado,
      recargoDomingoTieneHoras: rdConHoras.tieneHoras,
      recargoDomingoEncontrado: rdConHoras.encontrado || rdSinHoras.encontrado,

      horasRecargoFestivo: rfConHoras.horas,
      pagadoRecargoFestivo: rfConHoras.encontrado
        ? rfConHoras.pagado
        : rfSinHoras.pagado,
      recargoFestivoTieneHoras: rfConHoras.tieneHoras,
      recargoFestivoEncontrado: rfConHoras.encontrado || rfSinHoras.encontrado,
    };
  }

  // -------------------- Cálculo Valor Hora --------------------
  function calcularValorHoraMensualMEC(sueldoMensual, jornadaHorasSemana) {
    if (!sueldoMensual || sueldoMensual <= 0) return null;
    if (!jornadaHorasSemana || jornadaHorasSemana <= 0) return null;

    return (sueldoMensual / 30) * (28 / (Number(jornadaHorasSemana) * 4));
  }

  function calcularValorHoraHRA(sueldoConvenido, horasHRA) {
    if (!sueldoConvenido || sueldoConvenido <= 0) return null;
    if (!horasHRA || horasHRA <= 0) return null;

    return sueldoConvenido / horasHRA;
  }

  function calcularValorHoraBaseDemanda(params) {
    const { tipoSueldoBase, sc, horasBaseDetectadas, jornada } = params;

    if (tipoSueldoBase === "part-time-hra") {
      const valorHoraBase = calcularValorHoraHRA(sc, horasBaseDetectadas);

      return {
        valorHoraBase,
        metodoCalculo: "part-time-hra",
        descripcionMetodo:
          "Part-time HRA: valorHoraBase = SC / horas HRA detectadas en el PDF.",
        warning:
          valorHoraBase == null
            ? "No se pudo calcular valor hora HRA porque no se detectaron horas HRA válidas."
            : "",
      };
    }

    if (tipoSueldoBase === "mensual") {
      const valorHoraBase = calcularValorHoraMensualMEC(sc, jornada);

      return {
        valorHoraBase,
        metodoCalculo: "mensual-mec",
        descripcionMetodo:
          "Sueldo mensual: valorHoraBase = (SC / 30) × (28 / (jornada × 4)).",
        warning:
          valorHoraBase == null
            ? "No se pudo calcular valor hora mensual porque no se detectó jornada semanal válida."
            : "",
      };
    }

    return {
      valorHoraBase: null,
      metodoCalculo: "no-detectado",
      descripcionMetodo:
        "No se pudo determinar método de cálculo porque no se detectó sueldo base válido.",
      warning:
        "No se detectó sueldo base válido. No es posible calcular valor hora.",
    };
  }

  function calcularValorHoraEmpresaMEC(baseEmpresa, tipoBase, horasBaseDetectadas, jornadaHorasSemana) {
    /*
      Usa la base que aparentemente usó la empresa, sin bonos pactados normalizados.

      Para HRA:
      valorHoraEmpresa = sueldoBaseDetectado / horasHRA

      Para mensual:
      valorHoraEmpresa = (sueldoBaseDetectado / 30) × (28 / (jornada × 4))
    */

    if (!baseEmpresa || baseEmpresa <= 0) return null;

    if (tipoBase === "part-time-hra") {
      if (!horasBaseDetectadas || horasBaseDetectadas <= 0) return null;
      return baseEmpresa / horasBaseDetectadas;
    }

    if (tipoBase === "mensual") {
      if (!jornadaHorasSemana || jornadaHorasSemana <= 0) return null;
      return (baseEmpresa / 30) * (28 / (Number(jornadaHorasSemana) * 4));
    }

    return null;
  }

  function estimarHorasDesdeMonto(pagado, valorHoraEmpresa, factor) {
    if (!pagado || pagado <= 0) return null;
    if (!valorHoraEmpresa || valorHoraEmpresa <= 0) return null;
    if (!factor || factor <= 0) return null;

    const horas = pagado / (valorHoraEmpresa * factor);

    return Number.isFinite(horas) && horas > 0 ? horas : null;
  }

  function construirHorasEstimadas(st, valorHoraEmpresa) {
    return {
      horasExtras50:
        st.horasExtras50 == null && st.pagadoHorasExtras50 > 0
          ? estimarHorasDesdeMonto(st.pagadoHorasExtras50, valorHoraEmpresa, 1.5)
          : null,

      horasExtrasDomingo:
        st.horasExtrasDomingo == null && st.pagadoHorasExtrasDomingo > 0
          ? estimarHorasDesdeMonto(
              st.pagadoHorasExtrasDomingo,
              valorHoraEmpresa,
              1.3 * 1.5
            )
          : null,

      horasRecargoDomingo:
        st.horasRecargoDomingo == null && st.pagadoRecargoDomingo > 0
          ? estimarHorasDesdeMonto(st.pagadoRecargoDomingo, valorHoraEmpresa, 0.3)
          : null,

      horasRecargoFestivo:
        st.horasRecargoFestivo == null && st.pagadoRecargoFestivo > 0
          ? estimarHorasDesdeMonto(st.pagadoRecargoFestivo, valorHoraEmpresa, 1.5)
          : null,
    };
  }

  function calcularEsperados(st, valorHoraBase, horasEstimadas) {
    horasEstimadas = horasEstimadas || {};

    const horasExtras50Usadas =
      st.horasExtras50 != null ? st.horasExtras50 : horasEstimadas.horasExtras50;

    const horasExtrasDomingoUsadas =
      st.horasExtrasDomingo != null
        ? st.horasExtrasDomingo
        : horasEstimadas.horasExtrasDomingo;

    const horasRecargoDomingoUsadas =
      st.horasRecargoDomingo != null
        ? st.horasRecargoDomingo
        : horasEstimadas.horasRecargoDomingo;

    const horasRecargoFestivoUsadas =
      st.horasRecargoFestivo != null
        ? st.horasRecargoFestivo
        : horasEstimadas.horasRecargoFestivo;

    return {
      horasExtras50:
        valorHoraBase != null && horasExtras50Usadas != null
          ? valorHoraBase * 1.5 * horasExtras50Usadas
          : null,

      horasExtrasDomingo:
        valorHoraBase != null && horasExtrasDomingoUsadas != null
          ? valorHoraBase * 1.3 * 1.5 * horasExtrasDomingoUsadas
          : null,

      recargoDomingo:
        valorHoraBase != null && horasRecargoDomingoUsadas != null
          ? valorHoraBase * 0.3 * horasRecargoDomingoUsadas
          : null,

      recargoFestivo:
        valorHoraBase != null && horasRecargoFestivoUsadas != null
          ? valorHoraBase * 1.5 * horasRecargoFestivoUsadas
          : null,

      horasUsadas: {
        horasExtras50: horasExtras50Usadas,
        horasExtrasDomingo: horasExtrasDomingoUsadas,
        horasRecargoDomingo: horasRecargoDomingoUsadas,
        horasRecargoFestivo: horasRecargoFestivoUsadas,
      },

      horasSonEstimadas: {
        horasExtras50:
          st.horasExtras50 == null && horasEstimadas.horasExtras50 != null,
        horasExtrasDomingo:
          st.horasExtrasDomingo == null &&
          horasEstimadas.horasExtrasDomingo != null,
        horasRecargoDomingo:
          st.horasRecargoDomingo == null &&
          horasEstimadas.horasRecargoDomingo != null,
        horasRecargoFestivo:
          st.horasRecargoFestivo == null &&
          horasEstimadas.horasRecargoFestivo != null,
      },
    };
  }

  function calcularDiferencias(st, esperado) {
    return {
      horasExtras50:
        esperado.horasExtras50 != null
          ? esperado.horasExtras50 - st.pagadoHorasExtras50
          : null,

      horasExtrasDomingo:
        esperado.horasExtrasDomingo != null
          ? esperado.horasExtrasDomingo - st.pagadoHorasExtrasDomingo
          : null,

      recargoDomingo:
        esperado.recargoDomingo != null
          ? esperado.recargoDomingo - st.pagadoRecargoDomingo
          : null,

      recargoFestivo:
        esperado.recargoFestivo != null
          ? esperado.recargoFestivo - st.pagadoRecargoFestivo
          : null,
    };
  }

    function calcularTotalesDemandaHRA(st, esperado, difs) {
    const totalPagadoEmpresa =
      (st.horasExtras50Encontrado ? st.pagadoHorasExtras50 || 0 : 0) +
      (st.horasExtrasDomingoEncontrado ? st.pagadoHorasExtrasDomingo || 0 : 0) +
      (st.recargoDomingoEncontrado ? st.pagadoRecargoDomingo || 0 : 0) +
      (st.recargoFestivoEncontrado ? st.pagadoRecargoFestivo || 0 : 0);

    const totalEsperadoSC =
      (esperado.horasExtras50 != null ? esperado.horasExtras50 : 0) +
      (esperado.horasExtrasDomingo != null ? esperado.horasExtrasDomingo : 0) +
      (esperado.recargoDomingo != null ? esperado.recargoDomingo : 0) +
      (esperado.recargoFestivo != null ? esperado.recargoFestivo : 0);

    const totalDiferenciaAdeudada =
      (difs.horasExtras50 != null ? difs.horasExtras50 : 0) +
      (difs.horasExtrasDomingo != null ? difs.horasExtrasDomingo : 0) +
      (difs.recargoDomingo != null ? difs.recargoDomingo : 0) +
      (difs.recargoFestivo != null ? difs.recargoFestivo : 0);

    return {
      totalPagadoEmpresa,
      totalEsperadoSC,
      totalDiferenciaAdeudada,
    };
  }


  function notaHorasItem(encontrado, horasDetectadas, horasUsadas, esEstimado) {
    if (esEstimado && horasUsadas != null) {
      return (
        "Horas estimadas desde monto pagado empresa: " +
        formatearNumero(horasUsadas, 2)
      );
    }

    if (horasDetectadas != null) {
      return "Horas detectadas en PDF: " + formatearNumero(horasDetectadas, 3);
    }

    if (encontrado) {
      return "Ítem encontrado, pero no fue posible estimar horas.";
    }

    return "No encontrado";
  }

  function filaComparacion(nombre, pagado, esp, dif, notaExtra) {
    const estado = esp == null ? "⚪" : Math.abs(dif) < 1 ? "🟢" : "🔴";
    const difTxt = dif == null ? "—" : formatearCLP(dif);
    const espTxt = esp == null ? "—" : formatearCLP(esp);

    return (
      "<tr>" +
      '<td style="padding:8px; border-bottom:1px solid #eee;">' +
      estado +
      " " +
      escapeHtml(nombre) +
      (notaExtra
        ? '<div style="font-size:12px;color:#6b7280;">' +
          escapeHtml(notaExtra) +
          "</div>"
        : "") +
      "</td>" +
      '<td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">' +
      formatearCLP(pagado || 0) +
      "</td>" +
      '<td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">' +
      espTxt +
      "</td>" +
      '<td style="padding:8px; border-bottom:1px solid #eee; text-align:right;"><strong>' +
      difTxt +
      "</strong></td>" +
      "</tr>"
    );
  }

  // Guardamos el último estado para permitir recalcular bonos manuales
  let __demandaCtx = null;

  // Guardamos el último reporte generado para poder descargar informe individual HTML
  let __ultimoReporteDemandaHRA = null;
  let __ultimoReporteDemandaHRAHtml = "";

  // Etapa 3 — Acumulador interno de reportes Demanda HRA
  let __acumuladoDemandaHRA = [];


  // -------------------- Render / Recalc --------------------
  function renderReporte(contenedor, data) {
    __ultimoReporteDemandaHRA = data;
    __ultimoReporteDemandaHRAHtml = generarHtmlInformeIndividualDemandaHRA(data);

const {

  jornada,

  tipoSueldoBase,

  glosaSueldoBase,

  sueldoBaseDetectado,
  sueldoBaseNormalizado,
  sueldoBaseFueNormalizado,
  advertenciaSueldoBase,

  horasBaseDetectadas,
  diasBaseDetectados,

  baut,
  bpaut,
  bautNorm,
  bpautNorm,
  ambosCero,
  requiereBonosManual,
  bonosProporcionalesPorLiquidacionParcial,
  advertenciaBonos,

  sc,
  valorHoraBase,
  valorHoraEmpresa,
  metodoCalculo,
  descripcionMetodo,
  warningCalculo,

  st,
  esperado,
  difs,
  totales,
} = data;


    const requiereIngresoManualBonos = !!data.requiereBonosManual;
      const idLiq = data.identificacion || {};

    const bloqueIdentificacionLiquidacion = `
      <div style="margin-bottom:12px; padding:12px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:10px;">
        <div style="font-weight:700; color:#1e3a8a; margin-bottom:8px;">
          Identificación de la liquidación
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:13px;">
          <div>
            <span style="color:#6b7280;">Trabajador:</span>
            <strong>${escapeHtml(idLiq.nombreTrabajador || "No detectado")}</strong>
          </div>

          <div>
            <span style="color:#6b7280;">RUT:</span>
            <strong>${escapeHtml(idLiq.rutTrabajador || "No detectado")}</strong>
          </div>

          <div>
            <span style="color:#6b7280;">Periodo:</span>
            <strong>${escapeHtml(idLiq.periodoTexto || "No detectado")}</strong>
          </div>

          <div>
            <span style="color:#6b7280;">Cargo:</span>
            <strong>${escapeHtml(idLiq.cargo || "No detectado")}</strong>
          </div>
        </div>

        ${
          idLiq.advertenciaIdentificacion
            ? `
              <div style="margin-top:8px; font-size:12px; color:#92400e;">
                ${escapeHtml(idLiq.advertenciaIdentificacion)}
              </div>
            `
            : ""
        }
      </div>
    `;

    const bloqueInputManual = requiereIngresoManualBonos
      ? `
        <div style="margin-top:10px; padding:10px; border:1px solid #fde68a; background:#fffbeb; border-radius:10px;">
          <div style="color:#92400e; font-weight:700; margin-bottom:6px;">
            ⚠ Bonos pactados requieren ingreso manual
          </div>
          <div style="font-size:12px; color:#92400e; margin-bottom:8px;">
            ${
              sueldoBaseFueNormalizado
                ? "Esta liquidación tiene menos de 30 días pagados. Los bonos detectados en PDF pueden estar proporcionalizados, por lo que no se usan automáticamente para calcular el Sueldo Convenido mensual."
                : "No se puede inferir el valor pactado solo con este PDF. Puedes ingresar el bono pactado para recalcular."
            }
            Si ambos bonos son iguales, basta con ingresar uno.
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; align-items:end;">
            <label style="font-size:12px; color:#374151;">
              Bono asistencia pactado mensual (CLP)
              <input id="demanda_baut_manual" type="text" placeholder="Ej: 9115"
                style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />
            </label>

            <label style="font-size:12px; color:#374151;">
              Bono puntualidad pactado mensual (CLP)
              <input id="demanda_bpaut_manual" type="text" placeholder="Ej: 9115"
                style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />
            </label>
          </div>

          <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
            <button id="demanda_btn_recalcular" type="button"
              style="padding:8px 10px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer;">
              Recalcular con bonos pactados
            </button>

            <button id="demanda_btn_usar_igual" type="button"
              style="padding:8px 10px; border-radius:10px; border:1px solid #d1d5db; background:#fff; cursor:pointer;">
              Usar mismo valor para ambos
            </button>
          </div>
        </div>
      `
      : "";


    const bloqueAdvertenciasSC =
  sueldoBaseFueNormalizado || advertenciaBonos
    ? `
      <div style="margin-bottom:12px; padding:12px; border:1px solid #fbbf24; background:#fffbeb; border-radius:10px;">
        <div style="font-weight:700; color:#92400e; margin-bottom:6px;">
          Advertencias del Sueldo Convenido
        </div>

        ${
          sueldoBaseFueNormalizado
            ? `
              <div style="font-size:12px; color:#92400e; margin-bottom:8px;">
                ${escapeHtml(advertenciaSueldoBase)}
              </div>
              <div style="font-size:12px; color:#374151;">
                Sueldo base pagado en PDF: <strong>${formatearCLP(sueldoBaseDetectado)}</strong><br>
                Días pagados detectados: <strong>${escapeHtml(String(diasBaseDetectados ?? ""))}</strong><br>
                Sueldo base normalizado a 30 días: <strong>${formatearCLP(sueldoBaseNormalizado)}</strong>
              </div>
            `
            : ""
        }

        ${
          advertenciaBonos
            ? `
              <div style="font-size:12px; color:#92400e; margin-top:8px;">
                ${escapeHtml(advertenciaBonos)}
              </div>
            `
            : ""
        }
      </div>
    `
    : "";
 

    const bloqueMetodoHRA =
      tipoSueldoBase === "part-time-hra"
        ? `
          <div>Horas HRA detectadas: <strong>${escapeHtml(
            String(horasBaseDetectadas ?? "No detectadas")
          )}</strong></div>
          <div style="margin-top:8px;">Fórmula aplicada:</div>
          <div><strong>valorHoraBase = SC / horas HRA</strong></div>
          <div style="font-size:12px;color:#6b7280;">
            No se infiere jornada semanal. Se usa directamente la cantidad de horas HRA del PDF.
          </div>
        `
        : "";

    const bloqueMetodoMensual =
      tipoSueldoBase === "mensual"
        ? `
          <div>Jornada seleccionada: <strong>${
            jornada == null ? "No detectada" : escapeHtml(String(jornada))
          }</strong></div>
          <div style="margin-top:8px;">Fórmula aplicada:</div>
          <div><strong>valorHoraBase = (SC / 30) × (28 / (jornada × 4))</strong></div>
        `
        : "";

    const bloqueMetodoNoDetectado =
      tipoSueldoBase !== "part-time-hra" && tipoSueldoBase !== "mensual"
        ? `
          <div>No se detectó un sueldo base válido.</div>
        `
        : "";

    contenedor.innerHTML =
      '<div style="border:2px solid #ddd; border-radius:12px; padding:14px; background:#fafafa; margin-bottom:16px;">' +
      '<h2 style="margin:0 0 10px 0;">MEC — Demanda</h2>' +
      bloqueIdentificacionLiquidacion +
      bloqueAdvertenciasSC +

      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +

      // Bloque SC
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Sueldo Convenido</h3>' +

"<div>" +
escapeHtml(glosaSueldoBase || "Sueldo base") +
" pagado PDF: <strong>" +
formatearCLP(sueldoBaseDetectado) +
"</strong>" +
(sueldoBaseFueNormalizado
  ? '<div style="font-size:12px;color:#92400e;">Sueldo base normalizado a 30 días para SC: <strong>' +
    formatearCLP(sueldoBaseNormalizado) +
    "</strong></div>"
  : "") +

      (horasBaseDetectadas != null
        ? '<div style="font-size:12px;color:#6b7280;">Horas HRA: <strong>' +
          escapeHtml(String(horasBaseDetectadas)) +
          "</strong></div>"
        : "") +
      (diasBaseDetectados != null
        ? '<div style="font-size:12px;color:#6b7280;">Días: <strong>' +
          escapeHtml(String(diasBaseDetectados)) +
          "</strong></div>"
        : "") +
      '<div style="font-size:12px;color:#6b7280;">Tipo base: <strong>' +
      escapeHtml(String(tipoSueldoBase || "no-detectado")) +
      "</strong></div>" +
      "</div>" +

      '<div style="margin-top:8px; font-size:12px; color:#6b7280;">Detectado en PDF</div>' +
      "<div>BONO ASISTENCIA AUT.: <strong>" +
      formatearCLP(baut) +
      "</strong></div>" +
      "<div>BONO PUNTUALIDAD AUT.: <strong>" +
      formatearCLP(bpaut) +
      "</strong></div>" +

      '<div style="margin-top:8px; font-size:12px; color:#6b7280;">Pactado normalizado</div>' +
      "<div>BONO ASISTENCIA AUT. pactado: <strong>" +
      formatearCLP(bautNorm) +
      "</strong></div>" +
      "<div>BONO PUNTUALIDAD AUT. pactado: <strong>" +
      formatearCLP(bpautNorm) +
      "</strong></div>" +

      '<div style="margin-top:8px;">SC = Sueldo base corregido + bonos pactados</div>' +
      '<div style="font-size:18px; margin-top:4px;">Sueldo Convenido: <strong>' +
      formatearCLP(sc) +
      "</strong></div>" +

      bloqueInputManual +

      "</div>" +

      // Bloque Fórmula aplicada
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Cálculo valor hora aplicado</h3>' +
      '<div>Método: <strong>' +
      escapeHtml(metodoCalculo || "no-detectado") +
      "</strong></div>" +
      '<div style="font-size:12px;color:#6b7280; margin-bottom:8px;">' +
      escapeHtml(descripcionMetodo || "") +
      "</div>" +
      bloqueMetodoHRA +
      bloqueMetodoMensual +
      bloqueMetodoNoDetectado +
      '<div style="margin-top:8px;">Valor hora corregido con SC: <strong>' +
      (valorHoraBase == null ? "—" : formatearCLP(valorHoraBase)) +
      "</strong></div>" +
      (valorHoraBase != null
        ? '<div style="font-size:12px;color:#6b7280;">Valor exacto SC: ' +
          escapeHtml(formatearNumero(valorHoraBase, 6)) +
          "</div>"
        : "") +
      '<div style="margin-top:8px;">Valor hora empresa estimado: <strong>' +
      (valorHoraEmpresa == null ? "—" : formatearCLP(valorHoraEmpresa)) +
      "</strong></div>" +
      (valorHoraEmpresa != null
        ? '<div style="font-size:12px;color:#6b7280;">Valor exacto empresa: ' +
          escapeHtml(formatearNumero(valorHoraEmpresa, 6)) +
          "</div>"
        : "") +
      (warningCalculo
        ? '<div style="margin-top:8px;color:#b45309;"><strong>' +
          escapeHtml(warningCalculo) +
          "</strong></div>"
        : "") +
      "</div>" +

      "</div>" +
      "</div>" +

      // Comparación sobretiempo
      '<div style="border:1px solid #eee; border-radius:12px; padding:14px; background:#fff;">' +
      '<h2 style="margin:0 0 10px 0;">Comparación sobretiempo</h2>' +
      '<table style="width:100%; border-collapse:collapse;">' +
      "<thead>" +
      "<tr>" +
      '<th style="text-align:left; padding:8px; border-bottom:2px solid #eee;">Ítem</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Pagado empresa</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Esperado con SC</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Diferencia adeudada</th>' +
      "</tr>" +
      "</thead>" +
"<tbody>" +
(
  st.horasExtras50Encontrado
    ? filaComparacion(
        "HORAS EXTRAS 50%",
        st.pagadoHorasExtras50,
        esperado.horasExtras50,
        difs.horasExtras50,
        notaHorasItem(
          st.horasExtras50Encontrado,
          st.horasExtras50,
          esperado.horasUsadas.horasExtras50,
          esperado.horasSonEstimadas.horasExtras50
        )
      )
    : ""
) +
(
  st.horasExtrasDomingoEncontrado
    ? filaComparacion(
        "HORAS EXTRAS DOMINGO",
        st.pagadoHorasExtrasDomingo,
        esperado.horasExtrasDomingo,
        difs.horasExtrasDomingo,
        notaHorasItem(
          st.horasExtrasDomingoEncontrado,
          st.horasExtrasDomingo,
          esperado.horasUsadas.horasExtrasDomingo,
          esperado.horasSonEstimadas.horasExtrasDomingo
        )
      )
    : ""
) +
(
  st.recargoDomingoEncontrado
    ? filaComparacion(
        "HORAS RECARGO DOMINGO",
        st.pagadoRecargoDomingo,
        esperado.recargoDomingo,
        difs.recargoDomingo,
        notaHorasItem(
          st.recargoDomingoEncontrado,
          st.horasRecargoDomingo,
          esperado.horasUsadas.horasRecargoDomingo,
          esperado.horasSonEstimadas.horasRecargoDomingo
        )
      )
    : ""
) +
(
  st.recargoFestivoEncontrado
    ? filaComparacion(
        "RECARGO 50% FESTIVO",
        st.pagadoRecargoFestivo,
        esperado.recargoFestivo,
        difs.recargoFestivo,
        notaHorasItem(
          st.recargoFestivoEncontrado,
          st.horasRecargoFestivo,
          esperado.horasUsadas.horasRecargoFestivo,
          esperado.horasSonEstimadas.horasRecargoFestivo
        )
      )
    : ""
) +
      "</tbody>" +
      "</table>" +

      '<div style="margin-top:14px; padding:12px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:12px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px; color:#1e3a8a;">Resumen total de esta liquidación</h3>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">' +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total pagado empresa</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(totales ? totales.totalPagadoEmpresa : 0) +
      '</div>' +
      '</div>' +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total esperado con SC</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(totales ? totales.totalEsperadoSC : 0) +
      '</div>' +
      '</div>' +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total diferencia adeudada</div>' +
      '<div style="font-size:18px; font-weight:700; color:' +
      ((totales && totales.totalDiferenciaAdeudada > 0) ? '#b91c1c' : '#166534') +
      ';">' +
      formatearCLP(totales ? totales.totalDiferenciaAdeudada : 0) +
      '</div>' +
      '</div>' +

      '</div>' +
      '</div>' +

      '<div style="margin-top:14px; display:flex; gap:8px; flex-wrap:wrap;">' +

      '<button id="demanda_btn_descargar_informe_individual" type="button" style="padding:10px 12px; border-radius:10px; border:1px solid #1d4ed8; background:#2563eb; color:#fff; cursor:pointer; font-weight:700;">' +
      "Descargar informe individual" +
      "</button>" +

      '<button id="demanda_btn_agregar_acumulado" type="button" style="padding:10px 12px; border-radius:10px; border:1px solid #047857; background:#059669; color:#fff; cursor:pointer; font-weight:700;">' +
      "Agregar al acumulado" +
      "</button>" +

      "</div>" +

      '<div id="demanda_resumen_acumulado"></div>' +

      '<div style="margin-top:10px; font-size:12px; color:#6b7280;">' +
      "* Diferencia adeudada = Esperado con SC - Pagado empresa. Si |diferencia| &lt; 1 peso, se considera correcto." +

      "</div>" +
      '<div style="margin-top:6px; font-size:12px; color:#6b7280;">' +
      "* Si el PDF no informa horas, pero sí informa monto pagado, las horas se estiman dividiendo el monto pagado por el valor hora empresa y el factor del ítem." +
      "</div>" +
      '<div style="margin-top:6px; font-size:12px; color:#6b7280;">' +
      "* Las horas estimadas deben revisarse, porque no son un dato directo del PDF sino un cálculo inverso." +
      "</div>" +
      "</div>";

    const btnDescargarInforme = contenedor.querySelector(
      "#demanda_btn_descargar_informe_individual"
    );

    if (btnDescargarInforme) {
      btnDescargarInforme.addEventListener(
        "click",
        descargarInformeIndividualDemandaHRA
      );
    }
    const btnAgregarAcumulado = contenedor.querySelector(
      "#demanda_btn_agregar_acumulado"
    );

    if (btnAgregarAcumulado) {
      btnAgregarAcumulado.addEventListener(
        "click",
        agregarReporteAlAcumuladoDemandaHRA
      );
    }

    const contenedorAcumulado = contenedor.querySelector(
      "#demanda_resumen_acumulado"
    );

    renderResumenAcumuladoDemandaHRA(contenedorAcumulado);

        wireBotonesManual(contenedor);

  }

  function generarFilasInformeIndividualDemandaHRA(data) {
    const { st, esperado, difs } = data;

    if (!st || !esperado || !difs) {
      return (
        "<tr>" +
        '<td colspan="4" style="padding:10px; border:1px solid #e5e7eb;">' +
        "No existen datos de sobretiempo para mostrar." +
        "</td>" +
        "</tr>"
      );
    }

    let html = "";

    function fila(nombre, encontrado, horasDetectadas, horasUsadas, esEstimado, pagado, esperadoItem, diferencia) {
      if (!encontrado) return "";

      const nota = notaHorasItem(
        encontrado,
        horasDetectadas,
        horasUsadas,
        esEstimado
      );

      return (
        "<tr>" +
        '<td style="padding:10px; border:1px solid #e5e7eb;">' +
        "<strong>" +
        escapeHtml(nombre) +
        "</strong>" +
        '<div style="font-size:12px; color:#6b7280; margin-top:4px;">' +
        escapeHtml(nota) +
        "</div>" +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right;">' +
        formatearCLP(pagado || 0) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right;">' +
        (esperadoItem == null ? "—" : formatearCLP(esperadoItem)) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">' +
        (diferencia == null ? "—" : formatearCLP(diferencia)) +
        "</td>" +
        "</tr>"
      );
    }

    html += fila(
      "HORAS EXTRAS 50%",
      st.horasExtras50Encontrado,
      st.horasExtras50,
      esperado.horasUsadas ? esperado.horasUsadas.horasExtras50 : null,
      esperado.horasSonEstimadas ? esperado.horasSonEstimadas.horasExtras50 : false,
      st.pagadoHorasExtras50,
      esperado.horasExtras50,
      difs.horasExtras50
    );

    html += fila(
      "HORAS EXTRAS DOMINGO",
      st.horasExtrasDomingoEncontrado,
      st.horasExtrasDomingo,
      esperado.horasUsadas ? esperado.horasUsadas.horasExtrasDomingo : null,
      esperado.horasSonEstimadas ? esperado.horasSonEstimadas.horasExtrasDomingo : false,
      st.pagadoHorasExtrasDomingo,
      esperado.horasExtrasDomingo,
      difs.horasExtrasDomingo
    );

    html += fila(
      "HORAS RECARGO DOMINGO",
      st.recargoDomingoEncontrado,
      st.horasRecargoDomingo,
      esperado.horasUsadas ? esperado.horasUsadas.horasRecargoDomingo : null,
      esperado.horasSonEstimadas ? esperado.horasSonEstimadas.horasRecargoDomingo : false,
      st.pagadoRecargoDomingo,
      esperado.recargoDomingo,
      difs.recargoDomingo
    );

    html += fila(
      "RECARGO 50% FESTIVO",
      st.recargoFestivoEncontrado,
      st.horasRecargoFestivo,
      esperado.horasUsadas ? esperado.horasUsadas.horasRecargoFestivo : null,
      esperado.horasSonEstimadas ? esperado.horasSonEstimadas.horasRecargoFestivo : false,
      st.pagadoRecargoFestivo,
      esperado.recargoFestivo,
      difs.recargoFestivo
    );

    if (!html) {
      html =
        "<tr>" +
        '<td colspan="4" style="padding:10px; border:1px solid #e5e7eb;">' +
        "No se encontraron ítems de sobretiempo en esta liquidación." +
        "</td>" +
        "</tr>";
    }

    return html;
  }

  function generarHtmlInformeIndividualDemandaHRA(data) {
    if (!data) return "";

    const fechaGeneracion = new Date().toLocaleString("es-CL");
    const identificacion = data.identificacion || {};

    const nombreTrabajador =
      identificacion.nombreTrabajador || "No detectado";

    const rutTrabajador =
      identificacion.rutTrabajador || "No detectado";

    const periodoTexto =
      identificacion.periodoTexto || "No detectado";

    const cargo =
      identificacion.cargo || "No detectado";

    const advertenciaIdentificacion =
      typeof identificacion.advertenciaIdentificacion === "string"
        ? identificacion.advertenciaIdentificacion
        : "";

    const jornada = data.jornada;
    const tipoSueldoBase = data.tipoSueldoBase || "no-detectado";
    const glosaSueldoBase = data.glosaSueldoBase || "Sueldo base";

    const sueldoBaseDetectado = data.sueldoBaseDetectado || 0;
    const sueldoBaseNormalizado =
      data.sueldoBaseNormalizado || data.sueldoBaseDetectado || 0;
    const sueldoBaseFueNormalizado = !!data.sueldoBaseFueNormalizado;
    const advertenciaSueldoBase = data.advertenciaSueldoBase || "";

    const horasBaseDetectadas = data.horasBaseDetectadas;
    const diasBaseDetectados = data.diasBaseDetectados;

    const baut = data.baut || 0;
    const bpaut = data.bpaut || 0;
    const bautNorm = data.bautNorm || 0;
    const bpautNorm = data.bpautNorm || 0;
    const advertenciaBonos = data.advertenciaBonos || "";
    const bonosProporcionalesPorLiquidacionParcial =
      !!data.bonosProporcionalesPorLiquidacionParcial;

    const sc = data.sc || 0;
    const valorHoraBase = data.valorHoraBase;
    const valorHoraEmpresa = data.valorHoraEmpresa;
    const metodoCalculo = data.metodoCalculo || "no-detectado";
    const descripcionMetodo = data.descripcionMetodo || "";
    const warningCalculo = data.warningCalculo || "";

    const totales = data.totales || {};
    const totalPagadoEmpresa = totales.totalPagadoEmpresa || 0;
    const totalEsperadoSC = totales.totalEsperadoSC || 0;
    const totalDiferenciaAdeudada = totales.totalDiferenciaAdeudada || 0;

    const colorDiferencia =
      totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534";

    const bloqueAdvertencias =
      advertenciaSueldoBase || advertenciaBonos || warningCalculo
        ? (
          '<div style="margin-top:18px; padding:14px; border:1px solid #fbbf24; background:#fffbeb; border-radius:10px;">' +
          '<h2 style="margin:0 0 10px 0; font-size:18px; color:#92400e;">Advertencias</h2>' +
          (
            advertenciaSueldoBase
              ? '<div style="margin-bottom:8px; color:#92400e;">' +
                escapeHtml(advertenciaSueldoBase) +
                "</div>"
              : ""
          ) +
          (
            advertenciaBonos
              ? '<div style="margin-bottom:8px; color:#92400e;">' +
                escapeHtml(advertenciaBonos) +
                "</div>"
              : ""
          ) +
          (
            warningCalculo
              ? '<div style="margin-bottom:8px; color:#92400e;">' +
                escapeHtml(warningCalculo) +
                "</div>"
              : ""
          ) +
          "</div>"
        )
        : "";

    return (
      "<!DOCTYPE html>" +
      '<html lang="es">' +
      "<head>" +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title>Informe individual - Demanda HRA</title>" +
      "<style>" +
      "body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:24px;}" +
      ".doc{max-width:940px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;box-shadow:0 4px 18px rgba(0,0,0,.08);}" +
      "h1{margin:0 0 6px 0;font-size:26px;}" +
      "h2{margin:24px 0 10px 0;font-size:20px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;}" +
      ".muted{color:#6b7280;font-size:13px;}" +
      ".grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}" +
      ".card{border:1px solid #e5e7eb;background:#fafafa;border-radius:10px;padding:12px;}" +
      ".label{font-size:12px;color:#6b7280;margin-bottom:4px;}" +
      ".valor{font-weight:700;font-size:16px;}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px;}" +
      "th{background:#111827;color:#fff;text-align:left;padding:10px;border:1px solid #111827;}" +
      "td{vertical-align:top;}" +
      ".resumen{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px;}" +
      ".resumen .valor{font-size:20px;}" +
      ".footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;}" +
      "@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}}" +
      "</style>" +
      "</head>" +
      "<body>" +
      '<div class="doc">' +

"<h1>Informe individual - Demanda HRA</h1>" +
'<div class="muted">Generado el ' +
escapeHtml(fechaGeneracion) +
"</div>" +

"<h2>Identificación de la liquidación</h2>" +
'<div class="grid">' +

'<div class="card">' +
'<div class="label">Trabajador</div>' +
'<div class="valor">' +
escapeHtml(nombreTrabajador) +
"</div>" +
"</div>" +

'<div class="card">' +
'<div class="label">RUT</div>' +
'<div class="valor">' +
escapeHtml(rutTrabajador) +
"</div>" +
"</div>" +

'<div class="card">' +
'<div class="label">Periodo</div>' +
'<div class="valor">' +
escapeHtml(periodoTexto) +
"</div>" +
"</div>" +

'<div class="card">' +
'<div class="label">Cargo</div>' +
'<div class="valor">' +
escapeHtml(cargo) +
"</div>" +
"</div>" +

"</div>" +

(
  advertenciaIdentificacion
    ? '<div style="margin-top:12px; padding:12px; border:1px solid #fbbf24; background:#fffbeb; border-radius:10px; color:#92400e;">' +
      escapeHtml(advertenciaIdentificacion) +
      "</div>"
    : ""
) +

      bloqueAdvertencias +

      "<h2>Sueldo Convenido</h2>" +
      '<div class="grid">' +

      '<div class="card">' +
      '<div class="label">Glosa sueldo base</div>' +
      '<div class="valor">' +
      escapeHtml(glosaSueldoBase) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Tipo sueldo base</div>' +
      '<div class="valor">' +
      escapeHtml(tipoSueldoBase) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Sueldo base pagado PDF</div>' +
      '<div class="valor">' +
      formatearCLP(sueldoBaseDetectado) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Sueldo base usado para SC</div>' +
      '<div class="valor">' +
      formatearCLP(sueldoBaseNormalizado) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Sueldo base normalizado</div>' +
      '<div class="valor">' +
      (sueldoBaseFueNormalizado ? "Sí" : "No") +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Días detectados</div>' +
      '<div class="valor">' +
      escapeHtml(diasBaseDetectados == null ? "No detectados" : String(diasBaseDetectados)) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Horas HRA detectadas</div>' +
      '<div class="valor">' +
      escapeHtml(horasBaseDetectadas == null ? "No aplica / no detectadas" : String(horasBaseDetectadas)) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Jornada seleccionada</div>' +
      '<div class="valor">' +
      escapeHtml(jornada == null ? "No detectada" : String(jornada)) +
      "</div>" +
      "</div>" +

      "</div>" +


      "<h2>Bonos</h2>" +
      '<div class="grid">' +

      '<div class="card">' +
      '<div class="label">Bono asistencia pagado PDF</div>' +
      '<div class="valor">' +
      formatearCLP(baut) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Bono puntualidad pagado PDF</div>' +
      '<div class="valor">' +
      formatearCLP(bpaut) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">' +
      (
        bonosProporcionalesPorLiquidacionParcial
          ? "Bono asistencia pactado usado para SC"
          : "Bono asistencia pactado usado"
      ) +
      "</div>" +
      '<div class="valor">' +
      formatearCLP(bautNorm) +
      "</div>" +
      (
        bonosProporcionalesPorLiquidacionParcial
          ? '<div class="muted" style="margin-top:6px;">El monto del PDF no se usó automáticamente por posible proporcionalidad.</div>'
          : ""
      ) +
      "</div>" +

      '<div class="card">' +
      '<div class="label">' +
      (
        bonosProporcionalesPorLiquidacionParcial
          ? "Bono puntualidad pactado usado para SC"
          : "Bono puntualidad pactado usado"
      ) +
      "</div>" +
      '<div class="valor">' +
      formatearCLP(bpautNorm) +
      "</div>" +
      (
        bonosProporcionalesPorLiquidacionParcial
          ? '<div class="muted" style="margin-top:6px;">El monto del PDF no se usó automáticamente por posible proporcionalidad.</div>'
          : ""
      ) +
      "</div>" +

      "</div>" +

      '<div class="card" style="margin-top:12px; border-color:#10b981; background:#ecfdf5;">' +
      '<div class="label">Fórmula SC</div>' +
      '<div class="valor">SC = Sueldo base corregido + bonos pactados</div>' +
      '<div class="label" style="margin-top:10px;">Sueldo Convenido</div>' +
      '<div class="valor" style="font-size:26px;">' +
      formatearCLP(sc) +
      "</div>" +
      "</div>" +

      "<h2>Cálculo valor hora aplicado</h2>" +
      '<div class="grid">' +

      '<div class="card">' +
      '<div class="label">Método de cálculo</div>' +
      '<div class="valor">' +
      escapeHtml(metodoCalculo) +
      "</div>" +
      '<div class="muted" style="margin-top:6px;">' +
      escapeHtml(descripcionMetodo) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Valor hora corregido con SC</div>' +
      '<div class="valor">' +
      (valorHoraBase == null ? "—" : formatearCLP(valorHoraBase)) +
      "</div>" +
      '<div class="muted" style="margin-top:6px;">Exacto: ' +
      (valorHoraBase == null ? "—" : escapeHtml(formatearNumero(valorHoraBase, 6))) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Valor hora empresa estimado</div>' +
      '<div class="valor">' +
      (valorHoraEmpresa == null ? "—" : formatearCLP(valorHoraEmpresa)) +
      "</div>" +
      '<div class="muted" style="margin-top:6px;">Exacto: ' +
      (valorHoraEmpresa == null ? "—" : escapeHtml(formatearNumero(valorHoraEmpresa, 6))) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Jornada / base usada</div>' +
      '<div class="valor">' +
      (
        tipoSueldoBase === "part-time-hra"
          ? "Horas HRA: " + escapeHtml(horasBaseDetectadas == null ? "No detectadas" : String(horasBaseDetectadas))
          : "Jornada semanal: " + escapeHtml(jornada == null ? "No detectada" : String(jornada))
      ) +
      "</div>" +
      "</div>" +

      "</div>" +

      "<h2>Comparación sobretiempo</h2>" +
      "<table>" +
      "<thead>" +
      "<tr>" +
      "<th>Ítem</th>" +
      '<th style="text-align:right;">Pagado empresa</th>' +
      '<th style="text-align:right;">Esperado con SC</th>' +
      '<th style="text-align:right;">Diferencia adeudada</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      generarFilasInformeIndividualDemandaHRA(data) +
      "</tbody>" +
      "</table>" +

      "<h2>Resumen total de esta liquidación</h2>" +
      '<div class="resumen">' +

      '<div class="card">' +
      '<div class="label">Total pagado empresa</div>' +
      '<div class="valor">' +
      formatearCLP(totalPagadoEmpresa) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Total esperado con SC</div>' +
      '<div class="valor">' +
      formatearCLP(totalEsperadoSC) +
      "</div>" +
      "</div>" +

      '<div class="card" style="border-color:#bfdbfe; background:#eff6ff;">' +
      '<div class="label">Total diferencia adeudada</div>' +
      '<div class="valor" style="color:' +
      colorDiferencia +
      ';">' +
      formatearCLP(totalDiferenciaAdeudada) +
      "</div>" +
      "</div>" +

      "</div>" +

      '<div class="footer">' +
      "<p>* Diferencia adeudada = Esperado con SC - Pagado empresa.</p>" +
      "<p>* Si el PDF no informa horas, pero sí informa monto pagado, las horas se estiman dividiendo el monto pagado por el valor hora empresa y el factor del ítem.</p>" +
      "<p>* Las horas estimadas deben revisarse, porque no son un dato directo del PDF sino un cálculo inverso.</p>" +
      "<p>* Este informe fue generado automáticamente desde el módulo MEC — Demanda HRA.</p>" +
      "</div>" +

      "</div>" +
      "</body>" +
      "</html>"
    );
  }

function descargarInformeIndividualDemandaHRA() {
  if (!__ultimoReporteDemandaHRAHtml) {
    alert("Primero debes generar un análisis antes de descargar el informe.");
    return;
  }

  const identificacion =
    (__ultimoReporteDemandaHRA && __ultimoReporteDemandaHRA.identificacion)
      ? __ultimoReporteDemandaHRA.identificacion
      : {};

  const rutArchivo = slugArchivoDemandaHRA(
    identificacion.rutTrabajador || "rut-no-detectado"
  );

  const periodoArchivo = slugArchivoDemandaHRA(
    identificacion.periodoTexto || "periodo-no-detectado"
  );

  const trabajadorArchivo = slugArchivoDemandaHRA(
    identificacion.nombreTrabajador || "trabajador-no-detectado"
  );

  const nombreArchivo =
    "demanda-hra-" +
    rutArchivo +
    "-" +
    periodoArchivo +
    "-" +
    trabajadorArchivo +
    ".html";

  const blob = new Blob([__ultimoReporteDemandaHRAHtml], {
    type: "text/html;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

  function clonarReporteDemandaHRA(reporte) {
    return JSON.parse(JSON.stringify(reporte || {}));
  }

  function obtenerClaveReporteDemandaHRA(reporte) {
    const identificacion = reporte && reporte.identificacion ? reporte.identificacion : {};

    const rut = slugArchivoDemandaHRA(
      identificacion.rutTrabajador || "rut-no-detectado"
    );

    const periodo = slugArchivoDemandaHRA(
      identificacion.periodoTexto || "periodo-no-detectado"
    );

    const trabajador = slugArchivoDemandaHRA(
      identificacion.nombreTrabajador || "trabajador-no-detectado"
    );

    return rut + "__" + periodo + "__" + trabajador;
  }

  function calcularResumenAcumuladoDemandaHRA() {
    let totalLiquidaciones = __acumuladoDemandaHRA.length;
    let totalPagadoEmpresa = 0;
    let totalEsperadoSC = 0;
    let totalDiferenciaAdeudada = 0;

    for (const reporte of __acumuladoDemandaHRA) {
      const totales = reporte && reporte.totales ? reporte.totales : {};

      totalPagadoEmpresa += Number(totales.totalPagadoEmpresa || 0);
      totalEsperadoSC += Number(totales.totalEsperadoSC || 0);
      totalDiferenciaAdeudada += Number(totales.totalDiferenciaAdeudada || 0);
    }

    return {
      totalLiquidaciones,
      totalPagadoEmpresa,
      totalEsperadoSC,
      totalDiferenciaAdeudada,
    };
  }

  function renderResumenAcumuladoDemandaHRA(contenedor) {
    if (!contenedor) return;

    const resumen = calcularResumenAcumuladoDemandaHRA();

    let detalle = "";

    if (__acumuladoDemandaHRA.length > 0) {
      detalle =
        '<div style="margin-top:10px; font-size:12px; color:#374151;">' +
        __acumuladoDemandaHRA
          .map(function (reporte, index) {
            const id = reporte.identificacion || {};
            const totales = reporte.totales || {};

            return (
              '<div style="padding:6px 0; border-top:1px solid #dbeafe;">' +
              "<strong>" +
              escapeHtml(String(index + 1)) +
              ". " +
              escapeHtml(id.periodoTexto || "Periodo no detectado") +
              "</strong> — " +
              escapeHtml(id.nombreTrabajador || "Trabajador no detectado") +
              " — " +
              escapeHtml(id.rutTrabajador || "RUT no detectado") +
              " — Diferencia: <strong>" +
              formatearCLP(totales.totalDiferenciaAdeudada || 0) +
              "</strong>" +
              "</div>"
            );
          })
          .join("") +
        "</div>";
    }

    const bloqueBotonConsolidado =
      __acumuladoDemandaHRA.length > 0
        ? (
          '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">' +
          '<button id="demanda_btn_descargar_consolidado" type="button" style="padding:10px 12px; border-radius:10px; border:1px solid #7c3aed; background:#8b5cf6; color:#fff; cursor:pointer; font-weight:700;">' +
          "Descargar consolidado" +
          "</button>" +
          "</div>"
        )
        : "";

    contenedor.innerHTML =
      '<div style="margin-top:14px; padding:12px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:12px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px; color:#1e3a8a;">Acumulado Demanda HRA</h3>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">' +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Liquidaciones acumuladas</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      escapeHtml(String(resumen.totalLiquidaciones)) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total pagado empresa</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(resumen.totalPagadoEmpresa) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total esperado con SC</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(resumen.totalEsperadoSC) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total diferencia acumulada</div>' +
      '<div style="font-size:18px; font-weight:700; color:' +
      (resumen.totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534") +
      ';">' +
      formatearCLP(resumen.totalDiferenciaAdeudada) +
      "</div>" +
      "</div>" +

      "</div>" +

      detalle +

      bloqueBotonConsolidado +

      "</div>";

    const btnConsolidado = contenedor.querySelector(
      "#demanda_btn_descargar_consolidado"
    );

    if (btnConsolidado) {
      btnConsolidado.addEventListener(
        "click",
        descargarConsolidadoDemandaHRA
      );
    }
  
    
    contenedor.innerHTML =
      '<div style="margin-top:14px; padding:12px; border:1px solid #bfdbfe; background:#eff6ff; border-radius:12px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px; color:#1e3a8a;">Acumulado Demanda HRA</h3>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px;">' +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Liquidaciones acumuladas</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      escapeHtml(String(resumen.totalLiquidaciones)) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total pagado empresa</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(resumen.totalPagadoEmpresa) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total esperado con SC</div>' +
      '<div style="font-size:18px; font-weight:700;">' +
      formatearCLP(resumen.totalEsperadoSC) +
      "</div>" +
      "</div>" +

      '<div style="background:#fff; border:1px solid #dbeafe; border-radius:10px; padding:10px;">' +
      '<div style="font-size:12px; color:#6b7280;">Total diferencia acumulada</div>' +
      '<div style="font-size:18px; font-weight:700; color:' +
      (resumen.totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534") +
      ';">' +
      formatearCLP(resumen.totalDiferenciaAdeudada) +
      "</div>" +
      "</div>" +

      "</div>" +

      detalle +

      "</div>";
  }

  // -------------------- Etapa 4 — Consolidado Demanda HRA --------------------
  function obtenerClaveTrabajadorConsolidadoDemandaHRA(reporte) {
    const identificacion = reporte && reporte.identificacion ? reporte.identificacion : {};

    const rut = slugArchivoDemandaHRA(
      identificacion.rutTrabajador || "rut-no-detectado"
    );

    const trabajador = slugArchivoDemandaHRA(
      identificacion.nombreTrabajador || "trabajador-no-detectado"
    );

    return rut + "__" + trabajador;
  }

  function construirConsolidadoDemandaHRA() {
    const grupos = {};

    for (const reporte of __acumuladoDemandaHRA) {
      const identificacion = reporte && reporte.identificacion ? reporte.identificacion : {};
      const totales = reporte && reporte.totales ? reporte.totales : {};

      const clave = obtenerClaveTrabajadorConsolidadoDemandaHRA(reporte);

      if (!grupos[clave]) {
        grupos[clave] = {
          clave,
          nombreTrabajador:
            identificacion.nombreTrabajador || "Trabajador no detectado",
          rutTrabajador:
            identificacion.rutTrabajador || "RUT no detectado",
          cargo:
            identificacion.cargo || "No detectado",

          liquidaciones: [],

          totalLiquidaciones: 0,
          totalPagadoEmpresa: 0,
          totalEsperadoSC: 0,
          totalDiferenciaAdeudada: 0,
        };
      }

      grupos[clave].liquidaciones.push(reporte);
      grupos[clave].totalLiquidaciones += 1;
      grupos[clave].totalPagadoEmpresa += Number(totales.totalPagadoEmpresa || 0);
      grupos[clave].totalEsperadoSC += Number(totales.totalEsperadoSC || 0);
      grupos[clave].totalDiferenciaAdeudada += Number(
        totales.totalDiferenciaAdeudada || 0
      );
    }

    const trabajadores = Object.values(grupos);

    trabajadores.sort(function (a, b) {
      return String(a.nombreTrabajador || "").localeCompare(
        String(b.nombreTrabajador || ""),
        "es"
      );
    });

    const resumenGeneral = {
      totalTrabajadores: trabajadores.length,
      totalLiquidaciones: 0,
      totalPagadoEmpresa: 0,
      totalEsperadoSC: 0,
      totalDiferenciaAdeudada: 0,
    };

    for (const trabajador of trabajadores) {
      resumenGeneral.totalLiquidaciones += trabajador.totalLiquidaciones;
      resumenGeneral.totalPagadoEmpresa += trabajador.totalPagadoEmpresa;
      resumenGeneral.totalEsperadoSC += trabajador.totalEsperadoSC;
      resumenGeneral.totalDiferenciaAdeudada += trabajador.totalDiferenciaAdeudada;

      trabajador.liquidaciones.sort(function (a, b) {
        const ida = a.identificacion || {};
        const idb = b.identificacion || {};

        const anioA = Number(ida.anio || 0);
        const anioB = Number(idb.anio || 0);

        const ordenMes = {
          ENERO: 1,
          FEBRERO: 2,
          MARZO: 3,
          ABRIL: 4,
          MAYO: 5,
          JUNIO: 6,
          JULIO: 7,
          AGOSTO: 8,
          SEPTIEMBRE: 9,
          SETIEMBRE: 9,
          OCTUBRE: 10,
          NOVIEMBRE: 11,
          DICIEMBRE: 12,
        };

        const mesA = ordenMes[String(ida.mes || "").toUpperCase()] || 0;
        const mesB = ordenMes[String(idb.mes || "").toUpperCase()] || 0;

        if (anioA !== anioB) return anioA - anioB;
        return mesA - mesB;
      });
    }

    return {
      trabajadores,
      resumenGeneral,
    };
  }

  function generarHtmlConsolidadoDemandaHRA() {
    const consolidado = construirConsolidadoDemandaHRA();
    const trabajadores = consolidado.trabajadores;
    const resumen = consolidado.resumenGeneral;

    const fechaGeneracion = new Date().toLocaleString("es-CL");

    let filasResumenTrabajadores = "";

    for (const trabajador of trabajadores) {
      filasResumenTrabajadores +=
        "<tr>" +
        '<td style="padding:10px; border:1px solid #e5e7eb;">' +
        "<strong>" +
        escapeHtml(trabajador.nombreTrabajador) +
        "</strong>" +
        '<div style="font-size:12px; color:#6b7280; margin-top:4px;">RUT: ' +
        escapeHtml(trabajador.rutTrabajador) +
        "</div>" +
        '<div style="font-size:12px; color:#6b7280; margin-top:4px;">Cargo: ' +
        escapeHtml(trabajador.cargo) +
        "</div>" +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right;">' +
        escapeHtml(String(trabajador.totalLiquidaciones)) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right;">' +
        formatearCLP(trabajador.totalPagadoEmpresa) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right;">' +
        formatearCLP(trabajador.totalEsperadoSC) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right; font-weight:700; color:' +
        (trabajador.totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534") +
        ';">' +
        formatearCLP(trabajador.totalDiferenciaAdeudada) +
        "</td>" +
        "</tr>";
    }

    let bloquesDetalle = "";

    for (const trabajador of trabajadores) {
      let filasLiquidaciones = "";

      for (const reporte of trabajador.liquidaciones) {
        const id = reporte.identificacion || {};
        const totales = reporte.totales || {};

        filasLiquidaciones +=
          "<tr>" +
          '<td style="padding:9px; border:1px solid #e5e7eb;">' +
          escapeHtml(id.periodoTexto || "Periodo no detectado") +
          "</td>" +
          '<td style="padding:9px; border:1px solid #e5e7eb; text-align:right;">' +
          formatearCLP(totales.totalPagadoEmpresa || 0) +
          "</td>" +
          '<td style="padding:9px; border:1px solid #e5e7eb; text-align:right;">' +
          formatearCLP(totales.totalEsperadoSC || 0) +
          "</td>" +
          '<td style="padding:9px; border:1px solid #e5e7eb; text-align:right; font-weight:700; color:' +
          ((totales.totalDiferenciaAdeudada || 0) > 0 ? "#b91c1c" : "#166534") +
          ';">' +
          formatearCLP(totales.totalDiferenciaAdeudada || 0) +
          "</td>" +
          "</tr>";
      }

      bloquesDetalle +=
        '<div style="margin-top:24px;">' +
        '<h2 style="margin:0 0 8px 0; font-size:20px; border-bottom:2px solid #e5e7eb; padding-bottom:6px;">' +
        escapeHtml(trabajador.nombreTrabajador) +
        "</h2>" +
        '<div style="font-size:13px; color:#6b7280; margin-bottom:10px;">' +
        "RUT: " +
        escapeHtml(trabajador.rutTrabajador) +
        " — Cargo: " +
        escapeHtml(trabajador.cargo) +
        "</div>" +
        '<table style="width:100%; border-collapse:collapse;">' +
        "<thead>" +
        "<tr>" +
        '<th style="background:#111827; color:#fff; text-align:left; padding:10px; border:1px solid #111827;">Periodo</th>' +
        '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Pagado empresa</th>' +
        '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Esperado con SC</th>' +
        '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Diferencia adeudada</th>' +
        "</tr>" +
        "</thead>" +
        "<tbody>" +
        filasLiquidaciones +
        "</tbody>" +
        "<tfoot>" +
        "<tr>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; font-weight:700;">Total trabajador</td>' +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">' +
        formatearCLP(trabajador.totalPagadoEmpresa) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right; font-weight:700;">' +
        formatearCLP(trabajador.totalEsperadoSC) +
        "</td>" +
        '<td style="padding:10px; border:1px solid #e5e7eb; text-align:right; font-weight:700; color:' +
        (trabajador.totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534") +
        ';">' +
        formatearCLP(trabajador.totalDiferenciaAdeudada) +
        "</td>" +
        "</tr>" +
        "</tfoot>" +
        "</table>" +
        "</div>";
    }

    if (!filasResumenTrabajadores) {
      filasResumenTrabajadores =
        "<tr>" +
        '<td colspan="5" style="padding:12px; border:1px solid #e5e7eb;">' +
        "No existen liquidaciones acumuladas para consolidar." +
        "</td>" +
        "</tr>";
    }

    return (
      "<!DOCTYPE html>" +
      '<html lang="es">' +
      "<head>" +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title>Consolidado - Demanda HRA</title>" +
      "<style>" +
      "body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;color:#111827;margin:0;padding:24px;}" +
      ".doc{max-width:1040px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;box-shadow:0 4px 18px rgba(0,0,0,.08);}" +
      "h1{margin:0 0 6px 0;font-size:28px;}" +
      ".muted{color:#6b7280;font-size:13px;}" +
      ".resumen{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:18px;}" +
      ".card{border:1px solid #e5e7eb;background:#fafafa;border-radius:10px;padding:12px;}" +
      ".label{font-size:12px;color:#6b7280;margin-bottom:4px;}" +
      ".valor{font-weight:700;font-size:20px;}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px;}" +
      ".footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;}" +
      "@media print{body{background:#fff;padding:0}.doc{box-shadow:none;border-radius:0}}" +
      "</style>" +
      "</head>" +
      "<body>" +
      '<div class="doc">' +

      "<h1>Informe consolidado - Demanda HRA</h1>" +
      '<div class="muted">Generado el ' +
      escapeHtml(fechaGeneracion) +
      "</div>" +

      '<div class="resumen">' +

      '<div class="card">' +
      '<div class="label">Trabajadores</div>' +
      '<div class="valor">' +
      escapeHtml(String(resumen.totalTrabajadores)) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Liquidaciones acumuladas</div>' +
      '<div class="valor">' +
      escapeHtml(String(resumen.totalLiquidaciones)) +
      "</div>" +
      "</div>" +

      '<div class="card">' +
      '<div class="label">Total pagado empresa</div>' +
      '<div class="valor">' +
      formatearCLP(resumen.totalPagadoEmpresa) +
      "</div>" +
      "</div>" +

      '<div class="card" style="border-color:#bfdbfe; background:#eff6ff;">' +
      '<div class="label">Total diferencia adeudada</div>' +
      '<div class="valor" style="color:' +
      (resumen.totalDiferenciaAdeudada > 0 ? "#b91c1c" : "#166534") +
      ';">' +
      formatearCLP(resumen.totalDiferenciaAdeudada) +
      "</div>" +
      "</div>" +

      "</div>" +

      "<h2>Resumen por trabajador</h2>" +
      '<table style="width:100%; border-collapse:collapse;">' +
      "<thead>" +
      "<tr>" +
      '<th style="background:#111827; color:#fff; text-align:left; padding:10px; border:1px solid #111827;">Trabajador</th>' +
      '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Liquidaciones</th>' +
      '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Pagado empresa</th>' +
      '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Esperado con SC</th>' +
      '<th style="background:#111827; color:#fff; text-align:right; padding:10px; border:1px solid #111827;">Diferencia adeudada</th>' +
      "</tr>" +
      "</thead>" +
      "<tbody>" +
      filasResumenTrabajadores +
      "</tbody>" +
      "</table>" +

      bloquesDetalle +

      '<div class="footer">' +
      "<p>* Este consolidado se genera desde las liquidaciones agregadas al acumulador durante la sesión actual.</p>" +
      "<p>* Diferencia adeudada = Esperado con SC - Pagado empresa.</p>" +
      "<p>* Las horas estimadas deben revisarse cuando el PDF no informa horas directamente.</p>" +
      "<p>* Este informe fue generado automáticamente desde el módulo MEC — Demanda HRA.</p>" +
      "</div>" +

      "</div>" +
      "</body>" +
      "</html>"
    );
  }

  function descargarConsolidadoDemandaHRA() {
    if (!__acumuladoDemandaHRA || __acumuladoDemandaHRA.length === 0) {
      alert("No existen liquidaciones acumuladas para generar el consolidado.");
      return;
    }

    const html = generarHtmlConsolidadoDemandaHRA();
    const consolidado = construirConsolidadoDemandaHRA();

    let nombreBase = "demanda-hra-consolidado";

    if (consolidado.trabajadores.length === 1) {
      const trabajador = consolidado.trabajadores[0];

      nombreBase +=
        "-" +
        slugArchivoDemandaHRA(trabajador.rutTrabajador || "rut-no-detectado") +
        "-" +
        slugArchivoDemandaHRA(
          trabajador.nombreTrabajador || "trabajador-no-detectado"
        );
    } else {
      nombreBase += "-multiple";
    }

    const nombreArchivo = nombreBase + ".html";

    const blob = new Blob([html], {
      type: "text/html;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  
  function agregarReporteAlAcumuladoDemandaHRA() {
    if (!__ultimoReporteDemandaHRA) {
      alert("Primero debes generar un análisis antes de agregar al acumulado.");
      return;
    }

    const reporteActual = clonarReporteDemandaHRA(__ultimoReporteDemandaHRA);
    const identificacion = reporteActual.identificacion || {};

    if (identificacion.identificacionIncompleta) {
      const continuar = confirm(
        "La identificación de esta liquidación está incompleta. ¿Quieres agregarla al acumulado de todos modos?"
      );

      if (!continuar) return;
    }

    const claveActual = obtenerClaveReporteDemandaHRA(reporteActual);

    const yaExiste = __acumuladoDemandaHRA.some(function (reporte) {
      return obtenerClaveReporteDemandaHRA(reporte) === claveActual;
    });

    if (yaExiste) {
      const reemplazar = confirm(
        "Ya existe una liquidación acumulada para el mismo trabajador, RUT y periodo. ¿Quieres reemplazarla?"
      );

      if (!reemplazar) return;

      __acumuladoDemandaHRA = __acumuladoDemandaHRA.filter(function (reporte) {
        return obtenerClaveReporteDemandaHRA(reporte) !== claveActual;
      });
    }

    reporteActual.fechaAgregadoAcumulado = new Date().toISOString();

    __acumuladoDemandaHRA.push(reporteActual);

    const contenedorAcumulado = document.getElementById(
      "demanda_resumen_acumulado"
    );

    renderResumenAcumuladoDemandaHRA(contenedorAcumulado);

    alert("Liquidación agregada al acumulado Demanda HRA.");
  }


  function construirDataReporte(params) {
const {
  
  jornada,

  tipoSueldoBase,
  glosaSueldoBase,

  sueldoBaseDetectado,
  sueldoBaseNormalizado,
  sueldoBaseFueNormalizado,
  advertenciaSueldoBase,

  horasBaseDetectadas,
  diasBaseDetectados,

  baut,
  bpaut,
  bautNorm,
  bpautNorm,
  ambosCero,
  requiereBonosManual,
  bonosProporcionalesPorLiquidacionParcial,
  advertenciaBonos,

  identificacion,

  sc,
  st,
} = params;

const identificacionSegura = {
  nombreTrabajador:
    identificacion && identificacion.nombreTrabajador
      ? identificacion.nombreTrabajador
      : "No detectado",

  rutTrabajador:
    identificacion && identificacion.rutTrabajador
      ? identificacion.rutTrabajador
      : "No detectado",

  periodoTexto:
    identificacion && identificacion.periodoTexto
      ? identificacion.periodoTexto
      : "No detectado",

  mes:
    identificacion && identificacion.mes
      ? identificacion.mes
      : "No detectado",

  anio:
    identificacion && identificacion.anio
      ? identificacion.anio
      : "No detectado",

  cargo:
    identificacion && identificacion.cargo
      ? identificacion.cargo
      : "No detectado",

  identificacionIncompleta:
    identificacion && typeof identificacion.identificacionIncompleta === "boolean"
      ? identificacion.identificacionIncompleta
      : true,

  advertenciaIdentificacion:
    identificacion && typeof identificacion.advertenciaIdentificacion === "string"
      ? identificacion.advertenciaIdentificacion
      : "No fue posible detectar todos los datos identificatorios de la liquidación. Revisa trabajador, RUT, periodo y cargo antes de usar este informe en un acumulado.",
};

    const calc = calcularValorHoraBaseDemanda({
      tipoSueldoBase,
      sc,
      horasBaseDetectadas,
      jornada,
    });

    const valorHoraBase = calc.valorHoraBase;

    const valorHoraEmpresa = calcularValorHoraEmpresaMEC(
      sueldoBaseDetectado || 0,
      tipoSueldoBase,
      horasBaseDetectadas,
      jornada
    );

    const horasEstimadas = construirHorasEstimadas(st, valorHoraEmpresa);

    const esperado = calcularEsperados(st, valorHoraBase, horasEstimadas);
    const difs = calcularDiferencias(st, esperado);
    const totales = calcularTotalesDemandaHRA(st, esperado, difs);

return {
  identificacion: identificacionSegura,

  jornada,

  tipoSueldoBase,
  glosaSueldoBase,

  sueldoBaseDetectado,
  sueldoBaseNormalizado,
  sueldoBaseFueNormalizado,
  advertenciaSueldoBase,

  horasBaseDetectadas,
  diasBaseDetectados,

  baut,
  bpaut,
  bautNorm,
  bpautNorm,
  ambosCero,
  requiereBonosManual,
  bonosProporcionalesPorLiquidacionParcial,
  advertenciaBonos,

  sc,
  valorHoraBase,
  valorHoraEmpresa,
  metodoCalculo: calc.metodoCalculo,
  descripcionMetodo: calc.descripcionMetodo,
  warningCalculo: calc.warning,

  horasEstimadas,
  st,
  esperado,
  difs,
  totales,
};

  }

  function wireBotonesManual(contenedor) {
    const btn = contenedor.querySelector("#demanda_btn_recalcular");
    const btnIgual = contenedor.querySelector("#demanda_btn_usar_igual");

    if (!btn || !btnIgual) return;

    btn.addEventListener("click", function () {
      if (!__demandaCtx) return;

      const inBaut = contenedor.querySelector("#demanda_baut_manual");
      const inBpaut = contenedor.querySelector("#demanda_bpaut_manual");

      let bautManual = procesarMontoCLP(inBaut ? inBaut.value : 0);
      let bpautManual = procesarMontoCLP(inBpaut ? inBpaut.value : 0);

      if (bautManual > 0 && bpautManual === 0) {
        bpautManual = bautManual;
      }

      if (bpautManual > 0 && bautManual === 0) {
        bautManual = bpautManual;
      }

      const bautNorm = bautManual || 0;
      const bpautNorm = bpautManual || 0;

const sueldoBaseParaSC =
  __demandaCtx.sueldoBaseNormalizado ||
  __demandaCtx.sueldoBaseDetectado ||
  0;

const sc = sueldoBaseParaSC + bautNorm + bpautNorm;


const data = construirDataReporte({
  identificacion: __demandaCtx.identificacion,

  jornada: __demandaCtx.jornada,

  tipoSueldoBase: __demandaCtx.tipoSueldoBase,
  glosaSueldoBase: __demandaCtx.glosaSueldoBase,

  sueldoBaseDetectado: __demandaCtx.sueldoBaseDetectado,
  sueldoBaseNormalizado: __demandaCtx.sueldoBaseNormalizado,
  sueldoBaseFueNormalizado: __demandaCtx.sueldoBaseFueNormalizado,
  advertenciaSueldoBase: __demandaCtx.advertenciaSueldoBase,

  horasBaseDetectadas: __demandaCtx.horasBaseDetectadas,
  diasBaseDetectados: __demandaCtx.diasBaseDetectados,

  baut: __demandaCtx.baut,
  bpaut: __demandaCtx.bpaut,

  bautNorm,
  bpautNorm,
  ambosCero: false,
  requiereBonosManual: false,
  bonosProporcionalesPorLiquidacionParcial:
    __demandaCtx.bonosProporcionalesPorLiquidacionParcial || false,
  advertenciaBonos: __demandaCtx.bonosProporcionalesPorLiquidacionParcial
    ? "Los bonos pactados fueron ingresados manualmente porque la liquidación tiene menos de 30 días y los bonos detectados en PDF podían estar proporcionalizados."
    : "",

  sc,
  st: __demandaCtx.st,
});


      renderReporte(contenedor, data);

    });

    btnIgual.addEventListener("click", function () {
      const inBaut = contenedor.querySelector("#demanda_baut_manual");
      const inBpaut = contenedor.querySelector("#demanda_bpaut_manual");

      if (inBaut && inBpaut) {
        inBpaut.value = inBaut.value;
      }
    });
  }

  // -------------------- UI principal --------------------
  async function analizarArchivoDemandaHora() {
    try {
      const fileEl = document.getElementById("fileInput");
      const file = fileEl && fileEl.files ? fileEl.files[0] : null;

      const contenedor = document.getElementById("resultadoAnalisis");

      if (!file) {
        alert("⚠ Debes seleccionar una liquidación PDF.");
        return;
      }

      if (!contenedor) {
        alert("❌ No existe #resultadoAnalisis en el HTML.");
        return;
      }

      if (typeof pdfjsLib === "undefined") {
        alert("❌ No está cargado pdfjsLib.");
        return;
      }

const jornada = obtenerJornadaSeleccionada();
const textoCompleto = await leerPdfComoTextoCompleto(file);

// 0) Extraer identificación de la liquidación
const identificacion = extraerIdentificacionLiquidacionDemandaHRA(textoCompleto);

// 1) Extraer sueldo convenido
const scObj = extraerSC(textoCompleto);


      const {
        tipoSueldoBase,
        glosaSueldoBase,

        sueldoBaseDetectado,
        sueldoBaseNormalizado,
        sueldoBaseFueNormalizado,
        advertenciaSueldoBase,

        horasBaseDetectadas,
        diasBaseDetectados,

        baut,
        bpaut,
        bautNorm,
        bpautNorm,
        ambosCero,
        requiereBonosManual,
        bonosProporcionalesPorLiquidacionParcial,
        advertenciaBonos,

        sc,
      } = scObj;


      // 2) Extraer sobretiempo pagado
      const st = extraerSobretiempoPagado(textoCompleto);

      // 3) Armar reporte
const data = construirDataReporte({
  identificacion,

  jornada,

  tipoSueldoBase,
  glosaSueldoBase,

  sueldoBaseDetectado,
  sueldoBaseNormalizado,
  sueldoBaseFueNormalizado,
  advertenciaSueldoBase,

  horasBaseDetectadas,
  diasBaseDetectados,

  baut,
  bpaut,
  bautNorm,
  bpautNorm,
  ambosCero,
  requiereBonosManual,
  bonosProporcionalesPorLiquidacionParcial,
  advertenciaBonos,

  sc,
  st,
});


      // 4) Guardar contexto para recalcular manual
        __demandaCtx = {
          identificacion,

          jornada,

          tipoSueldoBase,
          glosaSueldoBase,


        sueldoBaseDetectado,
        sueldoBaseNormalizado,
        sueldoBaseFueNormalizado,
        advertenciaSueldoBase,

        horasBaseDetectadas,
        diasBaseDetectados,

        baut,
        bpaut,

        requiereBonosManual,
        bonosProporcionalesPorLiquidacionParcial,

        st,

      };

      // 5) Renderizar reporte.
      // Los botones quedan conectados dentro de renderReporte().
      renderReporte(contenedor, data);


    } catch (e) {
      console.error("❌ Error en analizarArchivoDemandaHora():", e);
      alert("❌ Error analizando Demanda. Revisa consola.");
    }
  }

  // Exponer al global
  window.analizarArchivoDemandaHora = analizarArchivoDemandaHora;
})();

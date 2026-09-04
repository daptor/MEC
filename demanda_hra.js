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

  function extraerSC(textoCompleto) {
    const sueldoBaseObj = extraerSueldoBaseDemanda(textoCompleto);

    const sueldoBaseDetectado = sueldoBaseObj.monto || 0;
    const horasBaseDetectadas = sueldoBaseObj.horas ?? null;
    const diasBaseDetectados = sueldoBaseObj.dias ?? null;
    const tipoSueldoBase = sueldoBaseObj.tipo;
    const glosaSueldoBase = sueldoBaseObj.glosa;

    const baut = extraerBonoAsistenciaAut(textoCompleto);
    const bpaut = extraerBonoPuntualidadAut(textoCompleto);

    const { bautNorm, bpautNorm, ambosCero } = normalizarBonosPactados(
      baut,
      bpaut
    );

    const sc = sueldoBaseDetectado + bautNorm + bpautNorm;

    return {
      tipoSueldoBase,
      glosaSueldoBase,
      sueldoBaseDetectado,
      horasBaseDetectadas,
      diasBaseDetectados,

      sb11: sueldoBaseDetectado,
      sbHRA_horas: horasBaseDetectadas,

      baut,
      bpaut,

      bautNorm,
      bpautNorm,
      ambosCero,

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

  // -------------------- Render / Recalc --------------------
  function renderReporte(contenedor, data) {
    const {
      jornada,

      tipoSueldoBase,
      glosaSueldoBase,
      sueldoBaseDetectado,
      horasBaseDetectadas,
      diasBaseDetectados,

      baut,
      bpaut,
      bautNorm,
      bpautNorm,
      ambosCero,

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


    const bloqueInputManual = ambosCero
      ? `
        <div style="margin-top:10px; padding:10px; border:1px solid #fde68a; background:#fffbeb; border-radius:10px;">
          <div style="color:#92400e; font-weight:700; margin-bottom:6px;">
            ⚠ Ambos bonos aparecen en $0 en esta liquidación
          </div>
          <div style="font-size:12px; color:#92400e; margin-bottom:8px;">
            No se puede inferir el valor pactado solo con este PDF. Puedes ingresar el bono pactado para recalcular.
            Si ambos bonos son iguales, basta con ingresar uno.
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; align-items:end;">
            <label style="font-size:12px; color:#374151;">
              Bono asistencia pactado (CLP)
              <input id="demanda_baut_manual" type="text" placeholder="Ej: 9115"
                style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />
            </label>

            <label style="font-size:12px; color:#374151;">
              Bono puntualidad pactado (CLP)
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
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +

      // Bloque SC
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Sueldo Convenido</h3>' +

      "<div>" +
      escapeHtml(glosaSueldoBase || "Sueldo base") +
      ": <strong>" +
      formatearCLP(sueldoBaseDetectado) +
      "</strong>" +
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

      '<div style="margin-top:8px;">SC = Sueldo base + bonos pactados</div>' +
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
  }

  function construirDataReporte(params) {
    const {
      jornada,
      tipoSueldoBase,
      glosaSueldoBase,
      sueldoBaseDetectado,
      horasBaseDetectadas,
      diasBaseDetectados,
      baut,
      bpaut,
      bautNorm,
      bpautNorm,
      ambosCero,
      sc,
      st,
    } = params;

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

      jornada,

      tipoSueldoBase,
      glosaSueldoBase,
      sueldoBaseDetectado,
      horasBaseDetectadas,
      diasBaseDetectados,

      baut,
      bpaut,
      bautNorm,
      bpautNorm,
      ambosCero,

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

  // Guardamos el último estado para permitir recalcular bonos manuales
  let __demandaCtx = null;

  function wireBotonesManual(contenedor) {
    const btn = document.getElementById("demanda_btn_recalcular");
    const btnIgual = document.getElementById("demanda_btn_usar_igual");

    if (!btn || !btnIgual) return;

    btn.addEventListener("click", function () {
      if (!__demandaCtx) return;

      const inBaut = document.getElementById("demanda_baut_manual");
      const inBpaut = document.getElementById("demanda_bpaut_manual");

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

      const sc =
        (__demandaCtx.sueldoBaseDetectado || 0) + bautNorm + bpautNorm;

      const data = construirDataReporte({
        jornada: __demandaCtx.jornada,

        tipoSueldoBase: __demandaCtx.tipoSueldoBase,
        glosaSueldoBase: __demandaCtx.glosaSueldoBase,
        sueldoBaseDetectado: __demandaCtx.sueldoBaseDetectado,
        horasBaseDetectadas: __demandaCtx.horasBaseDetectadas,
        diasBaseDetectados: __demandaCtx.diasBaseDetectados,

        baut: __demandaCtx.baut,
        bpaut: __demandaCtx.bpaut,

        bautNorm,
        bpautNorm,
        ambosCero: false,

        sc,
        st: __demandaCtx.st,
      });

      renderReporte(contenedor, data);
      wireBotonesManual(contenedor);
    });

    btnIgual.addEventListener("click", function () {
      const inBaut = document.getElementById("demanda_baut_manual");
      const inBpaut = document.getElementById("demanda_bpaut_manual");

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

      // 1) Extraer sueldo convenido
      const scObj = extraerSC(textoCompleto);

      const {
        tipoSueldoBase,
        glosaSueldoBase,
        sueldoBaseDetectado,
        horasBaseDetectadas,
        diasBaseDetectados,
        baut,
        bpaut,
        bautNorm,
        bpautNorm,
        ambosCero,
        sc,
      } = scObj;

      // 2) Extraer sobretiempo pagado
      const st = extraerSobretiempoPagado(textoCompleto);

      // 3) Armar reporte
      const data = construirDataReporte({
        jornada,

        tipoSueldoBase,
        glosaSueldoBase,
        sueldoBaseDetectado,
        horasBaseDetectadas,
        diasBaseDetectados,

        baut,
        bpaut,
        bautNorm,
        bpautNorm,
        ambosCero,

        sc,
        st,
      });

      renderReporte(contenedor, data);

      // 4) Guardar contexto para recalcular manual
      __demandaCtx = {
        jornada,

        tipoSueldoBase,
        glosaSueldoBase,
        sueldoBaseDetectado,
        horasBaseDetectadas,
        diasBaseDetectados,

        baut,
        bpaut,

        st,
      };

      // 5) Conectar botones manuales si aparecen
      wireBotonesManual(contenedor);
    } catch (e) {
      console.error("❌ Error en analizarArchivoDemandaHora():", e);
      alert("❌ Error analizando Demanda. Revisa consola.");
    }
  }

  // Exponer al global
  window.analizarArchivoDemandaHora = analizarArchivoDemandaHora;
})();

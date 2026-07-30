// ======================================================
// MEC — MÓDULO DEMANDA (HRA / SUELDO BASE)
// Recalcula base demandable:
// SC = SUELDO BASE o S.BASE PART-TIME (HRA)
//      + BONO ASISTENCIA AUT.
//      + BONO PUNTUALIDAD AUT.
//
// Soporta:
// - SUELDO BASE (30) $ 465.785
// - S.BASE PART-TIME (HRA) (86.7 $ 215.351
//
// Revalida sobretiempo con fórmula MEC:
// valorHoraBase = (sueldo / 30) * (28 / (jornada * 4))
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
    // Preferencia: pantalla horas MEC
    const selHoras = document.getElementById("horas-jornada");
    if (selHoras && selHoras.value) {
      const n = parseFloat(String(selHoras.value).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }

    // Alternativa: select general #jornada
    const sel = document.getElementById("jornada");
    if (sel && sel.value) {
      const n = parseFloat(String(sel.value).replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }

    return null;
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

  // -------------------- Extractores Base Demanda --------------------
  function extraerMontoPorGlosa(textoCompleto, glosaRegex) {
    const m = String(textoCompleto || "").match(glosaRegex);
    if (!m) return 0;
    return procesarMontoCLP(m[1]);
  }

  function extraerSueldoBasePartTimeHRA(textoCompleto) {
    const t = String(textoCompleto || "");

    /*
      Soporta:

      S.BASE PART-TIME (HRA) (86.7 $ 215.351
      S.BASE PART-TIME (HRA) (86,7 $ 215.351
      S.BASE PART-TIME (HRA) 86.7 $ 215.351
      S.BASE PART TIME (HRA) (86.7) $ 215.351
      S. BASE PART-TIME (HRA) (86.7 $ 215.351
    */

    const re =
      /S\.?\s*BASE\s+PART-?TIME\s*\(HRA\)\s*\(?\s*([0-9]+(?:[.,][0-9]+)?)\s*\)?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i;

    const m = t.match(re);
    if (!m) return null;

    const horas = parseFloat(String(m[1]).replace(",", "."));
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

    /*
      Soporta:

      SUELDO BASE (30) $ 465.785
      SUELDO BASE(30)$465.785
      SUELDO BASE $ 465.785

      No captura S.BASE PART-TIME porque busca explícitamente "SUELDO BASE".
    */

    const re =
      /\bSUELDO\s+BASE\s*(?:\(\s*([0-9]+(?:[.,][0-9]+)?)\s*\))?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i;

    const m = t.match(re);
    if (!m) return null;

    const dias = m[1] != null ? parseFloat(String(m[1]).replace(",", ".")) : null;
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
    // Prioridad 1: part-time HRA
    const sbHRA = extraerSueldoBasePartTimeHRA(textoCompleto);
    if (sbHRA && sbHRA.monto > 0) return sbHRA;

    // Prioridad 2: sueldo base mensual
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
      /BONO\s+ASISTENCIA\s+AUT\.?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );
  }

  function extraerBonoPuntualidadAut(textoCompleto) {
    return extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s+PUNTUALIDAD\s+AUT\.?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );
  }

  function normalizarBonosPactados(baut, bpaut) {
    // Regla:
    // Si uno es 0 y el otro tiene valor, ambos se asumen iguales.
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

      // Compatibilidad con nombres anteriores
      sb11: sueldoBaseDetectado,
      sbHRA_horas: horasBaseDetectadas,

      // Bonos detectados en PDF
      baut,
      bpaut,

      // Bonos pactados inferidos
      bautNorm,
      bpautNorm,
      ambosCero,

      sc,
    };
  }

  // -------------------- Extractores Sobretiempo --------------------
  function extraerSobretiempoPagado(textoCompleto) {
    const t = String(textoCompleto || "");

    /*
      Soporta:

      HORAS EXTRAS 50 % (.47) $ 1.703
      HORAS EXTRAS 50 % (1.5) $ 12.345
      HORAS EXTRAS DOMINGO (.4) $ 1.937
      HORAS RECARGO DOMINGO (2.0) $ 15.050
      HORAS RECARGO DOMINGO $ 27.822
      RECARGO 50% FESTIVO (x.xx) $ monto
    */

    const hx = t.match(
      /HORAS\s*EXTRAS\s*50\s*%\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const hxd = t.match(
      /HORAS\s*EXTRAS\s*DOMINGO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const rdConHoras = t.match(
      /HORAS\s*RECARGO\s*DOMINGO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const rdSinHoras = t.match(
      /HORAS\s*RECARGO\s*DOMINGO\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    const rf = t.match(
      /RECARGO\s*50\s*%\s*FESTIVO\s*\(\s*([0-9]*[.,]?[0-9]+)\s*\)\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i
    );

    return {
      horasExtras50: hx ? parseFloat(String(hx[1]).replace(",", ".")) : null,
      pagadoHorasExtras50: hx ? procesarMontoCLP(hx[2]) : 0,

      horasExtrasDomingo: hxd
        ? parseFloat(String(hxd[1]).replace(",", "."))
        : null,
      pagadoHorasExtrasDomingo: hxd ? procesarMontoCLP(hxd[2]) : 0,

      horasRecargoDomingo: rdConHoras
        ? parseFloat(String(rdConHoras[1]).replace(",", "."))
        : null,
      pagadoRecargoDomingo: rdConHoras
        ? procesarMontoCLP(rdConHoras[2])
        : rdSinHoras
        ? procesarMontoCLP(rdSinHoras[1])
        : 0,
      recargoDomingoTieneHoras: !!rdConHoras,

      horasRecargoFestivo: rf
        ? parseFloat(String(rf[1]).replace(",", "."))
        : null,
      pagadoRecargoFestivo: rf ? procesarMontoCLP(rf[2]) : 0,
    };
  }

  // -------------------- Cálculo MEC --------------------
  function calcularValorHoraBaseMEC(sueldoMensual, jornadaHorasSemana) {
    if (!sueldoMensual || sueldoMensual <= 0) return null;
    if (!jornadaHorasSemana || jornadaHorasSemana <= 0) return null;

    return (sueldoMensual / 30) * (28 / (Number(jornadaHorasSemana) * 4));
  }

  function calcularEsperados(st, valorHoraBase) {
    return {
      horasExtras50:
        valorHoraBase != null && st.horasExtras50 != null
          ? valorHoraBase * 1.5 * st.horasExtras50
          : null,

      horasExtrasDomingo:
        valorHoraBase != null && st.horasExtrasDomingo != null
          ? valorHoraBase * 1.3 * 1.5 * st.horasExtrasDomingo
          : null,

      recargoDomingo:
        valorHoraBase != null && st.horasRecargoDomingo != null
          ? valorHoraBase * 0.3 * st.horasRecargoDomingo
          : null,

      recargoFestivo:
        valorHoraBase != null && st.horasRecargoFestivo != null
          ? valorHoraBase * 1.5 * st.horasRecargoFestivo
          : null,
    };
  }

  function calcularDiferencias(st, esperado) {
    /*
      Diferencia demandable:
      Esperado con SC - Pagado Empresa

      Si da positivo, la empresa pagó menos.
      Si da negativo, la empresa pagó más.
    */

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
        esperado.recargoDomingo != null && st.recargoDomingoTieneHoras
          ? esperado.recargoDomingo - st.pagadoRecargoDomingo
          : null,

      recargoFestivo:
        esperado.recargoFestivo != null
          ? esperado.recargoFestivo - st.pagadoRecargoFestivo
          : null,
    };
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
      jornadaInferida,
      jornadaParaCalculo,
      warningJornada,

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

      st,
      esperado,
      difs,
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

    contenedor.innerHTML =
      '<div style="border:2px solid #ddd; border-radius:12px; padding:14px; background:#fafafa; margin-bottom:16px;">' +
      '<h2 style="margin:0 0 10px 0;">MEC — Demanda</h2>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +

      // Bloque SC
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Base “Demanda” — Sueldo Convenido</h3>' +

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
      '<div style="font-size:18px; margin-top:4px;">SUELDO CONVENIDO: <strong>' +
      formatearCLP(sc) +
      "</strong></div>" +

      bloqueInputManual +

      "</div>" +

      // Bloque Fórmula MEC
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Fórmula MEC aplicada</h3>' +
      "<div>Jornada seleccionada: <strong>" +
      (jornada == null ? "No detectada" : escapeHtml(String(jornada))) +
      "</strong></div>" +
      "<div>Jornada inferida por HRA: <strong>" +
      (jornadaInferida == null ? "No aplica" : escapeHtml(String(jornadaInferida.toFixed(3)))) +
      "</strong></div>" +
      "<div>Jornada usada para cálculo: <strong>" +
      (jornadaParaCalculo == null ? "No detectada" : escapeHtml(String(jornadaParaCalculo))) +
      "</strong></div>" +
      "<div style='margin-top:8px;'>valorHoraBase = (SC/30) × (28 / (jornada×4))</div>" +
      '<div style="margin-top:8px;">valorHoraBase: <strong>' +
      (valorHoraBase == null ? "—" : formatearCLP(valorHoraBase)) +
      "</strong></div>" +
      (warningJornada
        ? '<div style="margin-top:8px;color:#b45309;"><strong>' +
          escapeHtml(warningJornada) +
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
      filaComparacion(
        "HORAS EXTRAS 50%",
        st.pagadoHorasExtras50,
        esperado.horasExtras50,
        difs.horasExtras50,
        st.horasExtras50 != null ? "Horas: " + st.horasExtras50 : "No encontrado"
      ) +
      filaComparacion(
        "HORAS EXTRAS DOMINGO",
        st.pagadoHorasExtrasDomingo,
        esperado.horasExtrasDomingo,
        difs.horasExtrasDomingo,
        st.horasExtrasDomingo != null
          ? "Horas: " + st.horasExtrasDomingo
          : "No encontrado"
      ) +
      (st.recargoDomingoTieneHoras
        ? filaComparacion(
            "HORAS RECARGO DOMINGO",
            st.pagadoRecargoDomingo,
            esperado.recargoDomingo,
            difs.recargoDomingo,
            st.horasRecargoDomingo != null
              ? "Horas: " + st.horasRecargoDomingo
              : ""
          )
        : filaComparacion(
            "HORAS RECARGO DOMINGO",
            st.pagadoRecargoDomingo,
            null,
            null,
            "El PDF no trae horas, solo monto pagado. No validable."
          )) +
      filaComparacion(
        "RECARGO 50% FESTIVO",
        st.pagadoRecargoFestivo,
        esperado.recargoFestivo,
        difs.recargoFestivo,
        st.horasRecargoFestivo != null
          ? "Horas: " + st.horasRecargoFestivo
          : "No encontrado"
      ) +
      "</tbody>" +
      "</table>" +
      '<div style="margin-top:10px; font-size:12px; color:#6b7280;">' +
      "* Diferencia adeudada = Esperado con SC - Pagado empresa. Si |diferencia| &lt; 1 peso, se considera correct

// ======================================================
// MEC — MÓDULO DEMANDA (HRA)
// Recalcula base (SC) = S.BASE PART-TIME (HRA) + BONO ASISTENCIA AUT. + BONO PUNTUALIDAD AUT.
// y revalida sobretiempo con fórmula MEC:
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
      .replace(/[^\S\r\n]+/g, " ") // colapsa espacios
      .replace(/[^\x20-\x7EÁÉÍÓÚÜÑáéíóúüñ().,%$\/\-]/g, " ") // limpia raros manteniendo acentos típicos
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
    // Preferencia: pantalla horas (MEC)
    const selHoras = document.getElementById("horas-jornada");
    if (selHoras && selHoras.value) {
      const n = parseInt(selHoras.value, 10);
      return Number.isFinite(n) ? n : null;
    }

    // Alternativa: select general #jornada si viene como número
    const sel = document.getElementById("jornada");
    if (sel && sel.value) {
      const n = parseInt(sel.value, 10);
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

  // -------------------- Extractores “Demanda” --------------------
  function extraerMontoPorGlosa(textoCompleto, glosaRegex) {
    const m = String(textoCompleto || "").match(glosaRegex);
    if (!m) return 0;
    return procesarMontoCLP(m[1]);
  }

  function extraerSueldoBasePartTimeHRA(textoCompleto) {
    // Trabajamos con el texto ya normalizado por leerPdfComoTextoCompleto()
    const t = String(textoCompleto || "");

    // Captura:
    //  1) horas (ej: 86.7 o 86,7)
    //  2) monto (ej: 215.351 o 215351)
    const re =
      /S\.BASE\s+PART-?TIME\s*\(HRA\)\s*\(?\s*([0-9]+(?:[.,][0-9]+)?)\s*\)?\s*\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*|[0-9]+)\b/i;

    const m = t.match(re);
    if (!m) return null;

    const horas = parseFloat(String(m[1]).replace(",", "."));
    const monto = procesarMontoCLP(m[2]);

    return {
      glosa: "S.BASE PART-TIME (HRA)",
      horas: Number.isFinite(horas) ? horas : null,
      monto: monto || 0,
    };
  }

  function normalizarBonosPactados(baut, bpaut) {
    // Regla: si uno es 0 y el otro > 0, ambos se asumen iguales (valor pactado)
    let bautNorm = baut || 0;
    let bpautNorm = bpaut || 0;

    if (bautNorm === 0 && bpautNorm > 0) bautNorm = bpautNorm;
    if (bpautNorm === 0 && bautNorm > 0) bpautNorm = bautNorm;

    const ambosCero = bautNorm === 0 && bpautNorm === 0;

    return { bautNorm, bpautNorm, ambosCero };
  }

  function extraerSC(textoCompleto) {
    // Usar S.BASE PART-TIME (HRA) en vez de SB(11)
    const sbHRA = extraerSueldoBasePartTimeHRA(textoCompleto);
    const sb11 = sbHRA?.monto || 0;

    const baut = extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s*ASISTENCIA\s*AUT\.?.*?\$\s*([\d.,]+)/i
    );

    const bpaut = extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s*PUNTUALIDAD\s*AUT\.?.*?\$\s*([\d.,]+)/i
    );

    const { bautNorm, bpautNorm, ambosCero } = normalizarBonosPactados(baut, bpaut);
    const sc = (sb11 || 0) + bautNorm + bpautNorm;

    return {
      sb11,
      sbHRA_horas: sbHRA?.horas ?? null,

      // valores detectados en PDF
      baut,
      bpaut,

      // valores pactados inferidos (normalizados)
      bautNorm,
      bpautNorm,
      ambosCero,

      sc,
    };
  }

  function extraerSobretiempoPagado(textoCompleto) {
    // Formatos usados en tu HRA:
    // HORAS EXTRAS 50 % (1.5) $ 12.345
    // HORAS EXTRAS DOMINGO (.18) $ 849
    // HORAS RECARGO DOMINGO (x.xx) $ 15.050  (o sin horas)
    // RECARGO 50% FESTIVO (x.xx) $ monto
    const t = String(textoCompleto || "");

    const hx = t.match(/HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const hxd = t.match(/HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const rdConHoras = t.match(/HORAS\s*RECARGO\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const rdSinHoras = t.match(/HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i);
    const rf = t.match(/RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);

    return {
      horasExtras50: hx ? parseFloat(String(hx[1]).replace(",", ".")) : null,
      pagadoHorasExtras50: hx ? procesarMontoCLP(hx[2]) : 0,

      horasExtrasDomingo: hxd ? parseFloat(String(hxd[1]).replace(",", ".")) : null,
      pagadoHorasExtrasDomingo: hxd ? procesarMontoCLP(hxd[2]) : 0,

      horasRecargoDomingo: rdConHoras ? parseFloat(String(rdConHoras[1]).replace(",", ".")) : null,
      pagadoRecargoDomingo: rdConHoras ? procesarMontoCLP(rdConHoras[2]) : rdSinHoras ? procesarMontoCLP(rdSinHoras[1]) : 0,
      recargoDomingoTieneHoras: !!rdConHoras,

      horasRecargoFestivo: rf ? parseFloat(String(rf[1]).replace(",", ".")) : null,
      pagadoRecargoFestivo: rf ? procesarMontoCLP(rf[2]) : 0,
    };
  }

  // -------------------- Cálculo MEC --------------------
  function calcularValorHoraBaseMEC(sueldoMensual, jornadaHorasSemana) {
    // valorHoraBase = (sueldo / 30) * (28 / (jornada * 4))
    return (sueldoMensual / 30) * (28 / (parseInt(jornadaHorasSemana, 10) * 4));
  }

  function calcularEsperados(st, valorHoraBase) {
    return {
      horasExtras50:
        valorHoraBase != null && st.horasExtras50 != null ? valorHoraBase * 1.5 * st.horasExtras50 : null,
      horasExtrasDomingo:
        valorHoraBase != null && st.horasExtrasDomingo != null ? valorHoraBase * 1.3 * 1.5 * st.horasExtrasDomingo : null,
      recargoDomingo:
        valorHoraBase != null && st.horasRecargoDomingo != null ? valorHoraBase * 0.3 * st.horasRecargoDomingo : null,
      recargoFestivo:
        valorHoraBase != null && st.horasRecargoFestivo != null ? valorHoraBase * 1.5 * st.horasRecargoFestivo : null,
    };
  }

  function calcularDiferencias(st, esperado) {
    return {
      horasExtras50: esperado.horasExtras50 != null ? st.pagadoHorasExtras50 - esperado.horasExtras50 : null,
      horasExtrasDomingo: esperado.horasExtrasDomingo != null ? st.pagadoHorasExtrasDomingo - esperado.horasExtrasDomingo : null,
      recargoDomingo:
        esperado.recargoDomingo != null && st.recargoDomingoTieneHoras ? st.pagadoRecargoDomingo - esperado.recargoDomingo : null,
      recargoFestivo: esperado.recargoFestivo != null ? st.pagadoRecargoFestivo - esperado.recargoFestivo : null,
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
        ? '<div style="font-size:12px;color:#6b7280;">' + escapeHtml(notaExtra) + "</div>"
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
      warningJornada,
      sb11,
      sbHRA_horas,

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

    const bloqueInputManual =
      ambosCero
        ? `
        <div style="margin-top:10px; padding:10px; border:1px solid #fde68a; background:#fffbeb; border-radius:10px;">
          <div style="color:#92400e; font-weight:700; margin-bottom:6px;">
            ⚠ Ambos bonos aparecen en $0 en esta liquidación
          </div>
          <div style="font-size:12px; color:#92400e; margin-bottom:8px;">
            No se puede inferir el valor pactado solo con este PDF. Puedes ingresar el bono pactado para recalcular (si son iguales, basta con 1).
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; align-items:end;">
            <label style="font-size:12px; color:#374151;">
              Bono asistencia pactado (CLP)
              <input id="demanda_baut_manual" type="text" placeholder="Ej: 9115"
                style="width:100%; padding:8px; border:1px solid #e5e7eb; border-radius:8px;" />
            </label>

            <label style="font-size:12px; color:#374151;">
              Bono puntualidad pactado (CLP)
              <input id="demanda_bpaut_manual" type="text" placeholder="Ej: 9115 (opcional)"
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
              Usar mismo valor para ambos (desde asistencia)
            </button>
          </div>
        </div>
      `
        : "";

    contenedor.innerHTML =
      '<div style="border:2px solid #ddd; border-radius:12px; padding:14px; background:#fafafa; margin-bottom:16px;">' +
      '<h2 style="margin:0 0 10px 0;">MEC — Demanda (HRA)</h2>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Base “Demanda” (SC)</h3>' +
      "<div>S.BASE PART-TIME (HRA): <strong>" +
      formatearCLP(sb11) +
      "</strong>" +
      '<div style="font-size:12px;color:#6b7280;">Horas: <strong>' +
      (sbHRA_horas == null ? "No detectadas" : sbHRA_horas) +
      "</strong></div>" +
      "</div>" +

      '<div style="margin-top:8px; font-size:12px; color:#6b7280;">Detectado (PDF)</div>' +
      "<div>BONO ASISTENCIA AUT.: <strong>" +
      formatearCLP(baut) +
      "</strong></div>" +
      "<div>BONO PUNTUALIDAD AUT.: <strong>" +
      formatearCLP(bpaut) +
      "</strong></div>" +

      '<div style="margin-top:8px; font-size:12px; color:#6b7280;">Pactado (normalizado)</div>' +
      "<div>BONO ASISTENCIA AUT. pactado: <strong>" +
      formatearCLP(bautNorm) +
      "</strong></div>" +
      "<div>BONO PUNTUALIDAD AUT. pactado: <strong>" +
      formatearCLP(bpautNorm) +
      "</strong></div>" +

      '<div style="margin-top:8px;">SC = <strong>' +
      formatearCLP(sc) +
      "</strong></div>" +

      bloqueInputManual +

      "</div>" +
      '<div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">' +
      '<h3 style="margin:0 0 8px 0; font-size:16px;">Fórmula MEC aplicada</h3>' +
      "<div>jornada (horas/semana): <strong>" +
      (jornada == null ? "No detectada" : jornada) +
      "</strong></div>" +
      "<div>valorHoraBase = (SC/30) × (28 / (jornada×4))</div>" +
      '<div style="margin-top:8px;">valorHoraBase: <strong>' +
      (valorHoraBase == null ? "—" : formatearCLP(valorHoraBase)) +
      "</strong></div>" +
      (warningJornada
        ? '<div style="margin-top:8px;color:#b45309;"><strong>' + escapeHtml(warningJornada) + "</strong></div>"
        : "") +
      "</div>" +
      "</div>" +
      "</div>" +

      '<div style="border:1px solid #eee; border-radius:12px; padding:14px; background:#fff;">' +
      '<h2 style="margin:0 0 10px 0;">Comparación sobretiempo (pagado vs esperado con SC)</h2>' +
      '<table style="width:100%; border-collapse:collapse;">' +
      "<thead>" +
      "<tr>" +
      '<th style="text-align:left; padding:8px; border-bottom:2px solid #eee;">Ítem</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Pagado (PDF)</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Esperado (SC)</th>' +
      '<th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Diferencia</th>' +
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
        st.horasExtrasDomingo != null ? "Horas: " + st.horasExtrasDomingo : "No encontrado"
      ) +
      (st.recargoDomingoTieneHoras
        ? filaComparacion(
            "HORAS RECARGO DOMINGO",
            st.pagadoRecargoDomingo,
            esperado.recargoDomingo,
            difs.recargoDomingo,
            st.horasRecargoDomingo != null ? "Horas: " + st.horasRecargoDomingo : ""
          )
        : filaComparacion(
            "HORAS RECARGO DOMINGO",
            st.pagadoRecargoDomingo,
            null,
            null,
            "El PDF no trae horas (no validable)."
          )) +
      filaComparacion(
        "RECARGO 50% FESTIVO",
        st.pagadoRecargoFestivo,
        esperado.recargoFestivo,
        difs.recargoFestivo,
        st.horasRecargoFestivo != null ? "Horas: " + st.horasRecargoFestivo : "No encontrado"
      ) +
      "</tbody>" +
      "</table>" +
      '<div style="margin-top:10px; font-size:12px; color:#6b7280;">' +
      "* Regla de comparación: si |diferencia| &lt; 1 peso → se considera correcto." +
      "</div>" +
      "</div>";
  }

  function construirDataReporte(params) {
    const {
      jornada,
      sb11,
      sbHRA_horas,
      baut,
      bpaut,
      bautNorm,
      bpautNorm,
      ambosCero,
      sc,
      st,
    } = params;

    let valorHoraBase = null;
    let warningJornada = "";
    if (!jornada || jornada <= 0) {
      warningJornada = "No se detectó jornada (horas/semana). Selecciona #horas-jornada para recalcular.";
    } else {
      valorHoraBase = calcularValorHoraBaseMEC(sc, jornada);
    }

    const esperado = calcularEsperados(st, valorHoraBase);
    const difs = calcularDiferencias(st, esperado);

    return {
      jornada,
      warningJornada,
      sb11,
      sbHRA_horas,

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
    };
  }

  // Guardamos el último “estado” para permitir recalcular si ambos bonos venían 0
  let __demandaCtx = null;

  function wireBotonesManual(contenedor) {
    const btn = document.getElementById("demanda_btn_recalcular");
    const btnIgual = document.getElementById("demanda_btn_usar_igual");
    if (!btn || !btnIgual) return;

    btn.addEventListener("click", function () {
      if (!__demandaCtx) return;

      const inBaut = document.getElementById("demanda_baut_manual");
      const inBpaut = document.getElementById("demanda_bpaut_manual");

      const bautManual = procesarMontoCLP(inBaut ? inBaut.value : 0);
      const bpautManual = procesarMontoCLP(inBpaut ? inBpaut.value : 0);

      // Si solo llena uno, asumimos que ambos son iguales (pactados)
      const bautP = bautManual > 0 ? bautManual : bpautManual;
      const bpautP = bpautManual > 0 ? bpautManual : bautManual;

      const bautNorm = bautP || 0;
      const bpautNorm = bpautP || 0;

      const sc = (__demandaCtx.sb11 || 0) + bautNorm + bpautNorm;

      const data = construirDataReporte({
        jornada: __demandaCtx.jornada,
        sb11: __demandaCtx.sb11,
        sbHRA_horas: __demandaCtx.sbHRA_horas,

        baut: __demandaCtx.baut, // detectado PDF (0)
        bpaut: __demandaCtx.bpaut, // detectado PDF (0)

        bautNorm,
        bpautNorm,
        ambosCero: false,

        sc,
        st: __demandaCtx.st,
      });

      renderReporte(contenedor, data);
    });

    btnIgual.addEventListener("click", function () {
      const inBaut = document.getElementById("demanda_baut_manual");
      const inBpaut = document.getElementById("demanda_bpaut_manual");
      if (inBpaut && inBaut) inBpaut.value = inBaut.value;
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
        alert("❌ No existe #resultadoAnalisis en el HTML");
        return;
      }
      if (typeof pdfjsLib === "undefined") {
        alert("❌ No está cargado pdfjsLib.");
        return;
      }

      const jornada = obtenerJornadaSeleccionada();
      const textoCompleto = await leerPdfComoTextoCompleto(file);

      // 1) Extraer SC (con normalización pactada)
      const scObj = extraerSC(textoCompleto);
      const { sb11, sbHRA_horas, baut, bpaut, bautNorm, bpautNorm, ambosCero, sc } = scObj;

      // 2) Extraer sobretiempo pagado (PDF)
      const st = extraerSobretiempoPagado(textoCompleto);

      // 3) Armar reporte
      const data = construirDataReporte({
        jornada,
        sb11,
        sbHRA_horas,

        baut,
        bpaut,
        bautNorm,
        bpautNorm,
        ambosCero,

        sc,
        st,
      });

      renderReporte(contenedor, data);

      // 4) Guardar contexto para recalcular manual si corresponde
      __demandaCtx = {
        jornada,
        sb11,
        sbHRA_horas,
        baut,
        bpaut,
        st,
      };

      // 5) Si hay inputs manuales, conectar botones
      wireBotonesManual(contenedor);
    } catch (e) {
      console.error("❌ Error en analizarArchivoDemandaHora():", e);
      alert("❌ Error analizando Demanda (HRA). Revisa consola.");
    }
  }

  // Exponer al global
  window.analizarArchivoDemandaHora = analizarArchivoDemandaHora;
})();

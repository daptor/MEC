// ======================================================
// MEC — MÓDULO DEMANDA (HRA)
// Recalcula base (SC) = SB(11) + BONO ASISTENCIA AUT. + BONO PUNTUALIDAD AUT.
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
      .replace(/[^\S\r\n]+/g, " ")     // colapsa espacios
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
      const strings = content.items.map(it => it.str);
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

  // -------------------- Extractores “Demanda” --------------------
  function extraerMontoPorGlosa(textoCompleto, glosaRegex) {
    const m = textoCompleto.match(glosaRegex);
    if (!m) return 0;
    return procesarMontoCLP(m[1]);
  }

  function extraerSC(textoCompleto) {
    // SB(11) típico: "SB(11) $ 123.456" o "SB (11) $123.456"
    const sb11 = extraerMontoPorGlosa(
      textoCompleto,
      /SB\s*\(\s*11\s*\).*?\$\s*([\d.,]+)/i
    );

    const baut = extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s*ASISTENCIA\s*AUT\.?.*?\$\s*([\d.,]+)/i
    );

    const bpaut = extraerMontoPorGlosa(
      textoCompleto,
      /BONO\s*PUNTUALIDAD\s*AUT\.?.*?\$\s*([\d.,]+)/i
    );

    return { sb11, baut, bpaut, sc: (sb11 || 0) + (baut || 0) + (bpaut || 0) };
  }

  function extraerSobretiempoPagado(textoCompleto) {
    // Formatos usados en tu HRA:
    // HORAS EXTRAS 50 % (1.5) $ 12.345
    // HORAS EXTRAS DOMINGO (.18) $ 849
    // HORAS RECARGO DOMINGO (x.xx) $ 15.050  (o sin horas)
    // RECARGO 50% FESTIVO (x.xx) $ monto
    const hx = textoCompleto.match(/HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const hxd = textoCompleto.match(/HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const rdConHoras = textoCompleto.match(/HORAS\s*RECARGO\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);
    const rdSinHoras = textoCompleto.match(/HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i);
    const rf = textoCompleto.match(/RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i);

    return {
      horasExtras50: hx ? parseFloat(String(hx[1]).replace(",", ".")) : null,
      pagadoHorasExtras50: hx ? procesarMontoCLP(hx[2]) : 0,

      horasExtrasDomingo: hxd ? parseFloat(String(hxd[1]).replace(",", ".")) : null,
      pagadoHorasExtrasDomingo: hxd ? procesarMontoCLP(hxd[2]) : 0,

      horasRecargoDomingo: rdConHoras ? parseFloat(String(rdConHoras[1]).replace(",", ".")) : null,
      pagadoRecargoDomingo: rdConHoras ? procesarMontoCLP(rdConHoras[2]) : (rdSinHoras ? procesarMontoCLP(rdSinHoras[1]) : 0),
      recargoDomingoTieneHoras: !!rdConHoras,

      horasRecargoFestivo: rf ? parseFloat(String(rf[1]).replace(",", ".")) : null,
      pagadoRecargoFestivo: rf ? procesarMontoCLP(rf[2]) : 0
    };
  }

  // -------------------- Cálculo MEC (desde calcularHoras) --------------------
  function calcularValorHoraBaseMEC(sueldoMensual, jornadaHorasSemana) {
    // valorHoraBase = (sueldo / 30) * (28 / (jornada * 4))
    return (sueldoMensual / 30) * (28 / (parseInt(jornadaHorasSemana, 10) * 4));
  }

  // -------------------- UI principal --------------------
  async function analizarArchivoDemandaHora() {
    try {
      const file = document.getElementById("fileInput")?.files?.[0];
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

      // 1) Extraer SC
      const { sb11, baut, bpaut, sc } = extraerSC(textoCompleto);

      // 2) Recalcular valor hora base con MEC usando sueldo=SC
      let valorHoraBase = null;
      let warningJornada = "";
      if (!jornada || jornada <= 0) {
        warningJornada = "⚠ No se detectó jornada (horas/semana). Selecciona #horas-jornada para recalcular.";
      } else {
        valorHoraBase = calcularValorHoraBaseMEC(sc, jornada);
      }

      // 3) Extraer sobretiempo pagado (PDF) y recalcular esperado con valorHoraBase
      const st = extraerSobretiempoPagado(textoCompleto);

      const esperado = {
        horasExtras50: (valorHoraBase != null && st.horasExtras50 != null) ? (valorHoraBase * 1.5 * st.horasExtras50) : null,
        horasExtrasDomingo: (valorHoraBase != null && st.horasExtrasDomingo != null) ? (valorHoraBase * 1.3 * 1.5 * st.horasExtrasDomingo) : null,
        recargoDomingo: (valorHoraBase != null && st.horasRecargoDomingo != null) ? (valorHoraBase * 0.30 * st.horasRecargoDomingo) : null,
        recargoFestivo: (valorHoraBase != null && st.horasRecargoFestivo != null) ? (valorHoraBase * 1.5 * st.horasRecargoFestivo) : null
      };

      const difs = {
        horasExtras50: (esperado.horasExtras50 != null) ? (st.pagadoHorasExtras50 - esperado.horasExtras50) : null,
        horasExtrasDomingo: (esperado.horasExtrasDomingo != null) ? (st.pagadoHorasExtrasDomingo - esperado.horasExtrasDomingo) : null,
        recargoDomingo: (esperado.recargoDomingo != null && st.recargoDomingoTieneHoras) ? (st.pagadoRecargoDomingo - esperado.recargoDomingo) : null,
        recargoFestivo: (esperado.recargoFestivo != null) ? (st.pagadoRecargoFestivo - esperado.recargoFestivo) : null
      };

      function filaComparacion(nombre, pagado, esp, dif, notaExtra = "") {
        const estado =
          (esp == null)
            ? "⚪"
            : (Math.abs(dif) < 1 ? "🟢" : "🔴");

        const difTxt = (dif == null) ? "—" : formatearCLP(dif);
        const espTxt = (esp == null) ? "—" : formatearCLP(esp);

        return `
          <tr>
            <td style="padding:8px; border-bottom:1px solid #eee;">${estado} ${nombre}${notaExtra ? `<div style="font-size:12px;color:#6b7280;">${notaExtra}</div>` : ""}</td>
            <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${formatearCLP(pagado || 0)}</td>
            <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${espTxt}</td>
            <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;"><strong>${difTxt}</strong></td>
          </tr>
        `;
      }

      contenedor.innerHTML = `
        <div style="border:2px solid #ddd; border-radius:12px; padding:14px; background:#fafafa; margin-bottom:16px;">
          <h2 style="margin:0 0 10px 0;">MEC — Demanda (HRA)</h2>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">
              <h3 style="margin:0 0 8px 0; font-size:16px;">Base “Demanda” (SC)</h3>
              <div>SB(11): <strong>${formatearCLP(sb11)}</strong></div>
              <div>BONO ASISTENCIA AUT.: <strong>${formatearCLP(baut)}</strong></div>
              <div>BONO PUNTUALIDAD AUT.: <strong>${formatearCLP(bpaut)}</strong></div>
              <div style="margin-top:8px;">SC = <strong>${formatearCLP(sc)}</strong></div>
            </div>

            <div style="background:#fff; border:1px solid #eee; border-radius:10px; padding:10px;">
              <h3 style="margin:0 0 8px 0; font-size:16px;">Fórmula MEC aplicada</h3>
              <div>jornada (horas/semana): <strong>${jornada ?? "No detectada"}</strong></div>
              <div>valorHoraBase = (SC/30) × (28 / (jornada×4))</div>
              <div style="margin-top:8px;">valorHoraBase: <strong>${valorHoraBase == null ? "—" : formatearCLP(valorHoraBase)}</strong></div>
              ${warningJornada ? `<div style="margin-top:8px;color:#b45309;"><strong>${warningJornada}</strong></div>` : ""}
            </div>
          </div>
        </div>

        <div style="border:1px solid #eee; border-radius:12px; padding:14px; background:#fff;">
          <h2 style="margin:0 0 10px 0;">Comparación sobretiempo (pagado vs esperado con SC)</h2>

          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; padding:8px; border-bottom:2px solid #eee;">Ítem</th>
                <th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Pagado (PDF)</th>
                <th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Esperado (SC)</th>
                <th style="text-align:right; padding:8px; border-bottom:2px solid #eee;">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              ${filaComparacion("HORAS EXTRAS 50%", st.pagadoHorasExtras50, esperado.horasExtras50, difs.horasExtras50, st.horasExtras50 != null ? `Horas: ${st.horasExtras50}` : "No encontrado")}
              ${filaComparacion("HORAS EXTRAS DOMINGO", st.pagadoHorasExtrasDomingo, esperado.horasExtrasDomingo, difs.horasExtrasDomingo, st.horasExtrasDomingo != null ? `Horas: ${st.horasExtrasDomingo}` : "No encontrado")}
              ${
                st.recargoDomingoTieneHoras
                  ? filaComparacion("HORAS RECARGO DOMINGO", st.pagadoRecargoDomingo, esperado.recargoDomingo, difs.recargoDomingo, st.horasRecargoDomingo != null ? `Horas: ${st.horasRecargoDomingo}` : "")
                  : filaComparacion("HORAS RECARGO DOMINGO", st.pagadoRecargoDomingo, null, null, "⚠ El PDF no trae horas (no validable).")
              }
              ${filaComparacion("RECARGO 50% FESTIVO", st.pagadoRecargoFestivo, esperado.recargoFestivo, difs.recargoFestivo, st.horasRecargoFestivo != null ? `Horas: ${st.horasRecargoFestivo}` : "No encontrado")}
            </tbody>
          </table>

          <div style="margin-top:10px; font-size:12px; color:#6b7280;">
            * Regla de comparación: si |diferencia| &lt; 1 peso → se considera correcto.
          </div>
        </div>
      `;

    } catch (e) {
      console.error("❌ Error en analizarArchivoDemandaHora():", e);
      alert("❌ Error analizando Demanda (HRA). Revisa consola.");
    }
  }

  // Exponer al global
  window.analizarArchivoDemandaHora = analizarArchivoDemandaHora;
})();

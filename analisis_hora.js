// analisis_hora.js

// Si formatearCLP ya es global desde analisisLiquidacion.js,
// puedes borrar esta función y usar la existente.
function formatearCLP(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return "$0";
  return "$" + Math.round(valor).toLocaleString("es-CL");
}

// Detectar contrato por hora tipo:
// S.BASE PART-TIME (HRA) (40.1 $ 97.042
function detectarContratoPorHora(texto) {
  // Buscamos explícitamente "(HRA)" y luego el segundo paréntesis con horas y monto
  const regexBaseHora = /S\.?BASE\s+PART-?TIME\s*\(HRA\)\s*\(([\d.,]+)\s*\$\s*([\d.]+)/i;
  const match = texto.match(regexBaseHora);

  console.log("MATCH PART-TIME HRA:", match); // puedes quitarlo después de probar

  if (!match) return null;

  const horasBase = parseFloat(match[1].replace(',', '.'));
  const montoBase = parseFloat(match[2].replace(/\./g, ''));

  if (!horasBase || !montoBase) return null;

  const valorHora = montoBase / horasBase;

  return {
    horasBase,
    montoBase,
    valorHora
  };
}

// Analizar horas extras y recargos usando el valorHora detectado
function analizarHorasExtrasPorHora(texto, datosHora) {
  const { valorHora } = datosHora;

  const regexHE50   = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.]+)/i;
  const regexHEDom  = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.]+)/i;
  const regexRecDom = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.]+)/i;

  const he  = texto.match(regexHE50);
  const hed = texto.match(regexHEDom);
  const rd  = texto.match(regexRecDom);

  const resultado = {};

  // Horas extras 50%
  if (he) {
    const horas    = parseFloat(he[1].replace(',', '.'));
    const pagado   = parseFloat(he[2].replace(/\./g, ''));
    const esperado = valorHora * 1.5 * horas; // 50% recargo sobre hora normal

    resultado.horasExtras50 = {
      horas,
      pagado,
      esperado,
      diferencia: pagado - esperado
    };
  }

  // Horas extras domingo
  if (hed) {
    const horas    = parseFloat(hed[1].replace(',', '.'));
    const pagado   = parseFloat(hed[2].replace(/\./g, ''));
    // 30% domingo + 50% extra (mismo criterio que en el análisis general)
    const esperado = valorHora * 1.3 * 1.5 * horas;

    resultado.horasExtrasDomingo = {
      horas,
      pagado,
      esperado,
      diferencia: pagado - esperado
    };
  }

  // Recargo domingo (sin horas explícitas)
  if (rd) {
    const pagado = parseFloat(rd[1].replace(/\./g, ''));
    resultado.recargoDomingo = { pagado };
  }

  return resultado;
}

// Mostrar resultados en el nuevo div
function mostrarResultadoAnalisisHora(datosHora, resultadoHoras, asignaciones, comisionesYCorrida) {
  const cont = document.getElementById('resultadoAnalisisHora');
  if (!cont) {
    console.warn("No encontré el div resultadoAnalisisHora en el HTML");
    return;
  }

  let html = `
    <h2>Análisis contrato por hora</h2>
    <p><strong>Horas base detectadas:</strong> ${datosHora.horasBase}</p>
    <p><strong>Monto base:</strong> ${formatearCLP(datosHora.montoBase)}</p>
    <p><strong>Valor hora estimado:</strong> ${formatearCLP(datosHora.valorHora)}</p>
    <hr>
  `;

  // === Horas extras / recargos ===
  if (!resultadoHoras.horasExtras50 && !resultadoHoras.horasExtrasDomingo && !resultadoHoras.recargoDomingo) {
    html += `<p>No se encontraron líneas de horas extra / recargos en el PDF.</p>`;
  }

  if (resultadoHoras.horasExtras50) {
    const r = resultadoHoras.horasExtras50;
    html += `
      <h3>Horas Extras 50%</h3>
      <p>Horas: ${r.horas}</p>
      <p>Pagado: ${formatearCLP(r.pagado)}</p>
      <p>Esperado (según valor hora): ${formatearCLP(r.esperado)}</p>
      <p>Diferencia: ${formatearCLP(r.diferencia)}</p>
    `;
  }

  if (resultadoHoras.horasExtrasDomingo) {
    const r = resultadoHoras.horasExtrasDomingo;
    html += `
      <h3>Horas Extras Domingo</h3>
      <p>Horas: ${r.horas}</p>
      <p>Pagado: ${formatearCLP(r.pagado)}</p>
      <p>Esperado (según valor hora): ${formatearCLP(r.esperado)}</p>
      <p>Diferencia: ${formatearCLP(r.diferencia)}</p>
    `;
  }

  if (resultadoHoras.recargoDomingo) {
    html += `
      <h3>Recargo Domingo</h3>
      <p>Pagado (sin horas explícitas): ${formatearCLP(resultadoHoras.recargoDomingo.pagado)}</p>
    `;
  }

  // === BLOQUE: Asignaciones (reutilizando extraerAsignacionesDesdeTexto) ===
  if (asignaciones && (asignaciones.movilizacion.monto || asignaciones.colacion.monto || asignaciones.caja.monto)) {
    html += `<hr><h3>Asignaciones</h3>`;

    if (asignaciones.movilizacion.monto !== null) {
      const a = asignaciones.movilizacion;
      html += `
        <h4>Movilización</h4>
        <p>Días base: ${a.dias}</p>
        <p>Monto base: ${formatearCLP(a.monto)}</p>
        <p>Valor por día: ${formatearCLP(a.valorDia)}</p>
        <p>Días totales (con diferencias): ${Math.round(a.diasTotales)}</p>
        ${a.diferencia ? `<p>Diferencia: ${formatearCLP(a.diferencia)}</p>` : ''}
      `;
    }

    if (asignaciones.colacion.monto !== null) {
      const a = asignaciones.colacion;
      html += `
        <h4>Colación</h4>
        <p>Días base: ${a.dias}</p>
        <p>Monto base: ${formatearCLP(a.monto)}</p>
        <p>Valor por día: ${formatearCLP(a.valorDia)}</p>
        <p>Días totales (con diferencias): ${Math.round(a.diasTotales)}</p>
        ${a.diferencia ? `<p>Diferencia: ${formatearCLP(a.diferencia)}</p>` : ''}
      `;
    }

    if (asignaciones.caja.monto !== null) {
      const a = asignaciones.caja;
      html += `
        <h4>Caja</h4>
        <p>Días base: ${a.dias}</p>
        <p>Monto base: ${formatearCLP(a.monto)}</p>
        <p>Valor por día: ${formatearCLP(a.valorDia)}</p>
        <p>Días totales (con diferencias): ${Math.round(a.diasTotales)}</p>
        ${a.diferencia ? `<p>Diferencia: ${formatearCLP(a.diferencia)}</p>` : ''}
      `;
    }

    if (asignaciones.estadoAsignaciones === "warning") {
      html += `<p style="color:orange;"><strong>⚠ Se detectaron diferencias en asignaciones (mov/colación/caja).</strong></p>`;
    }
  } else {
    html += `<hr><p>No se detectaron asignaciones de movilización/colación/caja en el PDF.</p>`;
  }

    // === BLOQUE: Comisiones + Semana Corrida ===
  if (comisionesYCorrida) {
    const { totalComisiones, detallesComisiones, semanaCorrida } = comisionesYCorrida;

    html += `<hr><h3>Comisiones y Semana Corrida</h3>`;

    // Detalle de comisiones
    if (detallesComisiones && detallesComisiones.length > 0) {
      html += `<p><strong>Detalle de comisiones:</strong></p><ul>`;
      detallesComisiones.forEach(c => {
        html += `<li>${c.item}: ${formatearCLP(c.monto)}</li>`;
      });
      html += `</ul>`;
    } else if (totalComisiones > 0) {
      html += `<p>Se detectaron comisiones, pero sin detalle individual.</p>`;
    } else {
      html += `<p>No se detectaron comisiones individuales.</p>`;
    }

    html += `<p><strong>Total Comisiones:</strong> ${formatearCLP(totalComisiones || 0)}</p>`;

    // Semana corrida
    if (totalComisiones <= 0) {
      html += `<p><strong>Semana Corrida:</strong> No aplica (no existen comisiones).</p>`;
    } else {
      const s = semanaCorrida;
      html += `
        <p><strong>Semana Corrida:</strong></p>
        <p>Domingos/Festivos: ${s.diasSemanaCorrida !== "No especificados" ? s.diasSemanaCorrida : "No especificado"} días</p>
        <p>Monto pagado: ${formatearCLP(s.montoSemanaCorrida || 0)}</p>
      `;

      if (s.estadoSemanaCorrida === "ok") {
        html += `<p style="color:green;">✅ Cálculo correcto de semana corrida.</p>`;
      } else if (s.estadoSemanaCorrida === "error") {
        html += `
          <p>Valor esperado (según comisiones): ${formatearCLP(s.valorEsperadoSemanaCorrida || 0)}</p>
          <p>Diferencia: ${formatearCLP(s.diferenciaSemanaCorrida || 0)}</p>
          <p style="color:red;">❌ Discrepancia detectada en semana corrida.</p>
        `;
      } else if (s.estadoSemanaCorrida === "warning") {
        html += `<p style="color:orange;">⚠ Información insuficiente para calcular semana corrida.</p>`;
      } else {
        html += `<p>Semana corrida no calculada.</p>`;
      }
    }
  }

  cont.innerHTML = html;
}

// Función principal: usa el MISMO fileInput del análisis normal
async function analizarLiquidacionPorHora() {
  await esperarPlanUsuario(); // misma guardia de plan que usas hoy

  const archivoInput = document.getElementById('fileInput');
  if (!archivoInput || !archivoInput.files.length) {
    alert("Debes seleccionar una liquidación en PDF.");
    return;
  }

  const archivo  = archivoInput.files[0];
  const pdfData  = await archivo.arrayBuffer();
  const pdf      = await pdfjsLib.getDocument({ data: pdfData }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const texto  = await pagina.getTextContent();
    texto.items.forEach(item => textoCompleto += item.str + ' ');
  }

  const datosHora = detectarContratoPorHora(textoCompleto);
  if (!datosHora) {
    alert("No se detectó un formato de contrato por hora compatible (PART-TIME HRA).");
    return;
  }

  const resultadoHoras   = analizarHorasExtrasPorHora(textoCompleto, datosHora);
  const asignacionesHora = extraerAsignacionesDesdeTexto(textoCompleto);

  // Usamos los días totales de movilización como base para semana corrida,
  // igual que en el análisis normal.
  const diasTotalesMov = asignacionesHora.movilizacion.diasTotales || asignacionesHora.movilizacion.dias || 0;
  const comisionesYCorrida = extraerComisionesYSemanaCorridaDesdeTexto(textoCompleto, diasTotalesMov);

  mostrarResultadoAnalisisHora(datosHora, resultadoHoras, asignacionesHora, comisionesYCorrida);

}

// Hacer accesible desde preValidarAntesDeAnalizar()
window.analizarLiquidacionPorHora = analizarLiquidacionPorHora;

// analisis_hora.js

// Si formatearCLP ya es global desde analisisLiquidacion.js, 
// puedes borrar esta función y usar la existente.
function formatearCLP(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return "$0";
  return "$" + Math.round(valor).toLocaleString("es-CL");
}

// Detectar contrato por hora tipo: 
// S.BASE PART-TIME (HRA) (75.0 $ 181.597
function detectarContratoPorHora(texto) {
  const regexBaseHora = /S\.?BASE\s+PART-?TIME.*?\(([\d.,]+)\)\s*\$\s*([\d.]+)/i;
  const match = texto.match(regexBaseHora);

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

  const regexHE50 = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.]+)/i;
  const regexHEDom = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.]+)/i;
  const regexRecDom = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.]+)/i;

  const he = texto.match(regexHE50);
  const hed = texto.match(regexHEDom);
  const rd = texto.match(regexRecDom);

  const resultado = {};

  if (he) {
    const horas = parseFloat(he[1].replace(',', '.'));
    const pagado = parseFloat(he[2].replace(/\./g, ''));
    const esperado = valorHora * 1.5 * horas; // 50% recargo

    resultado.horasExtras50 = {
      horas,
      pagado,
      esperado,
      diferencia: pagado - esperado
    };
  }

  if (hed) {
    const horas = parseFloat(hed[1].replace(',', '.'));
    const pagado = parseFloat(hed[2].replace(/\./g, ''));
    const esperado = valorHora * 1.3 * 1.5 * horas; // domingo + extra

    resultado.horasExtrasDomingo = {
      horas,
      pagado,
      esperado,
      diferencia: pagado - esperado
    };
  }

  if (rd) {
    const pagado = parseFloat(rd[1].replace(/\./g, ''));
    resultado.recargoDomingo = { pagado };
  }

  return resultado;
}

// Mostrar resultados en el nuevo div
function mostrarResultadoAnalisisHora(datosHora, resultado) {
  const cont = document.getElementById('resultadoAnalisisHora');
  if (!cont) return;

  let html = `
    <h2>Análisis contrato por hora</h2>
    <p><strong>Horas base detectadas:</strong> ${datosHora.horasBase}</p>
    <p><strong>Monto base:</strong> ${formatearCLP(datosHora.montoBase)}</p>
    <p><strong>Valor hora estimado:</strong> ${formatearCLP(datosHora.valorHora)}</p>
    <hr>
  `;

  if (resultado.horasExtras50) {
    const r = resultado.horasExtras50;
    html += `
      <h3>Horas Extras 50%</h3>
      <p>Horas: ${r.horas}</p>
      <p>Pagado: ${formatearCLP(r.pagado)}</p>
      <p>Esperado (según valor hora): ${formatearCLP(r.esperado)}</p>
      <p>Diferencia: ${formatearCLP(r.diferencia)}</p>
    `;
  }

  if (resultado.horasExtrasDomingo) {
    const r = resultado.horasExtrasDomingo;
    html += `
      <h3>Horas Extras Domingo</h3>
      <p>Horas: ${r.horas}</p>
      <p>Pagado: ${formatearCLP(r.pagado)}</p>
      <p>Esperado (según valor hora): ${formatearCLP(r.esperado)}</p>
      <p>Diferencia: ${formatearCLP(r.diferencia)}</p>
    `;
  }

  if (resultado.recargoDomingo) {
    html += `
      <h3>Recargo Domingo</h3>
      <p>Pagado (sin horas explícitas): ${formatearCLP(resultado.recargoDomingo.pagado)}</p>
    `;
  }

  cont.innerHTML = html;
}

// Función principal: usa el MISMO fileInput del análisis normal
async function analizarLiquidacionPorHora() {
  alert("Entré a analizarLiquidacionPorHora");  // ← TEMPORAL, solo para probar
  await esperarPlanUsuario(); // misma guardia de plan que usas hoy


  const archivoInput = document.getElementById('fileInput');
  if (!archivoInput || !archivoInput.files.length) {
    alert("Debes seleccionar una liquidación en PDF.");
    return;
  }

  const archivo = archivoInput.files[0];
  const pdfData = await archivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const texto = await pagina.getTextContent();
    texto.items.forEach(item => textoCompleto += item.str + ' ');
  }

  const datosHora = detectarContratoPorHora(textoCompleto);
  if (!datosHora) {
    alert("No se detectó un formato de contrato por hora compatible (PART-TIME HRA).");
    return;
  }

  const resultado = analizarHorasExtrasPorHora(textoCompleto, datosHora);
  mostrarResultadoAnalisisHora(datosHora, resultado);
}

// Hacer accesible desde decidirAnalisis()
window.analizarLiquidacionPorHora = analizarLiquidacionPorHora;

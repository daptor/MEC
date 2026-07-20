// ======================================================
// MEC — Análisis de Liquidación POR HORA (HRA)
// Versión 1: SOLO Bloque 1 (Valor Hora + IMM/hora + resumen)
// ======================================================

// ==================== IMM ====================
// Copiado desde analisisLiquidacion.js para independencia del módulo HRA
const ingresosMinimosHRA = {
  2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 326500, "OCTUBRE": 326500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
  2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
  2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
  2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
  2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 },
  2025: { "ENERO": 510636, "FEBRERO": 510636, "MARZO": 510636, "ABRIL": 510500, "MAYO": 510500, "JUNIO": 510500, "JULIO": 529000, "AGOSTO": 529000, "SEPTIEMBRE": 529000, "OCTUBRE": 529000, "NOVIEMBRE": 529000, "DICIEMBRE": 529000 },
  2026: { "ENERO": 539000, "FEBRERO": 539000, "MARZO": 539000, "ABRIL": 539000, "MAYO": 553553, "JUNIO": 553553, "JULIO": 553553, "AGOSTO": 553553, "SEPTIEMBRE": 553553, "OCTUBRE": 553553, "NOVIEMBRE": 553553, "DICIEMBRE": 553553 }
};

// ==================== LISTA COMISIONES (HRA) ====================
// Copiada desde analisisLiquidacion.js para independencia
const listaComisionHRA = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA","COMISIÓN SEGURO DE VIDA",
    "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA","INCENTIVO SELF CHECK OUT AUT",
    "COMPENSACION PERMISO", "DIF CONCURSO FPAY", "PROMOCIONES CMR", "COMISION CONNECT", "DIF. COMISIONES",
    "INCENTIVO PRODUC CAJAS AUT","AVANCE CMR","DIF. INCENTI PRODUCT CAJAS"
];


// ==================== HELPERS ====================
const formatCurrencyHRA = (value) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

function formatearCLPHRA(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return "$0";
  return "$" + Math.round(valor).toLocaleString("es-CL");
}

function procesarMontoHRA(montoTexto) {
  // "97.042" => 97042 ; "1.250" => 1250 ; soporta coma decimal
  return parseFloat(String(montoTexto).replace(/\./g, '').replace(',', '.')) || 0;
}

// ======================================================
// RESUMEN MEC (versión HRA, independiente)
// ======================================================
let resumenAnalisisHRA = [];

function limpiarResumenAnalisisHRA() {
  resumenAnalisisHRA = [];
}

function agregarResultadoResumenHRA(modulo, estado, diferencia = 0) {
  resumenAnalisisHRA.push({
    modulo,
    estado, // "ok" | "warning" | "error" | "info"
    diferencia: diferencia || 0
  });
}

function generarResumenAnalisisHTMLHRA() {
  if (!resumenAnalisisHRA || resumenAnalisisHRA.length === 0) return '';

  const prioridadEstados = { error: 1, warning: 2, ok: 3, info: 4 };

  function obtenerPesoEstado(estado) {
    switch (estado) {
      case "error": return 3000000;
      case "warning": return 1000000;
      case "ok": return 1000;
      case "info":
      default: return 0;
    }
  }

  const iconosEstados = {
    error: ' ',
    warning: '🟠',
    ok: '🟢',
    info: '⚪'
  };

  const textosEstados = {
    error: 'Discrepancia detectada',
    warning: 'Revisar información',
    ok: 'Correcto',
    info: 'Sin información relevante'
  };

  const resumenOrdenado = [...resumenAnalisisHRA].sort((a, b) => {
    const pesoA = obtenerPesoEstado(a.estado) + Math.abs(a.diferencia || 0);
    const pesoB = obtenerPesoEstado(b.estado) + Math.abs(b.diferencia || 0);
    return pesoB - pesoA;
  });

  const resumenHTML = resumenOrdenado.map(item => {
    const icono = iconosEstados[item.estado] || '⚪';
    let detalle = textosEstados[item.estado];

    if (item.diferencia && Math.abs(item.diferencia) > 0) {
      detalle += ` → Diferencia ${formatCurrencyHRA(Math.abs(item.diferencia))}`;
    }

    return `
      <div style="
        padding:10px;
        margin-bottom:8px;
        border-radius:8px;
        background:#f5f5f5;
        border-left:6px solid ${
          item.estado === 'error'
            ? '#d32f2f'
            : item.estado === 'warning'
              ? '#f57c00'
              : item.estado === 'ok'
                ? '#388e3c'
                : '#9e9e9e'
        };
      ">
        <strong>${icono} ${item.modulo}</strong>
        <div style="margin-top:4px; font-size:14px;">
          ${detalle}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div style="
      border:2px solid #ddd;
      border-radius:12px;
      padding:15px;
      margin-bottom:20px;
      background:#fafafa;
    ">
      <h2 style="margin-top:0; margin-bottom:15px;">
        🚦 Análisis MEC por Hora
      </h2>
      ${resumenHTML}
    </div>
  `;
}

// ======================================================
// Jornada máxima legal según mes/año (45/44/42)
// ======================================================
function obtenerJornadaMaximaHRA(mes, año) {
  const meses = {
    ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
    JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
  };
  const mesIndex = meses[String(mes || "").toUpperCase()] || 0;

  // 42 horas desde abril 2026
  if (año > 2026 || (año === 2026 && mesIndex >= 4)) return 42;

  // 44 horas desde mayo 2024
  if (año > 2024 || (año === 2024 && mesIndex >= 5)) return 44;

  return 45;
}

// ========================================================
// PREVALIDACIÓN HRA (llamada desde dispatcher del mensual)
// ========================================================
async function preValidarAntesDeAnalizarHora() {
  try {
    const archivoInput = document.getElementById('fileInput');
    if (!archivoInput || !archivoInput.files.length) {
      alert("⚠ Debes seleccionar una liquidación.");
      return;
    }

    const archivo = archivoInput.files[0];
    const arrayBuffer = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let textoCompleto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      textoCompleto += strings.join(" ") + "\n";
    }

    // EXTRAER FECHA
    let fechaDetectada = "Fecha no detectada";
    const matchFecha = textoCompleto.match(
      /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+\d{4}/i
    );
    if (matchFecha) fechaDetectada = matchFecha[0];

    // EXTRAER NOMBRE/RUT (si existe)
    let nombreDetectado = "Trabajador no identificado";
    let rutDetectado = "RUT no detectado";
    const matchTrabajador = textoCompleto.match(
      /NOMBRE\s+RUT\s+SUELDO\s+BASE\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+(\d{1,2}\.\d{3}\.\d{3}-[\dkK])/i
    );
    if (matchTrabajador) {
      nombreDetectado = matchTrabajador[1].trim().replace(/\s+/g, " ");
      rutDetectado = matchTrabajador[2].trim();
    }

    // PLAN ACTUAL
    const plan = window.userPlan || "free";

    // JORNADA SELECCIONADA (texto)
    const selectJornada = document.getElementById('jornada');
    const jornadaTexto = selectJornada?.options?.[selectJornada.selectedIndex]?.text || "Cálculo por Hora (HRA)";

    // MODAL (reutiliza el del mensual)
    if (typeof window.mostrarModalValidacion !== "function") {
      alert("❌ No se encontró mostrarModalValidacion(). Verifica carga de analisisLiquidacion.js");
      return;
    }

    const confirmado = await window.mostrarModalValidacion({
      fecha: fechaDetectada,
      nombre: nombreDetectado,
      rut: rutDetectado,
      mostrarNombre: (plan === "pro" || plan === "pro_pending"),
      jornada: jornadaTexto
    });

    if (!confirmado) return;

    await analizarArchivoHora();

  } catch (error) {
    console.error("❌ Error prevalidando documento (HRA):", error);
    alert("❌ Error verificando el documento.");
  }
}

// ======================================================
// FUNCIÓN PRINCIPAL HRA (Bloque 1)
// ======================================================
async function analizarArchivoHora() {
  try {
    // Esperar plan (misma lógica MEC)
    if (typeof window.esperarPlanUsuario === "function") {
      await window.esperarPlanUsuario();
    }

    limpiarResumenAnalisisHRA();

    // Freemium (mismo control total que mensual)
    if (window.userPlan !== "pro") {
      if (typeof window.puedeUsarAnalisisTotal === "function") {
        const permitido = await window.puedeUsarAnalisisTotal();
        if (!permitido) {
          if (window.PAYWALL && typeof PAYWALL.show === "function") {
            PAYWALL.show("Ya usaste tus 2 análisis gratuitos");
          } else {
            alert("Has alcanzado el límite gratuito.");
          }
          return;
        }
      }

      if (typeof window.sumarUsoAnalisisTotal === "function") {
        await window.sumarUsoAnalisisTotal();
      }
      if (typeof window.actualizarContadorAnalisisUI === "function") {
        await window.actualizarContadorAnalisisUI();
      }
    }

    // Validaciones básicas
    const archivo = document.getElementById('fileInput')?.files?.[0];
    const jornadaSeleccionada = document.getElementById('jornada')?.value || "";

    if (!archivo) {
      alert("Por favor, selecciona un archivo PDF.");
      return;
    }
    if (String(jornadaSeleccionada).toUpperCase() !== "HRA") {
      alert("Para este análisis debes seleccionar: Cálculo por Hora (HRA).");
      return;
    }

    // Leer PDF
    const pdfData = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let textoCompleto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pagina = await pdf.getPage(i);
      const texto = await pagina.getTextContent();
      texto.items.forEach(item => textoCompleto += item.str + ' ');
    }

    // Detectar mes/año
    const regexFecha = /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)\s+de\s+(\d{4})/i;
    const matchFecha = textoCompleto.match(regexFecha);

    let mes = "No encontrado";
    let año = "No encontrado";
    if (matchFecha) {
      mes = matchFecha[1].toUpperCase();
      año = parseInt(matchFecha[2], 10);
    }

    // IMM mensual
    const inm = (ingresosMinimosHRA[año] && ingresosMinimosHRA[año][mes]) ? ingresosMinimosHRA[año][mes] : 0;

    // Extraer base HRA (robusto)
    const regexBaseHRA =
      /S\.?\s*BASE\s*PART[\s\-]*TIME\s*\(HRA\)\s*\(\s*([\d]+(?:[.,]\d+)?)\s*\$?\s*([\d\.\,]+)/i;
    const matchBaseHRA = textoCompleto.match(regexBaseHRA);

    let horasBaseContrato = null;
    let montoBasePagadoMes = null;
    let valorHoraContractual = null;

    let estadoResumenSueldo = "error";
    let diferenciaResumenSueldo = 0;
    let mensajeLegal = "";

    let jornadaMaxima = obtenerJornadaMaximaHRA(mes, año);

    // IMM por hora (conversión usada en MEC para valor hora normal)
    // Fórmula: (IMM / 30) * 28 / (4 * jornadaMaxima)
    let valorImmHora = 0;
    if (inm > 0 && jornadaMaxima > 0) {
      valorImmHora = (inm / 30) * 28 / (4 * jornadaMaxima);
    }


    if (!matchBaseHRA) {
      mensajeLegal = `
        <span style="color:red;">
          ❌ No se encontró “S.BASE PART-TIME (HRA)” en la liquidación.
          <br>Verifica que el PDF incluya ese renglón.
        </span>
      `;
      agregarResultadoResumenHRA("Sueldo Base (HRA)", "error", 0);
    } else {
      horasBaseContrato = parseFloat(String(matchBaseHRA[1]).replace(',', '.'));
      montoBasePagadoMes = procesarMontoHRA(matchBaseHRA[2]);

      if (!horasBaseContrato || horasBaseContrato <= 0) {
        mensajeLegal = `
          <span style="color:red;">
            ❌ Horas base inválidas en “S.BASE PART-TIME (HRA)”.
          </span>
        `;
        agregarResultadoResumenHRA("Sueldo Base (HRA)", "error", 0);
      } else {
        valorHoraContractual = montoBasePagadoMes / horasBaseContrato;

        const diffHora = valorHoraContractual - valorImmHora;

        if (diffHora >= 0) {
          estadoResumenSueldo = "ok";
          diferenciaResumenSueldo = 0;

          const pct = valorImmHora > 0 ? ((diffHora / valorImmHora) * 100) : 0;
          const pctR = Math.round(pct * 10) / 10;

          mensajeLegal = `
            <span style="color:green;">
              ✅ El valor hora contractual supera el IMM por hora en ${pctR}%.
            </span>
          `;
        } else {
          estadoResumenSueldo = "error";

          const difPorHora = Math.abs(diffHora);
          const difMesEstimada = difPorHora * horasBaseContrato;

          // En resumen guardamos la diferencia "estimada del mes" para priorizar como MEC (monto $)
          diferenciaResumenSueldo = difMesEstimada;

          mensajeLegal = `
            <span style="color:red;">
              ❌ El valor hora contractual es inferior al IMM por hora.
              <br>Diferencia por hora: ${formatearCLPHRA(difPorHora)}
              <br>Diferencia estimada del mes (según horas base): ${formatearCLPHRA(difMesEstimada)}
            </span>
          `;
        }

        agregarResultadoResumenHRA("Sueldo Base (HRA)", estadoResumenSueldo, diferenciaResumenSueldo);
      }
    }

    // ======================================================
    // BLOQUE 2 — SOBRETIEMPO (HRA)
    // Usa como hora normal: valorHoraContractual
    // ======================================================
    let resultadoHorasExtras = '';
    let estadoHorasExtras = "info";
    let diferenciaHorasExtras = 0;
    let horasExtrasRealizadas = null;
    let montoPagadoHorasExtras = null;
    let montoEsperadoHorasExtras = null;

    // HORAS EXTRAS 50% (ej: HORAS EXTRAS 50 % (1.5) $ 12.345)
    const regexHorasExtras = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d\.,]+)/i;
    const matchHorasExtras = textoCompleto.match(regexHorasExtras);

    if (matchHorasExtras) {
      horasExtrasRealizadas = parseFloat(String(matchHorasExtras[1]).replace(',', '.'));
      montoPagadoHorasExtras = procesarMontoHRA(matchHorasExtras[2]);

      montoEsperadoHorasExtras = valorHoraContractual * 1.5 * horasExtrasRealizadas;
      diferenciaHorasExtras = montoPagadoHorasExtras - montoEsperadoHorasExtras;

      if (Math.abs(diferenciaHorasExtras) < 1) {
        estadoHorasExtras = "ok";
        resultadoHorasExtras = `<span style="color: green;">✅ Cálculo correcto</span>`;
      } else {
        estadoHorasExtras = "error";
        resultadoHorasExtras = `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLPHRA(diferenciaHorasExtras)}</span>`;
      }
    } else {
      estadoHorasExtras = "info";
      resultadoHorasExtras = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    }

    // HORAS EXTRAS DOMINGO (ej: HORAS EXTRAS DOMINGO (.18) $ 849)
    let resultadoHorasExtrasDomingo = '';
    let estadoHorasExtrasDomingo = "info";
    let diferenciaHorasExtrasDomingo = 0;
    let horasExtrasDomingoRealizadas = null;
    let montoPagadoHorasExtrasDomingo = null;
    let montoEsperadoHorasExtrasDomingo = null;

    const regexHorasExtrasDomingo = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d\.,]+)/i;
    const matchHorasExtrasDomingo = textoCompleto.match(regexHorasExtrasDomingo);

    if (matchHorasExtrasDomingo) {
      horasExtrasDomingoRealizadas = parseFloat(String(matchHorasExtrasDomingo[1]).replace(',', '.'));
      montoPagadoHorasExtrasDomingo = procesarMontoHRA(matchHorasExtrasDomingo[2]);

      // Manteniendo lógica MEC: domingo recargo 30% y extra 50% => 1.3 * 1.5
      montoEsperadoHorasExtrasDomingo = valorHoraContractual * 1.3 * 1.5 * horasExtrasDomingoRealizadas;
      diferenciaHorasExtrasDomingo = montoPagadoHorasExtrasDomingo - montoEsperadoHorasExtrasDomingo;

      if (Math.abs(diferenciaHorasExtrasDomingo) < 1) {
        estadoHorasExtrasDomingo = "ok";
        resultadoHorasExtrasDomingo = `<span style="color: green;">✅ Cálculo correcto</span>`;
      } else {
        estadoHorasExtrasDomingo = "error";
        resultadoHorasExtrasDomingo = `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLPHRA(diferenciaHorasExtrasDomingo)}</span>`;
      }
    } else {
      estadoHorasExtrasDomingo = "info";
      resultadoHorasExtrasDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    }

    // HORAS RECARGO DOMINGO (mixto: con horas o sin horas)
    let resultadoRecargoDomingo = '';
    let estadoRecargoDomingo = "info";
    let diferenciaRecargoDomingo = 0;
    let horasRecargoDomingo = null;
    let montoPagadoRecargoDomingo = null;
    let montoEsperadoRecargoDomingo = null;

    // con horas: HORAS RECARGO DOMINGO (x.xx) $ 15.050
    const regexRecargoDomingoConHoras = /HORAS\s*RECARGO\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d\.,]+)/i;
    const matchRecargoConHoras = textoCompleto.match(regexRecargoDomingoConHoras);

    if (matchRecargoConHoras) {
      horasRecargoDomingo = parseFloat(String(matchRecargoConHoras[1]).replace(',', '.'));
      montoPagadoRecargoDomingo = procesarMontoHRA(matchRecargoConHoras[2]);

      montoEsperadoRecargoDomingo = valorHoraContractual * 0.3 * horasRecargoDomingo;
      diferenciaRecargoDomingo = montoPagadoRecargoDomingo - montoEsperadoRecargoDomingo;

      if (Math.abs(diferenciaRecargoDomingo) < 1) {
        estadoRecargoDomingo = "ok";
        resultadoRecargoDomingo = `<span style="color: green;">✅ Cálculo correcto</span>`;
      } else {
        estadoRecargoDomingo = "error";
        resultadoRecargoDomingo = `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLPHRA(diferenciaRecargoDomingo)}</span>`;
      }
    } else {
      // sin horas: HORAS RECARGO DOMINGO $ 15.050
      const regexRecargoDomingoSinHoras = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d\.,]+)/i;
      const matchRecargoSinHoras = textoCompleto.match(regexRecargoDomingoSinHoras);

      if (matchRecargoSinHoras) {
        montoPagadoRecargoDomingo = procesarMontoHRA(matchRecargoSinHoras[1]);
        estadoRecargoDomingo = "warning";
        resultadoRecargoDomingo = `<span style="color: orange;">⚠ Falta el tiempo realizado (horas). No se puede validar el cálculo.</span>`;
      } else {
        estadoRecargoDomingo = "info";
        resultadoRecargoDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
      }
    }

    // RECARGO 50% FESTIVO (ej: RECARGO 50% FESTIVO (x.xx) $ monto)
    let resultadoRecargoFestivo = '';
    let estadoRecargoFestivo = "info";
    let diferenciaRecargoFestivo = 0;
    let horasRecargoFestivoRealizadas = null;
    let montoPagadoRecargoFestivo = null;
    let montoEsperadoRecargoFestivo = null;

    const regexRecargoFestivo = /RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d\.,]+)/i;
    const matchRecargoFestivo = textoCompleto.match(regexRecargoFestivo);

    if (matchRecargoFestivo) {
      horasRecargoFestivoRealizadas = parseFloat(String(matchRecargoFestivo[1]).replace(',', '.'));
      montoPagadoRecargoFestivo = procesarMontoHRA(matchRecargoFestivo[2]);

      // Manteniendo lógica MEC: recargo festivo 50% => 1.5
      montoEsperadoRecargoFestivo = valorHoraContractual * 1.5 * horasRecargoFestivoRealizadas;
      diferenciaRecargoFestivo = montoPagadoRecargoFestivo - montoEsperadoRecargoFestivo;

      if (Math.abs(diferenciaRecargoFestivo) < 1) {
        estadoRecargoFestivo = "ok";
        resultadoRecargoFestivo = `<span style="color: green;">✅ Cálculo correcto</span>`;
      } else {
        estadoRecargoFestivo = "error";
        resultadoRecargoFestivo = `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLPHRA(diferenciaRecargoFestivo)}</span>`;
      }
    } else {
      estadoRecargoFestivo = "info";
      resultadoRecargoFestivo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    }

    // ======================================================
    // RESUMEN BLOQUE 2: "Sobretiempo"
    // ======================================================
    const estadosSobretiempo = [
      estadoHorasExtras,
      estadoHorasExtrasDomingo,
      estadoRecargoDomingo,
      estadoRecargoFestivo
    ];

    let estadoSobretiempo = "ok";
    if (estadosSobretiempo.includes("error")) estadoSobretiempo = "error";
    else if (estadosSobretiempo.includes("warning")) estadoSobretiempo = "warning";
    else if (estadosSobretiempo.every(e => e === "info")) estadoSobretiempo = "info";

    const diferenciaTotalSobretiempo = [
      diferenciaHorasExtras,
      diferenciaHorasExtrasDomingo,
      diferenciaRecargoDomingo,
      diferenciaRecargoFestivo
    ].reduce((acc, val) => acc + Math.abs(val || 0), 0);

    agregarResultadoResumenHRA("Sobretiempo", estadoSobretiempo, diferenciaTotalSobretiempo);

  
    // HTML final (por ahora solo Bloque 1 + resumen)
    const contenedor = document.getElementById('resultadoAnalisis');
    if (!contenedor) {
      alert("❌ No existe #resultadoAnalisis en el HTML");
      return;
    }

// ======================================================
// BLOQUE 3 — ASIGNACIONES (HRA)
// (copiado del mensual, misma lógica)
// ======================================================
const regexMovilizacion = /MOVILIZACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
const regexColacion = /COLACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
const regexDiferenciaMovilizacion = /DIFERENCIA\s*MOVILIZACION\s*\$\s*([\d.,]+)/i;
const regexDiferenciaColacion = /DIFERENCIA\s*COLACION\s*\$\s*([\d.,]+)/i;

const regexCaja = /CAJA\s*\((\d+)\)\s*\$\s*([\d.]+)/i;
const regexDiferenciaCaja = /DIF(?:ERENCIA)?(?:\s+ASIG\.?)?(?:\s+DE)?\s*CAJA.*?\$\s*([\d\.]+)/i;

// -------- MOVILIZACIÓN --------
const matchMovilizacion = textoCompleto.match(regexMovilizacion);
let diasMovilizacion = 0;
let montoMovilizacion = 0;
let valorDiaMovilizacion = 0;

if (matchMovilizacion) {
  diasMovilizacion = parseInt(matchMovilizacion[1], 10);
  montoMovilizacion = procesarMontoHRA(matchMovilizacion[2]);
  if (diasMovilizacion > 0) valorDiaMovilizacion = montoMovilizacion / diasMovilizacion;
}

const matchDiferenciaMovilizacion = textoCompleto.match(regexDiferenciaMovilizacion);
let montoDiferenciaMovilizacion = 0;
let diasDiferenciaMovilizacion = 0;
let diasTotalesMovilizacion = diasMovilizacion;

if (matchDiferenciaMovilizacion) {
  montoDiferenciaMovilizacion = procesarMontoHRA(matchDiferenciaMovilizacion[1]);
  if (valorDiaMovilizacion > 0) {
    diasDiferenciaMovilizacion = montoDiferenciaMovilizacion / valorDiaMovilizacion;
    diasTotalesMovilizacion += diasDiferenciaMovilizacion;
  }
}

// -------- COLACIÓN --------
const matchColacion = textoCompleto.match(regexColacion);
let diasColacion = 0;
let montoColacion = 0;
let valorDiaColacion = 0;

if (matchColacion) {
  diasColacion = parseInt(matchColacion[1], 10);
  montoColacion = procesarMontoHRA(matchColacion[2]);
  if (diasColacion > 0) valorDiaColacion = montoColacion / diasColacion;
}

const matchDiferenciaColacion = textoCompleto.match(regexDiferenciaColacion);
let montoDiferenciaColacion = 0;
let diasDiferenciaColacion = 0;
let diasTotalesColacion = diasColacion;

if (matchDiferenciaColacion) {
  montoDiferenciaColacion = procesarMontoHRA(matchDiferenciaColacion[1]);
  if (valorDiaColacion > 0) {
    diasDiferenciaColacion = montoDiferenciaColacion / valorDiaColacion;
    diasTotalesColacion += diasDiferenciaColacion;
  }
}

// -------- CAJA --------
const matchCaja = textoCompleto.match(regexCaja);
let diasCaja = 0;
let montoCaja = 0;
let valorDiaCaja = 0;

if (matchCaja) {
  diasCaja = parseInt(matchCaja[1], 10);
  montoCaja = procesarMontoHRA(matchCaja[2]);
  if (diasCaja > 0) valorDiaCaja = montoCaja / diasCaja;
}

const matchDiferenciaCaja = textoCompleto.match(regexDiferenciaCaja);
let montoDiferenciaCaja = 0;
let diasDiferenciaCaja = 0;
let diasTotalesCaja = diasCaja;

if (matchDiferenciaCaja) {
  montoDiferenciaCaja = procesarMontoHRA(matchDiferenciaCaja[1]);
  if (valorDiaCaja > 0) {
    diasDiferenciaCaja = montoDiferenciaCaja / valorDiaCaja;
    diasTotalesCaja += diasDiferenciaCaja;
  }
}

// ======================================================
// RESUMEN ASIGNACIONES (MOVILIZACIÓN + COLACIÓN + CAJA)
// ======================================================
let estadoAsignaciones = "info";

// Si no existe ninguna asignación en la liquidación:
const hayMov = !!matchMovilizacion || montoDiferenciaMovilizacion > 0;
const hayCol = !!matchColacion || montoDiferenciaColacion > 0;
const hayCaja = !!matchCaja || montoDiferenciaCaja > 0;

if (hayMov || hayCol || hayCaja) {
  estadoAsignaciones = "ok";
}

// Si hay diferencias pagadas, lo marcamos warning (como “revisar”)
if (
  montoDiferenciaMovilizacion > 0 ||
  montoDiferenciaColacion > 0 ||
  montoDiferenciaCaja > 0
) {
  estadoAsignaciones = "warning";
}

agregarResultadoResumenHRA("Asignaciones", estadoAsignaciones, 0);

// ======================================================
// BLOQUE 4 — COMISIONES (HRA)
// (copiado desde mensual, misma lógica)
// ======================================================
let totalComisiones = 0;
const detallesComisiones = [];

// Separación especial (igual que mensual)
const comisionesSeparadas = {
  "CONCURSO FPAY": 0,
  "DIF CONCURSO FPAY": 0
};

listaComisionHRA.forEach(comision => {
  const safe = comision.replace('.', '\\.');
  const regex = new RegExp(
    `${safe}(?:\\s|\\S)*?\\$\\s*((?:\\d{1,3}\\.){0,2}\\d{1,3}(?:,\\d{1,2})?)`,
    'gi'
  );

  const matches = [...textoCompleto.matchAll(regex)];
  matches.forEach(match => {
    const monto = procesarMontoHRA(match[1]);

    if (comision === "CONCURSO FPAY") {
      comisionesSeparadas["CONCURSO FPAY"] = monto;
    } else if (comision === "DIF CONCURSO FPAY") {
      comisionesSeparadas["DIF CONCURSO FPAY"] = monto;
    } else {
      totalComisiones += monto;
      detallesComisiones.push({ item: comision, monto });
    }
  });
});

// Agregar separadas al final (igual que mensual)
if (comisionesSeparadas["CONCURSO FPAY"] > 0) {
  detallesComisiones.push({ item: "CONCURSO FPAY", monto: comisionesSeparadas["CONCURSO FPAY"] });
  totalComisiones += comisionesSeparadas["CONCURSO FPAY"];
}
if (comisionesSeparadas["DIF CONCURSO FPAY"] > 0) {
  detallesComisiones.push({ item: "DIF CONCURSO FPAY", monto: comisionesSeparadas["DIF CONCURSO FPAY"] });
  totalComisiones += comisionesSeparadas["DIF CONCURSO FPAY"];
}

// HTML detalle
let detalleComisionesHTML = detallesComisiones
  .map(c => `<li>${c.item}: ${formatCurrencyHRA(c.monto)}</li>`)
  .join('');

if (detallesComisiones.length === 0) {
  detalleComisionesHTML = '⛔ No tiene comisiones individuales.';
}

// ======================================================
// RESUMEN COMISIONES
// ======================================================
let estadoComisiones = "ok";
if (detallesComisiones.length === 0 && totalComisiones === 0) {
  estadoComisiones = "info";
} else if (detallesComisiones.length > 0 && totalComisiones === 0) {
  estadoComisiones = "warning";
}
agregarResultadoResumenHRA("Comisiones", estadoComisiones, 0);


contenedor.innerHTML = `
  <div id="resumenMecContainer">
    ${generarResumenAnalisisHTMLHRA()}
  </div>

  <hr>
  <p><strong>Mes y Año:</strong> ${mes} DE ${año}</p>
  <p><strong>IMM mensual utilizado:</strong> ${inm ? formatCurrencyHRA(inm) : "No encontrado"}</p>
  <p><strong>Jornada máxima legal usada para IMM/hora:</strong> ${jornadaMaxima || "No encontrado"} horas</p>
  <p><strong>IMM por hora:</strong> ${valorImmHora ? formatCurrencyHRA(valorImmHora) : "No encontrado"}</p>
  <p><strong>IMM por hora:</strong>(IMM ÷ 30) × 28 ÷ (4 × jornada máxima legal)</p>
  <hr>
  <h2>1. Sueldo por Hora</h2>
  <p><strong>Horas base contrato:</strong> ${horasBaseContrato != null ? horasBaseContrato : "No encontrado"}</p>
  <p><strong>Monto base pagado:</strong> ${montoBasePagadoMes != null ? formatCurrencyHRA(montoBasePagadoMes) : "No encontrado"}</p>
  <p><strong>Valor hora contractual:</strong> ${valorHoraContractual != null ? formatCurrencyHRA(valorHoraContractual) : "No encontrado"}</p>
  <p><strong>Análisis legal:</strong> ${mensajeLegal}</p>
  <hr>
  <h2>2. Sobretiempo por Hora</h2>
  <p><strong>Horas Extras 50%:</strong> ${resultadoHorasExtras}</p>
  ${estadoHorasExtras === "info" ? "" : `
    <p>
      <em>Pagado:</em> ${formatCurrencyHRA(montoPagadoHorasExtras)} |
      <em>Esperado:</em> ${formatCurrencyHRA(montoEsperadoHorasExtras)} |
      <em>Horas:</em> ${horasExtrasRealizadas}
    </p>
  `}

  <p><strong>Horas Extras Domingo:</strong> ${resultadoHorasExtrasDomingo}</p>
  ${estadoHorasExtrasDomingo === "info" ? "" : `
    <p>
      <em>Pagado:</em> ${formatCurrencyHRA(montoPagadoHorasExtrasDomingo)} |
      <em>Esperado:</em> ${formatCurrencyHRA(montoEsperadoHorasExtrasDomingo)} |
      <em>Horas:</em> ${horasExtrasDomingoRealizadas}
    </p>
  `}

  <p><strong>Horas Recargo Domingo:</strong> ${resultadoRecargoDomingo}</p>
  ${(estadoRecargoDomingo === "ok" || estadoRecargoDomingo === "error") ? `
    <p>
      <em>Pagado:</em> ${formatCurrencyHRA(montoPagadoRecargoDomingo)} |
      <em>Esperado:</em> ${formatCurrencyHRA(montoEsperadoRecargoDomingo)} |
      <em>Horas:</em> ${horasRecargoDomingo}
    </p>
  ` : ""}

  <p><strong>Recargo 50% Festivo:</strong> ${resultadoRecargoFestivo}</p>
  ${estadoRecargoFestivo === "info" ? "" : `
    <p>
      <em>Pagado:</em> ${formatCurrencyHRA(montoPagadoRecargoFestivo)} |
      <em>Esperado:</em> ${formatCurrencyHRA(montoEsperadoRecargoFestivo)} |
      <em>Horas:</em> ${horasRecargoFestivoRealizadas}
    </p>
  `}

  <hr>

  <h2>3. Asignaciones </h2>

  <p><strong>Movilización:</strong>
  ${matchMovilizacion ? `Días: ${diasMovilizacion} | Monto: ${formatCurrencyHRA(montoMovilizacion)}` : '⛔ No tiene movilización.'}
  </p>
  ${montoDiferenciaMovilizacion > 0 ? `<p><strong>Dif. Movilización:</strong> ${formatCurrencyHRA(montoDiferenciaMovilizacion)}</p>` : ''}
  ${matchMovilizacion ? `<p><strong>Días Totales Movilización:</strong> ${Math.round(diasTotalesMovilizacion)}</p>` : ''}

  <p><strong>Colación:</strong>
  ${matchColacion ? `Días: ${diasColacion} | Monto: ${formatCurrencyHRA(montoColacion)}` : '⛔ No tiene colación.'}
  </p>
  ${montoDiferenciaColacion > 0 ? `<p><strong>Dif. Colación:</strong> ${formatCurrencyHRA(montoDiferenciaColacion)}</p>` : ''}
  ${matchColacion ? `<p><strong>Días Totales Colación:</strong> ${Math.round(diasTotalesColacion)}</p>` : ''}

  <p><strong>Caja:</strong>
  ${matchCaja ? `Días: ${diasCaja} | Monto: ${formatCurrencyHRA(montoCaja)}` : '⛔ No tiene asignación de caja.'}
  </p>
  ${montoDiferenciaCaja > 0 ? `<p><strong>Dif. Caja:</strong> ${formatCurrencyHRA(montoDiferenciaCaja)}</p>` : ''}
  ${matchCaja ? `<p><strong>Días Totales Caja:</strong> ${Math.round(diasTotalesCaja)}</p>` : ''}
 
  <hr>
  <h2>4. Comisiones</h2>
  <ul>
    ${detalleComisionesHTML}
  </ul>
  <p><strong>Total Comisiones:</strong> ${formatCurrencyHRA(totalComisiones)}</p>
  <hr>

  <p style="font-size:13px; color:#6b7280;">
    Nota: Ya están implementados Bloque 1 (Sueldo HRA) y Bloque 2 (Sobretiempo).
    Luego integraremos asignaciones, comisiones, semana corrida y gratificación.
  </p>
`;

  } catch (error) {
    console.error("❌ Error en analizarArchivoHora():", error);
    alert("❌ Error analizando la liquidación por hora.");
  }
}

// ======================================================
// EXPORTS
// ======================================================
window.preValidarAntesDeAnalizarHora = preValidarAntesDeAnalizarHora;
window.analizarArchivoHora = analizarArchivoHora;

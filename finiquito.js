/* ============================================================

   MEC — FINIQUITO

   Migración autocontenida MEC 1.1 hacia MEC 1.0

   Archivo único modificado:

   finiquito.js

   No requiere import/export.

   No modifica script.js ni global.js.

   ============================================================= */

(function () {

  "use strict";

  var MILISEGUNDOS_DIA = 1000 * 60 * 60 * 24;

  var CONCEPTOS_NO_FINIQUITO = [
    "BONO VACACIONES",
    "HORAS EXTRAS 50 %",
    "HORAS EXTRAS 50%",
    "AGUINALDO NAVIDAD",
    "AGUIN FIESTAS PATRIAS",
    "ASIG. FAMILIAR",
    "QUINQUENIO",
    "CANASTA DE MERCADERIA",
    "RELIQUIDACION DE GRATIFICACI",
    "BONO DICIEMBRE",
    "BONO FIESTAS",
    "ESCOLARIDAD",
    "BENEFICIO MATRIMONIO",
    "DIF. AGUINALDO",
    "BONO PRONTO ACUERDO",
    "HORAS EXTRAS DOMINGO",
    "ESC. SUPERIOR",
    "ESC. BASICA",
    "ASIGNACION SALA CUNA"
  ];

  var FERIADOS_FIJOS_CHILE = [
    "01-01",
    "01-05",
    "18-09",
    "19-09",
    "25-12",
    "01-11",
    "08-12"
  ];

  /* ==========================================================
     UTILIDADES
     ========================================================== */

  function obtenerElemento(id) {
    return document.getElementById(id);
  }

  function numeroSeguro(valor, defecto) {
    var numero = Number(valor);

    if (!Number.isFinite(numero)) {
      return defecto === undefined ? 0 : defecto;
    }

    return numero;
  }

  function escaparHTML(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatearCLP(valor) {
    var numero = numeroSeguro(valor, 0);

    return "$" + Math.round(numero).toLocaleString("es-CL");
  }

function formatearDias(valor) {
    return Number(valor).toLocaleString("es-CL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

  function procesarMonto(valor) {
    if (valor === null || valor === undefined) {
      return 0;
    }

    var texto = String(valor)
      .trim()
      .replace(/[^\d.,-]/g, "");

    if (!texto) {
      return 0;
    }

    /*
     * Formato chileno:
     * 1.234.567,89 -> 1234567.89
     * 1.234         -> 1234
     */

    if (texto.indexOf(",") !== -1) {
      texto = texto
        .replace(/\./g, "")
        .replace(",", ".");
    } else {
      /*
       * Los montos de liquidación con punto se interpretan
       * como separadores de miles.
       */
      texto = texto.replace(/\./g, "");
    }

    var numero = parseFloat(texto);

    return Number.isFinite(numero) ? numero : 0;
  }

  function escaparRegex(texto) {
    return String(texto).replace(
      /[-\/\\^$*+?.()|[\]{}]/g,
      "\\$&"
    );
  }

  function normalizarTexto(texto) {
    return String(texto || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function esPDF(archivo) {
    if (!archivo) {
      return false;
    }

    var nombre = String(archivo.name || "").toLowerCase();
    var tipo = String(archivo.type || "").toLowerCase();

    return (
      tipo === "application/pdf" ||
      nombre.endsWith(".pdf")
    );
  }

  function fechaLocalDesdeInput(valor) {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return null;
    }

    var partes = valor.split("-").map(Number);

    var fecha = new Date(
      partes[0],
      partes[1] - 1,
      partes[2]
    );

    if (
      fecha.getFullYear() !== partes[0] ||
      fecha.getMonth() !== partes[1] - 1 ||
      fecha.getDate() !== partes[2]
    ) {
      return null;
    }

    fecha.setHours(0, 0, 0, 0);

    return fecha;
  }

  function normalizarFechaEntrada(fecha) {
    if (!(fecha instanceof Date) || isNaN(fecha.getTime())) {
      return null;
    }

    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );
  }

  /* ==========================================================
     PDF
     ========================================================== */

  async function extraerTextoDePDF(archivo) {
    if (!archivo) {
      throw new Error("No se recibió un archivo PDF.");
    }

    var pdfjs =
      window.pdfjsLib ||
      window["pdfjsLib"];

    if (!pdfjs || typeof pdfjs.getDocument !== "function") {
      throw new Error("PDF.js no está disponible.");
    }

    var buffer = await archivo.arrayBuffer();

    var pdf = await pdfjs.getDocument({
      data: buffer
    }).promise;

    var textoCompleto = "";

    for (var pagina = 1; pagina <= pdf.numPages; pagina++) {
      var paginaPDF = await pdf.getPage(pagina);

      var contenido = await paginaPDF.getTextContent();

      var partes = contenido.items.map(function (item) {
        return item.str || "";
      });

      textoCompleto += partes.join(" ") + " ";
    }

    return normalizarTexto(textoCompleto);
  }

  function extraerTotalHaberes(texto) {
    var patrones = [
      /TOTAL\s+HABERES\s*:?\s*\$?\s*([\d.,]+)/i,
      /TOTAL\s+HABERES\s+\$?\s*([\d.,]+)/i
    ];

    for (var i = 0; i < patrones.length; i++) {
      var coincidencia = texto.match(patrones[i]);

      if (coincidencia) {
        var monto = procesarMonto(coincidencia[1]);

        if (Number.isFinite(monto)) {
          return monto;
        }
      }
    }

    return null;
  }

  function extraerConceptosNoFiniquito(texto) {
    var items = {};
    var total = 0;

    CONCEPTOS_NO_FINIQUITO.forEach(function (concepto) {
      var conceptoSeguro = escaparRegex(concepto);

      var expresion = new RegExp(
        conceptoSeguro +
          "\\s*(?:\\([^)]*\\))?" +
          "\\s*\\$?\\s*([\\d.,]+)",
        "gi"
      );

      var coincidencia;

      while (
        (coincidencia = expresion.exec(texto)) !== null
      ) {
        var monto = procesarMonto(coincidencia[1]);

        if (monto <= 0) {
          continue;
        }

        if (!items[concepto]) {
          items[concepto] = 0;
        }

        items[concepto] += monto;
        total += monto;
      }
    });

    return {
      items: items,
      total: total
    };
  }

  function extraerAsignacionesNoFeriado(texto) {
    var items = {};
    var total = 0;

    var patrones = [
      {
        nombre: "MOVILIZACION",
        regex:
          /(?:^|\s)MOVILIZACION\s*\(\s*\d+\s*\)\s*\$?\s*([\d.,]+)/gi
      },
      {
        nombre: "COLACION",
        regex:
          /(?:^|\s)COLACION\s*\(\s*\d+\s*\)\s*\$?\s*([\d.,]+)/gi
      },
      {
        nombre: "ASIG. DE CAJA",
        regex:
          /ASIG\.?\s*DE\s*CAJA(?:\s+(?:VENDEDORES|CAJEROS?|CAJERAS?))?\s*\(\s*\d+\s*\)\s*\$?\s*([\d.,]+)/gi
      },
      {
        nombre: "DIFERENCIA MOVILIZACION",
        regex:
          /DIFERENCIA\s+MOVILIZACION\s*\$?\s*([\d.,]+)/gi
      },
      {
        nombre: "DIFERENCIA COLACION",
        regex:
          /DIFERENCIA\s+COLACION\s*\$?\s*([\d.,]+)/gi
      },
      {
        nombre: "DIFERENCIA CAJA",
        regex:
          /DIF(?:ERENCIA)?(?:\s+ASIG\.?)?(?:\s+DE)?\s*CAJA.*?\$?\s*([\d.,]+)/gi
      }
    ];

    patrones.forEach(function (patron) {
      var coincidencia;

      while (
        (coincidencia = patron.regex.exec(texto)) !== null
      ) {
        var monto = procesarMonto(coincidencia[1]);

        if (monto <= 0) {
          continue;
        }

        if (!items[patron.nombre]) {
          items[patron.nombre] = 0;
        }

        items[patron.nombre] += monto;
        total += monto;
      }
    });

    return {
      items: items,
      total: total
    };
  }

  async function parsearFiniquitoPDF(archivo) {
    var texto = await extraerTextoDePDF(archivo);

    var totalHaberes = extraerTotalHaberes(texto);

    if (
      totalHaberes === null ||
      !Number.isFinite(totalHaberes)
    ) {
      throw new Error(
        'No se pudo extraer "TOTAL HABERES" del archivo "' +
          archivo.name +
          '".'
      );
    }

    var noFiniquito =
      extraerConceptosNoFiniquito(texto);

    var asignaciones =
      extraerAsignacionesNoFeriado(texto);

    var fecha = texto.match(
      /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+(\d{4})/i
    );

    return {
      fileName: archivo.name,
      mes: fecha ? fecha[1].toUpperCase() : "NO DETECTADO",
      anio: fecha ? fecha[2] : "NO DETECTADO",
      totalHaberes: totalHaberes,
      conceptosNoFiniquito: noFiniquito.items,
      totalNoFiniquito: noFiniquito.total,
      asignacionesNoFeriado: asignaciones.items,
      totalAsignacionesNoFeriado: asignaciones.total,
      totalHaberesConsiderado:
        totalHaberes - noFiniquito.total,
      textoExtraido: texto,
      valido: true
    };
  }

  async function parsearFiniquitoPDFs(archivos) {
    var lista = Array.from(archivos || []);

    if (lista.length !== 3) {
      throw new Error(
        "Debes seleccionar exactamente 3 archivos PDF."
      );
    }

    lista.forEach(function (archivo) {
      if (!esPDF(archivo)) {
        throw new Error(
          'El archivo "' +
            (archivo.name || "") +
            '" no es un PDF válido.'
        );
      }
    });

    var resultados = [];

    for (var i = 0; i < lista.length; i++) {
      resultados.push(
        await parsearFiniquitoPDF(lista[i])
      );
    }

    return {
      resultadosPDF: resultados,
      totalHaberes: resultados.reduce(function (total, item) {
        return total + numeroSeguro(item.totalHaberes, 0);
      }, 0),
      totalNoFiniquito: resultados.reduce(function (total, item) {
        return total + numeroSeguro(item.totalNoFiniquito, 0);
      }, 0),
      totalAsignacionesNoFeriado: resultados.reduce(function (
        total,
        item
      ) {
        return (
          total +
          numeroSeguro(
            item.totalAsignacionesNoFeriado,
            0
          )
        );
      }, 0)
    };
  }

  /* ==========================================================
     CÁLCULOS MEC 1.1
     ========================================================== */

  function calcularAniosDeServicio(
    fechaInicio,
    fechaDesvinculacion
  ) {
    var diferencia =
      fechaDesvinculacion.getTime() -
      fechaInicio.getTime();

    var anios =
      diferencia /
      (MILISEGUNDOS_DIA * 365.25);

    var aniosEnteros = Math.floor(anios);

    var mesesRestantes =
      (anios - aniosEnteros) * 12;

    if (mesesRestantes >= 6) {
      aniosEnteros++;
    }

    return Math.min(aniosEnteros, 11);
  }

  function calcularVacacionesProporcionales(
    fechaContrato,
    fechaDesvinculacion
  ) {
    var anio =
      fechaDesvinculacion.getFullYear();

    var fechaAnualidad = new Date(
      anio,
      fechaContrato.getMonth(),
      fechaContrato.getDate()
    );

    if (fechaDesvinculacion < fechaAnualidad) {
      fechaAnualidad = new Date(
        anio - 1,
        fechaContrato.getMonth(),
        fechaContrato.getDate()
      );
    }

    var diasTrabajados = Math.floor(
      (
        fechaDesvinculacion.getTime() -
        fechaAnualidad.getTime()
      ) / MILISEGUNDOS_DIA
    );

    if (diasTrabajados < 0) {
      return 0;
    }

    var mesesCompletos =
      Math.floor(diasTrabajados / 30);

    var diasRestantes =
      diasTrabajados - mesesCompletos * 30;

    var vacacionesMeses =
      mesesCompletos * 1.25;

    var vacacionesDias =
      diasRestantes * 0.041666667;

    /*
     * MEC 1.1 conserva la precisión.
     * No se utiliza Math.ceil().
     */

    return vacacionesMeses + vacacionesDias;
  }

  function esFinDeSemana(fecha) {
    var dia = fecha.getDay();
    return dia === 0 || dia === 6;
  }

  function esFeriado(fecha) {
    var mes = String(fecha.getMonth() + 1).padStart(2, "0");
    var dia = String(fecha.getDate()).padStart(2, "0");

    return FERIADOS_FIJOS_CHILE.includes(
      mes + "-" + dia
    );
  }

  function calcularDiasCorridosVacaciones(
    diasHabiles,
    fechaInicioVacaciones
  ) {
    var diasHabilesNumero =
      Number(diasHabiles) || 0;

    var diasHabilesEnteros =
      Math.floor(diasHabilesNumero);

    var fraccionDia =
      diasHabilesNumero - diasHabilesEnteros;

    var diasCorridos = 0;
    var diasContados = 0;

    var fechaActual = new Date(
      fechaInicioVacaciones.getTime()
    );

    /*
     * MEC 1.1:
     *
     * Primero se evalúa fin de semana.
     * Un fin de semana cuenta como día corrido,
     * pero no como día hábil.
     *
     * Después se evalúa feriado.
     * Un feriado no cuenta ni como corrido
     * ni como hábil.
     *
     * Finalmente se procesa el día hábil.
     */

    while (diasContados < diasHabilesEnteros) {

      if (esFinDeSemana(fechaActual)) {
        diasCorridos++;

        fechaActual.setDate(
          fechaActual.getDate() + 1
        );

        continue;
      }

      if (esFeriado(fechaActual)) {
        fechaActual.setDate(
          fechaActual.getDate() + 1
        );

        continue;
      }

      diasCorridos++;
      diasContados++;

      fechaActual.setDate(
        fechaActual.getDate() + 1
      );
    }

    return diasCorridos + fraccionDia;
  }

  function calcularBaseIndemnizacion(
    resultadosPDF
  ) {
    if (
      !Array.isArray(resultadosPDF) ||
      resultadosPDF.length !== 3
    ) {
      return null;
    }

    var suma = resultadosPDF.reduce(function (
      total,
      item
    ) {
      return (
        total +
        numeroSeguro(item.totalHaberes, 0) -
        numeroSeguro(item.totalNoFiniquito, 0)
      );
    }, 0);

    return Math.round(suma / 3);
  }

  function calcularBaseVacaciones(
    resultadosPDF
  ) {
    if (
      !Array.isArray(resultadosPDF) ||
      resultadosPDF.length !== 3
    ) {
      return null;
    }

    var suma = resultadosPDF.reduce(function (
      total,
      item
    ) {
      return (
        total +
        numeroSeguro(item.totalHaberes, 0) -
        numeroSeguro(
          item.totalAsignacionesNoFeriado,
          0
        )
      );
    }, 0);

    return Math.round(suma / 3);
  }

  function calcularFiniquito(datos) {
    var fechaInicio =
      normalizarFechaEntrada(
        datos.fechaInicioContrato
      );

    var fechaDesvinculacion =
      normalizarFechaEntrada(
        datos.fechaDesvinculacion
      );

    if (!fechaInicio || !fechaDesvinculacion) {
      throw new Error("Las fechas no son válidas.");
    }

    if (fechaDesvinculacion < fechaInicio) {
      throw new Error(
        "La fecha de desvinculación no puede ser anterior a la fecha de inicio."
      );
    }

    var diasPendientes = Math.max(
      0,
      numeroSeguro(
        datos.diasVacacionesPendientes,
        0
      )
    );

    var diasTrabajadosUltimoMes = Math.max(
      0,
      numeroSeguro(
        datos.diasTrabajadosUltimoMes,
        0
      )
    );

    var resultadosPDF =
      datos.resultadosPDF;

    var baseIndemnizacion =
      calcularBaseIndemnizacion(
        resultadosPDF
      );

    var baseVacaciones =
      calcularBaseVacaciones(
        resultadosPDF
      );

    if (
      baseIndemnizacion === null ||
      baseVacaciones === null
    ) {
      throw new Error(
        "No se pudieron calcular las bases con las tres liquidaciones."
      );
    }

    var aniosTrabajados =
      calcularAniosDeServicio(
        fechaInicio,
        fechaDesvinculacion
      );

    var diasVacacionesProporcionales =
      calcularVacacionesProporcionales(
        fechaInicio,
        fechaDesvinculacion
      );

    var totalDiasVacacionesHabiles =
      diasPendientes +
      diasVacacionesProporcionales;

    var fechaInicioVacaciones =
      new Date(
        fechaDesvinculacion.getTime()
      );

    fechaInicioVacaciones.setDate(
      fechaInicioVacaciones.getDate() + 1
    );

    /*
     * Solo los días pendientes se proyectan sobre calendario.
     * Los días proporcionales se agregan posteriormente,
     * conservando su fracción decimal.
     */

    var diasCorridosPendientes =
      calcularDiasCorridosVacaciones(
        diasPendientes,
        fechaInicioVacaciones
      );

    var diasVacacionesCorridos =
      diasCorridosPendientes +
      diasVacacionesProporcionales;

    var indemnizacion =
      baseIndemnizacion *
      aniosTrabajados;

    var pagoVacaciones =
      (baseVacaciones / 30) *
      diasVacacionesCorridos;

    var pagoAviso =
      baseIndemnizacion;

    var montoDiasTrabajadosUltimoMes =
      (baseIndemnizacion / 30) *
      diasTrabajadosUltimoMes;

    var totalFiniquito =
      indemnizacion +
      pagoVacaciones +
      pagoAviso +
      montoDiasTrabajadosUltimoMes;

    return {
      baseIndemnizacion: baseIndemnizacion,
      baseVacaciones: baseVacaciones,
      aniosTrabajados: aniosTrabajados,
      diasVacacionesPendientes: diasPendientes,
      diasVacacionesProporcionales:
        diasVacacionesProporcionales,
      totalDiasVacacionesHabiles:
        totalDiasVacacionesHabiles,
      diasVacacionesCorridos:
        diasVacacionesCorridos,
      diasTrabajadosUltimoMes:
        diasTrabajadosUltimoMes,
      indemnizacion: indemnizacion,
      pagoVacaciones: pagoVacaciones,
      pagoAviso: pagoAviso,
      montoDiasTrabajadosUltimoMes:
        montoDiasTrabajadosUltimoMes,
      totalFiniquito: totalFiniquito
    };
  }

  /* ==========================================================
     UI
     ========================================================== */

  function mostrarResultadoFiniquito(resultado) {
    var contenedor =
      obtenerElemento("resultadosFiniquito");

    if (!contenedor) {
      return;
    }

    contenedor.innerHTML = [
      '<div class="finiquito-resultado">',
      "<p><strong>Base Indemnización:</strong> ",
      formatearCLP(resultado.baseIndemnizacion),
      "</p>",
      "<p><strong>Base Vacaciones:</strong> ",
      formatearCLP(resultado.baseVacaciones),
      "</p>",
      "<p><strong>Años de Servicio:</strong> ",
      formatearDias(resultado.aniosTrabajados),
      "</p>",
      "<hr>",
      "<p>Vacaciones Pendientes: ",
      formatearDias(resultado.diasVacacionesPendientes),
      " días</p>",
      "<p>Vacaciones Proporcionales: ",
      formatearDias(resultado.diasVacacionesProporcionales),
      " días</p>",
      "<p>Suma Vacaciones días hábiles: ",
      formatearDias(resultado.totalDiasVacacionesHabiles),
      " días</p>",
      "<p>Total Vacaciones días corridos: ",
      formatearDias(resultado.diasVacacionesCorridos),
      " días</p>",
      "<p><strong>Monto Vacaciones:</strong> ",
      formatearCLP(resultado.pagoVacaciones),
      "</p>",
      "<hr>",
      "<p><strong>Días Trabajados Último Mes:</strong> ",
      formatearDias(resultado.diasTrabajadosUltimoMes),
      " días — ",
      formatearCLP(resultado.montoDiasTrabajadosUltimoMes),
      "</p>",
      "<p><strong>Indemnización por Años:</strong> ",
      formatearCLP(resultado.indemnizacion),
      "</p>",
      "<p><strong>Pago por Vacaciones:</strong> ",
      formatearCLP(resultado.pagoVacaciones),
      "</p>",
      "<p><strong>Pago por Aviso Previo:</strong> ",
      formatearCLP(resultado.pagoAviso),
      "</p>",
      "<p><strong>Total Finiquito:</strong> ",
      '<span class="finiquito-total">',
      formatearCLP(resultado.totalFiniquito),
      "</span></p>",
      "</div>"
    ].join("");

    contenedor.hidden = false;
    contenedor.classList.remove("hidden");
  }

  function mostrarResultadosNoFiniquito(resultadosPDF) {
    var contenedor =
      obtenerElemento("resultadosNoFiniquito");

    if (!contenedor) {
      return;
    }

    var html = [
      '<div class="finiquito-no-finiquito">',
      "<h3>Detalle de las Liquidaciones Utilizadas</h3>"
    ];

    resultadosPDF.forEach(function (
      resultado,
      indice
    ) {
      var conceptos =
        resultado.conceptosNoFiniquito || {};

      var asignaciones =
        resultado.asignacionesNoFeriado || {};

      html.push(
        '<div class="finiquito-pdf">',
        "<p><strong>",
        escaparHTML(
          resultado.mes !== "NO DETECTADO"
            ? resultado.mes + " " + resultado.anio
            : "Liquidación " + (indice + 1)
        ),
        "</strong></p>",
        "<p><strong>Total Haberes:</strong> ",
        formatearCLP(resultado.totalHaberes),
        "</p>"
      );

      var conceptosArray =
        Object.entries(conceptos);

      if (conceptosArray.length > 0) {
        html.push(
          "<p><strong>Valores excluidos para indemnización:</strong></p>",
          "<ul>"
        );

        conceptosArray.forEach(function (
          entrada
        ) {
          html.push(
            "<li>",
            escaparHTML(entrada[0]),
            ": ",
            formatearCLP(entrada[1]),
            "</li>"
          );
        });

        html.push(
          "</ul>",
          "<p><strong>Total excluido:</strong> ",
          formatearCLP(resultado.totalNoFiniquito),
          "</p>"
        );
      }

      var asignacionesArray =
        Object.entries(asignaciones);

      if (asignacionesArray.length > 0) {
        html.push(
          "<p><strong>Asignaciones excluidas para vacaciones:</strong></p>",
          "<ul>"
        );

        asignacionesArray.forEach(function (
          entrada
        ) {
          html.push(
            "<li>",
            escaparHTML(entrada[0]),
            ": ",
            formatearCLP(entrada[1]),
            "</li>"
          );
        });

        html.push(
          "</ul>",
          "<p><strong>Total asignaciones excluidas:</strong> ",
          formatearCLP(
            resultado.totalAsignacionesNoFeriado
          ),
          "</p>"
        );
      }

      html.push(
        "<p><strong>Haberes considerados para indemnización:</strong> ",
        formatearCLP(
          resultado.totalHaberesConsiderado
        ),
        "</p>",
        "</div>"
      );
    });

    html.push("</div>");

    contenedor.innerHTML = html.join("");
    contenedor.hidden = false;
    contenedor.classList.remove("hidden");
  }

  function limpiarResultadosFiniquito() {
    var resultado =
      obtenerElemento("resultadosFiniquito");

    var excluidos =
      obtenerElemento("resultadosNoFiniquito");

    if (resultado) {
      resultado.innerHTML = "";
      resultado.hidden = true;
      resultado.classList.add("hidden");
    }

    if (excluidos) {
      excluidos.innerHTML = "";
      excluidos.hidden = true;
      excluidos.classList.add("hidden");
    }
  }

  /* ==========================================================
     VALIDACIÓN Y CONTROLADOR
     ========================================================== */

  function obtenerDatosInterfaz() {
    var fechaInicioElemento =
      obtenerElemento("fechaInicioContrato");

    var fechaDesvinculacionElemento =
      obtenerElemento("fechaDesvinculacion");

    var diasPendientesElemento =
      obtenerElemento("diasVacacionesPendientes");

    var diasTrabajadosElemento =
      obtenerElemento("diasTrabajadosUltimoMes");

    var archivosElemento =
      obtenerElemento("fileFiniquito");

    if (
      !fechaInicioElemento ||
      !fechaDesvinculacionElemento ||
      !diasPendientesElemento ||
      !diasTrabajadosElemento ||
      !archivosElemento
    ) {
      throw new Error(
        "No se encontraron todos los controles de Finiquito."
      );
    }

    var fechaInicio =
      fechaLocalDesdeInput(
        fechaInicioElemento.value
      );

    var fechaDesvinculacion =
      fechaLocalDesdeInput(
        fechaDesvinculacionElemento.value
      );

    if (!fechaInicio || !fechaDesvinculacion) {
      throw new Error(
        "Por favor, ingrese fechas válidas."
      );
    }

    if (fechaDesvinculacion < fechaInicio) {
      throw new Error(
        "La fecha de desvinculación no puede ser anterior a la fecha de inicio."
      );
    }

    var diasPendientesTexto =
      String(diasPendientesElemento.value || "").trim();

    var diasTrabajadosTexto =
      String(diasTrabajadosElemento.value || "").trim();

    var diasPendientes =
      diasPendientesTexto === ""
        ? 0
        : Number(diasPendientesTexto);

    var diasTrabajadosUltimoMes =
      diasTrabajadosTexto === ""
        ? 0
        : Number(diasTrabajadosTexto);

    if (
      !Number.isFinite(diasPendientes) ||
      !Number.isFinite(diasTrabajadosUltimoMes)
    ) {
      throw new Error(
        "Los días ingresados deben ser numéricos."
      );
    }

    if (
      diasPendientes < 0 ||
      diasTrabajadosUltimoMes < 0
    ) {
      throw new Error(
        "Los días ingresados no pueden ser negativos."
      );
    }

    var archivos =
      Array.from(archivosElemento.files || []);

    if (archivos.length !== 3) {
      throw new Error(
        "Debes seleccionar exactamente 3 archivos PDF."
      );
    }

    archivos.forEach(function (archivo) {
      if (!esPDF(archivo)) {
        throw new Error(
          'El archivo "' +
            (archivo.name || "") +
            '" no es un PDF válido.'
        );
      }
    });

    return {
      fechaInicioContrato: fechaInicio,
      fechaDesvinculacion: fechaDesvinculacion,
      diasVacacionesPendientes: diasPendientes,
      diasTrabajadosUltimoMes:
        diasTrabajadosUltimoMes,
      archivos: archivos
    };
  }

  async function calcularDesdeInterfaz(evento) {
    /*
     * Este listener se registra en captura y detiene la propagación
     * para evitar que el listener antiguo de script.js ejecute un
     * segundo cálculo sobre los mismos archivos.
     */

    if (evento) {
      evento.preventDefault();

      if (typeof evento.stopImmediatePropagation === "function") {
        evento.stopImmediatePropagation();
      }

      evento.stopPropagation();
    }

    var boton =
      obtenerElemento("calcularFiniquito");

    if (boton) {
      boton.disabled = true;
    }

    try {
      if (
        window.PERMISSIONS &&
        window.PERMISSIONS.requireFeature &&
        window.PERMISSIONS.FEATURES &&
        window.PERMISSIONS.FEATURES.FINIQUITO
      ) {
        var permitido =
          window.PERMISSIONS.requireFeature(
            window.PERMISSIONS.FEATURES.FINIQUITO,
            "Cálculo de Finiquito"
          );

        if (!permitido) {
          return;
        }
      }

      var datos =
        obtenerDatosInterfaz();

      var parseado =
        await parsearFiniquitoPDFs(
          datos.archivos
        );

      if (
        !parseado ||
        !Array.isArray(parseado.resultadosPDF) ||
        parseado.resultadosPDF.length !== 3
      ) {
        throw new Error(
          "No se pudieron procesar exactamente tres liquidaciones."
        );
      }

      var resultado =
        calcularFiniquito({
          fechaInicioContrato:
            datos.fechaInicioContrato,
          fechaDesvinculacion:
            datos.fechaDesvinculacion,
          diasVacacionesPendientes:
            datos.diasVacacionesPendientes,
          diasTrabajadosUltimoMes:
            datos.diasTrabajadosUltimoMes,
          resultadosPDF:
            parseado.resultadosPDF
        });

      mostrarResultadoFiniquito(resultado);

      mostrarResultadosNoFiniquito(
        parseado.resultadosPDF
      );

    } catch (error) {
      console.error(
        "Error en cálculo de Finiquito:",
        error
      );

      limpiarResultadosFiniquito();

      if (typeof window.alert === "function") {
        window.alert(
          error && error.message
            ? error.message
            : "No fue posible procesar el Finiquito."
        );
      }

    } finally {
      if (boton) {
        boton.disabled = false;
      }
    }
  }

  function refrescarFiniquito() {
    var ids = [
      "fechaInicioContrato",
      "fechaDesvinculacion",
      "diasVacacionesPendientes",
      "diasTrabajadosUltimoMes",
      "fileFiniquito"
    ];

    ids.forEach(function (id) {
      var elemento = obtenerElemento(id);

      if (elemento) {
        elemento.value = "";
      }
    });

    limpiarResultadosFiniquito();
  }

  /* ==========================================================
     API GLOBAL COMPATIBLE
     ========================================================== */

  window.calcularFiniquitoMEC =
    calcularDesdeInterfaz;

  window.refrescarFiniquito =
    refrescarFiniquito;

  window.parsearFiniquitoPDFs =
    parsearFiniquitoPDFs;

  window.calcularFiniquito =
    calcularFiniquito;

  window.mostrarResultadoFiniquito =
    mostrarResultadoFiniquito;

  window.mostrarResultadosNoFiniquito =
    mostrarResultadosNoFiniquito;

  /*
   * Captura temprana del evento:
   * finiquito.js aparece antes que script.js en el HTML.
   * Al usar capture=true y stopImmediatePropagation(),
   * el listener antiguo no vuelve a ejecutar el cálculo.
   */

  function inicializarFiniquito() {
    var boton =
      obtenerElemento("calcularFiniquito");

    if (
      boton &&
      boton.dataset.finiquitoMECInicializado !== "true"
    ) {
      boton.dataset.finiquitoMECInicializado = "true";

      boton.addEventListener(
        "click",
        calcularDesdeInterfaz,
        true
      );
    }

    var botonRefrescar =
      obtenerElemento("refrescarFiniquito");

    if (
      botonRefrescar &&
      botonRefrescar.dataset.finiquitoMECInicializado !== "true"
    ) {
      botonRefrescar.dataset.finiquitoMECInicializado = "true";

      botonRefrescar.addEventListener(
        "click",
        function (evento) {
          evento.preventDefault();

          if (
            typeof evento.stopImmediatePropagation ===
            "function"
          ) {
            evento.stopImmediatePropagation();
          }

          evento.stopPropagation();

          refrescarFiniquito();
        },
        true
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      inicializarFiniquito
    );
  } else {
    inicializarFiniquito();
  }

})();
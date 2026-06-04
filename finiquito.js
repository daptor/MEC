// ****************** Funcion Finiquito ****************
document.addEventListener("DOMContentLoaded", function () {
  function mostrarPantalla(idPantalla) {
    document.querySelectorAll(".pantalla").forEach(pantalla => {
      pantalla.style.display = "none";
    });
    const pantallaSeleccionada = document.getElementById(idPantalla);
    if (pantallaSeleccionada) {
      pantallaSeleccionada.style.display = "block";
    }
  }

  document.querySelectorAll("[data-target]").forEach(boton => {
    boton.addEventListener("click", function () {
      const pantallaObjetivo = boton.getAttribute("data-target");
      mostrarPantalla(pantallaObjetivo);
    });
  });

  const btnCalcularFiniquito = document.getElementById("calcularFiniquito");
  const inputDiasVacacionesPendientes = document.getElementById("diasVacacionesPendientes");
  const inputDiasTrabajadosUltimoMes = document.getElementById("diasTrabajadosUltimoMes"); // Nuevo input
  const inputPDFs = document.getElementById("fileFiniquito");
  const resultadosFiniquito = document.getElementById("resultadosFiniquito");

  btnCalcularFiniquito.addEventListener("click", async function () {

  // 🔒 BLOQUEO FREEMIUM (Finiquito)
  if (!PERMISSIONS.requireFeature(PERMISSIONS.FEATURES.FINIQUITO)) return;

    const fechaInicio = new Date(document.getElementById("fechaInicioContrato").value);
    const fechaDesvinculacion = new Date(document.getElementById("fechaDesvinculacion").value);

    if (isNaN(fechaInicio) || isNaN(fechaDesvinculacion)) {
      alert("Por favor, ingrese fechas válidas.");
      return;
    }

    const añosTrabajados = calcularAñosDeServicio(fechaInicio, fechaDesvinculacion);
    const diasVacPendientes = parseInt(inputDiasVacacionesPendientes.value) || 0;
    const diasTrabajadosUltimoMes = parseInt(inputDiasTrabajadosUltimoMes.value) || 0;

    if (inputPDFs.files.length !== 3) {
      alert("Debes subir exactamente 3 archivos PDF con las últimas liquidaciones de sueldo.");
      return;
    }

    const sueldoMensual = await calcularSueldoPromedio(inputPDFs.files);
    if (!sueldoMensual) {
      alert("No se pudo extraer el sueldo promedio. Verifica que los PDFs sean correctos.");
      return;
    }

    const diasVacProp = calcularVacacionesProporcionales(fechaInicio, fechaDesvinculacion);
    const totalDiasVacHabil = diasVacPendientes + diasVacProp;

    const fechaInicioVac = new Date(fechaDesvinculacion.getTime());
    fechaInicioVac.setDate(fechaInicioVac.getDate() + 1);
    const diasVacCorridos = calcularDiasCorridosVacaciones(totalDiasVacHabil, fechaInicioVac);

    const valorDiaPromedio = sueldoMensual / 30;
    const valorVacacionesPagadas = valorDiaPromedio * diasVacCorridos;

    const resultado = calcularFiniquito(sueldoMensual, añosTrabajados, totalDiasVacHabil);

    // Cálculo de monto de los días trabajados del último mes
    const montoDiasTrabajadosUltimoMes = (sueldoMensual / 30) * diasTrabajadosUltimoMes;

    // Modificación aquí: asegurándonos de usar "Monto Vacaciones (días Corridos)" en lugar del valor anterior.
    const pagoPorVacaciones = valorVacacionesPagadas;  // Este es el valor correcto de vacaciones corridas.

    // Modificación del "Total Finiquito"
    const totalFiniquito = resultado.indemnizacion + pagoPorVacaciones + resultado.pagoAviso + montoDiasTrabajadosUltimoMes;

    resultadosFiniquito.innerHTML = `
      <p><strong>Sueldo Promedio:</strong> ${formatearCLP(sueldoMensual)}</p>
      <p><strong>Años de Servicio:</strong> ${añosTrabajados}</p>
      <hr>
      <p>Vacaciones Pendientes: ${diasVacPendientes} días</p>
      <p>Vacaciones Proporcionales: ${diasVacProp} días</p>
      <p>Suma Vacaciones (días hábiles): ${totalDiasVacHabil} días</p>
      <p>Total Vacaciones (días Corridos): ${diasVacCorridos} días</p>
      <p><strong>Monto Vacaciones (días Corridos):</strong> ${formatearCLP(valorVacacionesPagadas)}</p>
      <hr>
      <p><strong>Monto Días Trabajados:</strong> ${formatearCLP(montoDiasTrabajadosUltimoMes)} (${diasTrabajadosUltimoMes} días)</p>
      <p><strong>Indemnización por Años:</strong> ${formatearCLP(resultado.indemnizacion)}</p>
      <p><strong>Pago por Vacaciones:</strong> ${formatearCLP(pagoPorVacaciones)}</p> <!-- Ahora muestra el valor correcto -->
      <p><strong>Pago por Aviso Previo:</strong> ${formatearCLP(resultado.pagoAviso)}</p>
      <p><strong>Total Finiquito:</strong> <span style="color: green;">${formatearCLP(totalFiniquito)}</span></p> <!-- Aquí se calcula correctamente -->
      <hr>
    `;

    const itemsNoFiniquito = await extraerItemsNoFiniquito(inputPDFs.files);
    mostrarResultadosNoFiniquito(itemsNoFiniquito);

    resultadosFiniquito.classList.remove("hidden");
  });

  // Función para calcular las vacaciones proporcionales tomando en cuenta la anualidad
  function calcularVacacionesProporcionales(fechaContrato, fechaDesvinculacion) {
    let anioDesv = fechaDesvinculacion.getFullYear();
    let fechaAnualidad = new Date(anioDesv, fechaContrato.getMonth(), fechaContrato.getDate());

    if (fechaDesvinculacion < fechaAnualidad) {
      fechaAnualidad = new Date(anioDesv - 1, fechaContrato.getMonth(), fechaContrato.getDate());
    }

    const diasTrabajados = Math.floor((fechaDesvinculacion - fechaAnualidad) / (1000 * 60 * 60 * 24));
    const mesesCompletos = Math.floor(diasTrabajados / 30);
    const diasRestantes = diasTrabajados - (mesesCompletos * 30);
    const vacMeses = mesesCompletos * 1.25;
    const vacDias = diasRestantes * 0.041666667;

    return Math.ceil(vacMeses + vacDias);
  }

  // Función para convertir días hábiles de vacaciones a días corridos
  function calcularDiasCorridosVacaciones(diasHabiles, fechaInicioVacaciones) {
    let diasCorridos = 0;
    let diasContados = 0;
    let fechaActual = new Date(fechaInicioVacaciones.getTime());
    while (diasContados < diasHabiles) {
      if (!esFinDeSemana(fechaActual) && !esFeriado(fechaActual)) {
        diasContados++;
      }
      diasCorridos++;
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    return diasCorridos;
  }

  // Función para determinar si un día es fin de semana
  function esFinDeSemana(fecha) {
    const dia = fecha.getDay();
    return (dia === 0 || dia === 6);
  }

  // Función para determinar si un día es feriado en Chile
  function esFeriado(fecha) {
    const feriadosChile = ["01-01", "01-05", "18-09", "19-09", "25-12", "01-11", "08-12"];
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const dia = fecha.getDate().toString().padStart(2, "0");
    const fechaStr = `${mes}-${dia}`;
    return feriadosChile.includes(fechaStr);
  }

  // Función para calcular el finiquito (método original)
  function calcularFiniquito(sueldoMensual, añosTrabajados, diasVacacionesHabil, diasTrabajadosUltimoMes) {
    let indemnizacion = sueldoMensual * añosTrabajados;
    let pagoVacaciones = (sueldoMensual / 30) * diasVacacionesHabil;
    let pagoAviso = sueldoMensual;
    let totalFiniquito = indemnizacion + pagoVacaciones + pagoAviso + (sueldoMensual / 30) * diasTrabajadosUltimoMes;
    return {
      indemnizacion,
      pagoVacaciones,
      pagoAviso,
      totalFiniquito
    };
  }

  async function calcularSueldoPromedio(files) {
    let totalHaberesArray = [];
    for (const file of files) {
      const totalHaberes = await extraerTotalHaberesDePDF(file);
      if (totalHaberes) {
        totalHaberesArray.push(totalHaberes);
      }
    }
    if (totalHaberesArray.length !== 3) {
      return null;
    }
    let sumTotalHaberes = totalHaberesArray.reduce((acc, val) => acc + val, 0);
    const noFiniquitoResult = await extraerItemsNoFiniquito(files);
    let totalNoFiniquito = noFiniquitoResult.noFiniquitoTotal;
    let sueldoPromedio = Math.round((sumTotalHaberes - totalNoFiniquito) / 3);
    return sueldoPromedio;
  }

  async function extraerTotalHaberesDePDF(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        try {
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let totalHaberesEncontrado = null;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            const text = textItems.join(" ");
            const regex = /TOTAL\s+HABERES\s*\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/i;
            const match = regex.exec(text);
            if (match) {
              let valor = match[1].replace(/\./g, "").replace(",", ".");
              totalHaberesEncontrado = parseFloat(valor);
              break;
            }
          }
          resolve(totalHaberesEncontrado);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function extraerItemsNoFiniquito(files) {
    const itemsNoFiniquito = [
      "BONO VACACIONES", "HORAS EXTRAS 50 %", "AGUINALDO NAVIDAD", "AGUIN FIESTAS PATRIAS", "ASIG. FAMILIAR", "QUINQUENIO",
      "CANASTA DE MERCADERIA", "RELIQUIDACION DE GRATIFICACI", "BONO DICIEMBRE", "BONO FIESTAS", "ESCOLARIDAD",
      "BENEFICIO MATRIMONIO", "DIF. AGUINALDO", "BONO PRONTO ACUERDO", "HORAS EXTRAS DOMINGO", "ESC. SUPERIOR", "ESC. BASICA"
    ];
    let resultadosPDF = [];
    let noFiniquitoTotal = 0;
    let acumuladoGlobal = {};
    for (const file of files) {
      const textoPDF = await extraerTextoDePDF(file);
      let itemsPDF = {};
      let noFiniquitoPDF = 0;
      itemsNoFiniquito.forEach(item => {
        const regex = new RegExp(`${item}\\s*(?:\\(.*?\\))?\\s*\\$?\\s*(\\d{1,3}(?:[.,]\\d{3})*(?:[.,]\\d{2})?)`, 'gi');
        let matches;
        while ((matches = regex.exec(textoPDF)) !== null) {
          let valor = matches[1].replace(/\./g, "").replace(",", ".");
          valor = parseFloat(valor) || 0;
          if (!itemsPDF[item]) {
            itemsPDF[item] = 0;
          }
          itemsPDF[item] += valor;
          if (!acumuladoGlobal[item]) {
            acumuladoGlobal[item] = 0;
          }
          acumuladoGlobal[item] += valor;
          noFiniquitoPDF += valor;
        }
      });
      resultadosPDF.push({ fileName: file.name, items: itemsPDF });
      noFiniquitoTotal += noFiniquitoPDF;
    }
    return { resultadosPDF, noFiniquitoTotal, acumuladoGlobal };
  }

  async function extraerTextoDePDF(file) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async function () {
        const typedarray = new Uint8Array(this.result);
        try {
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let textoCompleto = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map(item => item.str);
            textoCompleto += textItems.join(" ");
          }
          resolve(textoCompleto);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function mostrarResultadosNoFiniquito(items) {
    const resultadosDiv = document.getElementById("resultadosNoFiniquito");
    let contenidoHTML = "<h4 style='font-size: 20px; margin-bottom: 6px;'>Valores Excluidos:</h4><hr>";
    items.resultadosPDF.forEach(result => {
      contenidoHTML += `<p style="margin: 8px;"><strong>${result.fileName}:</strong></p>`;
      Object.entries(result.items).forEach(([item, valor]) => {
        contenidoHTML += `<p style="margin: 8px;">${item}: ${formatearCLP(valor)}</p>`;
      });
    });
    contenidoHTML += `<h5 style="font-size: 18px; margin-top: 12px;">Total excluidos: ${formatearCLP(items.noFiniquitoTotal)}</h5>`;
    resultadosDiv.innerHTML = contenidoHTML;
  }

  function calcularAñosDeServicio(fechaInicio, fechaDesvinculacion) {
    const diferencia = fechaDesvinculacion - fechaInicio;
    const añosDeServicio = diferencia / (1000 * 60 * 60 * 24 * 365.25);
    let añosRedondeados = Math.floor(añosDeServicio);
    const mesesRestantes = (añosDeServicio - añosRedondeados) * 12;
    if (mesesRestantes >= 6) {
      añosRedondeados++;
    }
    const añosLimitados = Math.min(añosRedondeados, 11);
    return añosLimitados;
  }

  function calcularDiasTrabajadosUltimoMes(fechaInicio, fechaDesvinculacion) {
    const diasUltimoMes = (fechaDesvinculacion - new Date(fechaDesvinculacion.getFullYear(), fechaDesvinculacion.getMonth(), 1)) / (1000 * 60 * 60 * 24);
    return Math.ceil(diasUltimoMes);
  }
});


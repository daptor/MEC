pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("menu-principal").style.display = "none";
    document.getElementById("mensajeError").style.display = "none";
});

document.addEventListener("DOMContentLoaded", function () {
    // Elementos del DOM
    const contadorElemento = document.getElementById("contador");
    const fechaHoraElemento = document.getElementById("fechaHora");
    const resetBoton = document.getElementById("resetContador");

    // Inicializar contador de visitas
    let contadorVisitas = localStorage.getItem("contadorVisitas");

    // Si no existe en localStorage, inicializarlo en 0
    if (!contadorVisitas) {
        contadorVisitas = 0;
    } else {
        contadorVisitas = parseInt(contadorVisitas);
    }

    // Incrementar el contador
    contadorVisitas++;
    localStorage.setItem("contadorVisitas", contadorVisitas);

    // Mostrar valores en la pantalla de inicio
    if (contadorElemento) contadorElemento.textContent = contadorVisitas;

    function actualizarFechaHora() {
        const fechaElemento = document.getElementById("fecha");
        const horaElemento = document.getElementById("hora");

        const ahora = new Date();
        const fecha = ahora.toLocaleDateString();
        const hora = ahora.toLocaleTimeString();

        if (fechaElemento) fechaElemento.textContent = fecha;
        if (horaElemento) horaElemento.textContent = hora;
    }

    // Actualiza la fecha y hora cada segundo
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);

    // Botón de reinicio (casi invisible)
    if (resetBoton) {
        resetBoton.addEventListener("click", function () {
            localStorage.setItem("contadorVisitas", 0);
            contadorElemento.textContent = 0;
        });
    }
});

// Verificación del código de acceso
document.getElementById("ingresarBtn").addEventListener("click", function () {
    const codigoIngresado = document.getElementById("codigoAcceso").value;
    const codigoCorrecto = "fthf1999";  // Cambiar si es necesario

    if (codigoIngresado === codigoCorrecto) {
        document.getElementById("login-container").style.display = "none";
        document.getElementById("menu-principal").style.display = "block";
    } else {
        const mensajeError = document.getElementById("mensajeError");
        mensajeError.style.display = "block";
        mensajeError.textContent = "Código incorrecto. Intenta nuevamente."; // Asegura que el mensaje sea visible
    }
});


// Función para cambiar entre pantallas
function mostrarPantalla(idPantalla) {
    document.querySelectorAll(".pantalla").forEach(pantalla => {
        pantalla.style.display = "none";
    });

    const pantalla = document.getElementById(idPantalla);
    if (pantalla) {
        pantalla.style.display = "block";
    } else {
        console.error("No se encontró el elemento con id:", idPantalla);
    }
}

// ==================== CONFIGURACIÓN DE NAVEGACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a las pantallas (ajusta los IDs según tu HTML)
    const pantallaPrincipal = document.getElementById('pantalla-principal');
    const pantallaAnalizar = document.getElementById('pantalla-analizar');

    // Botón para ir a la pantalla de análisis
    const analizarBtn = document.getElementById('analizarLiquidacionBtn');

    // Botones comunes en cada pantalla (volver y refrescar)
    const volverBtns = document.querySelectorAll('.volverBtn');
    const refrescarBtns = document.querySelectorAll('.refrescarBtn');

    // Función para mostrar una pantalla específica
    function mostrarPantalla(pantalla) {
        pantallaPrincipal.style.display = 'none';
        pantallaAnalizar.style.display = 'none';
        pantalla.style.display = 'block';
    }

    // Navegación: Al presionar el botón de analizar, se muestra la pantalla de análisis
    if (analizarBtn) {
        analizarBtn.addEventListener('click', () => {
            mostrarPantalla(pantallaAnalizar);
        });
    }

    // Funcionalidad de los botones "Volver"
    volverBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarPantalla(pantallaPrincipal);
        });
    });

    // Funcionalidad de los botones "Refrescar"
  const refrescarBtnAnalisis = document.getElementById('refrescarBtnAnalisis');
  if (refrescarBtnAnalisis) {
      refrescarBtnAnalisis.addEventListener('click', () => {
          // Limpiar los resultados previos de análisis
          document.getElementById('resultadoAnalisis').innerHTML = '';

          // Limpiar el contenedor de gratificación
          const gratificacionMec = document.getElementById('gratificacionMec');
          if (gratificacionMec) {
              gratificacionMec.style.display = 'none'; // Esconder el contenedor
          }

          // Limpiar el contenido de gratificación calculada
          const resultadoGratificacion = document.getElementById('resultadoGratificacion');
          if (resultadoGratificacion) {
              resultadoGratificacion.innerHTML = ''; // Limpiar la información de gratificación
          }

          // Limpiar el archivo PDF seleccionado
          const fileInput = document.getElementById('fileInput');
          if (fileInput) {
              fileInput.value = ''; // Limpiar el archivo PDF
          }

          // Resetear el campo de jornada seleccionada
          const jornadaSelect = document.getElementById('jornada');
          if (jornadaSelect) {
              jornadaSelect.value = ''; // Limpiar la selección de jornada
          }
      });
  }

  const refrescarBtnVacaciones = document.getElementById('refrescarBtnVacaciones');
  if (refrescarBtnVacaciones) {
      refrescarBtnVacaciones.addEventListener('click', () => {
          // Limpiar los archivos seleccionados para vacaciones
          const vacacionInput = document.getElementById('vacacionInput');
          if (vacacionInput) {
              vacacionInput.value = ''; // Limpiar el campo de archivos
          }

          // Limpiar los resultados previos de vacaciones
          const resultadoVacaciones = document.getElementById('resultadoVacaciones');
          if (resultadoVacaciones) {
              resultadoVacaciones.innerHTML = ''; // Limpiar los resultados previos
          }
      });
  }

  // Funcionalidad del botón "Refrescar" en el cálculo de finiquito
  const refrescarBtnFiniquito = document.getElementById('refrescarFiniquito');
  if (refrescarBtnFiniquito) {
      refrescarBtnFiniquito.addEventListener('click', () => {
          refrescarFiniquito();
      });
  }

  // Función para refrescar la pantalla de Finiquito
  function refrescarFiniquito() {
      // Limpiar los campos de entrada
      document.getElementById('añosTrabajados').value = '';
      document.getElementById('diasTrabajados').value = '';
      document.getElementById('fileFiniquito').value = ''; // Limpiar el campo de archivo

      // Limpiar los resultados de finiquito
      const resultadosFiniquito = document.getElementById('resultadosFiniquito');
      if (resultadosFiniquito) {
          resultadosFiniquito.classList.add('hidden'); // Ocultar los resultados
          resultadosFiniquito.innerHTML = ''; // Limpiar cualquier contenido previo
      }

      // Limpiar los resultados de los ítems no finiquito (Valores Excluidos)
      const resultadosNoFiniquito = document.getElementById('resultadosNoFiniquito');
      if (resultadosNoFiniquito) {
          resultadosNoFiniquito.innerHTML = ''; // Limpiar los resultados de ítems no finiquito
      }
  }

  // Inicialmente muestra la pantalla principal
  if (pantallaPrincipal) pantallaPrincipal.style.display = 'block';
  if (pantallaAnalizar) pantallaAnalizar.style.display = 'none';

});

// ==================== VARIABLES GLOBALES ====================
// Ingresos mínimos para cada año y mes
const ingresosMinimos = {
    2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 320500, "OCTUBRE": 320500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
    2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
    2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
    2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
    2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 },
    2025: { "ENERO": 510500, "FEBRERO": 510500, "MARZO": 510500, "ABRIL": 510500, "MAYO": 510500, "JUNIO": 510500, "JULIO": 510500, "AGOSTO": 510500, "SEPTIEMBRE": 510500, "OCTUBRE": 510500, "NOVIEMBRE": 510500, "DICIEMBRE": 510500 }
};

// Lista de factores de hora extra
const listaHoraExtra = [
    { horas: "45", factor: 0.0077778 },
    { horas: "44", factor: 0.0079545 },
    { horas: "43", factor: 0.0081395 },
    { horas: "42", factor: 0.0083333 },
    { horas: "41", factor: 0.0085366 },
    { horas: "40", factor: 0.0087500 },
    { horas: "30", factor: 0.0116667 },
    { horas: "25", factor: 0.0140000 },
    { horas: "20", factor: 0.0175000 },
    { horas: "18", factor: 0.0194444 }
];

// Lista de cargos para búsqueda
const listaCargos = [
    "ASESOR DE CLIENTES", "ASESOR DE COMPRAS", "ASESOR DE MARCA", "ASESOR DE MARCA ETAM",
    "ASISTENTE DE DISPLAY", "ASISTENTE DE VISUAL", "CAJERA(O) - EMPAQUE", "CONSULTOR DE PERFUMERIA",
    "COORDINADORA DE VENTAS", "GUARDIA", "OPERADOR DE CCTV", "TRAINEE TIENDA", "VENDEDOR JORNADA PARCIAL MAÑANA",
    "VENDEDOR", "VENDEDOR JORNADA PARCIAL", "ASISTENTE DE BODEGA", "ASISTENTE DE PROBADORES"
];

// Lista de Comisiones
const listaComision = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA",
    "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA",
    "COMPENSACION PERMISO", "DIF CONCURSO FPAY", "PROMOCIONES CMR", "COMISION CONNECT"
];

const listaGratificables = [
    "APERTURA CTA CTE", "BONO ASISTENCIA AUT.", "BONO CERTIFICACION", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "BONO PRONTO ACUERDO", "BONO PUNTUALIDAD AUT.", "BONO VACACIONES",
    "COMISION VACACIONES", "DIF BONO CUMPLIMIENTO DE HP.", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "DIF. SB MES ANTERIOR", "DIF. SUELDO BASE", "DIF.HORAS EXTRAS ", "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD",
    "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO", "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT",
    "PREMIO CUMPL.GRUPAL NPS", "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA",
    "PREMIO VENTA TIENDA AUT.", "PROMEDIOS VARIOS", "PROMOCIONES CMR", "QUIEBRE DE STOCK", "QUINQUENIO", "HORAS RECARGO NAVIDAD",
    "DIFERENCIA CONTINGENCIA", "BONO ASISTENCIA", "DIFERENCIA SEMANA CORRIDA", "DIF. CONTING. MES ANTERIOR", "DIF.SUELDO BASE CONTINGENCIA",
    "DIFERENCIA 70%"
];

// ==================== FUNCIÓN DE ANÁLISIS DEL PDF ====================
const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

async function analizarArchivo() {
    const archivo = document.getElementById('fileInput').files[0];
    const jornadaSeleccionada = document.getElementById('jornada').value;
    const regexMovilizacion = /MOVILIZACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const regexColacion = /COLACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const regexDiferenciaMovilizacion = /DIFERENCIA\s*MOVILIZACION\s*\$\s*([\d.,]+)/i;
    const regexDiferenciaColacion = /DIFERENCIA\s*COLACION\s*\$\s*([\d.,]+)/i;

    if (!archivo || !jornadaSeleccionada) {
      alert('Por favor, selecciona una jornada y un archivo PDF.');
      return;
  }

  const factorObj = listaHoraExtra.find(item => item.horas === jornadaSeleccionada);
if (!factorObj) {
    alert('No se encontró el factor de horas extras para esta jornada.');
    return;
}
const factor = factorObj.factor;

const pdfData = await archivo.arrayBuffer();
const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

let textoCompleto = '';
for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const texto = await pagina.getTextContent();
    texto.items.forEach(item => textoCompleto += item.str + ' ');
}

const regexFecha = /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b) de (\d{4})/i;
const matchFecha = textoCompleto.match(regexFecha);

let mes = "No encontrado";
let año = "No encontrado";
if (matchFecha) {
    mes = matchFecha[1].toUpperCase();
    año = parseInt(matchFecha[2]);
}

    const regexCargo = /FECHA\s*INGRESO\s*(.*?)(?=\s*[\r\n]|$)/i;
    const matchCargo = textoCompleto.match(regexCargo);

    let cargo = "No encontrado";
    if (matchCargo) {
        cargo = matchCargo[1].trim();
    }
    const cargoEncontrado = listaCargos.find(c => cargo.includes(c));
    if (cargoEncontrado) {
        cargo = cargoEncontrado;
    }

    const regexSueldoBaseContractual = /SUELDO\s*BASE.*?\$\s*(\d[\d.]*)/i;
    const matchSueldoBaseContractual = textoCompleto.match(regexSueldoBaseContractual);

    let sueldoBaseContractual = null;
    if (matchSueldoBaseContractual) {
        sueldoBaseContractual = parseFloat(matchSueldoBaseContractual[1].replace('.', '').replace(',', '.'));
    }

    const regexSueldoBaseProporcional = /SUELDO\s*BASE\s*\((\d+)\)\s*\$\s*(\d[\d.]*)/i;
    const matchSueldoBaseProporcional = textoCompleto.match(regexSueldoBaseProporcional);

    let diasTrabajados = null;
    let sueldoProporcional = null;
    let resultadoProporcional = '';

    if (matchSueldoBaseProporcional && sueldoBaseContractual) {
        diasTrabajados = parseInt(matchSueldoBaseProporcional[1]);
        sueldoProporcional = parseFloat(matchSueldoBaseProporcional[2].replace('.', '').replace(',', '.'));

        const diasDelMes = 30;
        const sueldoEsperado = (sueldoBaseContractual / diasDelMes) * diasTrabajados;

        if (Math.abs(sueldoEsperado - sueldoProporcional) < 1) {
            resultadoProporcional = `<span style="color: green;">✅ Cálculo correcto</span>`;
        } else {
            resultadoProporcional = `<span style="color: red;">❌ Discrepancia detectada: Se esperaba $${sueldoEsperado.toFixed(2)}</span>`;
        }
    }

    let jornadaMaxima = 45;
    if (año > 2024 || (año === 2024 && mes === "MAYO")) {
        jornadaMaxima = 44;
    }

    const inm = ingresosMinimos[año] && ingresosMinimos[año][mes.toUpperCase()] ? ingresosMinimos[año][mes.toUpperCase()] : 0;

    let inmProporcional = inm;

    if (jornadaSeleccionada <= 30) {
        inmProporcional = (inm / jornadaMaxima) * jornadaSeleccionada;
    }

    let variacionPorcentual = 0;
    let mensajeVariacion = '';
    if (sueldoBaseContractual > inmProporcional) {


    variacionPorcentual = ((sueldoBaseContractual - inmProporcional) / inmProporcional) * 100;
    mensajeVariacion = `✅ Es un ${variacionPorcentual.toFixed(2)}% mayor que el IMM `;
    } else if (sueldoBaseContractual === inmProporcional) {


      mensajeVariacion = `Es igual al IMM `;
    } else {

      variacionPorcentual = ((inmProporcional - sueldoBaseContractual) / inmProporcional) * 100;
      mensajeVariacion = `❌ Es ${variacionPorcentual.toFixed(2)}% inferior al IMM `;
    }

    // ----- HORAS EXTRAS 50% -----
    let resultadoHorasExtras = '';
    const regexHorasExtras = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtras = textoCompleto.match(regexHorasExtras);

    let horasExtrasRealizadas = "No especificadas";
    let montoPagadoHorasExtras = "No encontrado";
    let montoEsperadoHorasExtras = null;

    if (matchHorasExtras) {
        horasExtrasRealizadas = matchHorasExtras[1].replace(',', '.'); // Extrae las horas (con coma decimal)
        montoPagadoHorasExtras = parseFloat(
            matchHorasExtras[2].replace('.', '').replace(',', '.')
        ); // Extrae el monto
    }

    if (horasExtrasRealizadas === "No especificadas" || montoPagadoHorasExtras === "No encontrado") {
        resultadoHorasExtras = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        montoEsperadoHorasExtras = sueldoBaseContractual * factor * parseFloat(horasExtrasRealizadas);
        const diferenciaHorasExtras = montoPagadoHorasExtras - montoEsperadoHorasExtras;
        resultadoHorasExtras = Math.abs(diferenciaHorasExtras) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaHorasExtras.toFixed(2)}</span>`;
    }

    // ----- HORAS EXTRAS DOMINGO -----
    let resultadoHorasExtrasDomingo = '';
    const regexHorasExtrasDomingo = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtrasDomingo = textoCompleto.match(regexHorasExtrasDomingo);

    let horasExtrasDomingoRealizadas = "No especificadas";
    let montoPagadoHorasExtrasDomingo = "No encontrado";
    let montoEsperadoHorasExtrasDomingo = null;

    if (matchHorasExtrasDomingo) {
        // Convertimos las horas a número (ya con punto decimal)
        horasExtrasDomingoRealizadas = parseFloat(matchHorasExtrasDomingo[1].replace(',', '.'));
        montoPagadoHorasExtrasDomingo = parseFloat(
            matchHorasExtrasDomingo[2].replace('.', '').replace(',', '.')
        );
    }

    if (horasExtrasDomingoRealizadas === "No especificadas" || montoPagadoHorasExtrasDomingo === "No encontrado") {
        resultadoHorasExtrasDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada);
        const valorHoraRecargoDomingo = valorHoraNormal * 1.3;
        const horaExtraDomingo = valorHoraRecargoDomingo * 1.5;
        montoEsperadoHorasExtrasDomingo = horaExtraDomingo * horasExtrasDomingoRealizadas;
        const diferenciaHorasExtrasDomingo = montoPagadoHorasExtrasDomingo - montoEsperadoHorasExtrasDomingo;
        resultadoHorasExtrasDomingo = Math.abs(diferenciaHorasExtrasDomingo) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaHorasExtrasDomingo.toFixed(2)}</span>`;
    }

    // ----- RECARGO DOMINGO -----
    let resultadoRecargoDomingo = '';
    const regexRecargoDomingo = /HORAS\s*RECARGO\s*DOMINGO\s*\((\d+[\.,]?\d*)\)\s*\$\s*([\d.,]+)/i;
    const matchRecargoDomingo = textoCompleto.match(regexRecargoDomingo);

    let horasRecargoDomingo = "No especificadas";
    let montoPagadoRecargoDomingo = "No encontrado";
    let montoEsperadoRecargoDomingo = null;

    if (matchRecargoDomingo) {
        horasRecargoDomingo = matchRecargoDomingo[1].replace(',', '.');
        montoPagadoRecargoDomingo = parseFloat(
            matchRecargoDomingo[2].replace('.', '').replace(',', '.')
        );
    } else {
        // Se intenta extraer el monto sin las horas
        const regexRecargoDomingoSinHoras = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i;
        const matchRecargoDomingoSinHoras = textoCompleto.match(regexRecargoDomingoSinHoras);
        if (matchRecargoDomingoSinHoras) {
            montoPagadoRecargoDomingo = parseFloat(
                matchRecargoDomingoSinHoras[1].replace('.', '').replace(',', '.')
            );
            horasRecargoDomingo = "⛔ No tiene el tiempo realizado";
        }
    }

    // Se decide el mensaje a mostrar para el recargo domingo:
    if (montoPagadoRecargoDomingo === "No encontrado" && horasRecargoDomingo === "No especificadas") {
        resultadoRecargoDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else if (horasRecargoDomingo === "⛔ No tiene el tiempo realizado") {
        // Si falta el tiempo realizado, se muestra solo el mensaje sin detalles adicionales.
        resultadoRecargoDomingo = `<span style="color: red;">❌ Falta el tiempo realizado.</span>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada);
        const valorHoraRecargoDomingo = valorHoraNormal * 0.3;
        montoEsperadoRecargoDomingo = valorHoraRecargoDomingo * parseFloat(horasRecargoDomingo);
        const diferenciaRecargoDomingo = montoPagadoRecargoDomingo - montoEsperadoRecargoDomingo;
        resultadoRecargoDomingo = Math.abs(diferenciaRecargoDomingo) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaRecargoDomingo.toFixed(2)}</span>`;
    }

    // ----- RECARGO FESTIVO 50% -----
    let resultadoRecargoFestivo = '';
    const regexRecargoFestivo = /RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchRecargoFestivo = textoCompleto.match(regexRecargoFestivo);

    let horasRecargoFestivoRealizadas = "No especificadas";
    let montoPagadoRecargoFestivo = "No encontrado";
    let montoEsperadoRecargoFestivo = null;

    if (matchRecargoFestivo) {
        horasRecargoFestivoRealizadas = matchRecargoFestivo[1].replace(',', '.');
        montoPagadoRecargoFestivo = parseFloat(
            matchRecargoFestivo[2].replace(/\./g, '').replace(',', '.')
        );
    }

    if (horasRecargoFestivoRealizadas === "No especificadas" || montoPagadoRecargoFestivo === "No encontrado") {
        resultadoRecargoFestivo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada);
        const valorHoraRecargoFestivo = valorHoraNormal * 1.5;
        montoEsperadoRecargoFestivo = valorHoraRecargoFestivo * parseFloat(horasRecargoFestivoRealizadas);
        const diferenciaRecargoFestivo = montoPagadoRecargoFestivo - montoEsperadoRecargoFestivo;
        resultadoRecargoFestivo = Math.abs(diferenciaRecargoFestivo) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaRecargoFestivo.toFixed(2)}</span>`;
    }

    const matchMovilizacion = textoCompleto.match(regexMovilizacion);
    let diasMovilizacion = 21;
    let montoMovilizacion = "Dato no encontrado";
    let valorDiaMovilizacion = 0;

    if (matchMovilizacion) {
        diasMovilizacion = parseInt(matchMovilizacion[1]);
        montoMovilizacion = parseFloat(matchMovilizacion[2].replace('.', '').replace(',', '.'));
        if (diasMovilizacion > 0) {
            valorDiaMovilizacion = montoMovilizacion / diasMovilizacion;
        }
    }

    const matchDiferenciaMovilizacion = textoCompleto.match(regexDiferenciaMovilizacion);
    let montoDiferenciaMovilizacion = 0;
    let diasDiferenciaMovilizacion = 0;
    let diasTotalesMovilizacion = diasMovilizacion;

    if (matchDiferenciaMovilizacion) {
        montoDiferenciaMovilizacion = parseFloat(matchDiferenciaMovilizacion[1].replace('.', '').replace(',', '.'));
          if (valorDiaMovilizacion > 0) {
            diasDiferenciaMovilizacion = montoDiferenciaMovilizacion / valorDiaMovilizacion;
            diasTotalesMovilizacion += diasDiferenciaMovilizacion;
        }
    }

    const matchColacion = textoCompleto.match(regexColacion);
    let diasColacion = 21;
    let montoColacion = "Dato no encontrado";
    let valorDiaColacion = 0;
    if (matchColacion) {
        diasColacion = parseInt(matchColacion[1]);
        montoColacion = parseFloat(matchColacion[2].replace('.', '').replace(',', '.'));
        if (diasColacion > 0) {
            valorDiaColacion = montoColacion / diasColacion;
        }
    }

    const matchDiferenciaColacion = textoCompleto.match(regexDiferenciaColacion);
    let montoDiferenciaColacion = 0;
    let diasDiferenciaColacion = 0;
    let diasTotalesColacion = diasColacion;
    if (matchDiferenciaColacion) {
        montoDiferenciaColacion = parseFloat(matchDiferenciaColacion[1].replace('.', '').replace(',', '.'));
              if (valorDiaColacion > 0) {
            diasDiferenciaColacion = montoDiferenciaColacion / valorDiaColacion;
            diasTotalesColacion += diasDiferenciaColacion;
        }
    }

let totalComisiones = 0;
const detallesComisiones = [];

const comisionesSeparadas = {
    "CONCURSO FPAY": 0,
    "DIF CONCURSO FPAY": 0
};

listaComision.forEach(comision => {
    const regex = new RegExp(`${comision.replace('.', '\\.')}(?:\\s|\\S)*?\\$\\s*([\\d.,]+)`, 'gi');
    const matches = [...textoCompleto.matchAll(regex)];

    matches.forEach(match => {
        const monto = parseFloat(match[1].replace('.', '').replace(',', '.'));

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

if (comisionesSeparadas["CONCURSO FPAY"] > 0) {
    detallesComisiones.push({ item: "CONCURSO FPAY", monto: comisionesSeparadas["CONCURSO FPAY"] });
    totalComisiones += comisionesSeparadas["CONCURSO FPAY"];
}

if (comisionesSeparadas["DIF CONCURSO FPAY"] > 0) {
    detallesComisiones.push({ item: "DIF CONCURSO FPAY", monto: comisionesSeparadas["DIF CONCURSO FPAY"] });
    totalComisiones += comisionesSeparadas["DIF CONCURSO FPAY"];
}

let detalleComisionesHTML = detallesComisiones.map(comision =>
    `<li>${comision.item}: ${formatCurrency(comision.monto)}</li>`
).join('');


if (detallesComisiones.length === 0) {
    detalleComisionesHTML = '<li>⛔ No tiene comisiones individuales.</li>';
}

    const regexSemanaCorrida = /SEMANA\s*CORRIDA\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const matchSemanaCorrida = textoCompleto.match(regexSemanaCorrida);

    let montoSemanaCorrida = 0;
    let valorEsperadoSemanaCorrida = 0;
    let resultadoSemanaCorrida = '';
    let diasSemanaCorrida = "No especificados";

    if (matchSemanaCorrida) {
        diasSemanaCorrida = parseInt(matchSemanaCorrida[1]);
        montoSemanaCorrida = parseFloat(matchSemanaCorrida[2].replace('.', '').replace(',', '.'));
    } else {
        montoSemanaCorrida = 0;
    }
    let diasParaSemanaCorrida = diasTotalesMovilizacion;

    if (diasParaSemanaCorrida > 23) {
        let mejorValor = 21;
        let menorDiscrepancia = Infinity;

        const valorEsperado21 = (totalComisiones / 21) * diasSemanaCorrida;
        const discrepancia21 = Math.abs(valorEsperado21 - montoSemanaCorrida);
        const valorEsperado22 = (totalComisiones / 22) * diasSemanaCorrida;
        const discrepancia22 = Math.abs(valorEsperado22 - montoSemanaCorrida);
        const valorEsperado23 = (totalComisiones / 23) * diasSemanaCorrida;
        const discrepancia23 = Math.abs(valorEsperado23 - montoSemanaCorrida);

        if (discrepancia22 < discrepancia21 && discrepancia22 < discrepancia23) {
            diasParaSemanaCorrida = 22;
        } else if (discrepancia23 < discrepancia21 && discrepancia23 < discrepancia22) {
            diasParaSemanaCorrida = 23;
        } else {
            diasParaSemanaCorrida = 21;
        }
    }

    if (diasSemanaCorrida !== "No especificados" && diasParaSemanaCorrida > 0 && totalComisiones > 0) {
        const valorDiarioComisiones = totalComisiones / diasParaSemanaCorrida;
        valorEsperadoSemanaCorrida = (valorDiarioComisiones * diasSemanaCorrida).toFixed(2);
        const diferenciaSemanaCorrida = valorEsperadoSemanaCorrida - montoSemanaCorrida;
        resultadoSemanaCorrida = Math.abs(diferenciaSemanaCorrida) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: Se esperaba ${formatCurrency(valorEsperadoSemanaCorrida)}. Diferencia: ${formatCurrency(diferenciaSemanaCorrida)}.</span>`;
    } else {
        resultadoSemanaCorrida = `<span style="color: orange;">⛔ Datos insuficientes para calcular la semana corrida.</span>`;
    }

    function procesarMonto(montoTexto) {
        return parseFloat(montoTexto.replace(/\./g, '').replace(',', '.'));
    }

    //*************************** gratificacion ***************************

        function identificarGratificables(texto) {
            let gratificablesEncontrados = [];
            let textoRestante = texto.replace(/\s+/g, ' ').trim();

            textoRestante = textoRestante.replace(/[^\x20-\x7E]/g, ' ');

            listaGratificables.forEach(item => {
                const regex = new RegExp(`${item.replace(/\s+/g, '\\s*')}\\s*(?:\\(\\d+\\))?\\s*\\$\\s*([\\d.,]+)`, 'i');
                const match = textoRestante.match(regex);

                if (match) {
                    gratificablesEncontrados.push({
                        item: item,
                        monto: procesarMonto(match[1])
                    });

                    textoRestante = textoRestante.replace(new RegExp(match[0].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), '').trim();
                }
            });

            return gratificablesEncontrados;
        }

        function calcularTotalGratificacion(gratificables) {
            return gratificables.reduce((total, item) => total + item.monto, 0);
        }

        function mostrarGratificacionMec(gratificables) {
            const gratificacionContainer = document.getElementById('gratificacionMec');

            if (gratificacionContainer.style.display === 'block') {
                return;
            }

            const listaGratificablesHTML = gratificables
                .filter(gratificable => gratificable.monto > 0) // Filtra los ítems con monto > 0
                .map(gratificable => {
                    return `<li><strong>${gratificable.item}:</strong> ${mostrarValor(gratificable.monto)}</li>`;
                }).join('');

            const totalGratificacion = calcularTotalGratificacion(gratificables);
            const valoresConsolidados = [
                sueldoProporcional || 0,
                montoPagadoHorasExtras || 0,
                montoPagadoHorasExtrasDomingo || 0,
                montoPagadoRecargoDomingo || 0,
                montoPagadoRecargoFestivo || 0,
                totalComisiones || 0,
                valorEsperadoSemanaCorrida || 0
            ];

            const valorTotalGratificacion = valoresConsolidados.reduce((total, valor) => total + (parseFloat(valor) || 0), totalGratificacion);

            calcularGratificacion(gratificables, textoCompleto, jornadaSeleccionada, mes, año, valorTotalGratificacion);

            const datosCalculadosHTML = `
                <ul>
                    ${[
                        { label: 'Sueldo Base', value: sueldoProporcional },
                        { label: 'Hrs. Extras', value: montoPagadoHorasExtras },
                        { label: 'Hrs. Extras Domingo', value: montoPagadoHorasExtrasDomingo },
                        { label: 'Hrs. Recargo Domingo', value: montoPagadoRecargoDomingo },
                        { label: 'Recargo 50% Festivo', value: montoPagadoRecargoFestivo },
                        { label: 'Suma Comisiones', value: totalComisiones },
                        { label: 'Semana Corrida', value: valorEsperadoSemanaCorrida > 0 ? valorEsperadoSemanaCorrida : 'No disponible' }
                    ]
                    .filter(item => item.value > 0) // Filtra ítems con valor > 0
                    .map(item => `<li><strong>${item.label}:</strong> ${mostrarValor(item.value)}</li>`).join('')}
                </ul>
            `;

            const gratificablesHTML = `
                <ul>
                    ${listaGratificablesHTML}
                </ul>
            `;

            const valorTotalHTML = `
                <p><strong>SUMA TOTAL HABERES: ${mostrarValor(valorTotalGratificacion)}</strong></p>
            `;

            const gratificacionHTML = datosCalculadosHTML + gratificablesHTML + valorTotalHTML;
            if (document.getElementById('listaGratificables').innerHTML !== gratificacionHTML) {
                document.getElementById('listaGratificables').innerHTML = gratificacionHTML;
            }

            document.getElementById('gratificacionMec').style.display = 'block';
        }


        function mostrarValor(valor) {
            return isNaN(valor) || valor === null ? '$0' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
        }

        const gratificables = identificarGratificables(textoCompleto);

        function obtenerJornadaMaxima(mes, año) {
            const meses = {
                ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
                JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
            };
            const mesIndex = meses[mes.toUpperCase()] || 0;

            if (año > 2024 || (año === 2024 && mesIndex >= 5)) {
                return 44;
            }

            return 45;
        }

        function calcularGratificacion(gratificables, textoCompleto, jornadaSeleccionada, mes, año, valorTotalGratificacion) {

            const meses = {
                ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
                JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
            };

            const inm = ingresosMinimos[año]?.[mes.toUpperCase()] || 0;
            if (inm === 0) {
                console.error("IMM no disponible para este mes y año.");
                return;
            }

            const mesIndex = meses[mes.toUpperCase()];
            if (!mesIndex) {
                console.error("Mes inválido.");
                return;
            }

            let jornadaMaxima = 45;
            if (año > 2024 || (año === 2024 && mesIndex >= 5)) {
                jornadaMaxima = 44;
            }

            const resultadoCalculado = valorTotalGratificacion * 0.25;
            const topeGratificacion = (4.75 * inm) / 12;
            const topeProporcional = (topeGratificacion / jornadaMaxima) * jornadaSeleccionada;
            const topeCalculado = jornadaSeleccionada > 30 ? resultadoCalculado : topeProporcional;
            const valorAPagar = Math.round(Math.min(topeCalculado, topeGratificacion));
            const topeGratificacionRedondeado = Math.round(topeGratificacion);
            const topeProporcionalRedondeado = Math.round(topeProporcional);
            const regexGratificacionPDF = /GRATIFICACION\s*25%\s*C\.T\.\s*\$\s*([\d.,]+)/i;
            const matchGratificacionPDF = textoCompleto.match(regexGratificacionPDF);
            const gratificacionPDF = matchGratificacionPDF ? parseFloat(matchGratificacionPDF[1].replace(/\./g, '').replace(',', '.')) : 0;

            let comparacionHTML = "";
            const diferencia = gratificacionPDF - valorAPagar;
            if (Math.abs(diferencia) < 0.001) {
                comparacionHTML = `<span style="color: green;">✅ Pago Correcto: ${formatCurrency(valorAPagar)}</span>`;
            } else {
                comparacionHTML = `<span style="color: red;">❌ Discrepancia de ${formatCurrency(diferencia)}</span>`;
            }

            const resultadoHTML = `
                <h2>7. Cálculo de Gratificación</h2>
                <p><strong>25% de la Suma Total Haberes:</strong> ${formatCurrency(resultadoCalculado)}</p>
                <ul><em><p><strong>IMM Vigente utilizado:</strong> ${formatCurrency(inm)}</p>
                <p><strong>Jornada Máxima Vigente:</strong> ${jornadaMaxima} horas</p>
                <p><strong>Tope Mensual (4.75 x IMM / 12):</strong> ${formatCurrency(topeGratificacionRedondeado)}</p>
                <p><strong>Tope Proporcional:</strong> ${formatCurrency(topeProporcionalRedondeado)}</p></em></ul>
                <p><strong>Monto Calculado a Pagar:</strong> ${formatCurrency(valorAPagar)}</p>
                <p><strong>Extraído del PDF:</strong> ${formatCurrency(gratificacionPDF)}</p>
                <p><strong>Comparación:</strong> ${comparacionHTML}</p>
            `;
            document.getElementById('resultadoGratificacion').innerHTML = resultadoHTML;
        }

    // ===== Mostrar resultados en HTML =====
    document.getElementById('resultadoAnalisis').innerHTML = `
<hr>
        <p><strong>Mes y Año: </strong> ${mes} DE ${año}. <strong>
        <p>Jornada: </strong> ${jornadaSeleccionada} horas.</p>
        <p><strong>Cargo:</strong> ${cargo}</p>
<hr>
        <h2>1. Sueldo</h2>
        <p><strong>Sueldo Base:</strong> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'}.</p>
        <p><strong>Días Trabajados:</strong> ${diasTrabajados || 'No encontrados'}. <strong>Pagado:</strong> ${sueldoProporcional ? formatCurrency(sueldoProporcional) : 'No encontrado'}.</p>
        <p><strong>Resultado Sueldo Base:</strong> ${resultadoProporcional}.</p>
        <p><em>Cálculo:</em> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'} ÷ 30 días × ${diasTrabajados} días = ${sueldoBaseContractual ? formatCurrency((sueldoBaseContractual / 30) * diasTrabajados) : 'No encontrado'}.</p>
        <p><strong>% Sueldo Base Contractual v/s IMM:</strong></p><p> ${mensajeVariacion}</p>
<hr>
<h2>2. Sobretiempo:</h2>
<p><strong>Hrs. Extras:</strong> ${resultadoHorasExtras}</p>
${resultadoHorasExtras.indexOf("No se realizaron") !== -1 ? '' :
    `<p><em>Pagado:</em> ${montoPagadoHorasExtras !== "No encontrado" ? formatCurrency(montoPagadoHorasExtras) : 'No encontrado'}, Calculado: ${horasExtrasRealizadas !== "No especificadas" ? formatCurrency(montoEsperadoHorasExtras) : 'No encontrado'}.</p>`
}
<p><strong>Recargo 50% Festivo:</strong> ${resultadoRecargoFestivo}</p>
${resultadoRecargoFestivo.indexOf("No se realizaron") !== -1 ? '' :
    `<p><em>Pagado:</em> ${montoPagadoRecargoFestivo !== "No encontrado" ? formatCurrency(montoPagadoRecargoFestivo) : 'No encontrado'}, Calculado: ${horasRecargoFestivoRealizadas !== "No especificadas" ? formatCurrency(montoEsperadoRecargoFestivo) : 'No encontrado'}.</p>`
}
<p><strong>Hrs. Extras Domingo:</strong> ${resultadoHorasExtrasDomingo}</p>
${resultadoHorasExtrasDomingo.indexOf("No se realizaron") !== -1 ? '' :
    `<p><em>Pagado:</em> ${montoPagadoHorasExtrasDomingo !== "No encontrado" ? formatCurrency(montoPagadoHorasExtrasDomingo) : 'No encontrado'}, Calculado: ${horasExtrasDomingoRealizadas !== "No especificadas" ? formatCurrency(montoEsperadoHorasExtrasDomingo) : 'No encontrado'}.</p>`
}
<p><strong>Hrs. Recargo Domingo:</strong> ${resultadoRecargoDomingo}</p>
${resultadoRecargoDomingo.indexOf("No se realizaron") !== -1 ? '' :
    `<p><em>Pagado:</em> ${montoPagadoRecargoDomingo !== "No encontrado" ? formatCurrency(montoPagadoRecargoDomingo) : 'No encontrado'}, Calculado: ${horasRecargoDomingo !== "No especificadas" ? formatCurrency(montoEsperadoRecargoDomingo) : 'No encontrado'}.</p>`
}
<hr>
<h2>3. Asignación:</h2>
<p><strong>Movilización:</strong> Días: ${diasMovilizacion}, Monto: ${montoMovilizacion !== "No encontrado" ? formatCurrency(montoMovilizacion) : 'No encontrado'}.</p>
${montoDiferenciaMovilizacion !== 0 ? `<p><strong>Dif. Movilización:</strong> ${montoDiferenciaMovilizacion !== "No encontrado" ? formatCurrency(montoDiferenciaMovilizacion) : 'No encontrado'}.</p>` : ''}
<p><strong>Días Totales:</strong> ${diasTotalesMovilizacion.toFixed(2)}</p>
<p><strong>Colación:</strong> Días: ${diasColacion}, Monto: ${montoColacion !== "No encontrado" ? formatCurrency(montoColacion) : 'No encontrado'}.</p>
${montoDiferenciaColacion !== 0 ? `<p><strong>Dif. Colación:</strong> ${montoDiferenciaColacion !== "No encontrado" ? formatCurrency(montoDiferenciaColacion) : 'No encontrado'}.</p>` : ''}
<p><strong>Días Totales:</strong> ${diasTotalesColacion.toFixed(2)}</p>
<hr>
        <h2>4. Comisiones</h2>
        <ul>${detalleComisionesHTML}</ul>
        <p><strong>Total Comisiones:</strong> ${formatCurrency(totalComisiones)}</p>
<hr>
        <h2>5. Semana Corrida</h2>
        <p><strong>Domingos y Festivos:</strong> (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'} días) <strong>Monto:</strong> ${formatCurrency(montoSemanaCorrida)}.</p>
        <p><strong>Resultado:</strong> ${resultadoSemanaCorrida}</p>
        <p>${formatCurrency(totalComisiones)} ÷ Días Totales: (${diasParaSemanaCorrida}) × Dom. y Fest.: (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}) = ${formatCurrency(valorEsperadoSemanaCorrida)}.</p>
<hr>
        <div class="container gratificacion-container" id="gratificacionMec" style="display: none;">
        <h2>6. Haberes Gratificables</h2>
        <ul id="listaGratificables"></ul>
        </div>
<hr>
  `;
  mostrarGratificacionMec(gratificables);
}

// **************** Función de cálculo de vacaciones ****************
document.addEventListener("DOMContentLoaded", function () {
    const vacacionesBtn = document.getElementById("vacacionesBtn");
    const volverBtn = document.getElementById("volverBtn");
    const refrescarBtn = document.getElementById("refrescarBtn"); // Obtener el botón de refrescar

    if (vacacionesBtn) {
        vacacionesBtn.addEventListener("click", () => {
            document.getElementById("menu-principal").style.display = "none";
            document.getElementById("pantalla-vacaciones").style.display = "block";
        });
    }

    if (volverBtn) {
        volverBtn.addEventListener("click", () => {
            document.getElementById("pantalla-vacaciones").style.display = "none";
            document.getElementById("menu-principal").style.display = "block";
        });
    }

    // Función para refrescar los datos
    if (refrescarBtn) {
        refrescarBtn.addEventListener("click", () => {
            // Limpiar los archivos seleccionados
            const vacacionInput = document.getElementById("vacacionInput");
            const resultadoVacaciones = document.getElementById("resultadoVacaciones");

            // Borrar archivos seleccionados
            if (vacacionInput) {
                vacacionInput.value = ""; // Limpiar el campo de archivos
            }

            // Borrar resultados previos
            if (resultadoVacaciones) {
                resultadoVacaciones.innerHTML = ""; // Limpiar resultados previos
            }
        });
    }
});

function formatearMonto(monto) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto);
}

function procesarMonto(textoMonto) {
    return parseFloat(textoMonto.replace(/\./g, '').replace(',', '.'));
}

async function extraerTextoDePDF(archivo) {
    const pdfData = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    let textoCompleto = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const pagina = await pdf.getPage(i);
        const texto = await pagina.getTextContent();
        texto.items.forEach(item => textoCompleto += item.str + ' ');
    }
    return textoCompleto;
}

// Lista de comisiones
const listaComisionVacaciones = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA", "COMI. KIOSCO OTRAS EMPRESAS",
    "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA", "COMPENSACION PERMISO", "DIF CONCURSO FPAY",
    "PROMOCIONES CMR", "COMISION CONNECT", "SEMANA CORRIDA", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD", "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO",
    "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", "PREMIO CUMPL.GRUPAL NPS",
    "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.",
    "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD", "DIFERENCIA SEMANA CORRIDA", "BONO CERTIFICACION", "DIF. COMISIONES"
];

function extraerItemsDePDF(texto) {
    let items = [];
    listaComisionVacaciones.forEach(item => {
        // Convertir el nombre del ítem en una expresión segura para regex
        let itemRegex = item.replace(/([.+*?^${}()|\[\]\/\\])/g, "\\$1");
        // Nueva expresión regular mejorada
        const regex = new RegExp(`${itemRegex}(?:\\s*\\(\\d+\\))?\\s*\\$\\s*([0-9]+(?:\.[0-9]{3})*)`, "i");
        const resultado = texto.match(regex);
        if (resultado) {
            items.push({ nombre: item, monto: procesarMonto(resultado[1]) });
        }
    });
    return items;
}

// Función para obtener días trabajados
function obtenerDiasTrabajados(texto) {
    const regex = /SUELDO BASE.*?\((\d+)\)/i;
    const resultado = texto.match(regex);
    return resultado ? parseInt(resultado[1], 10) : 0;
}

// Obtener comisión de vacaciones
function obtenerComisionVacaciones(texto) {
    const regex = /COMISION VACACIONES.*?\((\d+)\)\s*\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/i;
    const resultado = texto.match(regex);
    if (resultado) {
        return {
            dias: parseInt(resultado[1], 10),
            monto: procesarMonto(resultado[2])
        };
    }
    return null;
}

// Obtener el mes y año del texto
function obtenerMesYAnio(texto) {
    const regex = /\b([A-Za-z]+)\s+de\s+(\d{4})\b/i;
    const resultado = texto.match(regex);
    return resultado ? `${resultado[1].toUpperCase()} de ${resultado[2]}` : 'Fecha no encontrada';
}

// Obtener tres PDFs previos válidos
function obtenerTresPDFsValidos(datos, mesAnioEvaluado) {
    const tresPrevios = datos.filter(pdf => pdf.dias >= 29 && !pdf.comisionVacaciones && esAnteriorAlMes(pdf.mesAnio, mesAnioEvaluado));
    if (tresPrevios.length < 3) {
        return { error: true, mensaje: 'No hay suficientes PDFs válidos para realizar el cálculo.' };
    }
    return { error: false, tresPrevios: tresPrevios.slice(-3) };
}

// Compara si un mes y año es anterior a otro
function esAnteriorAlMes(mesAnio1, mesAnio2) {
    const [mes1, anio1] = mesAnio1.split(' de ');
    const [mes2, anio2] = mesAnio2.split(' de ');
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    if (anio1 < anio2) return true;
    if (anio1 === anio2 && meses.indexOf(mes1) < meses.indexOf(mes2)) return true;
    return false;
}

// Calcular vacaciones
document.getElementById('calcularVacacionesBtn').addEventListener('click', async () => {
    const archivos = document.getElementById('vacacionInput').files;
    const resultadoDiv = document.getElementById('resultadoVacaciones');
    resultadoDiv.innerHTML = '';

    if (archivos.length < 4 || archivos.length > 7) {
        resultadoDiv.innerHTML = '<p style="color: red;">Por favor, sube entre 4 y 7 archivos PDF.</p>';
        return;
    }

    const datos = [];
    const pdfsConComisionVacaciones = [];

    for (let archivo of archivos) {
        const texto = await extraerTextoDePDF(archivo);
        const diasTrabajados = obtenerDiasTrabajados(texto);
        const mesAnio = obtenerMesYAnio(texto);
        const comisionVacaciones = obtenerComisionVacaciones(texto);
        const items = extraerItemsDePDF(texto);

        datos.push({ nombre: archivo.name, dias: diasTrabajados, mesAnio, comisionVacaciones, items });

        if (comisionVacaciones) {
            pdfsConComisionVacaciones.push({ nombre: archivo.name, comisionVacaciones, mesAnio });
        }
    }

    if (pdfsConComisionVacaciones.length > 1) {
        const opcionesValidas = pdfsConComisionVacaciones.filter(pdf => {
            const resultado = obtenerTresPDFsValidos(datos, pdf.mesAnio);
            return !resultado.error;
        });

        if (opcionesValidas.length > 0) {
            const opciones = opcionesValidas.map((pdf, idx) => `<button class="opcion" data-index="${idx}">${pdf.nombre} (${pdf.mesAnio})</button>`).join('');
            resultadoDiv.innerHTML = `<h3>Selecciona un PDF con 'COMISION VACACIONES':</h3>${opciones}`;

            document.querySelectorAll('.opcion').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = btn.dataset.index;
                    realizarCalculo(datos, opcionesValidas[index]);
                });
            });
        } else {
            resultadoDiv.innerHTML = '<p style="color: red;">No hay PDFs con "COMISION VACACIONES" que cumplan con 3 PDFs anteriores válidos.</p>';
        }
    } else if (pdfsConComisionVacaciones.length === 1) {
        realizarCalculo(datos, pdfsConComisionVacaciones[0]);
    } else {
        resultadoDiv.innerHTML = '<p style="color: red;">No se encontraron PDFs con "COMISION VACACIONES".</p>';
    }
});

// Realizar el cálculo de vacaciones
function realizarCalculo(datos, pdfSeleccionado) {
    const resultadoDiv = document.getElementById('resultadoVacaciones');
    const resultado = obtenerTresPDFsValidos(datos, pdfSeleccionado.mesAnio);
    if (resultado.error) {
        resultadoDiv.innerHTML = `<p style="color: red;">${resultado.mensaje}</p>`;
        return;
    }

    const tresPrevios = resultado.tresPrevios;
    const totalItems = tresPrevios.reduce((acc, pdf) => acc + pdf.items.reduce((sum, item) => sum + item.monto, 0), 0);
    const promedioVacaciones = (totalItems / 3) / 30 * pdfSeleccionado.comisionVacaciones.dias;
    const diferencia = promedioVacaciones - pdfSeleccionado.comisionVacaciones.monto;

    resultadoDiv.innerHTML =
        `<h3>Resumen de Cálculo de Vacaciones:</h3>
        <p>PDF seleccionado para cálculo: ${pdfSeleccionado.nombre} (${pdfSeleccionado.mesAnio})</p>
        <p>Promedio de Vacaciones (por 3 PDFs previos): ${formatearMonto(promedioVacaciones)}</p>
        <p>Comisión Vacaciones en el PDF seleccionado: ${formatearMonto(pdfSeleccionado.comisionVacaciones.monto)}</p>
        <p>Diferencia: ${formatearMonto(diferencia)}</p>`;
}

// ****************** Funcion Finiquito ****************
document.addEventListener("DOMContentLoaded", function () {
    // Función para mostrar la pantalla correcta
    function mostrarPantalla(idPantalla) {
        document.querySelectorAll(".pantalla").forEach(pantalla => {
            pantalla.style.display = "none";
        });

        const pantallaSeleccionada = document.getElementById(idPantalla);
        if (pantallaSeleccionada) {
            pantallaSeleccionada.style.display = "block";
        }
    }

    // Configurar la navegación para los botones con "data-target"
    document.querySelectorAll("[data-target]").forEach(boton => {
        boton.addEventListener("click", function () {
            const pantallaObjetivo = boton.getAttribute("data-target");
            mostrarPantalla(pantallaObjetivo);
        });
    });

    // Obtener elementos del DOM
    const btnCalcularFiniquito = document.getElementById("calcularFiniquito");
    const inputDiasTrabajados = document.getElementById("diasTrabajados");
    const inputPDFs = document.getElementById("fileFiniquito");
    const resultadosFiniquito = document.getElementById("resultadosFiniquito");

    // Evento para el botón de cálculo
    btnCalcularFiniquito.addEventListener("click", async function () {
        // Obtener años de servicio desde el select (entre 1 y 11 años)
        const añosTrabajados = parseInt(document.getElementById("añosTrabajados").value) || 0;
        const diasVacacionesPendientes = parseInt(inputDiasTrabajados.value) || 0;

        // Verificar si hay 3 PDFs
        if (inputPDFs.files.length !== 3) {
            alert("Debes subir exactamente 3 archivos PDF con las últimas liquidaciones de sueldo.");
            return;
        }

        // Calcular sueldo promedio a partir de los totales haberes y los items no finiquito
        const sueldoMensual = await calcularSueldoPromedio(inputPDFs.files);
        if (!sueldoMensual) {
            alert("No se pudo extraer el sueldo promedio. Verifica que los PDFs sean correctos.");
            return;
        }

        // Calcular finiquito
        const resultado = calcularFiniquito(sueldoMensual, añosTrabajados, diasVacacionesPendientes);

        // Mostrar resultados en la pantalla de finiquito, redondeando los valores
        resultadosFiniquito.innerHTML = `
            <p><strong>Sueldo Promedio:</strong> $${Math.round(sueldoMensual).toLocaleString()}</p>
            <p><strong>Indemnización por años de servicio:</strong> $${Math.round(resultado.indemnizacion).toLocaleString()}</p>
            <p><strong>Pago por vacaciones:</strong> $${Math.round(resultado.pagoVacaciones).toLocaleString()}</p>
            <p><strong>Pago por aviso previo:</strong> $${Math.round(resultado.pagoAviso).toLocaleString()}</p>
            <p><strong>Total Finiquito:</strong> <span style="color: green;">$${Math.round(resultado.totalFiniquito).toLocaleString()}</span></p>
        `;

        // Extraer ítems no finiquito para mostrarlos
        const itemsNoFiniquito = await extraerItemsNoFiniquito(inputPDFs.files);
        mostrarResultadosNoFiniquito(itemsNoFiniquito);

        resultadosFiniquito.classList.remove("hidden");
    });

    // Función para calcular el finiquito
    function calcularFiniquito(sueldoMensual, añosTrabajados, diasVacacionesPendientes) {
        // Indemnización por años de servicio: sueldo promedio * años trabajados
        let indemnizacion = sueldoMensual * añosTrabajados;
        // Pago por vacaciones: sueldo promedio dividido en 30 (valor día) * días pendientes
        let pagoVacaciones = (sueldoMensual / 30) * diasVacacionesPendientes;
        // Pago por aviso previo: igual al sueldo promedio
        let pagoAviso = sueldoMensual;

        let totalFiniquito = indemnizacion + pagoVacaciones + pagoAviso;

        return {
            indemnizacion,
            pagoVacaciones,
            pagoAviso,
            totalFiniquito
        };
    }

    // Función para leer los PDFs y calcular el sueldo promedio
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

        // Extraer la sumatoria de items no finiquito
        const noFiniquitoResult = await extraerItemsNoFiniquito(files);
        let totalNoFiniquito = noFiniquitoResult.noFiniquitoTotal;

        // Calcular sueldo promedio
        let sueldoPromedio = Math.round((sumTotalHaberes - totalNoFiniquito) / 3);
        return sueldoPromedio;
    }

    // Función para extraer el valor de "TOTAL HABERES" de un PDF
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
                        // Buscar el item "TOTAL HABERES" y extraer su valor
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

    // Función para extraer ítems no finiquito de los PDFs
    async function extraerItemsNoFiniquito(files) {
        const itemsNoFiniquito = [
            "BONO VACACIONES", "HORAS EXTRAS 50 %", "AGUINALDO NAVIDAD","AGUIN FIESTAS PATRIAS", "ASIG. FAMILIAR", "QUINQUENIO",
            "CANASTA DE MERCADERIA", "RELIQUIDACION DE GRATIFICACI", "BONO DICIEMBRE", "BONO FIESTAS", "ESCOLARIDAD",
            "BENEFICIO MATRIMONIO","DIF. AGUINALDO","BONO PRONTO ACUERDO","HORAS EXTRAS DOMINGO","ESC. SUPERIOR","ESC. BASICA"
        ];

        let resultadosPDF = [];
        let noFiniquitoTotal = 0;
        let acumuladoGlobal = {};

        for (const file of files) {
            const textoPDF = await extraerTextoDePDF(file);
            let itemsPDF = {};
            let noFiniquitoPDF = 0;

            itemsNoFiniquito.forEach(item => {
                // Expresión regular mejorada para ignorar valores entre paréntesis
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

    // Función para extraer texto de un PDF usando PDF.js
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

    // Función para mostrar los resultados de los ítems no finiquito con el nuevo estilo
    function mostrarResultadosNoFiniquito(items) {
        const resultadosDiv = document.getElementById("resultadosNoFiniquito");
        let contenidoHTML = "<h4 style='font-size: 20px; margin-bottom: 6px;'>Valores Excluidos:</h4><hr>"; // Título más pequeño

        items.resultadosPDF.forEach(result => {
            contenidoHTML += `<p style="margin: 8px;"><strong>${result.fileName}:</strong></p>`; // Espaciado reducido
            Object.entries(result.items).forEach(([item, valor]) => {
                contenidoHTML += `<p style="margin: 8px;">${item}: $${Math.round(valor).toLocaleString()}</p>`; // Redondeando el valor
            });
        });

        contenidoHTML += `<h5 style="font-size: 18px; margin-top: 12px;">Total excluidos: $${Math.round(items.noFiniquitoTotal).toLocaleString()}</h5>`; // Redondeando el total
        resultadosDiv.innerHTML = contenidoHTML;
    }
});

// Función para salir
function salirAplicacion() {
    alert("Cerrando la aplicación...");
    window.location.reload();
}

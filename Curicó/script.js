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

// Función para mostrar una pantalla específica (modificada para cumplir con todos los requisitos)
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

// Mostrar la pantalla de Recursos Útiles
function mostrarPantallaRecursos() {
    mostrarPantalla('pantalla-recursos');
}

// Función para volver al menú principal desde cualquier pantalla
function volverAlMenu() {
    mostrarPantalla('menu-principal');
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
      document.getElementById('fechaInicioContrato').value = '';  // Limpiar fecha inicio contrato
      document.getElementById('fechaDesvinculacion').value = '';  // Limpiar fecha desvinculación
      document.getElementById('diasVacacionesPendientes').value = ''; // Limpiar días de vacaciones pendientes
      document.getElementById('diasTrabajadosUltimoMes').value = ''; // Limpiar días trabajados del último mes
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
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "BONO PUNTUALIDAD AUT.", "BONO VACACIONES",
    "COMISION VACACIONES", "DIF BONO CUMPLIMIENTO DE HP.", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "DIF. SB MES ANTERIOR", "DIF. SUELDO BASE", "DIF.HORAS EXTRAS ", "QUINQUENIO", "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD",
    "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO", "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT",
    "PREMIO CUMPL.GRUPAL NPS", "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA",
    "PREMIO VENTA TIENDA AUT.", "PROMEDIOS VARIOS", "PROMOCIONES CMR", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD",
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

            // Determinación de la jornada máxima vigente
            let jornadaMaxima = 45;
            if (año > 2024 || (año === 2024 && mesIndex >= 5)) {
                jornadaMaxima = 44;
            }

            // Cálculo base: 25% de la Suma Total Haberes
            const resultadoCalculado = valorTotalGratificacion * 0.25;

            // Cálculo del tope mensual
            const topeGratificacion = (4.75 * inm) / 12;
            // Cálculo del tope proporcional según la jornada seleccionada
            const topeProporcional = (topeGratificacion / jornadaMaxima) * jornadaSeleccionada;

            let valorAPagar;
            // Para jornadas mayores a 30, se utiliza el tope mensual
            if (jornadaSeleccionada > 30) {
                valorAPagar = Math.round(Math.min(resultadoCalculado, topeGratificacion));
            } else {
                // Para jornadas menores o iguales a 30, se utiliza el tope proporcional
                valorAPagar = Math.round(Math.min(resultadoCalculado, topeProporcional));
            }

            const topeGratificacionRedondeado = Math.round(topeGratificacion);
            const topeProporcionalRedondeado = Math.round(topeProporcional);
            const regexGratificacionPDF = /GRATIFICACION\s*25%\s*C\.T\.\s*\$\s*([\d.,]+)/i;
            const matchGratificacionPDF = textoCompleto.match(regexGratificacionPDF);
            const gratificacionPDF = matchGratificacionPDF
                ? parseFloat(matchGratificacionPDF[1].replace(/\./g, '').replace(',', '.'))
                : 0;

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
                <p>
                    <em>
                        <p><strong>IMM Vigente utilizado:</strong> ${formatCurrency(inm)}</p>
                        <p><strong>Jornada Máxima Vigente:</strong> ${jornadaMaxima} horas</p>
                        <p><strong>Tope Mensual (4.75 x IMM / 12):</strong> ${formatCurrency(topeGratificacionRedondeado)}</p>
                        <p><strong>Tope Proporcional:</strong> ${formatCurrency(topeProporcionalRedondeado)}</p>
                    </em>
                </p>
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
        <p>${detalleComisionesHTML}</p>
        <p><strong>Total Comisiones:</strong> ${formatCurrency(totalComisiones)}</p>
<hr>
        <h2>5. Semana Corrida</h2>
        <p><strong>Domingos y Festivos:</strong> (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'} días) <strong>Monto:</strong> ${formatCurrency(montoSemanaCorrida)}.</p>
        <p><strong>Resultado:</strong> ${resultadoSemanaCorrida}</p>
        <p>${formatCurrency(totalComisiones)} ÷ Días Totales: (${diasParaSemanaCorrida}) × Dom. y Fest.: (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}) = ${formatCurrency(valorEsperadoSemanaCorrida)}.</p>
<hr>
        <div class="container gratificacion-container" id="gratificacionMec" style="display: none;">
        <h2>6. Haberes Gratificables</h2>
        <p id="listaGratificables"></p>
        </div>
<hr>
  `;
  mostrarGratificacionMec(gratificables);
}

// **************** Función de cálculo de vacaciones ****************
document.addEventListener("DOMContentLoaded", function () {
    const vacacionesBtn = document.getElementById("vacacionesBtn");
    const volverBtn = document.getElementById("volverBtn");
    const refrescarBtn = document.getElementById("refrescarBtnVacaciones"); // Nota: Usamos el ID específico para Vacaciones

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

    if (refrescarBtn) {
        refrescarBtn.addEventListener("click", () => {
            const vacacionInput = document.getElementById("vacacionInput");
            const resultadoVacaciones = document.getElementById("resultadoVacaciones");
            if (vacacionInput) { vacacionInput.value = ""; }
            if (resultadoVacaciones) { resultadoVacaciones.innerHTML = ""; }
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

// Lista de comisiones (se incluye "COMISION VACACIONES")
const listaComisionVacaciones = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA", "COMI. KIOSCO OTRAS EMPRESAS",
    "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA", "COMPENSACION PERMISO", "DIF CONCURSO FPAY",
    "PROMOCIONES CMR", "COMISION CONNECT", "SEMANA CORRIDA", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD", "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO",
    "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", "PREMIO CUMPL.GRUPAL NPS",
    "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.",
    "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD", "DIFERENCIA SEMANA CORRIDA", "BONO CERTIFICACION", "DIF. COMISIONES",
    "COMISION VACACIONES"
];

function extraerItemsDePDF(texto) {
    let items = [];
    listaComisionVacaciones.forEach(item => {
        let itemRegex = item.replace(/([.+*?^${}()|\[\]\/\\])/g, "\\$1");
        const regex = new RegExp(`${itemRegex}(?:\\s*\\(\\d+\\))?\\s*\\$\\s*([0-9]+(?:\.[0-9]{3})*)`, "i");
        const resultado = texto.match(regex);
        if (resultado) {
            items.push({ nombre: item, monto: procesarMonto(resultado[1]) });
        }
    });
    return items;
}

// Función para obtener días trabajados (se espera 30 para liquidaciones válidas)
function obtenerDiasTrabajados(texto) {
    const regex = /SUELDO BASE.*?\((\d+)\)/i;
    const resultado = texto.match(regex);
    return resultado ? parseInt(resultado[1], 10) : 0;
}

// Obtener comisión de vacaciones del PDF evaluado
function obtenerComisionVacaciones(texto) {
    const regex = /COMISION VACACIONES\s*\(?(\d+)\)?\s*\$\s*([\d.]+)/i;
    const resultado = texto.match(regex);
    if (resultado) {
        return {
            dias: parseInt(resultado[1], 10),
            monto: procesarMonto(resultado[2])
        };
    }
    return null;
}

// Obtener el mes y año del texto (ej: "JULIO de 2023")
function obtenerMesYAnio(texto) {
    const regex = /\b([A-Za-z]+)\s+de\s+(\d{4})\b/i;
    const resultado = texto.match(regex);
    return resultado ? `${resultado[1].toUpperCase()} de ${resultado[2]}` : 'Fecha no encontrada';
}


// ----- Funciones para selección de liquidaciones (promedio) -----

// Determina si mesAnioAnterior es el mes inmediatamente anterior a mesAnioPosterior.
function esMesConsecutivo(mesAnioAnterior, mesAnioPosterior) {
    if (!mesAnioAnterior || !mesAnioPosterior) {
        return false;  // Retorna false si algún mes o año no está definido
    }

    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const [mesA, anioA] = mesAnioAnterior.split(' de ');
    const [mesB, anioB] = mesAnioPosterior.split(' de ');

    const idxA = meses.indexOf(mesA.toUpperCase());
    const idxB = meses.indexOf(mesB.toUpperCase());

    const yearA = parseInt(anioA, 10);
    const yearB = parseInt(anioB, 10);

    if (yearB === yearA && idxB === idxA + 1) return true;
    if (yearB === yearA + 1 && idxA === 11 && idxB === 0) return true;
    return false;
}

// Selecciona 3 liquidaciones para el promedio siguiendo las reglas:
// - Se descarta el PDF evaluado.
// - Solo se consideran liquidaciones con 30 días trabajados.
// - Se intenta seleccionar 3 liquidaciones NO consecutivas al PDF evaluado.
// - Si no se logra, se notifica la necesidad de una liquidación adicional.
// Ajustar la función 'seleccionarLiquidacionesParaPromedio' para evitar errores de acceso a propiedades no definidas
function seleccionarLiquidacionesParaPromedio(datos, pdfSeleccionado) {
    // Excluir el PDF evaluado y solo considerar liquidaciones de 30 días
    let candidatos = datos.filter(pdf => pdf.nombre !== pdfSeleccionado.nombre && pdf.dias === 30);

    // Ordenar cronológicamente de más antiguo a más reciente
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    candidatos.sort((a, b) => {
        const [mesA, anioA] = a.mesAnio ? a.mesAnio.split(' de ') : ['', ''];
        const [mesB, anioB] = b.mesAnio ? b.mesAnio.split(' de ') : ['', ''];
        const yearA = parseInt(anioA, 10);
        const yearB = parseInt(anioB, 10);
        const idxA = meses.indexOf(mesA.toUpperCase());
        const idxB = meses.indexOf(mesB.toUpperCase());

        // Verificar que mesA y mesB son válidos antes de comparar
        if (idxA === -1 || idxB === -1) return 0;  // Si algún mes no es válido, no ordenar

        return (yearA === yearB) ? (idxA - idxB) : (yearA - yearB);
    });

    // Filtrar solo PDFs anteriores al evaluado
    candidatos = candidatos.filter(pdf => {
        const [mesCandidato, anioCandidato] = pdf.mesAnio ? pdf.mesAnio.split(' de ') : ['', ''];
        const [mesEvaluado, anioEvaluado] = pdfSeleccionado.mesAnio.split(' de ');

        const idxCandidato = meses.indexOf(mesCandidato.toUpperCase());
        const idxEvaluado = meses.indexOf(mesEvaluado.toUpperCase());

        const yearCandidato = parseInt(anioCandidato, 10);
        const yearEvaluado = parseInt(anioEvaluado, 10);

        return (yearCandidato < yearEvaluado) || (yearCandidato === yearEvaluado && idxCandidato < idxEvaluado);
    });

    // Buscar si hay PDFs con "COMISION VACACIONES"
    let pdfsConComision = candidatos.filter(pdf => pdf.items.some(item => item.nombre === "COMISION VACACIONES"));

    // Si los meses seleccionados son consecutivos, no incluir PDFs con "COMISION VACACIONES"
    let consecutivos = esMesConsecutivo(candidatos[candidatos.length - 3]?.mesAnio, candidatos[candidatos.length - 2]?.mesAnio) &&
                       esMesConsecutivo(candidatos[candidatos.length - 2]?.mesAnio, candidatos[candidatos.length - 1]?.mesAnio);

    if (consecutivos) {
        // Si son consecutivos, no incluir PDFs con "COMISION VACACIONES"
        candidatos = candidatos.filter(pdf => !pdfsConComision.includes(pdf));
    }

    // Si no son consecutivos, incluir PDFs con "COMISION VACACIONES" solo si no son posteriores al mes evaluado
    pdfsConComision = pdfsConComision.filter(pdf => {
        const [mesCandidato, anioCandidato] = pdf.mesAnio.split(' de ');
        const [mesEvaluado, anioEvaluado] = pdfSeleccionado.mesAnio.split(' de ');
        const idxCandidato = meses.indexOf(mesCandidato.toUpperCase());
        const idxEvaluado = meses.indexOf(mesEvaluado.toUpperCase());
        // Incluir solo si es anterior o igual al mes evaluado
        return (parseInt(anioCandidato) < parseInt(anioEvaluado)) ||
               (parseInt(anioCandidato) === parseInt(anioEvaluado) && idxCandidato <= idxEvaluado);
    });

    // Agregar PDFs con "COMISION VACACIONES" si no son posteriores
    candidatos.push(...pdfsConComision);

    // Si hay al menos 3 candidatos, devolverlos
    if (candidatos.length >= 3) {
        return { error: false, seleccion: candidatos.slice(-3) };
    }

    return { error: true, mensaje: "No hay suficientes liquidaciones válidas para el cálculo." };
}


// Ajuste en la función 'calcularVacaciones' para manejar la lógica de selección de liquidaciones con "COMISIÓN VACACIONES"
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

    // Procesar cada PDF subido
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

    // Ordenar PDFs con "COMISIÓN VACACIONES" cronológicamente
    pdfsConComisionVacaciones.sort((a, b) => {
        const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
        const [mesA, anioA] = a.mesAnio.split(' de ');
        const [mesB, anioB] = b.mesAnio.split(' de ');

        const idxA = meses.indexOf(mesA.toUpperCase()), idxB = meses.indexOf(mesB.toUpperCase());
        return (parseInt(anioA) - parseInt(anioB)) || (idxA - idxB);
    });

    // Si hay PDFs consecutivos con "COMISIÓN VACACIONES", ambos deben usar el mismo cálculo
    for (let i = 0; i < pdfsConComisionVacaciones.length - 1; i++) {
        if (esMesConsecutivo(pdfsConComisionVacaciones[i].mesAnio, pdfsConComisionVacaciones[i + 1].mesAnio)) {
            const seleccion = seleccionarLiquidacionesParaPromedio(datos, pdfsConComisionVacaciones[i]);
            if (!seleccion.error) {
                realizarCalculo(datos, pdfsConComisionVacaciones[i], seleccion.seleccion);
                realizarCalculo(datos, pdfsConComisionVacaciones[i + 1], seleccion.seleccion);
                return;
            }
        }
    }

    // Si solo hay un PDF con "COMISIÓN VACACIONES", hacer el cálculo normal
    if (pdfsConComisionVacaciones.length === 1) {
        realizarCalculo(datos, pdfsConComisionVacaciones[0]);
    } else if (pdfsConComisionVacaciones.length > 1) {
        const opcionesValidas = pdfsConComisionVacaciones.filter(pdf => {
            const seleccion = seleccionarLiquidacionesParaPromedio(datos, pdf);
            return !seleccion.error;
        });

        if (opcionesValidas.length > 0) {
            const opciones = opcionesValidas.map((pdf, idx) =>
                `<button class="opcion" data-index="${idx}">${pdf.mesAnio}</button>`).join('');
            resultadoDiv.innerHTML = `<hr><strong>Elige un período con 'Comisión Vacaciones':</strong><hr> ${opciones}`;

            document.querySelectorAll('.opcion').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = btn.dataset.index;
                    realizarCalculo(datos, opcionesValidas[index]);
                });
            });
        } else {
            resultadoDiv.innerHTML = '<p style="color: red;">No hay PDFs con "COMISIÓN VACACIONES" que cumplan las reglas para el cálculo.</p>';
        }
    } else {
        resultadoDiv.innerHTML = '<p style="color: red;">No se encontraron PDFs con "COMISIÓN VACACIONES".</p>';
    }
});


// Función que realiza el cálculo usando la liquidación evaluada y las 3 para promedio
function realizarCalculo(datos, pdfSeleccionado, seleccion) {
    const resultadoDiv = document.getElementById('resultadoVacaciones');
    const seleccionResult = seleccion || seleccionarLiquidacionesParaPromedio(datos, pdfSeleccionado).seleccion;

    if (!seleccionResult) {
        resultadoDiv.innerHTML = `<p style="color: red;">No hay suficientes liquidaciones válidas para el cálculo.</p>`;
        return;
    }

    // Calcular el total de haberes en las liquidaciones seleccionadas
    const totalItems = seleccionResult.reduce((acc, pdf) =>
        acc + pdf.items.reduce((sum, item) => sum + item.monto, 0)
    , 0);

    // Calcular el promedio diario
    const promedioVacaciones = (totalItems / 3) / 30 * pdfSeleccionado.comisionVacaciones.dias;
    const diferencia = promedioVacaciones - pdfSeleccionado.comisionVacaciones.monto;

    resultadoDiv.innerHTML +=
        `<h3>Cálculo de Vacaciones:</h3>
        <p>Mes evaluado: ${pdfSeleccionado.mesAnio}</p>
        <p>Liquidaciones usadas para promedio: ${seleccionResult.map(pdf => pdf.mesAnio).join(', ')}</p>
        <p>Comisión calculada: ${formatearMonto(promedioVacaciones)}</p>
        <p>Comisión pagada: ${formatearMonto(pdfSeleccionado.comisionVacaciones.monto)}</p>
        <p>Diferencia: ${formatearMonto(diferencia)}</p>`;
}

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
      <p><strong>Sueldo Promedio:</strong> $${Math.round(sueldoMensual).toLocaleString()}</p>
      <p><strong>Años de Servicio:</strong> ${añosTrabajados}</p>
      <hr>
      <p>Vacaciones Pendientes: ${diasVacPendientes} días</p>
      <p>Vacaciones Proporcionales: ${diasVacProp} días</p>
      <p>Suma Vacaciones (días hábiles): ${totalDiasVacHabil} días</p>
      <p>Total Vacaciones (días Corridos): ${diasVacCorridos} días</p>
      <p><strong>Monto Vacaciones (días Corridos):</strong> $${Math.round(valorVacacionesPagadas).toLocaleString()}</p>
      <hr>
      <p><strong>Monto Días Trabajados:</strong> $${Math.round(montoDiasTrabajadosUltimoMes).toLocaleString()} (${diasTrabajadosUltimoMes} días)</p>
      <p><strong>Indemnización por Años:</strong> $${Math.round(resultado.indemnizacion).toLocaleString()}</p>
      <p><strong>Pago por Vacaciones:</strong> $${Math.round(pagoPorVacaciones).toLocaleString()}</p> <!-- Ahora muestra el valor correcto -->
      <p><strong>Pago por Aviso Previo:</strong> $${Math.round(resultado.pagoAviso).toLocaleString()}</p>
      <p><strong>Total Finiquito:</strong> <span style="color: green;">$${Math.round(totalFiniquito).toLocaleString()}</span></p> <!-- Aquí se calcula correctamente -->
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
        contenidoHTML += `<p style="margin: 8px;">${item}: $${Math.round(valor).toLocaleString()}</p>`;
      });
    });
    contenidoHTML += `<h5 style="font-size: 18px; margin-top: 12px;">Total excluidos: $${Math.round(items.noFiniquitoTotal).toLocaleString()}</h5>`;
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

// Función para salir con confirmación
function salirAplicacion() {
    // Mostrar cuadro de confirmación
    const confirmacion = confirm("¿Desea salir de la aplicación?");

    // Si el usuario confirma, se recarga la página o se redirige
    if (confirmacion) {
        alert("Cerrando la aplicación...");
        window.location.href = "https://www.google.cl"; // Redirige a Google, o puedes poner la URL que prefieras
    }
}

// **************** archivo sindical ********************
document.addEventListener("DOMContentLoaded", function () {

    // Lista de claves de acceso por sindicato
    const clavesAcceso = {
        Concepcion: "135scc",
        Costanera: "257scc",
        Curico: "351scc",
        Iquique: "456sic",
        PlazaNorte: "555spn",
        PuertoMontt: "660spm",
        Rancagua: "736srm",
        Trebol: "845stm"
    };

    // Documentos específicos de cada sindicato (ruta y nombre de archivo)
    const documentosSindicato = {
        Concepcion: [
            { nombre: "Contrato Colectivo Concepción", url: "sindicato1/contrato.pdf" },
            { nombre: "Estatuto Sindicato Concepción", url: "sindicato1/estatuto.docx" }
        ],
        Costanera: [
            { nombre: "Contrato Colectivo Costanera", url: "sindicato2/contrato.pdf" },
            { nombre: "Estatuto Sindicato Costanera", url: "sindicato2/estatuto.pdf" }
        ],
        Curico: [
            { nombre: "Contrato Colectivo Curicó 2023", url: "Curicó/Contrato Colectivo STFC 2023.pdf" },
            { nombre: "Estatuto Sindicato Curicó 2022", url: "Curicó/ESTATUTOS VIGENTE CURICO 2022.pdf" },
            { nombre: "Ingreso y Costo Sindicato", url: "Curicó/INGRESO Y COSTO SINDICATO.xlsm" },
            { nombre: "Listado STFC", url: "Curicó/Listado STFC.xlsx" }
        ],
        Iquique: [
            { nombre: "Contrato Colectivo Iquique", url: "sindicato4/contrato.pdf" },
            { nombre: "Estatuto Sindicato Iquique", url: "sindicato4/estatuto.pdf" }
        ],
        PlazaNorte: [
            { nombre: "Contrato Colectivo 2023 Plaza Norte", url: "Plaza Norte/Contrato Colectivo 2023 PLAZA NORTE.pdf" },
            { nombre: "Estatuto Sindicato Plaza Norte", url: "sindicato5/estatuto.pdf" }
        ],
        PuertoMontt: [
            { nombre: "Contrato Colectivo 2021 Puerto Montt", url: "Puerto Montt/Puerto Montt 2021.pdf" },
            { nombre: "Estatuto Sindicato Puerto Montt", url: "sindicato6/estatuto.pdf" }
        ],
        Rancagua: [
            { nombre: "Contrato Colectivo 2022 Rancagua", url: "Rancagua/Rancagua 2022.pdf" },
            { nombre: "Estatuto Sindicato Rancagua", url: "sindicato7/estatuto.pdf" }
        ],
        Trebol: [
            { nombre: "Contrato Colectivo Trebol 2023", url: "Trebol/Contrato Colectivo TREBOL 2023.pdf" },
            { nombre: "Estatuto Sindicato Trebol", url: "sindicato8/estatuto.pdf" }
        ]
    };

    // Documentos públicos, accesibles para todos los sindicatos autenticados
    const documentosPublicos = [
        { nombre: "Estatutos Federación 2019", url: "Documento Público General/Estatutos Federación 2019.pdf" },
        { nombre: "Proyecto Estatutos Federacion 2025", url: "Documento Público General/estatutos federacion 2025.pdf" },
        { nombre: "Contactos Canal de Integridad", url: "Documento Público General/Contactos Canal de Integridad.pdf" }
    ];

    // Variable para almacenar el sindicato seleccionado
    let sindicatoSeleccionado = "";

    // Función para mostrar una pantalla y ocultar las demás
    function mostrarPantalla(idPantalla) {
        const pantallas = document.querySelectorAll(".pantalla");
        pantallas.forEach(p => p.style.display = "none");
        const pantalla = document.getElementById(idPantalla);
        if (pantalla) {
            pantalla.style.display = "block";
        }

        if (idPantalla === "pantalla-archivosindical" || idPantalla === "menu-principal") {
            // Limpiar la selección de sindicato al regresar al menú
            const selectSindicato = document.getElementById("select-sindicato");
            if (selectSindicato) selectSindicato.value = "";  // Limpiar el select

            // Limpiar cualquier mensaje de error
            const mensajeError = document.getElementById("mensaje-error");
            if (mensajeError) mensajeError.style.display = "none";

            // Limpiar los documentos previamente mostrados
            const listaDocumentos = document.getElementById("lista-documentos-sindicato");
            if (listaDocumentos) listaDocumentos.innerHTML = "";

            const listaPublicos = document.getElementById("lista-documentos-publicos");
            if (listaPublicos) listaPublicos.innerHTML = "";

            // Limpiar el nombre del sindicato
            const nombreSindicato = document.getElementById("nombre-sindicato");
            if (nombreSindicato) nombreSindicato.textContent = "";

            // Restablecer la variable de sindicato seleccionado
            sindicatoSeleccionado = "";
        }
    }

    // Función para mostrar el modal de clave
    function mostrarClaveInput() {
        // Obtén el sindicato seleccionado
        sindicatoSeleccionado = document.getElementById("select-sindicato").value;
        const modalClave = document.getElementById("modal-clave");

        if (sindicatoSeleccionado) {
            // Si hay un sindicato seleccionado, muestra el modal de clave
            document.getElementById("clave-input").value = ""; // Limpia el campo de la clave
            document.getElementById("mensaje-error").style.display = "none"; // Oculta el mensaje de error
            modalClave.classList.remove("oculto");
        } else {
            // Si no se seleccionó un sindicato, oculta el modal
            modalClave.classList.add("oculto");
        }
    }

    // Función para verificar la clave ingresada de manera simple (sin servidor)
    function verificarClave() {
        const claveIngresada = document.getElementById("clave-input").value;
        const sindicatoSeleccionado = document.getElementById("select-sindicato").value;

        // Compara la clave ingresada con la almacenada en el objeto clavesAcceso
        if (claveIngresada === clavesAcceso[sindicatoSeleccionado]) {
            // Si coincide, muestra los documentos y luego limpia la selección
            mostrarDocumentos(sindicatoSeleccionado);
        } else {
            // Si no, muestra mensaje de error
            const mensajeError = document.getElementById("mensaje-error");
            if (mensajeError) {
                mensajeError.innerText = "Clave incorrecta. Inténtalo de nuevo.";
                mensajeError.style.display = "block";
            }
        }
    }

    // Función para mostrar la pantalla de documentos para el sindicato autenticado
    function mostrarDocumentos(sindicato) {
        const nombreSindicato = document.getElementById("nombre-sindicato");
        if (nombreSindicato) nombreSindicato.textContent = "Sindicato de " + sindicato;

        const listaSindicato = document.getElementById("lista-documentos-sindicato");
        if (listaSindicato) listaSindicato.innerHTML = ""; // Limpiar cualquier contenido previo

        const docsSindicato = documentosSindicato[sindicato] || [];
        docsSindicato.forEach(doc => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${doc.url}" target="_blank">${doc.nombre}</a>`;
            listaSindicato.appendChild(li);
        });

        const listaPublicos = document.getElementById("lista-documentos-publicos");
        if (listaPublicos) listaPublicos.innerHTML = "";

        documentosPublicos.forEach(doc => {
            const li = document.createElement("li");
            li.innerHTML = `<a href="${doc.url}" target="_blank">${doc.nombre}</a>`;
            listaPublicos.appendChild(li);
        });

        // Limpiar el campo de clave y el select
        document.getElementById("clave-input").value = "";
        document.getElementById("select-sindicato").value = "";

        cerrarModalClave(); // Limpia y oculta el modal de clave

        mostrarPantalla("pantalla-documentos");
    }

    // Función para cerrar el modal de clave
    function cerrarModalClave() {
        const modalClave = document.getElementById("modal-clave");
        if (modalClave) modalClave.classList.add("oculto");
        const claveInput = document.getElementById("clave-input");
        if (claveInput) claveInput.value = "";
        const mensajeError = document.getElementById("mensaje-error");
        if (mensajeError) mensajeError.style.display = "none";
    }

    // Asignar las funciones al objeto global 'window'
    window.mostrarClaveInput = mostrarClaveInput;
    window.verificarClave = verificarClave;
    window.cerrarModalClave = cerrarModalClave;

    // Enlazar las funciones a los botones del DOM
    document.getElementById("select-sindicato").addEventListener("change", mostrarClaveInput);
    document.getElementById("ingresarBtn").addEventListener("click", verificarClave);
    document.getElementById("resetContador").addEventListener("click", () => {
        window.location.reload();
    });
});

function actualizarFechaHora() {
    const fechaHoraElement = document.getElementById('fecha-hora');
    const ahora = new Date();

    const opcionesFecha = { year: 'numeric', month: 'long', day: 'numeric' };
    const opcionesHora = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const fecha = ahora.toLocaleDateString('es-ES', opcionesFecha);
    const hora = ahora.toLocaleTimeString('es-ES', opcionesHora);
    fechaHoraElement.textContent = `${fecha} ${hora}`;
}

setInterval(actualizarFechaHora, 10);

document.addEventListener("DOMContentLoaded", function () {
    const contadorVisitasElement = document.getElementById("contador-visitas");
    const resetButton = document.getElementById("reset-button");

    let visitas = localStorage.getItem("contadorVisitas");
    visitas = visitas ? parseInt(visitas) : 0;

    visitas++;
    localStorage.setItem("contadorVisitas", visitas);

    contadorVisitasElement.textContent = `Visitante n°: ${visitas}`;

    resetButton.addEventListener("click", function () {
        localStorage.setItem("contadorVisitas", 0);
        contadorVisitasElement.textContent = `Visita n°: 0`;
    });
});

const codigoCorrecto = "fthf1999";
document.getElementById('ingresarBtn').addEventListener('click', () => {
    const codigoIngresado = document.getElementById('codigoAcceso').value;

    if (codigoIngresado === codigoCorrecto) {
        document.getElementById('login-container').style.display = 'none';
        document.querySelector('.main-container').style.display = 'block';
    } else {
        document.getElementById('mensajeError').style.display = 'block';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.main-container').style.display = 'none';
});

const ingresosMinimos = {
    2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 320500, "OCTUBRE": 320500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
    2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
    2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
    2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
    2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 }
};

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


const listaCargos = [
    "ASESOR DE CLIENTES", "ASESOR DE COMPRAS", "ASESOR DE MARCA", "ASESOR DE MARCA ETAM",
    "ASISTENTE DE DISPLAY", "ASISTENTE DE VISUAL", "CAJERA(O) - EMPAQUE", "CONSULTOR DE PERFUMERIA",
    "COORDINADORA DE VENTAS", "GUARDIA", "OPERADOR DE CCTV", "TRAINEE TIENDA","VENDEDOR JORNADA PARCIAL MAÑANA",
    "VENDEDOR", "VENDEDOR JORNADA PARCIAL","ASISTENTE DE BODEGA", "ASISTENTE DE PROBADORES"
];

const listaComision = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA",
    "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA",
    "COMPENSACION PERMISO","DIF CONCURSO FPAY","PROMOCIONES CMR","COMISION CONNECT"
];

const listaGratificables = [
    "APERTURA CTA CTE", "BONO ASISTENCIA AUT.", "BONO CERTIFICACION", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "BONO PRONTO ACUERDO", "BONO PUNTUALIDAD AUT.", "BONO VACACIONES",
    "COMISION VACACIONES", "DIF BONO CUMPLIMIENTO DE HP.", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "DIF. SB MES ANTERIOR", "DIF. SUELDO BASE", "DIF.HORAS EXTRAS ", "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD",
    "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO", "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT",
    "PREMIO CUMPL.GRUPAL NPS", "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA",
    "PREMIO VENTA TIENDA AUT.", "PROMEDIOS VARIOS", "PROMOCIONES CMR", "QUIEBRE DE STOCK", "QUINQUENIO","HORAS RECARGO NAVIDAD",
    "DIFERENCIA CONTINGENCIA","BONO ASISTENCIA","DIFERENCIA SEMANA CORRIDA","DIF. CONTING. MES ANTERIOR ","DIF.SUELDO BASE CONTINGENCIA",
    "DIFERENCIA 70%"
];

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

    let resultadoHorasExtras = '';
    const regexHorasExtras = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtras = textoCompleto.match(regexHorasExtras);

    let horasExtrasRealizadas = "No especificadas";
    let montoPagadoHorasExtras = "No encontrado";

    if (matchHorasExtras) {
        horasExtrasRealizadas = matchHorasExtras[1].replace(',', '.'); // Extrae las horas y maneja la coma como decimal
        montoPagadoHorasExtras = parseFloat(matchHorasExtras[2].replace('.', '').replace(',', '.')); // Extrae el monto, manejando comas y puntos
    }

    if (horasExtrasRealizadas === "No especificadas" || montoPagadoHorasExtras === "No encontrado") {
        resultadoHorasExtras = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const montoEsperadoHorasExtras = sueldoBaseContractual * factor * parseFloat(horasExtrasRealizadas);
        const diferenciaHorasExtras = montoPagadoHorasExtras - montoEsperadoHorasExtras;

        resultadoHorasExtras = Math.abs(diferenciaHorasExtras) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaHorasExtras.toFixed(2)}</span>`;
    }

    let resultadoHorasExtrasDomingo = '';
    const regexHorasExtrasDomingo = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtrasDomingo = textoCompleto.match(regexHorasExtrasDomingo);

    let horasExtrasDomingoRealizadas = "No especificadas";
    let montoPagadoHorasExtrasDomingo = "No encontrado";

    if (matchHorasExtrasDomingo) {
        horasExtrasDomingoRealizadas = parseFloat(matchHorasExtrasDomingo[1].replace(',', '.'));
        montoPagadoHorasExtrasDomingo = parseFloat(matchHorasExtrasDomingo[2].replace('.', '').replace(',', '.'));
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

    let resultadoRecargoDomingo = '';
    const regexRecargoDomingo = /HORAS\s*RECARGO\s*DOMINGO\s*\((\d+[\.,]?\d*)\)\s*\$\s*([\d.,]+)/i;
    const matchRecargoDomingo = textoCompleto.match(regexRecargoDomingo);

    let horasRecargoDomingo = "No especificadas";
    let montoPagadoRecargoDomingo = "No encontrado";
    let montoEsperadoRecargoDomingo = 0;

    if (matchRecargoDomingo) {
        horasRecargoDomingo = matchRecargoDomingo[1].replace(',', '.');
        montoPagadoRecargoDomingo = parseFloat(matchRecargoDomingo[2].replace('.', '').replace(',', '.'));
    } else {

        const regexRecargoDomingoSinHoras = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i;
        const matchRecargoDomingoSinHoras = textoCompleto.match(regexRecargoDomingoSinHoras);

        if (matchRecargoDomingoSinHoras) {
            montoPagadoRecargoDomingo = parseFloat(matchRecargoDomingoSinHoras[1].replace('.', '').replace(',', '.'));
            horasRecargoDomingo = "⛔ No tiene el tiempo realizado";
        }
    }


    if (montoPagadoRecargoDomingo === "No encontrado" && horasRecargoDomingo === "No especificadas") {
        resultadoRecargoDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else if (horasRecargoDomingo === "⛔ No tiene el tiempo realizado") {
        resultadoRecargoDomingo = `<span style="color: red;">❌ Falta el tiempo realizado</span>
        <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado: $0.</p>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada);
        const valorHoraRecargoDomingo = valorHoraNormal * 0.3;
        montoEsperadoRecargoDomingo = valorHoraRecargoDomingo * parseFloat(horasRecargoDomingo);
        const diferenciaRecargoDomingo = montoPagadoRecargoDomingo - montoEsperadoRecargoDomingo;
        if (Math.abs(diferenciaRecargoDomingo) < 1) {
            resultadoRecargoDomingo = `<span style="color: green;">✅ Cálculo correcto</span>
            <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado ${formatCurrency(montoEsperadoRecargoDomingo)}.</p>`;
        } else {
            resultadoRecargoDomingo = `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaRecargoDomingo.toFixed(2)}</span>
            <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado ${formatCurrency(montoEsperadoRecargoDomingo)}.</p>`;
        }
    }

    let resultadoRecargoFestivo = '';
    const regexRecargoFestivo = /RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchRecargoFestivo = textoCompleto.match(regexRecargoFestivo);
    let horasRecargoFestivoRealizadas = "No especificadas";
    let montoPagadoRecargoFestivo = "No encontrado";
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
        const montoEsperadoRecargoFestivo = valorHoraRecargoFestivo * parseFloat(horasRecargoFestivoRealizadas);
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

        const listaGratificablesHTML = gratificables.map(gratificable => {
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
                <li><strong>Sueldo Base:</strong> ${mostrarValor(sueldoProporcional)}</li>
                <li><strong>Hrs. Extras:</strong> ${mostrarValor(montoPagadoHorasExtras || 0)}</li>
                <li><strong>Hrs. Extras Domingo:</strong> ${mostrarValor(montoPagadoHorasExtrasDomingo || 0)}</li>
                <li><strong>Hrs. Recargo Domingo:</strong> ${mostrarValor(montoPagadoRecargoDomingo || 0)}</li>
                <li><strong>Recargo 50% Festivo:</strong> ${mostrarValor(montoPagadoRecargoFestivo || 0)}</li>
                <li><strong>Suma Comisiones:</strong> ${mostrarValor(totalComisiones)}</li>
                <li><strong>Semana Corrida:</strong> ${valorEsperadoSemanaCorrida > 0 ? mostrarValor(valorEsperadoSemanaCorrida) : 'No disponible'}</li>
            </ul>
        `;

        const gratificablesHTML = `
            <ul>
                ${listaGratificablesHTML}
            </ul>
        `;

        const valorTotalHTML = `
            <p><strong>_______ SUMA TOTAL HABERES GRATIFICACION: ${mostrarValor(valorTotalGratificacion)} _______</strong></p>
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

    window.imprimirResultados = function imprimirResultados() {
        const analisisMEC = document.querySelector('#resultado');
        const gratificacionMEC = document.querySelector('#gratificacionMec');
        const calculoGratificacion = document.querySelector('#resultadoGratificacion');

        const contenidoAnalisis = analisisMEC ? analisisMEC.innerHTML.trim() : '';
        const contenidoGratificacion = gratificacionMEC && gratificacionMEC.style.display !== 'none'
            ? gratificacionMEC.innerHTML.trim()
            : '<p>No hay datos disponibles en Gratificación MEC.</p>';
        const contenidoCalculoGratificacion = calculoGratificacion ? calculoGratificacion.innerHTML.trim() : '';

        let contenidoFinal = contenidoAnalisis;
        if (!contenidoFinal.includes('Haberes Gratificables') && contenidoGratificacion) {
            contenidoFinal += `</div>${contenidoGratificacion}`;
        }

        if (contenidoCalculoGratificacion) {
            contenidoFinal += `</div>${contenidoCalculoGratificacion}`;
        }

        if (!contenidoAnalisis || !contenidoGratificacion || !contenidoCalculoGratificacion) {
            alert('El contenido no está listo para imprimir. Por favor, verifica el análisis antes de imprimir.');
            return;
        }

        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(`
            <html>
            <head>
                <title>Impresión de Resultados</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        line-height: 1.8; /* Ajustar la separación entre líneas */
                    }
                    h2, h3 {
                        color: #4a90e2;
                    }
                    .page-break {
                        page-break-before: always; /* Forzar salto de página */
                    }
                    h2 {
                        margin-top: 0;
                    }
                    p {
                        margin: 0; /* Reducir margen de los párrafos */
                    }
                </style>
            </head>
            <body>
                ${contenidoFinal}
            </body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.print();
    };

    const gratificables = identificarGratificables(textoCompleto);

    document.getElementById('resultadoContenido').innerHTML = `
        <h2>Análisis MEC:</h2>
        <p><strong>Mes y Año:</strong> ${mes.toUpperCase()} DE ${año}. <strong>Jornada:</strong> ${jornadaSeleccionada} horas.</p>
        <p><strong>Cargo:</strong> ${cargo}</p>
        <p><strong>Sueldo Base:</strong> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'}.</p>
        <p><strong>Días Trabajados:</strong> ${diasTrabajados || 'No encontrados'}. <strong>Pagado:</strong> ${sueldoProporcional ? formatCurrency(sueldoProporcional) : 'No encontrado'}.</p>
        <p><strong>1.- Resultado Sueldo Base:</strong> ${resultadoProporcional}.</p>
        <p><em>Cálculo:</em> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'} ÷ 30 días × ${diasTrabajados} días = ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual / 30 * diasTrabajados) : 'No encontrado'}.</p>
        <p><strong>2.- % Sueldo Base Contractual respecto al IMM:</strong> ${mensajeVariacion}</p>
        <p><strong>3.- Resultado Hrs. Extras:</strong> ${resultadoHorasExtras}</p>
        <p><em>Pagado:</em> ${montoPagadoHorasExtras !== "No encontrado" ? formatCurrency(montoPagadoHorasExtras) : 'No encontrado'},
        Calculado ${horasExtrasRealizadas !== "No especificadas" ? formatCurrency(sueldoBaseContractual * factor * parseFloat(horasExtrasRealizadas)) : 'No encontrado'}.</p>
        <p><strong>4.- Resultado Hrs. Extras Domingo:</strong> ${resultadoHorasExtrasDomingo}</p>
        <p><em>Pagado:</em> ${montoPagadoHorasExtrasDomingo !== "No encontrado" ? formatCurrency(montoPagadoHorasExtrasDomingo) : 'No encontrado'},
        Calculado ${horasExtrasDomingoRealizadas !== "No especificadas" ? formatCurrency(parseFloat(montoEsperadoHorasExtrasDomingo)) : 'No encontrado'}.</p>
        <p><strong>5.- Resultado Hrs. Recargo Domingo:</strong> ${resultadoRecargoDomingo}</p>
        <p><strong>6.- Resultado Recargo 50% Festivo:</strong> ${resultadoRecargoFestivo}</p>
        <p><em>Pagado:</em> ${montoPagadoRecargoFestivo !== "No encontrado" ? formatCurrency(montoPagadoRecargoFestivo) : 'No encontrado'},
        Calculado ${horasRecargoFestivoRealizadas !== "No especificadas" ? formatCurrency((sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada) * 1.5 * parseFloat(horasRecargoFestivoRealizadas)) : 'No encontrado'}.</p>
        <p><strong>7.- Movilización:</strong> Días: ${diasMovilizacion}, Monto: ${montoMovilizacion !== "No encontrado" ? formatCurrency(montoMovilizacion) : 'No encontrado'}.
            <strong>Días Totales:</strong> ${diasTotalesMovilizacion.toFixed(2)}</p>
        <p><strong>Dif. Movilización:</strong> ${montoDiferenciaMovilizacion !== "No encontrado" ? formatCurrency(montoDiferenciaMovilizacion) : 'No encontrado'}.</p>
        <p><strong>8.- Colación:</strong> Días: ${diasColacion}, Monto: ${montoColacion !== "No encontrado" ? formatCurrency(montoColacion) : 'No encontrado'}.
            <strong>Días Totales:</strong> ${diasTotalesColacion.toFixed(2)}</p>
        <p><strong>Dif. Colación:</strong> ${montoDiferenciaColacion !== "No encontrado" ? formatCurrency(montoDiferenciaColacion) : 'No encontrado'}.</p>
        <h3>9.- Comisiones</h3>
        <ul>${detalleComisionesHTML}</ul>
        <p><strong>Total Comisiones:</strong> ${formatCurrency(totalComisiones)}</p>
        <p><strong>10.- Semana Corrida</strong></p>
        <p><strong>Domingos y Festivos: </strong> (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}
            dias)     <strong>Monto:</strong> ${formatCurrency(montoSemanaCorrida)}.</p>
        <p><strong>Resultado:</strong> ${resultadoSemanaCorrida}</p>
        <p><em>Cálculo:</em> Comisiones: ${formatCurrency(totalComisiones)} ÷ Días Totales: (${diasParaSemanaCorrida}) × Dom. y Fest.: (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}) = ${formatCurrency(valorEsperadoSemanaCorrida)}.</p>
        <div class="container gratificacion-container" id="gratificacionMec" style="display: none;">
            <h3>Análisis MEC: Haberes Gratificables</h3>
            <ul id="listaGratificables"></ul>
        </div>
    `;

    mostrarGratificacionMec(gratificables);
    document.getElementById('resultado').style.display = 'block';
    document.getElementById('recargarBtn').style.display = 'block';
    document.getElementById('imprimirBtn').style.display = 'block';
    }

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
          <h3>Cálculo de Gratificación</h3>
          <p><strong>Suma Total Haberes:</strong> ${formatCurrency(valorTotalGratificacion)}</p>
          <p><strong>25% de la Suma:</strong> ${formatCurrency(resultadoCalculado)}</p>
          <p><strong>IMM Vigente utilizado:</strong> ${formatCurrency(inm)}</p>
          <p><strong>Jornada Máxima Vigente:</strong> ${jornadaMaxima} horas</p>
          <p><strong>Tope Mensual de Gratificación (4.75 x IMM / 12):</strong> ${formatCurrency(topeGratificacionRedondeado)}</p>
          <p><strong>Tope Proporcional Gratificación:</strong> ${formatCurrency(topeProporcionalRedondeado)}</p>
          <p><strong>Monto Calculado a Pagar:</strong> ${formatCurrency(valorAPagar)}</p>
          <p><strong>Extraído del PDF:</strong> ${formatCurrency(gratificacionPDF)}</p>
          <p><strong>Comparación:</strong> ${comparacionHTML}</p>
      `;
      document.getElementById('resultadoGratificacion').innerHTML = resultadoHTML;
  }

  function volverAPantallaPrincipal() {

      document.querySelector('.main-container').style.display = 'block';
      document.getElementById('pantalla-principal').style.display = 'block';
      document.getElementById('resultado').style.display = 'none';
      document.getElementById('gratificacionMec').style.display = 'none';
      document.getElementById('resultadoGratificacion').innerHTML = '';
      document.getElementById('resultadoContenido').innerHTML = '';
      document.getElementById('recargarBtn').style.display = 'none';
      document.getElementById('imprimirBtn').style.display = 'none';


      const fileInput = document.getElementById('fileInput');
      if (fileInput) {
          fileInput.value = '';
      }
      }

      const listaComisionVacaciones = [
          "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA", "COMI. KIOSCO OTRAS EMPRESAS",
          "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA", "COMPENSACION PERMISO", "DIF CONCURSO FPAY",
          "PROMOCIONES CMR", "COMISION CONNECT", "SEMANA CORRIDA", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ",
          "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
          "GARANTIZADO", "HORAS TRABAJO SIND.", "INCENTIVO CONFIABILIDAD", "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO",
          "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", "PREMIO CUMPL.GRUPAL NPS",
          "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.",
          "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD", "DIFERENCIA SEMANA CORRIDA", "BONO CERTIFICACION","DIF. COMISIONES"
      ];


      document.getElementById('vacacionesBtn').addEventListener('click', () => {
          document.getElementById('pantalla-principal').style.display = 'none';
          document.getElementById('pantalla-vacaciones').style.display = 'block';
      });
      document.getElementById('volverBtn').addEventListener('click', () => {
          document.getElementById('pantalla-vacaciones').style.display = 'none';
          document.getElementById('pantalla-principal').style.display = 'block';
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

      function obtenerDiasTrabajados(texto) {
          const regex = /SUELDO BASE.*?\((\d+)\)/i;
          const resultado = texto.match(regex);
          return resultado ? parseInt(resultado[1], 10) : 0;
      }

      function extraerItemsDePDF(texto) {
          let items = [];
          listaComisionVacaciones.forEach(item => {
              const regex = new RegExp(`(${item}).*?\\$\\s*(\\d{1,3}(?:\\.\\d{3})*(?:,\\d+)?)`, 'i');
              const resultado = texto.match(regex);
              if (resultado) {
                  items.push({ nombre: item, monto: procesarMonto(resultado[2]) });
              }
          });
          return items;
      }

      function obtenerMesYAnio(texto) {
          const regex = /\b([A-Za-z]+)\s+de\s+(\d{4})\b/i;
          const resultado = texto.match(regex);
          return resultado ? `${resultado[1].toUpperCase()} de ${resultado[2]}` : 'Fecha no encontrada';
      }

      function obtenerTresPDFsValidos(datos, mesAnioEvaluado) {
          const tresPrevios = datos.filter(pdf => pdf.dias >= 29 && !pdf.comisionVacaciones && esAnteriorAlMes(pdf.mesAnio, mesAnioEvaluado));
          if (tresPrevios.length < 3) {
              return { error: true, mensaje: 'No hay suficientes PDFs válidos para realizar el cálculo.' };
          }
          return { error: false, tresPrevios: tresPrevios.slice(-3) };
      }

      function esAnteriorAlMes(mesAnio1, mesAnio2) {
          const [mes1, anio1] = mesAnio1.split(' de ');
          const [mes2, anio2] = mesAnio2.split(' de ');
          const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
          if (anio1 < anio2) return true;
          if (anio1 === anio2 && meses.indexOf(mes1) < meses.indexOf(mes2)) return true;
          return false;
      }

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

          resultadoDiv.innerHTML = `
              <h3>Resumen de Cálculo de Vacaciones:</h3>
              <p>PDF seleccionado para cálculo: ${pdfSeleccionado.nombre} (${pdfSeleccionado.mesAnio})</p>
              <p>Promedio de Vacaciones Calculado: ${formatearMonto(promedioVacaciones)}</p>
              <p>Valor de 'COMISION VACACIONES': ${formatearMonto(pdfSeleccionado.comisionVacaciones.monto)}</p>
              <p>Diferencia: ${formatearMonto(diferencia)}</p>
              <p>PDFs utilizados en el cálculo:</p>
              <ul>
                  ${tresPrevios.map(pdf => `<li>${pdf.nombre} (${pdf.mesAnio})</li>`).join('')}
              </ul>
          `;
      }

    document.getElementById('refrescarBtn').addEventListener('click', () => {
        document.getElementById('vacacionInput').value = '';
        const resultadoDiv = document.getElementById('resultadoVacaciones');
        resultadoDiv.innerHTML = '';
        document.getElementById('pantalla-vacaciones').style.display = 'block';
    });

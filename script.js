// Definir los ingresos mínimos para cada año y mes
const ingresosMinimos = {
    2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 320500, "OCTUBRE": 320500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
    2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
    2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
    2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
    2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 }
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
    "COORDINADORA DE VENTAS", "GUARDIA", "OPERADOR DE CCTV", "TRAINEE TIENDA","VENDEDOR JORNADA PARCIAL MAÑANA",
    "VENDEDOR", "VENDEDOR JORNADA PARCIAL","ASISTENTE DE BODEGA"
];

// Lista de Comisiones
const listaComision = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA",
    "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA",
    "COMPENSACION PERMISO","DIF CONCURSO FPAY","PROMOCIONES CMR"
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

// Mostrar los resultados en formato compacto
const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

// Función principal para analizar el archivo
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

// console.log('Texto extraído del PDF:', textoCompleto);

// === Análisis de Mes y Año ===
const regexFecha = /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b) de (\d{4})/i;
const matchFecha = textoCompleto.match(regexFecha);

let mes = "No encontrado";
let año = "No encontrado";
if (matchFecha) {
    mes = matchFecha[1].toUpperCase(); // Asegúrate de que el mes está en mayúsculas
    año = parseInt(matchFecha[2]);    // Asegúrate de que el año sea un número
}

    // === Análisis de Cargo ===
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

    // === Análisis de Sueldo Base Contractual ===
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

    // === Calcular sueldo base diario y esperado ===
        const diasDelMes = 30; // Usamos 30 días como referencia
        const sueldoEsperado = (sueldoBaseContractual / diasDelMes) * diasTrabajados;

        if (Math.abs(sueldoEsperado - sueldoProporcional) < 1) {
            resultadoProporcional = `<span style="color: green;">✅ Cálculo correcto</span>`;
        } else {
            resultadoProporcional = `<span style="color: red;">❌ Discrepancia detectada: Se esperaba $${sueldoEsperado.toFixed(2)}</span>`;
        }
    }
    // === Determinación de jornada máxima ===
    let jornadaMaxima = 45; // Por defecto hasta abril 2024
    if (año > 2024 || (año === 2024 && mes === "MAYO")) {
        jornadaMaxima = 44; // Para mayo 2024 y adelante
    }

    console.log(`Mes: ${mes}, Año: ${año}, Jornada Máxima: ${jornadaMaxima}`);

    // === Cálculo del IMM ajustado a la jornada laboral ===
    const inm = ingresosMinimos[año] && ingresosMinimos[año][mes.toUpperCase()] ? ingresosMinimos[año][mes.toUpperCase()] : 0;

    let inmProporcional = inm;

    // Si la jornada es parcial (<= 30 horas), calcular proporcionalidad
    if (jornadaSeleccionada <= 30) {
        inmProporcional = (inm / jornadaMaxima) * jornadaSeleccionada;
    }
    // === Cálculo de la Variación Porcentual entre Sueldo Base y IMM ===
    let variacionPorcentual = 0;
    let mensajeVariacion = '';
    if (sueldoBaseContractual > inmProporcional) {

    // Sueldo base mayor que IMM ajustado
    variacionPorcentual = ((sueldoBaseContractual - inmProporcional) / inmProporcional) * 100;
    mensajeVariacion = `✅ Es un ${variacionPorcentual.toFixed(2)}% mayor que el IMM `;
    } else if (sueldoBaseContractual === inmProporcional) {

    // Sueldo base igual al IMM ajustado
      mensajeVariacion = `Es igual al IMM `;
    } else {

    // Sueldo base menor que IMM ajustado
      variacionPorcentual = ((inmProporcional - sueldoBaseContractual) / inmProporcional) * 100;
      mensajeVariacion = `❌ Es ${variacionPorcentual.toFixed(2)}% inferior al IMM `;
    }

    // === Análisis de Horas Extras ===
    let resultadoHorasExtras = ''; // Aseguramos que la variable esté definida
    const regexHorasExtras = /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtras = textoCompleto.match(regexHorasExtras);

    let horasExtrasRealizadas = "No especificadas";
    let montoPagadoHorasExtras = "No encontrado";

    // Si se encuentra el patrón de horas extras
    if (matchHorasExtras) {
        horasExtrasRealizadas = matchHorasExtras[1].replace(',', '.'); // Extrae las horas y maneja la coma como decimal
        montoPagadoHorasExtras = parseFloat(matchHorasExtras[2].replace('.', '').replace(',', '.')); // Extrae el monto, manejando comas y puntos
    }

    // Cálculo de Horas Extras
    if (horasExtrasRealizadas === "No especificadas" || montoPagadoHorasExtras === "No encontrado") {
        resultadoHorasExtras = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const montoEsperadoHorasExtras = sueldoBaseContractual * factor * parseFloat(horasExtrasRealizadas);
        const diferenciaHorasExtras = montoPagadoHorasExtras - montoEsperadoHorasExtras;

        resultadoHorasExtras = Math.abs(diferenciaHorasExtras) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaHorasExtras.toFixed(2)}</span>`;
    }

    // === Análisis de Hrs. Extras Domingo ===
    let resultadoHorasExtrasDomingo = ''; // Aseguramos que la variable esté definida
    const regexHorasExtrasDomingo = /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i;
    const matchHorasExtrasDomingo = textoCompleto.match(regexHorasExtrasDomingo);

    let horasExtrasDomingoRealizadas = "No especificadas";
    let montoPagadoHorasExtrasDomingo = "No encontrado";

    // Si se encuentran horas y monto para horas extras domingo
    if (matchHorasExtrasDomingo) {
        horasExtrasDomingoRealizadas = parseFloat(matchHorasExtrasDomingo[1].replace(',', '.')); // Extrae las horas (maneja comas como decimales)
        montoPagadoHorasExtrasDomingo = parseFloat(matchHorasExtrasDomingo[2].replace('.', '').replace(',', '.')); // Extrae el monto
    }

    // Cálculo de Horas Extras Domingo
    if (horasExtrasDomingoRealizadas === "No especificadas" || montoPagadoHorasExtrasDomingo === "No encontrado") {
        resultadoHorasExtrasDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada); // Valor de una hora normal
        const valorHoraRecargoDomingo = valorHoraNormal * 1.3; // Recargo del 30% por ser domingo
        const horaExtraDomingo = valorHoraRecargoDomingo * 1.5; // Factor de 1.5 por ser hora extra
        montoEsperadoHorasExtrasDomingo = horaExtraDomingo * horasExtrasDomingoRealizadas; // Monto esperado

        const diferenciaHorasExtrasDomingo = montoPagadoHorasExtrasDomingo - montoEsperadoHorasExtrasDomingo;

        resultadoHorasExtrasDomingo = Math.abs(diferenciaHorasExtrasDomingo) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaHorasExtrasDomingo.toFixed(2)}</span>`;
    }

    // === Análisis de Recargo Domingo ===
    let resultadoRecargoDomingo = ''; // Aseguramos que la variable esté definida
    const regexRecargoDomingo = /HORAS\s*RECARGO\s*DOMINGO\s*\((\d+[\.,]?\d*)\)\s*\$\s*([\d.,]+)/i;
    const matchRecargoDomingo = textoCompleto.match(regexRecargoDomingo);

    let horasRecargoDomingo = "No especificadas";
    let montoPagadoRecargoDomingo = "No encontrado";
    let montoEsperadoRecargoDomingo = 0; // Inicializamos montoEsperadoRecargoDomingo

    // Caso 1: Si se encuentran horas entre paréntesis y monto
    if (matchRecargoDomingo) {
        horasRecargoDomingo = matchRecargoDomingo[1].replace(',', '.'); // Extrae las horas y maneja la coma
        montoPagadoRecargoDomingo = parseFloat(matchRecargoDomingo[2].replace('.', '').replace(',', '.')); // Extrae el monto
    } else {
        // Caso 2: Si solo se encuentra el monto (sin horas)
        const regexRecargoDomingoSinHoras = /HORAS\s*RECARGO\s*DOMINGO.*?\$\s*([\d.,]+)/i;
        const matchRecargoDomingoSinHoras = textoCompleto.match(regexRecargoDomingoSinHoras);

        if (matchRecargoDomingoSinHoras) {
            montoPagadoRecargoDomingo = parseFloat(matchRecargoDomingoSinHoras[1].replace('.', '').replace(',', '.')); // Solo el monto
            horasRecargoDomingo = "⛔ No tiene el tiempo realizado"; // Informamos que no tiene el tiempo realizado
        }
    }

    // Caso 3: Si no se encuentra ni el monto ni las horas
    if (montoPagadoRecargoDomingo === "No encontrado" && horasRecargoDomingo === "No especificadas") {
        resultadoRecargoDomingo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else if (horasRecargoDomingo === "⛔ No tiene el tiempo realizado") {
        // Caso: Falta el tiempo realizado pero se encontró un monto pagado
        resultadoRecargoDomingo = `<span style="color: red;">❌ Falta el tiempo realizado</span>
        <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado: $0.</p>`;
    } else {
        // Caso: Si se encuentran tanto las horas como el monto, calculamos la discrepancia
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada);
        const valorHoraRecargoDomingo = valorHoraNormal * 0.3; // Recargo del 30%
        montoEsperadoRecargoDomingo = valorHoraRecargoDomingo * parseFloat(horasRecargoDomingo); // Monto esperado

        const diferenciaRecargoDomingo = montoPagadoRecargoDomingo - montoEsperadoRecargoDomingo;

        if (Math.abs(diferenciaRecargoDomingo) < 1) {
            // Si el cálculo es correcto, mostramos también el cálculo Pagado y Esperado
            resultadoRecargoDomingo = `<span style="color: green;">✅ Cálculo correcto</span>
            <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado ${formatCurrency(montoEsperadoRecargoDomingo)}.</p>`;
        } else {
            resultadoRecargoDomingo = `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaRecargoDomingo.toFixed(2)}</span>
            <p><em>Pagado:</em> ${formatCurrency(montoPagadoRecargoDomingo)}, Calculado ${formatCurrency(montoEsperadoRecargoDomingo)}.</p>`;
        }
    }

    // === Análisis de Recargo 50% Festivo ===
    let resultadoRecargoFestivo = ''; // Aseguramos que la variable esté definida
    const regexRecargoFestivo = /RECARGO\s*50%\s*FESTIVO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i; // Corrige el patrón
    const matchRecargoFestivo = textoCompleto.match(regexRecargoFestivo);

    let horasRecargoFestivoRealizadas = "No especificadas";
    let montoPagadoRecargoFestivo = "No encontrado";

    if (matchRecargoFestivo) {
        horasRecargoFestivoRealizadas = matchRecargoFestivo[1].replace(',', '.'); // Extrae las horas, maneja la coma como decimal
        montoPagadoRecargoFestivo = parseFloat(
            matchRecargoFestivo[2].replace(/\./g, '').replace(',', '.')
        ); // Extrae el monto, manejando puntos y comas
    }

    // Cálculo de Recargo 50% Festivo
    if (horasRecargoFestivoRealizadas === "No especificadas" || montoPagadoRecargoFestivo === "No encontrado") {
        resultadoRecargoFestivo = `<span style="color: orange;">⛔ No se realizaron.</span>`;
    } else {
        const valorHoraNormal = (sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada); // Calculamos el valor de la hora normal
        const valorHoraRecargoFestivo = valorHoraNormal * 1.5; // Aplicamos el 50% de recargo
        const montoEsperadoRecargoFestivo = valorHoraRecargoFestivo * parseFloat(horasRecargoFestivoRealizadas); // Calculamos el monto esperado
        const diferenciaRecargoFestivo = montoPagadoRecargoFestivo - montoEsperadoRecargoFestivo;

        resultadoRecargoFestivo = Math.abs(diferenciaRecargoFestivo) < 1
            ? `<span style="color: green;">✅ Cálculo correcto</span>`
            : `<span style="color: red;">❌ Discrepancia detectada: $${diferenciaRecargoFestivo.toFixed(2)}</span>`;
    }

    // === Análisis de Movilización ===
    const matchMovilizacion = textoCompleto.match(regexMovilizacion);
    let diasMovilizacion = 21;  // Asumimos días promedio de trabajo si no se encuentran datos
    let montoMovilizacion = "Dato no encontrado";  // Indicamos que no se encontró el dato
    let valorDiaMovilizacion = 0;

    if (matchMovilizacion) {
        diasMovilizacion = parseInt(matchMovilizacion[1]); // Días base de movilización
        montoMovilizacion = parseFloat(matchMovilizacion[2].replace('.', '').replace(',', '.')); // Monto total de movilización
        if (diasMovilizacion > 0) {
            valorDiaMovilizacion = montoMovilizacion / diasMovilizacion; // Valor diario de movilización
        }
    }

    // === Análisis de Diferencia Movilización ===
    const matchDiferenciaMovilizacion = textoCompleto.match(regexDiferenciaMovilizacion);
    let montoDiferenciaMovilizacion = 0;  // Inicializamos las diferencias en 0
    let diasDiferenciaMovilizacion = 0;
    let diasTotalesMovilizacion = diasMovilizacion;  // Inicializamos con los días base de movilización

    if (matchDiferenciaMovilizacion) {
        montoDiferenciaMovilizacion = parseFloat(matchDiferenciaMovilizacion[1].replace('.', '').replace(',', '.'));
        // Si se encuentran las diferencias, las sumamos a los días totales
        if (valorDiaMovilizacion > 0) {
            diasDiferenciaMovilizacion = montoDiferenciaMovilizacion / valorDiaMovilizacion;
            diasTotalesMovilizacion += diasDiferenciaMovilizacion;  // Sumamos días adicionales a los días base
        }
    }

    // === Análisis de Colación ===
    const matchColacion = textoCompleto.match(regexColacion);
    let diasColacion = 21;  // Asumimos días promedio de trabajo si no se encuentran datos
    let montoColacion = "Dato no encontrado";  // Indicamos que no se encontró el dato
    let valorDiaColacion = 0;

    if (matchColacion) {
        diasColacion = parseInt(matchColacion[1]);
        montoColacion = parseFloat(matchColacion[2].replace('.', '').replace(',', '.'));
        if (diasColacion > 0) {
            valorDiaColacion = montoColacion / diasColacion;
        }
    }

    // === Análisis de Diferencia Colación ===
    const matchDiferenciaColacion = textoCompleto.match(regexDiferenciaColacion);
    let montoDiferenciaColacion = 0;  // Inicializamos las diferencias en 0
    let diasDiferenciaColacion = 0;
    let diasTotalesColacion = diasColacion;

    if (matchDiferenciaColacion) {
        montoDiferenciaColacion = parseFloat(matchDiferenciaColacion[1].replace('.', '').replace(',', '.'));
        // Si se encuentran las diferencias, las sumamos a los días totales
        if (valorDiaColacion > 0) {
            diasDiferenciaColacion = montoDiferenciaColacion / valorDiaColacion;
            diasTotalesColacion += diasDiferenciaColacion;
        }
    }

    // Mostrar los resultados procesados
    //console.log("Movilización: ", montoMovilizacion, ", Días Totales: ", diasTotalesMovilizacion);
    //console.log("Colación: ", montoColacion, ", Días Totales: ", diasTotalesColacion);

    // === Análisis de Comisiones ===
let totalComisiones = 0; // Asegúrate de que esta variable esté definida antes de usarla
const detallesComisiones = [];

// Creamos un objeto para almacenar las sumas de "CONCURSO FPAY" y "DIF CONCURSO FPAY" por separado
const comisionesSeparadas = {
    "CONCURSO FPAY": 0,
    "DIF CONCURSO FPAY": 0
};

// Iteramos sobre cada tipo de comisión en la lista
listaComision.forEach(comision => {
    const regex = new RegExp(`${comision.replace('.', '\\.')}(?:\\s|\\S)*?\\$\\s*([\\d.,]+)`, 'gi');
    const matches = [...textoCompleto.matchAll(regex)];

    // Recorremos cada coincidencia encontrada
    matches.forEach(match => {
        const monto = parseFloat(match[1].replace('.', '').replace(',', '.'));

        // Separar y asignar el monto correctamente
        if (comision === "CONCURSO FPAY") {
            comisionesSeparadas["CONCURSO FPAY"] = monto;  // Asignamos directamente el valor
        } else if (comision === "DIF CONCURSO FPAY") {
            comisionesSeparadas["DIF CONCURSO FPAY"] = monto; // Asignamos directamente el valor
        } else {
            totalComisiones += monto;
            detallesComisiones.push({ item: comision, monto });
        }
    });
});

// Aseguramos que "CONCURSO FPAY" y "DIF CONCURSO FPAY" se sumen por separado
if (comisionesSeparadas["CONCURSO FPAY"] > 0) {
    detallesComisiones.push({ item: "CONCURSO FPAY", monto: comisionesSeparadas["CONCURSO FPAY"] });
    totalComisiones += comisionesSeparadas["CONCURSO FPAY"];
}

if (comisionesSeparadas["DIF CONCURSO FPAY"] > 0) {
    detallesComisiones.push({ item: "DIF CONCURSO FPAY", monto: comisionesSeparadas["DIF CONCURSO FPAY"] });
    totalComisiones += comisionesSeparadas["DIF CONCURSO FPAY"];
}

// Generar el HTML para mostrar las comisiones
let detalleComisionesHTML = detallesComisiones.map(comision =>
    `<li>${comision.item}: ${formatCurrency(comision.monto)}</li>`
).join('');

// Si no se encontraron comisiones, mostramos un mensaje
if (detallesComisiones.length === 0) {
    detalleComisionesHTML = '<li>⛔ No tiene comisiones individuales.</li>';
}

    // === Cálculo de Semana Corrida ===
    const regexSemanaCorrida = /SEMANA\s*CORRIDA\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const matchSemanaCorrida = textoCompleto.match(regexSemanaCorrida);

    let montoSemanaCorrida = 0;
    let valorEsperadoSemanaCorrida = 0;
    let resultadoSemanaCorrida = '';
    let diasSemanaCorrida = "No especificados";

    if (matchSemanaCorrida) {
        diasSemanaCorrida = parseInt(matchSemanaCorrida[1]); // Días especificados en el PDF
        montoSemanaCorrida = parseFloat(matchSemanaCorrida[2].replace('.', '').replace(',', '.')); // Monto del PDF
    } else {
        montoSemanaCorrida = 0;
    }

    let diasParaSemanaCorrida = diasTotalesMovilizacion; // Usamos los días totales de movilización

    // Evaluamos el tope entre 21, 22, y 23 días
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

    // Cálculo de la semana corrida
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

    // Función para procesar correctamente montos numéricos
    function procesarMonto(montoTexto) {
        return parseFloat(montoTexto.replace(/\./g, '').replace(',', '.'));
    }

    // Función para identificar los valores de los ítems "Gratificables" en el texto extraído
    function identificarGratificables(texto) {
        let gratificablesEncontrados = [];
        let textoRestante = texto.replace(/\s+/g, ' ').trim(); // Normalizar espacios y saltos de línea

        // Eliminar caracteres no visibles (como saltos de línea, tabulaciones)
        textoRestante = textoRestante.replace(/[^\x20-\x7E]/g, ' '); // Limpiar caracteres no imprimibles

        // Expresión regular con una flexibilidad mayor para el ítem exacto
        listaGratificables.forEach(item => {

            // Añadir \b para asegurarse de que el término sea completamente exacto
            // Permitir que haya números entre paréntesis opcionales justo después del ítem
            const regex = new RegExp(`${item.replace(/\s+/g, '\\s*')}\\s*(?:\\(\\d+\\))?\\s*\\$\\s*([\\d.,]+)`, 'i');
            const match = textoRestante.match(regex);

            if (match) {
                gratificablesEncontrados.push({
                    item: item,
                    monto: procesarMonto(match[1])
                });

                // Eliminar la coincidencia exacta del texto restante
                textoRestante = textoRestante.replace(new RegExp(match[0].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i'), '').trim();
            }
        });

        return gratificablesEncontrados;
    }

    // Función para calcular el total de los valores de "Gratificación Mec"
    function calcularTotalGratificacion(gratificables) {
        return gratificables.reduce((total, item) => total + item.monto, 0);
    }

    // Función para mostrar los valores encontrados en el cuadro "Gratificación Mec"
    function mostrarGratificacionMec(gratificables) {
        const gratificacionContainer = document.getElementById('gratificacionMec');

        if (gratificacionContainer.style.display === 'block') {
            return; // Si ya está visible, no agregar los datos nuevamente
        }

        // Crear HTML para los gratificables
        const listaGratificablesHTML = gratificables.map(gratificable => {
            return `<li><strong>${gratificable.item}:</strong> ${mostrarValor(gratificable.monto)}</li>`;
        }).join('');

        // Calcular el total de "Gratificación Mec"
        const totalGratificacion = calcularTotalGratificacion(gratificables);

        // Valores consolidados del Análisis MEC
        const valoresConsolidados = [
            sueldoProporcional || 0,
            montoPagadoHorasExtras || 0,
            montoPagadoHorasExtrasDomingo || 0,
            montoPagadoRecargoDomingo || 0,
            montoPagadoRecargoFestivo || 0,
            totalComisiones || 0,
            valorEsperadoSemanaCorrida || 0
        ];

        // Sumar valores consolidados y gratificables ********
        const valorTotalGratificacion = valoresConsolidados.reduce((total, valor) => total + (parseFloat(valor) || 0), totalGratificacion);

        // Llamar a la función calcularGratificacion pasando el valor calculado
        calcularGratificacion(gratificables, textoCompleto, jornadaSeleccionada, mes, año, valorTotalGratificacion);

        // Crear HTML para los datos calculados
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

        // Crear HTML para los conceptos de gratificación adicionales
        const gratificablesHTML = `
            <ul>
                ${listaGratificablesHTML}
            </ul>
        `;

        // Agregar el nuevo cálculo total
        const valorTotalHTML = `
            <p><strong>_______ SUMA TOTAL HABERES GRATIFICACION: ${mostrarValor(valorTotalGratificacion)} _______</strong></p>
        `;

        // Unir ambas secciones
        const gratificacionHTML = datosCalculadosHTML + gratificablesHTML + valorTotalHTML;

        // Actualiza el contenido visible y también el contenido para impresión
        document.getElementById('listaGratificables').innerHTML = gratificacionHTML;
        document.getElementById('gratificacionMec').style.display = 'block';
    }

    // Función para mostrar el valor de un monto de manera adecuada
    function mostrarValor(valor) {
        return isNaN(valor) || valor === null ? '$0' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
    }

    // Imprimir resultados en hojas distintas
    window.imprimirResultados = function imprimirResultados() {
        const analisisMEC = document.querySelector('#resultado'); // Contenedor "Análisis MEC"
        const gratificacionMEC = document.querySelector('#gratificacionMec'); // Contenedor "Gratificación MEC"

        // Verificar que los elementos tienen contenido
        const contenidoAnalisis = analisisMEC ? analisisMEC.innerHTML.trim() : '';
        const contenidoGratificacion = gratificacionMEC && gratificacionMEC.style.display !== 'none'
            ? gratificacionMEC.innerHTML.trim()
            : '<p>No hay datos disponibles en Gratificación MEC.</p>'; // Mensaje si no hay datos en Gratificación MEC

        if (!contenidoAnalisis || !contenidoGratificacion) {
            alert('El contenido no está listo para imprimir. Por favor, verifica el análisis antes de imprimir.');
            return;
        }

        // Crear una nueva ventana para la impresión
        const ventanaImpresion = window.open('', '_blank');
        ventanaImpresion.document.write(`
            <html>
            <head>
                <title>Impresión de Resultados</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        line-height: 1.6;
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
                </style>
            </head>
            <body>
                <!-- Solo muestra el contenido del análisis -->
                ${contenidoAnalisis}
                <!-- Salto de página -->
                <div class="page-break"></div>
                <!-- Contenido de Gratificación MEC -->
                ${contenidoGratificacion}
            </body>
            </html>
        `);
        ventanaImpresion.document.close();
        ventanaImpresion.print(); // Ejecutar impresión
    };

    // Después de extraer el texto del PDF, identificamos los "Gratificables"
    const gratificables = identificarGratificables(textoCompleto);

    // === Mostrar resultados en HTML ===
    document.getElementById('resultadoContenido').innerHTML = `
        <h2>Análisis MEC:</h2>
        <p><strong>Mes y Año:</strong> ${mes.toUpperCase()} DE ${año}. <strong>Jornada:</strong> ${jornadaSeleccionada} horas.</p>
        <p><strong>Cargo:</strong> ${cargo}</p>
        <p><strong>Sueldo Base:</strong> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'}.</p>
        <p><strong>Días Trabajados:</strong> ${diasTrabajados || 'No encontrados'}. <strong>Pagado:</strong> ${sueldoProporcional ? formatCurrency(sueldoProporcional) : 'No encontrado'}.</p>
        <p><strong>1.- Resultado Sueldo Base:</strong> ${resultadoProporcional}.</p>
        <p><em>Cálculo:</em> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'} ÷ 30 días × ${diasTrabajados} días = ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual / 30 * diasTrabajados) : 'No encontrado'}.</p>
        <p><strong>2.- % Sueldo Base Contractual respecto al IMM:</strong> ${mensajeVariacion}</p>
        <!-- Punto 3: Resultado Hrs. Extras -->
        <p><strong>3.- Resultado Hrs. Extras:</strong> ${resultadoHorasExtras}</p>
        <p><em>Pagado:</em> ${montoPagadoHorasExtras !== "No encontrado" ? formatCurrency(montoPagadoHorasExtras) : 'No encontrado'},
        Calculado ${horasExtrasRealizadas !== "No especificadas" ? formatCurrency(sueldoBaseContractual * factor * parseFloat(horasExtrasRealizadas)) : 'No encontrado'}.</p>
        <!-- Punto 4: Resultado Hrs. Extras Domingo-->
        <p><strong>4.- Resultado Hrs. Extras Domingo:</strong> ${resultadoHorasExtrasDomingo}</p>
        <p><em>Pagado:</em> ${montoPagadoHorasExtrasDomingo !== "No encontrado" ? formatCurrency(montoPagadoHorasExtrasDomingo) : 'No encontrado'},
        Calculado ${horasExtrasDomingoRealizadas !== "No especificadas" ? formatCurrency(sueldoBaseContractual * factor * parseFloat(horasExtrasDomingoRealizadas)) : 'No encontrado'}.</p>
        <!-- Punto 5: Resultado Hrs. Recargo Domingo -->
        <p><strong>5.- Resultado Hrs. Recargo Domingo:</strong> ${resultadoRecargoDomingo}</p>
        <!-- Punto 6: Resultado Recargo 50% Festivo -->
        <p><strong>6.- Resultado Recargo 50% Festivo:</strong> ${resultadoRecargoFestivo}</p>
        <p><em>Pagado:</em> ${montoPagadoRecargoFestivo !== "No encontrado" ? formatCurrency(montoPagadoRecargoFestivo) : 'No encontrado'},
        Calculado ${horasRecargoFestivoRealizadas !== "No especificadas" ? formatCurrency((sueldoBaseContractual / 30) * 28 / (4 * jornadaSeleccionada) * 1.5 * parseFloat(horasRecargoFestivoRealizadas)) : 'No encontrado'}.</p>
        <!-- Punto 7: Movilización -->
        <p><strong>7.- Movilización:</strong> Días: ${diasMovilizacion}, Monto: ${montoMovilizacion !== "No encontrado" ? formatCurrency(montoMovilizacion) : 'No encontrado'}.
            <strong>Días Totales:</strong> ${diasTotalesMovilizacion.toFixed(2)}</p>
        <p><strong>Dif. Movilización:</strong> ${montoDiferenciaMovilizacion !== "No encontrado" ? formatCurrency(montoDiferenciaMovilizacion) : 'No encontrado'}.</p>
        <!-- Punto 8: Colación -->
        <p><strong>8.- Colación:</strong> Días: ${diasColacion}, Monto: ${montoColacion !== "No encontrado" ? formatCurrency(montoColacion) : 'No encontrado'}.
            <strong>Días Totales:</strong> ${diasTotalesColacion.toFixed(2)}</p>
        <p><strong>Dif. Colación:</strong> ${montoDiferenciaColacion !== "No encontrado" ? formatCurrency(montoDiferenciaColacion) : 'No encontrado'}.</p>
        <!-- Punto 9: Comisiones -->
        <h3>9.- Comisiones</h3>
        <ul>${detalleComisionesHTML}</ul>
        <p><strong>Total Comisiones:</strong> ${formatCurrency(totalComisiones)}</p>
        <!-- Punto 10: Semana Corrida -->
        <p><strong>10.- Semana Corrida</strong></p>
        <p><strong>Domingos y Festivos: </strong> (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}
            dias)     <strong>Monto:</strong> ${formatCurrency(montoSemanaCorrida)}.</p>
        <p><strong>Resultado:</strong> ${resultadoSemanaCorrida}</p>
        <p><em>Cálculo:</em> Comisiones: ${formatCurrency(totalComisiones)} ÷ Días Totales: (${diasParaSemanaCorrida}) × Dom. y Fest.: (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}) = ${formatCurrency(valorEsperadoSemanaCorrida)}.</p>
        <!-- Punto 11: Gratificación Mec -->
        <div class="container gratificacion-container" id="gratificacionMec" style="display: none;">
            <h3>Análisis MEC: Haberes Gratificables</h3>
            <ul id="listaGratificables"></ul>
        </div>
    `;

    mostrarGratificacionMec(gratificables); // Llamar con los datos procesados de gratificables
    document.getElementById('resultado').style.display = 'block';
    document.getElementById('recargarBtn').style.display = 'block';
    document.getElementById('imprimirBtn').style.display = 'block';
    }

    // === Función centralizada para determinar la jornada máxima según la fecha ===
  function obtenerJornadaMaxima(mes, año) {
      const meses = {
          ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
          JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
      };
      const mesIndex = meses[mes.toUpperCase()] || 0;

      // Para mayo 2024 en adelante, jornada máxima 44 horas
      if (año > 2024 || (año === 2024 && mesIndex >= 5)) {
          return 44; // Desde mayo 2024
      }

      // Para abril 2024 y antes, jornada máxima 45 horas
      return 45; // Hasta abril 2024
  }

  // === Función para calcular la gratificación con tope mensual ===
  function calcularGratificacion(gratificables, textoCompleto, jornadaSeleccionada, mes, año, valorTotalGratificacion) {
      // Mapeo de meses a índices
      const meses = {
          ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
          JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12
      };

      // Obtener el IMM del mes y año
      const inm = ingresosMinimos[año]?.[mes.toUpperCase()] || 0;
      if (inm === 0) {
          console.error("IMM no disponible para este mes y año.");
          return;
      }

      // Determinar el índice del mes
      const mesIndex = meses[mes.toUpperCase()];
      if (!mesIndex) {
          console.error("Mes inválido.");
          return;
      }

      // Determinar la jornada máxima según la fecha
      let jornadaMaxima = 45; // Por defecto hasta abril 2024
      if (año > 2024 || (año === 2024 && mesIndex >= 5)) {
          jornadaMaxima = 44; // A partir de mayo 2024
      }

      // Cálculo del 25% de la suma total
      const resultadoCalculado = valorTotalGratificacion * 0.25;

      // Calcular el tope de gratificación
      const topeGratificacion = (4.75 * inm) / 12;

      // Calcular el tope proporcional para jornada máxima
      const topeProporcional = (topeGratificacion / jornadaMaxima) * jornadaSeleccionada;

      // Si la jornada es mayor a 30 horas, utilizar el 25% de la suma total como tope
      const topeCalculado = jornadaSeleccionada > 30 ? resultadoCalculado : topeProporcional;

      // Si el tope calculado es mayor al tope de gratificación, utilizar el tope de gratificación
      const valorAPagar = Math.round(Math.min(topeCalculado, topeGratificacion));

      // Redondear valores para mostrar
      const topeGratificacionRedondeado = Math.round(topeGratificacion);
      const topeProporcionalRedondeado = Math.round(topeProporcional);

      // Extraer el valor de "GRATIFICACION 25% C.T." del PDF
      const regexGratificacionPDF = /GRATIFICACION\s*25%\s*C\.T\.\s*\$\s*([\d.,]+)/i;
      const matchGratificacionPDF = textoCompleto.match(regexGratificacionPDF);
      const gratificacionPDF = matchGratificacionPDF ? parseFloat(matchGratificacionPDF[1].replace(/\./g, '').replace(',', '.')) : 0;

      // Comparar valores calculados y extraídos con tolerancia
      let comparacionHTML = "";
      const diferencia = gratificacionPDF - valorAPagar;
      if (Math.abs(diferencia) < 0.001) {
          comparacionHTML = `<span style="color: green;">✅ Pago Correcto: ${formatCurrency(valorAPagar)}</span>`;
      } else {
          comparacionHTML = `<span style="color: red;">❌ Discrepancia de ${formatCurrency(diferencia)}</span>`;
      }

      // Mostrar los resultados
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

    function recargarAplicacion() {
        // Recarga la página actual para reiniciar la aplicación
        location.reload();
    }

// ==================== VARIABLES GLOBALES ====================
// Ingresos mínimos para cada año y mes
const ingresosMinimos = {
    2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 326500, "OCTUBRE": 326500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
    2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
    2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
    2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
    2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 },
    2025: { "ENERO": 510636, "FEBRERO": 510636, "MARZO": 510636, "ABRIL": 510500, "MAYO": 510500, "JUNIO": 510500, "JULIO": 529000, "AGOSTO": 529000, "SEPTIEMBRE": 529000, "OCTUBRE": 529000, "NOVIEMBRE": 529000, "DICIEMBRE": 529000 },
    2026: { "ENERO": 539000, "FEBRERO": 539000, "MARZO": 539000, "ABRIL": 539000, "MAYO": 553553, "JUNIO": 553553, "JULIO": 553553, "AGOSTO": 553553, "SEPTIEMBRE": 553553, "OCTUBRE": 553553, "NOVIEMBRE": 553553, "DICIEMBRE": 553553 }
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
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA","COMISIÓN SEGURO DE VIDA",
    "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA","INCENTIVO SELF CHECK OUT AUT",
    "COMPENSACION PERMISO", "DIF CONCURSO FPAY", "PROMOCIONES CMR", "COMISION CONNECT", "DIF. COMISIONES",
    "INCENTIVO PRODUC CAJAS AUT","AVANCE CMR","DIF. INCENTI PRODUCT CAJAS"
];

const listaGratificables = [
"BONO ASISTENCIA","BONO ASISTENCIA AUT.","BONO CERTIFICACION","BONO CLICK AND COLLECT","BONO CUMPLIMIENTO DE ",
"BONO CYBER","BONO DICIEMBRE","BONO INVENTARIO","BONO PUNTUALIDAD AUT.","BONO VACACIONES",
"COMISION VACACIONES","DIF BONO CUMPLIMIENTO DE HP.","DIF PREMIO CLICK AND COLLECT","DIF PREMIO VENTA TIENDA","DIF. CONTING. MES ANTERIOR",
"DIF. SB MES ANTERIOR","DIF. SUELDO BASE","DIF.HORAS EXTRAS ","DIF.SUELDO BASE CONTINGENCIA","DIFERENCIA 70%",
"DIFERENCIA CONTINGENCIA","DIFERENCIA SEMANA CORRIDA","GARANTIZADO","HORAS RECARGO NAVIDAD","HORAS TRABAJO SIND.",
"INCENTIVO CONFIABILIDAD","INCENTIVO RECUPERO","INCENTIVO TIENDA CD/SFS","PREMIO CLICK AND COLLECT","PREMIO CUMPL.GRUPAL NPS",
"PREMIO CUMPL.GRUPAL VTAS","PREMIO CUMPLIMIENTO DE PLAN","PREMIO NPS","PREMIO VENTA TIENDA","PREMIO VENTA TIENDA AUT.",
"PROMEDIOS VARIOS","QUIEBRE DE STOCK","QUINQUENIO","BONO BRIGADISTA","VACACIONES PT","INCENTIVO PRODUC CAJAS AUT"

];

// ======================================================
// 🔎 PREVALIDACIÓN DE DOCUMENTO ANTES DEL ANÁLISIS
// ======================================================

async function preValidarAntesDeAnalizar() {

    try {

        const archivoInput = document.getElementById('fileInput');
        if (!archivoInput || !archivoInput.files.length) {
            alert("⚠️ Debes seleccionar una liquidación.");
            return;
        }

        const archivo = archivoInput.files[0];
        const arrayBuffer = await archivo.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        let textoCompleto = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            textoCompleto += strings.join(" ") + "\n";
        }

        // ======================================================
        // 📅 EXTRAER FECHA
        // ======================================================

        let fechaDetectada = "Fecha no detectada";

        const matchFecha = textoCompleto.match(
            /(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+DE\s+\d{4}/i
        );

        if (matchFecha) {

            fechaDetectada = matchFecha[0];
        }

        // ======================================================
        // 👤 EXTRAER NOMBRE (básico inicial)
        // ======================================================

        let nombreDetectado = "Trabajador no identificado";
        let rutDetectado = "RUT no detectado";
        const matchTrabajador = textoCompleto.match(
            /NOMBRE\s+RUT\s+SUELDO\s+BASE\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+(\d{1,2}\.\d{3}\.\d{3}-[\dkK])/i
        );

        if (matchTrabajador) {

            nombreDetectado = matchTrabajador[1]
                .trim()
                .replace(/\s+/g, " ");

            rutDetectado = matchTrabajador[2]
                .trim();
        }

        // ======================================================
        // 🧠 PLAN ACTUAL
        // ======================================================

        const plan = window.userPlan || "free";

        // ======================================================
        // ⏰ JORNADA SELECCIONADA
        // ======================================================

        const selectJornada =
            document.getElementById('jornada');

        const jornadaTexto =
            selectJornada.options[
                selectJornada.selectedIndex
            ].text;

        // ======================================================
        // 📦 MODAL VALIDACIÓN
        // ======================================================

        const confirmado = await mostrarModalValidacion({
            fecha: fechaDetectada,
            nombre: nombreDetectado,
            rut: rutDetectado,
            mostrarNombre: (
                plan === "pro" ||
                plan === "pro_pending"
            ),
            jornada: jornadaTexto
        });

        // ======================================================
        // ✅ CONTINUAR ANÁLISIS ORIGINAL / POR HORA
        // ======================================================
        if (confirmado) {
            const jornadaValor = document.getElementById('jornada').value;

            if (jornadaValor === 'HORA') {
                // Contrato por hora → nuevo análisis
                analizarLiquidacionPorHora();
            } else {
                // Jornadas normales → flujo clásico
                analizarArchivo();
            }
        }

    } catch (error) {

        console.error(
            "❌ Error prevalidando documento:",
            error
        );

        alert("❌ Error verificando el documento.");
    }
}


// ======================================================
// 🎨 MODAL VISUAL VALIDACIÓN
// ======================================================

function mostrarModalValidacion({
    fecha,
    nombre,
    rut,
    mostrarNombre,
    jornada
}) {

    return new Promise((resolve) => {

        const anterior =
            document.getElementById('modalValidacionMEC');

        if (anterior) {

            anterior.remove();
        }

        const overlay = document.createElement('div');

        overlay.id = 'modalValidacionMEC';

        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 20px;
        `;

        const modal = document.createElement('div');

        modal.style.cssText = `
            background: #fff;
            border-radius: 18px;
            max-width: 460px;
            width: 100%;
            padding: 28px;
            font-family: Arial;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        `;

        modal.innerHTML = `

            <h2 style="
                margin-top:0;
                margin-bottom:18px;
                color:#111827;
                font-size:22px;
            ">
                🔎 Verificación del documento
            </h2>

            <!-- FECHA -->

            <div style="
                background:#f3f4f6;
                border-radius:12px;
                padding:14px;
                margin-bottom:16px;
            ">

                <div style="
                    font-size:13px;
                    color:#6b7280;
                    margin-bottom:6px;
                    font-weight:bold;
                ">
                    Fecha detectada
                </div>

                <div style="
                    font-size:16px;
                    font-weight:600;
                    color:#111827;
                ">
                    ${fecha}
                </div>

            </div>

            <!-- TRABAJADOR -->

            ${
                mostrarNombre
                ? `
                <div style="
                    background:#f9fafb;
                    border-radius:12px;
                    padding:14px;
                    margin-bottom:18px;
                ">

                    <div style="
                        font-size:13px;
                        color:#6b7280;
                        margin-bottom:12px;
                        font-weight:bold;
                    ">
                        Trabajador detectado
                    </div>

                    <div style="
                        font-size:12px;
                        color:#6b7280;
                        margin-bottom:4px;
                    ">
                        Nombre
                    </div>

                    <div style="
                        font-size:16px;
                        font-weight:600;
                        color:#111827;
                        margin-bottom:12px;
                        line-height:1.4;
                    ">
                        ${nombre}
                    </div>

                    <div style="
                        font-size:12px;
                        color:#6b7280;
                        margin-bottom:4px;
                    ">
                        RUT
                    </div>

                    <div style="
                        font-size:15px;
                        font-weight:600;
                        color:#111827;
                    ">
                        ${rut}
                    </div>

                </div>
                `
                : ''
            }

            <!-- JORNADA -->

            <div style="
                background:#fff7ed;
                border:1px solid #fdba74;
                border-radius:12px;
                padding:14px;
                margin-bottom:18px;
            ">

                <div style="
                    font-size:13px;
                    color:#9a3412;
                    margin-bottom:6px;
                    font-weight:bold;
                ">
                    ⚠ Verifica la jornada seleccionada
                </div>

                <div style="
                    font-size:16px;
                    font-weight:600;
                    color:#111827;
                    margin-bottom:8px;
                ">
                    ${jornada}
                </div>

                <div style="
                    font-size:13px;
                    color:#7c2d12;
                    line-height:1.5;
                ">
                    Una jornada incorrecta puede afectar el análisis.
                </div>

            </div>

            <!-- BOTONES -->

            <div style="
                display:flex;
                gap:12px;
            ">

                <button
                    id="cancelarValidacionMEC"
                    style="
                        flex:1;
                        border:none;
                        background:#e5e7eb;
                        color:#111827;
                        padding:14px;
                        border-radius:12px;
                        cursor:pointer;
                        font-weight:bold;
                        font-size:14px;
                    "
                >
                    ❌ Cancelar
                </button>

                <button
                    id="confirmarValidacionMEC"
                    style="
                        flex:1;
                        border:none;
                        background:#111827;
                        color:white;
                        padding:14px;
                        border-radius:12px;
                        cursor:pointer;
                        font-weight:bold;
                        font-size:14px;
                    "
                >
                    ✅ Continuar
                </button>

            </div>
        `;

        overlay.appendChild(modal);

        document.body.appendChild(overlay);

        document
            .getElementById('cancelarValidacionMEC')
            .onclick = () => {

                overlay.remove();

                resolve(false);
            };

        document
            .getElementById('confirmarValidacionMEC')
            .onclick = () => {

                overlay.remove();

                resolve(true);
            };
    });
}

// =====================================
// 💰 FORMATEO OFICIAL MONEDA CLP (UI)
// =====================================
function formatearCLP(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return "$0";
    return "$" + Math.round(valor).toLocaleString("es-CL");
}

// =====================================================
// 🚦 RECOLECTOR GLOBAL RESUMEN DE ANÁLISIS
// =====================================================

let resumenAnalisis = [];

function limpiarResumenAnalisis() {
    resumenAnalisis = [];
}

function agregarResultadoResumen(modulo, estado, diferencia = 0) {

    resumenAnalisis.push({
        modulo: modulo,
        estado: estado, // "ok" | "warning" | "error" | "info"
        diferencia: diferencia || 0
    });
}

function generarResumenAnalisisHTML() {

    if (!resumenAnalisis || resumenAnalisis.length === 0) {
        return '';
    }

    // ======================================
    // PRIORIDAD BASE
    // ======================================

    const prioridadEstados = {
        error: 1,
        warning: 2,
        ok: 3,
        info: 4
    };

    // ======================================
    // PESO REAL DEL ESTADO
    // ======================================

    function obtenerPesoEstado(estado) {

        switch (estado) {

            case "error":
                return 3000000;

            case "warning":
                return 1000000;

            case "ok":
                return 1000;

            case "info":
            default:
                return 0;
        }
    }

    // ======================================
    // ICONOS
    // ======================================

    const iconosEstados = {
        error: '🔴',
        warning: '🟠',
        ok: '🟢',
        info: '⚪'
    };

    // ======================================
    // TEXTOS
    // ======================================

    const textosEstados = {
        error: 'Discrepancia detectada',
        warning: 'Revisar información',
        ok: 'Correcto',
        info: 'Sin información relevante'
    };

    // ======================================
    // ORDENAMIENTO INTELIGENTE
    // ======================================

    const resumenOrdenado = [...resumenAnalisis]

        .sort((a, b) => {

            const pesoA =
                obtenerPesoEstado(a.estado) +
                Math.abs(a.diferencia || 0);

            const pesoB =
                obtenerPesoEstado(b.estado) +
                Math.abs(b.diferencia || 0);

            return pesoB - pesoA;
        });

    // ======================================
    // GENERAR HTML
    // ======================================

    const resumenHTML = resumenOrdenado.map(item => {

        const icono =
            iconosEstados[item.estado] || '⚪';

        let detalle =
            textosEstados[item.estado];

        if (
            item.diferencia &&
            Math.abs(item.diferencia) > 0
        ) {

            detalle += `
                → Diferencia ${formatCurrency(
                    Math.abs(item.diferencia)
                )}
            `;
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

                <strong>
                    ${icono} ${item.modulo}
                </strong>

                <div style="
                    margin-top:4px;
                    font-size:14px;
                ">

                    ${detalle}

                </div>

            </div>
        `;

    }).join('');

    // ======================================
    // CONTENEDOR FINAL
    // ======================================

    return `

        <div style="
            border:2px solid #ddd;
            border-radius:12px;
            padding:15px;
            margin-bottom:20px;
            background:#fafafa;
        ">

            <h2 style="
                margin-top:0;
                margin-bottom:15px;
            ">
                🚦 Resumen: Análisis MEC
            </h2>

            ${resumenHTML}

        </div>
    `;
}

// ==================== FUNCIÓN DE ANÁLISIS DEL PDF ====================
const formatCurrency = (value) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

async function analizarArchivo() {

// ⏳ ESPERAR PLAN DEL USUARIO (MUY IMPORTANTE)
await esperarPlanUsuario();

// 🚦 limpiar resumen antes de iniciar nuevo análisis
limpiarResumenAnalisis();

// 💰 CONTROL DE PLAN + LÍMITE TOTAL (FREEMIUM REAL)

// 💎 PRO → acceso ilimitado
if (window.userPlan === "pro") {
    console.log("💎 Usuario PRO → acceso ilimitado");

} else {

    console.log("🆓 Usuario FREE → verificando límite TOTAL");

    const permitido = await puedeUsarAnalisisTotal();

    if (!permitido) {
        PAYWALL.show("Ya usaste tus 5 análisis gratuitos");
        return;
    }

    // 🔥 SUMAR USO (solo FREE y solo si sí puede usar)
    await sumarUsoAnalisisTotal();
    await actualizarContadorAnalisisUI(); // 👈 ACTUALIZA EN TIEMPO REAL
}

    const archivo = document.getElementById('fileInput').files[0];
    const jornadaSeleccionada = document.getElementById('jornada').value;
    const regexMovilizacion = /MOVILIZACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const regexColacion = /COLACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
    const regexDiferenciaMovilizacion = /DIFERENCIA\s*MOVILIZACION\s*\$\s*([\d.,]+)/i;
    const regexDiferenciaColacion = /DIFERENCIA\s*COLACION\s*\$\s*([\d.,]+)/i;
    const regexCaja = /CAJA\s*\((\d+)\)\s*\$\s*([\d.]+)/i;
    const regexDiferenciaCaja = /DIF(?:ERENCIA)?(?:\s+ASIG\.?)?(?:\s+DE)?\s*CAJA.*?\$\s*([\d\.]+)/i;

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

// Detectar premio en la nómina tempranamente para integrarlo en haberes si existe
const regexPremioNomina_global = /(PREMIO\s*VENTA\s*TIENDA(?:\s*AUT\.?)?|PREMIO\s*VENTA\s*TIENDA|PREMIO\s*CUMPL\.?GRUPAL\s*VTAS|INCENTIVO\s*TIENDA|PREMIO\s*VENTA)[^\$]*\$\s*([\d\.,]+)/i;
const matchPremioNomina_global = textoCompleto.match(regexPremioNomina_global);

window.comisionPagadaEnNomina =
    matchPremioNomina_global
        ? procesarMonto(matchPremioNomina_global[2])
        : 0;

const regexFecha =
    /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b) de (\d{4})/i;

const matchFecha = textoCompleto.match(regexFecha);

let mes = "No encontrado";
let año = "No encontrado";

if (matchFecha) {
    mes = matchFecha[1].toUpperCase();
    año = parseInt(matchFecha[2]);
}

const regexCargo =
    /FECHA\s*INGRESO\s*(.*?)(?=\s*[\r\n]|$)/i;

const matchCargo = textoCompleto.match(regexCargo);

let cargo = "No encontrado";

if (matchCargo) {
    cargo = matchCargo[1].trim();
}

const cargoEncontrado =
    listaCargos.find(c => cargo.includes(c));

if (cargoEncontrado) {
    cargo = cargoEncontrado;
}

const regexSueldoBaseContractual =
    /SUELDO\s*BASE.*?\$\s*(\d[\d.]*)/i;

const matchSueldoBaseContractual =
    textoCompleto.match(regexSueldoBaseContractual);

let sueldoBaseContractual = null;

if (matchSueldoBaseContractual) {

    sueldoBaseContractual = parseFloat(
        matchSueldoBaseContractual[1]
            .replace('.', '')
            .replace(',', '.')
    );
}

const regexSueldoBaseProporcional =
    /SUELDO\s*BASE\s*\((\d+)\)\s*\$\s*(\d[\d.]*)/i;

const matchSueldoBaseProporcional =
    textoCompleto.match(regexSueldoBaseProporcional);

let diasTrabajados = null;
let sueldoProporcional = null;
let resultadoProporcional = '';

// =====================================================
// 💰 VALIDACIÓN PROPORCIONAL SUELDO BASE
// =====================================================

if (matchSueldoBaseProporcional && sueldoBaseContractual) {

    diasTrabajados =
        parseInt(matchSueldoBaseProporcional[1]);

    sueldoProporcional = parseFloat(
        matchSueldoBaseProporcional[2]
            .replace('.', '')
            .replace(',', '.')
    );

    const diasDelMes = 30;

    const sueldoEsperado =
        (sueldoBaseContractual / diasDelMes)
        * diasTrabajados;

    const diferenciaSueldo =
        sueldoProporcional - sueldoEsperado;

    // ⚠ SOLO INFORMAR
    // ⚠ NO alimentar resumen MEC
    if (Math.abs(diferenciaSueldo) < 1) {

        resultadoProporcional = `
            <span style="color: green;">
                ✅ Cálculo correcto
            </span>
        `;

    } else {

        resultadoProporcional = `
            <span style="color: red;">
                ❌ Discrepancia detectada:
                Se esperaba ${formatearCLP(sueldoEsperado)}
            </span>
        `;
    }
}

// =====================================================
// 💰 VALIDACIÓN SUELDO BASE VS IMM
// =====================================================

let jornadaMaxima = 45;

// 42 horas desde abril 2026
if (
    año > 2026 ||
    (
        año === 2026 &&
        [
            "ABRIL","MAYO","JUNIO","JULIO",
            "AGOSTO","SEPTIEMBRE","OCTUBRE",
            "NOVIEMBRE","DICIEMBRE"
        ].includes(mes)
    )
) {

    jornadaMaxima = 42;

// 44 horas desde mayo 2024
} else if (
    año > 2024 ||
    (
        año === 2024 &&
        [
            "MAYO","JUNIO","JULIO","AGOSTO",
            "SEPTIEMBRE","OCTUBRE",
            "NOVIEMBRE","DICIEMBRE"
        ].includes(mes)
    )
) {

    jornadaMaxima = 44;
}

const inm =
    ingresosMinimos[año] &&
    ingresosMinimos[año][mes.toUpperCase()]
        ? ingresosMinimos[año][mes.toUpperCase()]
        : 0;

let inmProporcional = inm;

// Jornada parcial → IMM proporcional
if (Number(jornadaSeleccionada) <= 30) {

    inmProporcional =
        (inm / jornadaMaxima)
        * Number(jornadaSeleccionada);
}

let mensajeVariacion = '';

const diferenciaIMM =
    sueldoBaseContractual - inmProporcional;

// =====================================================
// 💰 INTERPRETACIÓN JURÍDICA SUELDO BASE VS IMM
// =====================================================

const porcentajeSobreIMM =
    inmProporcional > 0
        ? (
            (sueldoBaseContractual - inmProporcional)
            / inmProporcional
        ) * 100
        : 0;

const porcentajeRedondeado =
    Math.round(porcentajeSobreIMM * 10) / 10;

// =====================================================
// 📊 ESTADO LEGAL SUELDO BASE → RESUMEN MEC
// =====================================================

let estadoResumenSueldoBase = "ok";
let diferenciaResumenSueldoBase = 0;

// =====================================================
// 🟢 CUMPLE IMM
// =====================================================
if (diferenciaIMM >= 0) {

    // -------------------------------------------------
    // ✅ Mostrar cálculo proporcional SOLO si cumple IMM
    // -------------------------------------------------
    if (
        typeof diferenciaSueldo !== "undefined" &&
        Math.abs(diferenciaSueldo) < 1
    ) {

        resultadoProporcional = `
            <span style="color: green;">
                ✅ Cálculo correcto
            </span>
        `;
    }

    // Jornada parcial
    if (Number(jornadaSeleccionada) <= 30) {

        mensajeVariacion = `
            <span style="color: green;">
                ✅ El sueldo base es un ${porcentajeRedondeado}% superior al IMM proporcional vigente para una jornada de ${jornadaSeleccionada} horas.
            </span>
        `;

    // Jornada ordinaria
    } else {

        mensajeVariacion = `
            <span style="color: green;">
                ✅ El sueldo base supera el IMM vigente en ${porcentajeRedondeado}%.
            </span>
        `;
    }

// =====================================================
// 🔴 NO CUMPLE IMM
// =====================================================
} else {

    estadoResumenSueldoBase = "error";

    diferenciaResumenSueldoBase =
        Math.abs(diferenciaIMM);

    // -------------------------------------------------
    // ❌ Ocultar "Cálculo correcto"
    // si existe incumplimiento IMM
    // -------------------------------------------------
    resultadoProporcional = '';

    // Jornada parcial
    if (Number(jornadaSeleccionada) <= 30) {

        mensajeVariacion = `
            <span style="color: red;">
                ❌ El sueldo base es inferior al IMM proporcional vigente para una jornada de ${jornadaSeleccionada} horas.
                <br>
                Diferencia detectada:
                ${formatearCLP(
                    Math.abs(diferenciaIMM)
                )}
            </span>
        `;

    // Jornada ordinaria
    } else {

        mensajeVariacion = `
            <span style="color: red;">
                ❌ El sueldo base es inferior al IMM vigente.
                <br>
                Diferencia detectada:
                ${formatearCLP(
                    Math.abs(diferenciaIMM)
                )}
            </span>
        `;
    }
}

// =====================================================
// 🚦 RESUMEN MEC → SOLO VALIDACIÓN LEGAL IMM
// =====================================================

agregarResultadoResumen(
    "Sueldo Base",
    estadoResumenSueldoBase,
    diferenciaResumenSueldoBase
);

    // ----- HORAS EXTRAS 50% -----
    let resultadoHorasExtras = '';
    let estadoHorasExtras = "info";
    let diferenciaHorasExtras = 0;

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

if (
    horasExtrasRealizadas === "No especificadas" ||
    montoPagadoHorasExtras === "No encontrado"
) {

    estadoHorasExtras = "info";

    resultadoHorasExtras =
        `<span style="color: orange;">⛔ No se realizaron.</span>`;

} else {

    montoEsperadoHorasExtras =
        sueldoBaseContractual *
        factor *
        parseFloat(horasExtrasRealizadas);

    diferenciaHorasExtras =
        montoPagadoHorasExtras -
        montoEsperadoHorasExtras;

    if (Math.abs(diferenciaHorasExtras) < 1) {

        estadoHorasExtras = "ok";

        resultadoHorasExtras =
            `<span style="color: green;">✅ Cálculo correcto</span>`;

    } else {

        estadoHorasExtras = "error";

        resultadoHorasExtras =
            `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLP(diferenciaHorasExtras)}</span>`;
    }
}

    // ----- HORAS EXTRAS DOMINGO -----
    let resultadoHorasExtrasDomingo = '';
    let estadoHorasExtrasDomingo = "info";
    let diferenciaHorasExtrasDomingo = 0;

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

if (
    horasExtrasDomingoRealizadas === "No especificadas" ||
    montoPagadoHorasExtrasDomingo === "No encontrado"
) {

    estadoHorasExtrasDomingo = "info";

    resultadoHorasExtrasDomingo =
        `<span style="color: orange;">⛔ No se realizaron.</span>`;

} else {

    const valorHoraNormal =
        (sueldoBaseContractual / 30) *
        28 /
        (4 * jornadaSeleccionada);

    const valorHoraRecargoDomingo =
        valorHoraNormal * 1.3;

    const horaExtraDomingo =
        valorHoraRecargoDomingo * 1.5;

    montoEsperadoHorasExtrasDomingo =
        horaExtraDomingo *
        horasExtrasDomingoRealizadas;

    diferenciaHorasExtrasDomingo =
        montoPagadoHorasExtrasDomingo -
        montoEsperadoHorasExtrasDomingo;

    if (Math.abs(diferenciaHorasExtrasDomingo) < 1) {

        estadoHorasExtrasDomingo = "ok";

        resultadoHorasExtrasDomingo =
            `<span style="color: green;">✅ Cálculo correcto</span>`;

    } else {

        estadoHorasExtrasDomingo = "error";

        resultadoHorasExtrasDomingo =
            `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLP(diferenciaHorasExtrasDomingo)}</span>`;
    }
}

    // ----- RECARGO DOMINGO -----
    let resultadoRecargoDomingo = '';
    let estadoRecargoDomingo = "info";
    let diferenciaRecargoDomingo = 0;
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
if (
    montoPagadoRecargoDomingo === "No encontrado" &&
    horasRecargoDomingo === "No especificadas"
) {

    estadoRecargoDomingo = "info";

    resultadoRecargoDomingo =
        `<span style="color: orange;">⛔ No se realizaron.</span>`;

} else if (
    horasRecargoDomingo === "⛔ No tiene el tiempo realizado"
) {

    // ⚠ NO ES ERROR MONETARIO
    estadoRecargoDomingo = "warning";

    resultadoRecargoDomingo =
        `<span style="color: orange;">⚠ Falta el tiempo realizado.</span>`;

} else {

    const valorHoraNormal =
        (sueldoBaseContractual / 30) *
        28 /
        (4 * jornadaSeleccionada);

    const valorHoraRecargoDomingo =
        valorHoraNormal * 0.3;

    montoEsperadoRecargoDomingo =
        valorHoraRecargoDomingo *
        parseFloat(horasRecargoDomingo);

    diferenciaRecargoDomingo =
        montoPagadoRecargoDomingo -
        montoEsperadoRecargoDomingo;

    if (Math.abs(diferenciaRecargoDomingo) < 1) {

        estadoRecargoDomingo = "ok";

        resultadoRecargoDomingo =
            `<span style="color: green;">✅ Cálculo correcto</span>`;

    } else {

        estadoRecargoDomingo = "error";

        resultadoRecargoDomingo =
            `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLP(diferenciaRecargoDomingo)}</span>`;
    }
}

    // ----- RECARGO FESTIVO 50% -----
    let resultadoRecargoFestivo = '';
    let estadoRecargoFestivo = "info";
    let diferenciaRecargoFestivo = 0;

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

if (
    horasRecargoFestivoRealizadas === "No especificadas" ||
    montoPagadoRecargoFestivo === "No encontrado"
) {

    estadoRecargoFestivo = "info";

    resultadoRecargoFestivo =
        `<span style="color: orange;">⛔ No se realizaron.</span>`;

} else {

    const valorHoraNormal =
        (sueldoBaseContractual / 30) *
        28 /
        (4 * jornadaSeleccionada);

    const valorHoraRecargoFestivo =
        valorHoraNormal * 1.5;

    montoEsperadoRecargoFestivo =
        valorHoraRecargoFestivo *
        parseFloat(horasRecargoFestivoRealizadas);

    diferenciaRecargoFestivo =
        montoPagadoRecargoFestivo -
        montoEsperadoRecargoFestivo;

    if (Math.abs(diferenciaRecargoFestivo) < 1) {

        estadoRecargoFestivo = "ok";

        resultadoRecargoFestivo =
            `<span style="color: green;">✅ Cálculo correcto</span>`;

    } else {

        estadoRecargoFestivo = "error";

        resultadoRecargoFestivo =
            `<span style="color: red;">❌ Discrepancia detectada: ${formatearCLP(diferenciaRecargoFestivo)}</span>`;
    }
}

// =====================================================
// 🚦 RESUMEN SOBRETIEMPO (HORAS EXTRAS + RECARGOS)
// =====================================================

const estadosSobretiempo = [
    estadoHorasExtras,
    estadoHorasExtrasDomingo,
    estadoRecargoDomingo,
    estadoRecargoFestivo
];

let estadoSobretiempo = "ok";

if (estadosSobretiempo.includes("error")) {

    estadoSobretiempo = "error";

} else if (estadosSobretiempo.includes("warning")) {

    estadoSobretiempo = "warning";

} else if (
    estadosSobretiempo.every(e => e === "info")
) {

    estadoSobretiempo = "info";
}

// ======================================
// DIFERENCIA MONETARIA REAL
// ======================================

const diferenciaTotalSobretiempo = [

    diferenciaHorasExtras,
    diferenciaHorasExtrasDomingo,
    diferenciaRecargoDomingo,
    diferenciaRecargoFestivo

].reduce((acc, val) => {

    return acc + Math.abs(val || 0);

}, 0);

// guardar resumen real
agregarResultadoResumen(
    "Sobretiempo",
    estadoSobretiempo,
    diferenciaTotalSobretiempo
);

    
// *********** calculo diferencia de movilizacion ***********

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

    // *********** calculo diferencia de colacion ***********

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
    // *********** calculo diferencia de caja ***********

        const matchCaja = textoCompleto.match(regexCaja);
    let diasCaja = 21;
    let montoCaja = "Dato no encontrado";
    let valorDiaCaja = 0;
    if (matchCaja) {
        diasCaja = parseInt(matchCaja[1]);
        montoCaja = parseFloat(matchCaja[2].replace('.', '').replace(',', '.'));
        if (diasCaja > 0) {
            valorDiaCaja = montoCaja / diasCaja;
        }
    }

    const matchDiferenciaCaja = textoCompleto.match(regexDiferenciaCaja);
    let montoDiferenciaCaja = 0;
    let diasDiferenciaCaja = 0;
    let diasTotalesCaja = diasCaja;
    if (matchDiferenciaCaja) {
        montoDiferenciaCaja = parseFloat(matchDiferenciaCaja[1].replace('.', '').replace(',', '.'));
              if (valorDiaCaja > 0) {
            diasDiferenciaCaja = montoDiferenciaCaja / valorDiaCaja;
            diasTotalesCaja += diasDiferenciaCaja;
        }
    }

// =====================================================
// 🚦 RESUMEN ASIGNACIONES (MOVILIZACIÓN + COLACIÓN + CAJA)
// =====================================================

let estadoAsignaciones = "ok";

if (
    montoDiferenciaMovilizacion > 0 ||
    montoDiferenciaColacion > 0 ||
    montoDiferenciaCaja > 0
) {
    estadoAsignaciones = "warning";
}

// guardar en resumen global
agregarResultadoResumen("Asignaciones", estadoAsignaciones, 0);

// ***************** CALCULO SEMANA CORRIDA **************

let totalComisiones = 0;
const detallesComisiones = [];

const comisionesSeparadas = {
    "CONCURSO FPAY": 0,
    "DIF CONCURSO FPAY": 0
};

listaComision.forEach(comision => {
    const regex = new RegExp(`${comision.replace('.', '\\.')}(?:\\s|\\S)*?\\$\\s*((?:\\d{1,3}\\.){0,2}\\d{1,3}(?:,\\d{1,2})?)`, 'gi');
    const matches = [...textoCompleto.matchAll(regex)];

    matches.forEach(match => {
      const monto = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));

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
    detalleComisionesHTML = '⛔ No tiene comisiones individuales.';
}

// =====================================================
// 🚦 RESUMEN COMISIONES INDIVIDUALES
// =====================================================

let estadoComisiones = "ok";

if (detallesComisiones.length === 0 && totalComisiones === 0) {
    estadoComisiones = "info"; // no tiene comisiones
}

else if (detallesComisiones.length > 0 && totalComisiones === 0) {
    estadoComisiones = "warning"; // detectó ítems pero total quedó 0 → raro
}

// guardar en resumen global
agregarResultadoResumen("Comisiones", estadoComisiones, 0);

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

if (totalComisiones <= 0) {

    resultadoSemanaCorrida =
        `<span style="color: gray;">⚪ No aplica: no existen comisiones.</span>`;

    agregarResultadoResumen(
        "Semana Corrida",
        "info",
        0
    );

} else if (
    diasSemanaCorrida !== "No especificados" &&
    diasParaSemanaCorrida > 0
) {

    const valorDiarioComisiones =
        totalComisiones / diasParaSemanaCorrida;

    valorEsperadoSemanaCorrida =
        valorDiarioComisiones * diasSemanaCorrida;

    const diferenciaSemanaCorrida =
        montoSemanaCorrida -
        valorEsperadoSemanaCorrida;

    if (Math.abs(diferenciaSemanaCorrida) < 1) {

        resultadoSemanaCorrida =
            `<span style="color: green;">✅ Cálculo correcto</span>`;

        agregarResultadoResumen(
            "Semana Corrida",
            "ok",
            0
        );

    } else {

        resultadoSemanaCorrida =
            `<span style="color: red;">❌ Discrepancia detectada: Se esperaba ${formatearCLP(valorEsperadoSemanaCorrida)}. Diferencia: ${formatearCLP(diferenciaSemanaCorrida)}.</span>`;

        agregarResultadoResumen(
            "Semana Corrida",
            "error",
            diferenciaSemanaCorrida
        );
    }

} else {

    resultadoSemanaCorrida =
        `<span style="color: orange;">⚠ Información insuficiente para calcular semana corrida.</span>`;

    agregarResultadoResumen(
        "Semana Corrida",
        "warning",
        0
    );
}

    function procesarMonto(montoTexto) {
        return parseFloat(montoTexto.replace(/\./g, '').replace(',', '.'));
    }

//*************************** GRATIFICACIÓN ***************************

function identificarGratificables(texto) {

    let gratificablesEncontrados = [];

    let textoRestante = texto
        .replace(/\s+/g, ' ')
        .trim();

    textoRestante = textoRestante
        .replace(/[^\x20-\x7E]/g, ' ');

    listaGratificables.forEach(item => {

        const regex = new RegExp(
            `${item.replace(/\s+/g, '\\s*')}\\s*(?:\\(\\d+\\))?\\s*\\$\\s*([\\d.,]+)`,
            'i'
        );

        const match = textoRestante.match(regex);

        if (match) {

            gratificablesEncontrados.push({
                item: item,
                monto: procesarMonto(match[1])
            });

            textoRestante = textoRestante.replace(
                new RegExp(
                    match[0].replace(
                        /[-\/\\^$*+?.()|[\]{}]/g,
                        '\\$&'
                    ),
                    'i'
                ),
                ''
            ).trim();
        }
    });

    return gratificablesEncontrados;
}

function calcularTotalGratificacion(gratificables) {

    return gratificables.reduce(
        (total, item) => total + item.monto,
        0
    );
}

function mostrarValor(valor) {

    return isNaN(valor) || valor === null
        ? '$0'
        : new Intl.NumberFormat(
            'es-CL',
            {
                style: 'currency',
                currency: 'CLP'
            }
        ).format(valor);
}

const gratificables = identificarGratificables(textoCompleto);

// =====================================================
// 🚦 RESUMEN HABERES GRATIFICABLES
// =====================================================

let estadoGratificables = "ok";

if (!gratificables || gratificables.length === 0) {

    estadoGratificables = "warning";
}

// NO agregar aún.
// Se agregará después del análisis real de gratificación.

function obtenerJornadaMaxima(mes, año) {

    const meses = {
        ENERO: 1,
        FEBRERO: 2,
        MARZO: 3,
        ABRIL: 4,
        MAYO: 5,
        JUNIO: 6,
        JULIO: 7,
        AGOSTO: 8,
        SEPTIEMBRE: 9,
        OCTUBRE: 10,
        NOVIEMBRE: 11,
        DICIEMBRE: 12
    };

    const mesIndex =
        meses[mes.toUpperCase()] || 0;

    // 42 horas desde abril 2026
    if (
        año > 2026 ||
        (año === 2026 && mesIndex >= 4)
    ) {
        return 42;
    }

    // 44 horas desde mayo 2024
    if (
        año > 2024 ||
        (año === 2024 && mesIndex >= 5)
    ) {
        return 44;
    }

    return 45;
}

function mostrarGratificacionMec(gratificables) {

    const gratificacionContainer =
        document.getElementById('gratificacionMec');

    if (
        gratificacionContainer.style.display === 'block'
    ) {
        return;
    }

    const listaGratificablesHTML = gratificables
        .filter(gratificable => gratificable.monto > 0)
        .map(gratificable => {

            return `
                <li>
                    <strong>${gratificable.item}:</strong>
                    ${mostrarValor(gratificable.monto)}
                </li>
            `;
        })
        .join('');

    const totalGratificacion =
        calcularTotalGratificacion(gratificables);

    const valoresConsolidados = [

        sueldoProporcional || 0,

        montoPagadoHorasExtras || 0,

        montoPagadoHorasExtrasDomingo || 0,

        montoPagadoRecargoDomingo || 0,

        montoPagadoRecargoFestivo || 0,

        totalComisiones || 0,

        valorEsperadoSemanaCorrida || 0
    ];

    const valorTotalGratificacion =
        valoresConsolidados.reduce(
            (total, valor) =>
                total + (parseFloat(valor) || 0),
            totalGratificacion
        );

    calcularGratificacion(
        gratificables,
        textoCompleto,
        jornadaSeleccionada,
        mes,
        año,
        valorTotalGratificacion
    );

    const datosCalculadosHTML = `
        <ul>

            ${
                [
                    {
                        label: 'Sueldo Base',
                        value: sueldoProporcional
                    },

                    {
                        label: 'Hrs. Extras',
                        value: montoPagadoHorasExtras
                    },

                    {
                        label: 'Hrs. Extras Domingo',
                        value: montoPagadoHorasExtrasDomingo
                    },

                    {
                        label: 'Hrs. Recargo Domingo',
                        value: montoPagadoRecargoDomingo
                    },

                    {
                        label: 'Recargo 50% Festivo',
                        value: montoPagadoRecargoFestivo
                    },

                    {
                        label: 'Suma Comisiones',
                        value: totalComisiones
                    },

                    {
                        label: 'Semana Corrida',
                        value: valorEsperadoSemanaCorrida > 0
                            ? valorEsperadoSemanaCorrida
                            : 0
                    }

                ]
                .filter(item => item.value > 0)
                .map(item => `
                    <li>
                        <strong>${item.label}:</strong>
                        ${mostrarValor(item.value)}
                    </li>
                `)
                .join('')
            }

        </ul>
    `;

    const gratificablesHTML = `
        <ul>
            ${listaGratificablesHTML}
        </ul>
    `;

    const valorTotalHTML = `
        <p>
            <strong>
                SUMA TOTAL HABERES:
                ${mostrarValor(valorTotalGratificacion)}
            </strong>
        </p>
    `;

    const gratificacionHTML =
        datosCalculadosHTML +
        gratificablesHTML +
        valorTotalHTML;

    if (
        document.getElementById('listaGratificables').innerHTML
        !== gratificacionHTML
    ) {

        document.getElementById(
            'listaGratificables'
        ).innerHTML = gratificacionHTML;
    }

    gratificacionContainer.style.display = 'block';
}

function calcularGratificacion(
    gratificables,
    textoCompleto,
    jornadaSeleccionada,
    mes,
    año,
    valorTotalGratificacion
) {

    jornadaSeleccionada =
        Number(jornadaSeleccionada) || 0;

    const meses = {

        ENERO: 1,
        FEBRERO: 2,
        MARZO: 3,
        ABRIL: 4,
        MAYO: 5,
        JUNIO: 6,
        JULIO: 7,
        AGOSTO: 8,
        SEPTIEMBRE: 9,
        OCTUBRE: 10,
        NOVIEMBRE: 11,
        DICIEMBRE: 12
    };

    const mesesOrden = [

        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE"
    ];

    const mesActual =
        mes.toUpperCase();

    // =====================================================
    // IMM
    // =====================================================

    let inm =
        ingresosMinimos[año]?.[mesActual] || 0;

    if (!inm || inm < 300000) {

        const idx =
            mesesOrden.indexOf(mesActual);

        if (idx > 0) {

            const mesAnterior =
                mesesOrden[idx - 1];

            const inmAnterior =
                ingresosMinimos[año]?.[mesAnterior] || 0;

            if (inmAnterior > 0) {

                inm = inmAnterior;
            }
        }
    }

    if (!inm) {

        console.error(
            "IMM no disponible para este mes."
        );

        return;
    }

    // =====================================================
    // VALIDAR MES
    // =====================================================

    const mesIndex = meses[mesActual];

    if (!mesIndex) {

        console.error("Mes inválido.");

        return;
    }

    // =====================================================
    // JORNADA MÁXIMA
    // =====================================================

    let jornadaMaxima = 45;

    if (
        año > 2026 ||
        (año === 2026 && mesIndex >= 4)
    ) {

        jornadaMaxima = 42;
    }

    if (
        año > 2024 ||
        (año === 2024 && mesIndex >= 5)
    ) {

        jornadaMaxima = 44;
    }

    // =====================================================
    // 25% HABERES
    // =====================================================

    const resultadoCalculado =
        valorTotalGratificacion * 0.25;

    // =====================================================
    // GRATIFICACIÓN CON TOPE
    // =====================================================

    const topeGratificacion =
        (4.75 * inm) / 12;

    let topeProporcional;

    let notaProporcional = "";

    if (jornadaSeleccionada > 30) {

        topeProporcional =
            topeGratificacion;

        notaProporcional =
            " (no aplica proporcionalidad)";

    } else {

        topeProporcional =
            (topeGratificacion / jornadaMaxima)
            * jornadaSeleccionada;
    }

    let valorConTope;

    if (jornadaSeleccionada > 30) {

        valorConTope = Math.round(
            Math.min(
                resultadoCalculado,
                topeGratificacion
            )
        );

    } else {

        valorConTope = Math.round(
            Math.min(
                resultadoCalculado,
                topeProporcional
            )
        );
    }

    // =====================================================
    // GRATIFICACIÓN SIN TOPE
    // =====================================================

    const valorSinTope =
        Math.round(resultadoCalculado);

    // =====================================================
    // EXTRAER PDF
    // =====================================================

    const regexGratificacionPDF =
        /GRATIFICACION\s*25\s*%\s*(?:\(?C\.?T\.?\)?|\(?S\.?T\.?\)?)\s*\$\s*([\d.,]+)/i;

    const matchGratificacionPDF =
        textoCompleto.match(regexGratificacionPDF);

    const gratificacionPDF =
        matchGratificacionPDF
            ? parseFloat(
                matchGratificacionPDF[1]
                    .replace(/\./g, '')
                    .replace(',', '.')
            )
            : 0;

    // =====================================================
    // DETECTAR TIPO PDF
    // =====================================================

    const esST =
        /GRATIFICACION\s*25\s*%\s*\(?S\.?T\.?\)?/i
            .test(textoCompleto);

    const esCT =
        /GRATIFICACION\s*25\s*%\s*\(?C\.?T\.?\)?/i
            .test(textoCompleto);

    let tipoDetectado = "No identificado";

    if (esST) {

        tipoDetectado =
            "Gratificación Sin Tope (S.T.)";

    } else if (esCT) {

        tipoDetectado =
            "Gratificación Con Tope (C.T.)";
    }

 // =====================================================
// COMPARACIONES
// =====================================================

const diferenciaConTope =
    gratificacionPDF - valorConTope;

const diferenciaSinTope =
    gratificacionPDF - valorSinTope;

let comparacionHTML = "";

let estadoGratificacionResumen = "ok";
let diferenciaResumenGratificacion = 0;

if (
    Math.abs(diferenciaConTope) < 1
) {

    comparacionHTML = `
        <span style="color:green;">
            ✅ Coincide con Gratificación CON TOPE
        </span>
    `;

    estadoGratificacionResumen = "ok";

} else if (
    Math.abs(diferenciaSinTope) < 1
) {

    comparacionHTML = `
        <span style="color:green;">
            ✅ Coincide con Gratificación SIN TOPE
        </span>
    `;

    estadoGratificacionResumen = "ok";

} else {

    const diferenciaMinima = Math.min(
        Math.abs(diferenciaConTope),
        Math.abs(diferenciaSinTope)
    );

    diferenciaResumenGratificacion =
        diferenciaMinima;

    if (diferenciaMinima <= 100) {

        estadoGratificacionResumen = "warning";

        comparacionHTML = `
            <span style="color:orange;">
                ⚠ Existe una pequeña diferencia detectada.<br>
                Diferencia: <b>${formatCurrency(diferenciaMinima)}</b>
            </span>
        `;

    } else {

        estadoGratificacionResumen = "error";

        comparacionHTML = `
            <span style="color:red;">
                ❌ El monto pagado en la liquidación NO coincide con el cálculo esperado.<br>
                Diferencia detectada: <b>${formatCurrency(diferenciaMinima)}</b>
            </span>
        `;
    }
}

// =====================================================
// 🚦 RESUMEN GRATIFICACIÓN
// =====================================================

agregarResultadoResumen(
    "Gratificación",
    estadoGratificacionResumen,
    diferenciaResumenGratificacion
);

    // =====================================================
    // RESULTADO HTML
    // =====================================================

    const resultadoHTML = `

        <h2>7. Cálculo Gratificación</h2>

        <p>
            <strong>
                Tipo detectado:
            </strong>

            ${tipoDetectado}
        </p>

        <hr>

        <p>
            <strong>
                25% Suma Total Haberes:
            </strong>

            ${formatCurrency(resultadoCalculado)}
        </p>

        <hr>

        <p>
            <strong>
                Gratificación CON TOPE:
            </strong>
        </p>

        <p>
            IMM utilizado:
            ${formatCurrency(inm)}
        </p>

        <p>
            Jornada máxima:
            ${jornadaMaxima} horas
        </p>

        <p>
            Tope mensual:
            ${formatCurrency(
                Math.round(topeGratificacion)
            )}
        </p>

        <p>
            Tope proporcional:
            ${formatCurrency(
                Math.round(topeProporcional)
            )}

            ${notaProporcional}
        </p>

        <p>
            <strong>
                Resultado CON TOPE:
            </strong>

            ${formatCurrency(valorConTope)}
        </p>

        <hr>

        <p>
            <strong>
                Gratificación SIN TOPE:
            </strong>

            ${formatCurrency(valorSinTope)}
        </p>

        <hr>

        <p>
            <strong>
                Monto extraído PDF:
            </strong>

            ${formatCurrency(gratificacionPDF)}
        </p>

        <p>
            <strong>
                Análisis:
            </strong>

            ${comparacionHTML}
        </p>
    `;

    document.getElementById(
        'resultadoGratificacion'
    ).innerHTML = resultadoHTML;
}

    // ===== Mostrar resultados en HTML =====
    document.getElementById('resultadoAnalisis').innerHTML = `
    <div id="resumenMecContainer">
        ${generarResumenAnalisisHTML()}
    </div>
<hr>
        <p><strong>Mes y Año: </strong> ${mes} DE ${año}. <strong>
        <p>Jornada: </strong> ${jornadaSeleccionada} horas.</p>
        <p><strong>Cargo:</strong> ${cargo}</p>
        <p><strong>IMM Vigente ${año}:</strong> ${formatCurrency(inm)}</p>
<hr>
        <h2>1. Sueldo</h2>
        <p><strong>Sueldo Base:</strong> ${sueldoBaseContractual ? formatCurrency(sueldoBaseContractual) : 'No encontrado'}.</p>
        <p><strong>Días Trabajados:</strong> ${diasTrabajados || 'No encontrados'}. <strong>Pagado:</strong> ${sueldoProporcional ? formatCurrency(sueldoProporcional) : 'No encontrado'}.</p>
        <p><strong>Análisis:</strong> ${resultadoProporcional}.</p>  
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
<p><strong>Movilización:</strong> Días: ${diasMovilizacion}, Monto: ${montoMovilizacion !== "Dato no encontrado" ? formatCurrency(montoMovilizacion) : 'Dato no encontrado'}.</p>
${montoDiferenciaMovilizacion !== 0 ? `<p><strong>Dif. Movilización:</strong> ${formatCurrency(montoDiferenciaMovilizacion)}.</p>` : ''}
<p><strong>Días Totales:</strong> ${Math.round(diasTotalesMovilizacion)}</p>
<p><strong>Colación:</strong> Días: ${diasColacion}, Monto: ${montoColacion !== "Dato no encontrado" ? formatCurrency(montoColacion) : 'Dato no encontrado'}.</p>
${montoDiferenciaColacion !== 0 ? `<p><strong>Dif. Colación:</strong> ${formatCurrency(montoDiferenciaColacion)}.</p>` : ''}
<p><strong>Días Totales:</strong> ${Math.round(diasTotalesColacion)}</p>
<p><strong>Caja:</strong> Días: ${diasCaja}, Monto: ${montoCaja !== "Dato no encontrado" ? formatCurrency(montoCaja) : 'Dato no encontrado'}.</p>
${montoDiferenciaCaja !== 0 ? `<p><strong>Dif. Caja:</strong> ${formatCurrency(montoDiferenciaCaja)}.</p>` : ''}
<p><strong>Días Totales:</strong> ${Math.round(diasTotalesCaja)}</p>
<hr>
        <h2>4. Comisiones</h2>
        <p>${detalleComisionesHTML}</p>
        <p><strong>Total Comisiones:</strong> ${formatCurrency(totalComisiones)}</p>
<hr>
        <h2>5. Semana Corrida</h2>
        <p><strong>Domingos y Festivos:</strong> (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'} días) <strong>Monto:</strong> ${formatCurrency(montoSemanaCorrida)}.</p>
        <p><strong>Análisis:</strong> ${resultadoSemanaCorrida}</p>
        <p>${formatCurrency(totalComisiones)} ÷ Días Totales: (${Math.round(diasParaSemanaCorrida)}) × Dom. y Fest.: (${diasSemanaCorrida !== "No especificados" ? diasSemanaCorrida : 'No especificado'}) = ${formatCurrency(valorEsperadoSemanaCorrida)}.</p>
<hr>
        <div class="container gratificacion-container" id="gratificacionMec" style="display: none;">
        <h2>6. Haberes Gratificables</h2>
        <p id="listaGratificables"></p>
        </div>
<hr>
  `;

mostrarGratificacionMec(gratificables);

// 🔄 refrescar SOLO el resumen
document.getElementById('resumenMecContainer').innerHTML =
    generarResumenAnalisisHTML();
  
// ---------- INICIA: ANÁLISIS COMISIÓN GRUPAL (ASESOR DE COMPRAS) ----------

// Detectar premio grupal real en la nómina
const regexPremioNomina = /PREMIO\s*VENTA\s*TIENDA\s*AUT\.?\s*\$?\s*([\d\.,]+)/i;
const matchPremioNomina = textoCompleto.match(regexPremioNomina);
const comisionPagadaEnNomina = matchPremioNomina ? procesarMonto(matchPremioNomina[1]) : 0;

// Extraer horas asesor desde nómina
let horasAsesor = 0;
const regexHorasAsesorEnNomina = /Horas\s*Trabajadas\s*Asesor\s*[:\-]?\s*([\d\.,]+)/i;
const mHorasAsesor1 = textoCompleto.match(regexHorasAsesorEnNomina);
if (mHorasAsesor1) {
    horasAsesor = parseFloat(String(mHorasAsesor1[1]).replace(/\./g, '').replace(',', '.'));
}

// ---------- EXTRAER REPORTE PREMIO ----------
async function extraerDatosReportePremio(archivo) {
    if (!archivo) return null;
    try {
        const textoPremio = await extraerTextoDePDF(archivo);
        const t = textoPremio.replace(/\s+/g, ' ');

        const rmVentaTienda = t.match(/Venta\s+Tienda\s*\$?\s*([\d\.,]+)/i);
        const rmVentaKiosco = t.match(/Venta\s+Kiosco\s+Tienda\s*\$?\s*([\d\.,]+)/i);
        const rmVentaCambioDev = t.match(/Venta\s+Cambio\s+Devoluci[oó]n\s*\$?\s*([\d\.,]+)/i);

        const ventaTiendaTotal =
            (rmVentaTienda ? procesarMonto(rmVentaTienda[1]) : 0) +
            (rmVentaKiosco ? procesarMonto(rmVentaKiosco[1]) : 0) +
            (rmVentaCambioDev ? procesarMonto(rmVentaCambioDev[1]) : 0);

        const horasDept = (t.match(/Horas\s+Trabajadas\s+Departamento\s+Asistido\s*[:\-]?\s*([\d\.,]+)/i));
        const horasAs   = (t.match(/Horas\s+Trabajadas\s+Asesor\s*[:\-]?\s*([\d\.,]+)/i));
        const pct       = (t.match(/Departamento\s+Asistido[:\s]*([\d\.,]+)%/i));

        const montoBruto = t.match(/Monto\s+bruto\s+incentivo\s*\$?\s*([\d\.,]+)/i)
                         || t.match(/Monto\s+Total\s+Incentivo\s*\$?\s*([\d\.,]+)/i);

        return {
            ventaTiendaTotal,
            horasDept: horasDept ? procesarMonto(horasDept[1]) : 0,
            horasAs: horasAs ? procesarMonto(horasAs[1]) : 0,
            pctDept: pct ? parseFloat(String(pct[1]).replace(',', '.')) / 100 : 0.0026,
            montoBrutoIncentivo: montoBruto ? procesarMonto(montoBruto[1]) : null
        };

    } catch (e) {
        console.error('Error leyendo archivo premio:', e);
        return null;
    }
}

let datosReporte = null;
const inputPremioEl = document.getElementById('filePremio');
if (inputPremioEl?.files?.length > 0) {
    datosReporte = await extraerDatosReportePremio(inputPremioEl.files[0]);
}

let ventaTiendaTotal = datosReporte?.ventaTiendaTotal || 0;
let horasTotalesDept = datosReporte?.horasDept || 0;
let horasAsesorReporte = datosReporte?.horasAs || 0;
let porcentajeDept = datosReporte?.pctDept || 0.0026;
let montoBrutoIncentivo = datosReporte?.montoBrutoIncentivo ?? null;

if ((!horasAsesor || horasAsesor === 0) && horasAsesorReporte) {
    horasAsesor = horasAsesorReporte;
}

// ---------- CÁLCULO ----------
let comisionCalculada = 0;
if (ventaTiendaTotal > 0 && horasTotalesDept > 0 && horasAsesor > 0) {
    const valorHora = (ventaTiendaTotal / horasTotalesDept) * porcentajeDept;
    comisionCalculada = Math.round(valorHora * horasAsesor);
}

// ---------- INTEGRAR MODO MANUAL ----------
if (window.calculoManualMEC) {
    comisionCalculada = Math.round(window.calculoManualMEC.comisionCalculada);
    ventaTiendaTotal  = window.calculoManualMEC.ventaTienda;
    horasTotalesDept  = window.calculoManualMEC.horasDepto;
    horasAsesor       = window.calculoManualMEC.horasAsesor;
    porcentajeDept    = window.calculoManualMEC.porcentaje;
}

// ======================================================
// ⭐ CLAVE DEL FIX: SI NO HAY DATOS → NO MOSTRAR NADA
// ======================================================

const hayDatosPDF =
    ventaTiendaTotal > 0 &&
    horasTotalesDept > 0 &&
    horasAsesor > 0;

const hayDatosManual =
    window.calculoManualMEC &&
    window.calculoManualMEC.comisionCalculada > 0;

const hayComisionNomina = comisionPagadaEnNomina > 0;

if (!(hayDatosPDF || hayDatosManual || hayComisionNomina)) {
    console.log("🚫 No hay comisión grupal → bloque oculto");
} else {

    let pagosTxt = [];
    pagosTxt.push(`<h2>Comisión Grupal — análisis</h2>`);
    pagosTxt.push(`<p><strong>Comisión detectada en la nómina:</strong> ${formatCurrency(comisionPagadaEnNomina)}</p>`);

    if (datosReporte || hayDatosManual) {
        pagosTxt.push(`<p><strong>Venta Tienda Total:</strong> ${formatCurrency(ventaTiendaTotal)}</p>`);
        pagosTxt.push(`<p><strong>Horas Totales Departamento:</strong> ${horasTotalesDept}</p>`);
        pagosTxt.push(`<p><strong>Horas Asesor:</strong> ${horasAsesor}</p>`);
        pagosTxt.push(`<p><strong>Porcentaje departamento:</strong> ${(porcentajeDept*100).toFixed(1)}%</p>`);
    }

    pagosTxt.push(`<p><strong>Comisión calculada:</strong> ${formatCurrency(comisionCalculada)}</p>`);

    mostrarResultadoFreemium(pagosTxt.join('')); }
}

/**********************************************
 *  MODO MANUAL DE COMISIÓN GRUPAL (Opción 1)
 **********************************************/

// Botón para mostrar/ocultar el ingreso manual
const btnIngresoManual = document.getElementById("btnIngresoManual");
const formularioManual = document.getElementById("formularioManual");
const filePremio = document.getElementById("filePremio");

// Mostrar u ocultar el formulario manual
if (btnIngresoManual) {
    btnIngresoManual.addEventListener("click", () => {
        if (formularioManual.style.display === "none") {
            formularioManual.style.display = "block";
            filePremio.style.display = "none";   // Oculta la subida de PDF del premio
            btnIngresoManual.style.background = "#FF9800";
            btnIngresoManual.textContent = "Usar archivo PDF nuevamente";
        } else {
            formularioManual.style.display = "none";
            filePremio.style.display = "block";
            btnIngresoManual.style.background = "#4CAF50";
            btnIngresoManual.textContent = "Ingresar datos manuales";
        }
    });
}

/**********************************************
 *  CÁLCULO MANUAL DE COMISIÓN GRUPAL
 **********************************************/

// Función principal del cálculo manual
function calcularComisionManual() {

    const horasAsesor = parseFloat(document.getElementById("manualHorasAsesor").value);
    const horasDepto = parseFloat(document.getElementById("manualHorasDepto").value);
    const ventaTienda = parseFloat(document.getElementById("manualVentaTienda").value);
    const porcentaje = parseFloat(document.getElementById("manualPorcentaje").value);

    if (isNaN(horasAsesor) || isNaN(horasDepto) || isNaN(ventaTienda) || isNaN(porcentaje)) {
        alert("⚠ Debes ingresar TODOS los datos manuales.");
        return null;
    }

    if (horasAsesor <= 0 || horasDepto <= 0 || ventaTienda <= 0 || porcentaje <= 0) {
        alert("⚠ Ningún dato puede ser 0 o negativo.");
        return null;
    }

    // Fórmula oficial
    const valorHora = (ventaTienda / horasDepto) * porcentaje;
    const comisionCalculada = valorHora * horasAsesor;

    return {
        valorHora,
        comisionCalculada,
        horasAsesor,
        horasDepto,
        ventaTienda,
        porcentaje
    };
}

/**********************************************
 *  BOTÓN CALCULAR MANUAL
 **********************************************/

const btnCalcularManual = document.getElementById("btnCalcularManual");

if (btnCalcularManual) {
    btnCalcularManual.addEventListener("click", () => {

        const datos = calcularComisionManual();
        if (!datos) return;

        // Mostrar resultado en pantalla (al mismo contenedor que usas hoy)
        const contenedor = document.getElementById("resultadoAnalisis");

        contenedor.innerHTML = `
            <h3>Resultado Comisión Manual</h3>
            <p><strong>Valor por hora:</strong> ${formatearCLP(datos.valorHora)}</p>
            <p><strong>Comisión Calculada:</strong> ${formatearCLP(datos.comisionCalculada)}</p>
            <p><strong>Horas Asesor:</strong> ${datos.horasAsesor}</p>
            <p><strong>Horas Depto:</strong> ${datos.horasDepto}</p>
            <p><strong>Venta Tienda:</strong> $${datos.ventaTienda}</p>
            <p><strong>Porcentaje:</strong> ${datos.porcentaje}</p>
            <hr>
            <p style="color: #0288D1;"><strong>Comparación con la liquidación aparecerá cuando termines el análisis completo.</strong></p>
        `;

        // Guardamos el cálculo manual para integrarlo con analizarArchivo()
        window.calculoManualMEC = datos;

        alert("✔ Datos manuales listos. Ahora presiona CALCULAR para integrarlos con tu liquidación.");
    });
}

// ---------- FIN: ANÁLISIS LIQUIDACION ----------

// ---------- boton que guia a calculo por hora o jornada ----------

function decidirAnalisis() {
  const select = document.getElementById('jornada');
  const valor = select.value;

  if (!valor) {
    alert("Debes seleccionar una jornada o 'Contrato por hora'.");
    return;
  }

  if (valor === 'HORA') {
    // NUEVO flujo (lo implementaremos con analisis_hora.js)
    analizarLiquidacionPorHora();
  } else {
    // FLUJO ORIGINAL: se mantiene igual que antes
    preValidarAntesDeAnalizar();
  }
}

window.decidirAnalisis = decidirAnalisis;

// ---------- FIN: ANÁLISIS LIQUIDACION ----------

// Hacer accesibles desde HTML / otros scripts
window.preValidarAntesDeAnalizar = preValidarAntesDeAnalizar;
window.analizarArchivo = analizarArchivo;
window.mostrarResultadoFreemium = mostrarResultadoFreemium;

// =====================================================
// HELPER COMPARTIDO: ASIGNACIONES DESDE TEXTO
// (Movilización, Colación, Caja + diferencias y días totales)
// =====================================================
function extraerAsignacionesDesdeTexto(textoCompleto) {
  const regexMovilizacion = /MOVILIZACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
  const regexColacion = /COLACION\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
  const regexDiferenciaMovilizacion = /DIFERENCIA\s*MOVILIZACION\s*\$\s*([\d.,]+)/i;
  const regexDiferenciaColacion = /DIFERENCIA\s*COLACION\s*\$\s*([\d.,]+)/i;
  const regexCaja = /CAJA\s*\((\d+)\)\s*\$\s*([\d.]+)/i;
  const regexDiferenciaCaja = /DIF(?:ERENCIA)?(?:\s+ASIG\.?)?(?:\s+DE)?\s*CAJA.*?\$\s*([\d\.]+)/i;

  // *********** MOVILIZACIÓN ***********
  const matchMovilizacion = textoCompleto.match(regexMovilizacion);
  let diasMovilizacion = 21;
  let montoMovilizacion = null;
  let valorDiaMovilizacion = 0;

  if (matchMovilizacion) {
    diasMovilizacion = parseInt(matchMovilizacion[1], 10);
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

  // *********** COLACIÓN ***********
  const matchColacion = textoCompleto.match(regexColacion);
  let diasColacion = 21;
  let montoColacion = null;
  let valorDiaColacion = 0;

  if (matchColacion) {
    diasColacion = parseInt(matchColacion[1], 10);
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

  // *********** CAJA ***********
  const matchCaja = textoCompleto.match(regexCaja);
  let diasCaja = 21;
  let montoCaja = null;
  let valorDiaCaja = 0;

  if (matchCaja) {
    diasCaja = parseInt(matchCaja[1], 10);
    montoCaja = parseFloat(matchCaja[2].replace('.', '').replace(',', '.'));
    if (diasCaja > 0) {
      valorDiaCaja = montoCaja / diasCaja;
    }
  }

  const matchDiferenciaCaja = textoCompleto.match(regexDiferenciaCaja);
  let montoDiferenciaCaja = 0;
  let diasDiferenciaCaja = 0;
  let diasTotalesCaja = diasCaja;

  if (matchDiferenciaCaja) {
    montoDiferenciaCaja = parseFloat(matchDiferenciaCaja[1].replace('.', '').replace(',', '.'));
    if (valorDiaCaja > 0) {
      diasDiferenciaCaja = montoDiferenciaCaja / valorDiaCaja;
      diasTotalesCaja += diasDiferenciaCaja;
    }
  }

  let estadoAsignaciones = "ok";
  if (montoDiferenciaMovilizacion > 0 || montoDiferenciaColacion > 0 || montoDiferenciaCaja > 0) {
    estadoAsignaciones = "warning";
  }

  return {
    movilizacion: {
      dias: diasMovilizacion,
      monto: montoMovilizacion,
      valorDia: valorDiaMovilizacion,
      diferencia: montoDiferenciaMovilizacion,
      diasTotales: diasTotalesMovilizacion
    },
    colacion: {
      dias: diasColacion,
      monto: montoColacion,
      valorDia: valorDiaColacion,
      diferencia: montoDiferenciaColacion,
      diasTotales: diasTotalesColacion
    },
    caja: {
      dias: diasCaja,
      monto: montoCaja,
      valorDia: valorDiaCaja,
      diferencia: montoDiferenciaCaja,
      diasTotales: diasTotalesCaja
    },
    estadoAsignaciones
  };
}

// =====================================================
// HELPER COMPARTIDO: COMISIONES + SEMANA CORRIDA
// (solo datos, sin tocar resumenAnalisis)
// =====================================================
function extraerComisionesYSemanaCorridaDesdeTexto(textoCompleto, diasTotalesMovilizacion) {
  // 1) Comisiones individuales
  let totalComisiones = 0;
  const detallesComisiones = [];
  const comisionesSeparadas = {
    "CONCURSO FPAY": 0,
    "DIF CONCURSO FPAY": 0
  };

  listaComision.forEach(comision => {
    const regex = new RegExp(
      `${comision.replace('.', '\\.')}(?:\\s|\\S)*?\\$\\s*((?:\\d{1,3}\\.){0,2}\\d{1,3}(?:,\\d{1,2})?)`,
      'gi'
    );
    const matches = [...textoCompleto.matchAll(regex)];
    matches.forEach(match => {
      const monto = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
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

  // 2) Semana corrida
  const regexSemanaCorrida = /SEMANA\s*CORRIDA\s*\((\d+)\)\s*\$\s*([\d.,]+)/i;
  const matchSemanaCorrida = textoCompleto.match(regexSemanaCorrida);

  let montoSemanaCorrida = 0;
  let valorEsperadoSemanaCorrida = 0;
  let diasSemanaCorrida = "No especificados";
  let estadoSemanaCorrida = "info";
  let diferenciaSemanaCorrida = 0;

  if (matchSemanaCorrida) {
    diasSemanaCorrida = parseInt(matchSemanaCorrida[1], 10);
    montoSemanaCorrida = parseFloat(matchSemanaCorrida[2].replace('.', '').replace(',', '.'));
  } else {
    montoSemanaCorrida = 0;
  }

  // misma lógica que el análisis normal: usar días de mov. y, si >23, probar 21/22/23
  let diasParaSemanaCorrida = diasTotalesMovilizacion || 0;

  if (diasParaSemanaCorrida > 23) {
    let mejorValor = 21;
    let menorDiscrepancia = Infinity;

    const valorEsperado21 = (totalComisiones / 21) * (diasSemanaCorrida === "No especificados" ? 0 : diasSemanaCorrida);
    const discrepancia21 = Math.abs(valorEsperado21 - montoSemanaCorrida);

    const valorEsperado22 = (totalComisiones / 22) * (diasSemanaCorrida === "No especificados" ? 0 : diasSemanaCorrida);
    const discrepancia22 = Math.abs(valorEsperado22 - montoSemanaCorrida);

    const valorEsperado23 = (totalComisiones / 23) * (diasSemanaCorrida === "No especificados" ? 0 : diasSemanaCorrida);
    const discrepancia23 = Math.abs(valorEsperado23 - montoSemanaCorrida);

    if (discrepancia22 < discrepancia21 && discrepancia22 < discrepancia23) {
      diasParaSemanaCorrida = 22;
    } else if (discrepancia23 < discrepancia21 && discrepancia23 < discrepancia22) {
      diasParaSemanaCorrida = 23;
    } else {
      diasParaSemanaCorrida = 21;
    }
  }

  if (totalComisiones <= 0) {
    // No hay comisiones → no aplica
    estadoSemanaCorrida = "info";
  } else if (
    diasSemanaCorrida !== "No especificados" &&
    diasParaSemanaCorrida > 0
  ) {
    const valorDiarioComisiones = totalComisiones / diasParaSemanaCorrida;
    valorEsperadoSemanaCorrida = valorDiarioComisiones * diasSemanaCorrida;
    diferenciaSemanaCorrida = montoSemanaCorrida - valorEsperadoSemanaCorrida;

    if (Math.abs(diferenciaSemanaCorrida) < 1) {
      estadoSemanaCorrida = "ok";
    } else {
      estadoSemanaCorrida = "error";
    }
  } else {
    // Información insuficiente
    estadoSemanaCorrida = "warning";
  }

  return {
    totalComisiones,
    detallesComisiones,
    semanaCorrida: {
      diasSemanaCorrida,
      montoSemanaCorrida,
      diasParaSemanaCorrida,
      valorEsperadoSemanaCorrida,
      diferenciaSemanaCorrida,
      estadoSemanaCorrida
    }
  };
}
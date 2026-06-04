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
    "PROMOCIONES CMR", "COMISION CONNECT", "SEMANA CORRIDA", "BONO CLICK AND COLLECT","HORAS RECARGO DOMINGO",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "GARANTIZADO", "INCENTIVO CONFIABILIDAD", "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO",
    "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", "PREMIO CUMPL.GRUPAL NPS",
    "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.",
    "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD", "DIFERENCIA SEMANA CORRIDA", "BONO CERTIFICACION", "DIF. COMISIONES",
    "COMISION VACACIONES","DIF COMISION DIGITA Y GANA","COMISIÓN SEGURO DE VIDA","NS OMNICANAL","NPS OMNICANAL"
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

    // 🔒 BLOQUEO CORRECTO PARA VACACIONES (usa el feature definido en permissions.js)
    if (!PERMISSIONS.requireFeature(PERMISSIONS.FEATURES.VACACIONES, "Cálculo de Vacaciones")) return;
    
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


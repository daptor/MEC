// Normalizar texto (quita tildes, espacios múltiples y lleva a mayúsculas)
function normalizarTexto(str) {
    if (!str) return '';
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function formatearMonto(monto) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto);
}

function procesarMonto(textoMonto) {
    if (textoMonto === null || textoMonto === undefined) return 0;
    const s = textoMonto.toString().trim();
    if (s === '') return 0;
    // quitar todo lo que no sea dígito, punto, coma o guión/menos
    const cleaned = s.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    if (Number.isNaN(n)) {
        console.warn('procesarMonto: no se pudo parsear ->', textoMonto, 'limpio->', cleaned);
        return 0;
    }
    return n;
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
    return normalizarTexto(textoCompleto);
}

// Lista de comisiones (se incluye "COMISION VACACIONES")
const listaComisionVacaciones = [
    "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA", "COMI. KIOSCO OTRAS EMPRESAS",
    "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA", "COMPENSACION PERMISO", "DIF CONCURSO FPAY",
    "PROMOCIONES CMR", "COMISION CONNECT", "SEMANA CORRIDA", "BONO CLICK AND COLLECT", "HORAS RECARGO DOMINGO",
    "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA",
    "GARANTIZADO", "INCENTIVO CONFIABILIDAD", "INCENTIVO PRODUC CAJAS AUT", "INCENTIVO RECUPERO",
    "INCENTIVO SELF CHECK OUT", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", "PREMIO CUMPL.GRUPAL NPS",
    "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.",
    "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "HORAS RECARGO NAVIDAD", "DIFERENCIA SEMANA CORRIDA", "BONO CERTIFICACION", "DIF. COMISIONES",
    "COMISION VACACIONES", "DIF COMISION DIGITA Y GANA", "COMISION SEGURO DE VIDA", "NPS OMNICANAL"
].map(s => normalizarTexto(s));

// Ordenar por longitud para priorizar conceptos más específicos
const listaOrdenadaPorLongitud = [...listaComisionVacaciones].sort((a, b) => b.length - a.length);

function escaparRegex(s) {
    return s.replace(/([.+*?^${}()|\[\]\/\\])/g, "\\$1");
}

function extraerItemsDePDF(texto) {
    const items = [];
    const lineas = texto.split(/\r?\n/);
    const conceptosUsadosPorLinea = new Map();

    for (const item of listaOrdenadaPorLongitud) {
        const itemRegex = escaparRegex(item);

        // 1) Búsqueda principal: exige separador válido tras el concepto
        //    y toma el monto más cercano después del nombre.
        const regexPrincipal = new RegExp(
            `${itemRegex}(?:\\s*\\([0-9]+(?:[\\.,][0-9]+)?\\))?(?:\\s|:|\\(|\\$|$){1}(?:[\\s\\S]{0,40}?)\\$?\\s*([0-9]+(?:\\.[0-9]{3})*(?:,[0-9]+)?)`,
            "i"
        );

        const resultado = texto.match(regexPrincipal);
        if (resultado && resultado[1]) {
            const monto = procesarMonto(resultado[1]);
            items.push({ nombre: item, monto });
            continue;
        }

        // 2) Fallback por línea:
        //    buscar el concepto con separador válido y tomar el último monto de esa línea,
        //    evitando reasignar el mismo monto en una línea ya consumida por un concepto más largo.
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i];
            const regexLinea = new RegExp(
                `${itemRegex}(?:\\s*\\([0-9]+(?:[\\.,][0-9]+)?\\))?(?:\\s|:|\\(|\\$|$)`,
                "i"
            );

            if (!regexLinea.test(linea)) continue;

            const montosEnLinea = linea.match(/([0-9]+(?:\.[0-9]{3})*(?:,[0-9]+)?)/g);
            if (!montosEnLinea || montosEnLinea.length === 0) continue;

            const ultimoMonto = montosEnLinea[montosEnLinea.length - 1];
            const monto = procesarMonto(ultimoMonto);

            const usados = conceptosUsadosPorLinea.get(i) || new Set();
            if (usados.has(monto)) {
                continue;
            }

            usados.add(monto);
            conceptosUsadosPorLinea.set(i, usados);
            items.push({ nombre: item, monto });
            break;
        }
    }

    // Deduplicar por nombre exacto
    const dedup = [];
    const vistos = new Set();
    for (const it of items) {
        if (!vistos.has(it.nombre)) {
            dedup.push(it);
            vistos.add(it.nombre);
        }
    }

    return dedup;
}

// Función para obtener días trabajados (se espera 30 para liquidaciones válidas)
function obtenerDiasTrabajados(texto) {
    const regex = /SUELDO BASE.*?\((\d+)\)/i;
    const resultado = texto.match(regex);
    return resultado ? parseInt(resultado[1], 10) : 0;
}

// Obtener comisión de vacaciones del PDF evaluado
function obtenerComisionVacaciones(texto) {
    const regex = /COMISION VACACIONES\s*\(?(\d+)\)?\s*\$?\s*([0-9.,]+)/i;
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
    const regex = /\b([A-ZÇÑ]+)\s+DE\s+(\d{4})\b/i;
    const resultado = texto.match(regex);
    return resultado ? `${resultado[1].toUpperCase()} de ${resultado[2]}` : 'Fecha no encontrada';
}

function parseMesAnio(mesAnio) {
    if (!mesAnio) return null;
    const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const parts = mesAnio.split(' de ').map(p => p.trim().toUpperCase());
    if (parts.length !== 2) return null;
    const idx = meses.indexOf(parts[0]);
    const anio = parseInt(parts[1], 10);
    if (idx === -1 || Number.isNaN(anio)) return null;
    return { mesIndex: idx, anio, label: `${parts[0]} de ${parts[1]}` };
}

// ----- Funciones para selección de liquidaciones (promedio) -----
function esMesConsecutivo(mesAnioAnterior, mesAnioPosterior) {
    if (!mesAnioAnterior || !mesAnioPosterior) return false;
    const a = parseMesAnio(mesAnioAnterior);
    const b = parseMesAnio(mesAnioPosterior);
    if (!a || !b) return false;
    if (b.anio === a.anio && b.mesIndex === a.mesIndex + 1) return true;
    if (b.anio === a.anio + 1 && a.mesIndex === 11 && b.mesIndex === 0) return true;
    return false;
}

function seleccionarLiquidacionesParaPromedio(datos, pdfSeleccionado) {
    const parsedEvaluado = parseMesAnio(pdfSeleccionado.mesAnio);
    if (!parsedEvaluado) return { error: true, mensaje: 'Mes evaluado inválido' };

    let candidatos = datos
        .filter(p => p.nombre !== pdfSeleccionado.nombre && p.dias === 30)
        .map(p => ({ ...p, parsed: parseMesAnio(p.mesAnio) }))
        .filter(p => p.parsed)
        .filter(p => (p.parsed.anio < parsedEvaluado.anio) || (p.parsed.anio === parsedEvaluado.anio && p.parsed.mesIndex < parsedEvaluado.mesIndex))
        .sort((a, b) => a.parsed.anio !== b.parsed.anio ? a.parsed.anio - b.parsed.anio : a.parsed.mesIndex - b.parsed.mesIndex);

    if (candidatos.length < 3) return { error: true, mensaje: "No hay suficientes liquidaciones válidas para el cálculo." };

    for (let i = candidatos.length - 1; i >= 2; i--) {
        const c3 = candidatos[i], c2 = candidatos[i-1], c1 = candidatos[i-2];
        if (!(esMesConsecutivo(c1.mesAnio, c2.mesAnio) && esMesConsecutivo(c2.mesAnio, c3.mesAnio))) {
            return { error: false, seleccion: [c1, c2, c3] };
        }
    }

    return { error: false, seleccion: candidatos.slice(-3), advertencia: 'Se usaron 3 meses consecutivos' };
}

// Evento de cálculo
document.getElementById('calcularVacacionesBtn').addEventListener('click', async () => {
    if (!PERMISSIONS.requireFeature(PERMISSIONS.FEATURES.VACACIONES, "Cálculo de Vacaciones")) return;

    const archivos = document.getElementById('vacacionInput').files;
    const resultadoDiv = document.getElementById('resultadoVacaciones');
    resultadoDiv.innerHTML = '';

    if (archivos.length < 4 || archivos.length > 7) {
        resultadoDiv.innerHTML = '<p style="color: red;">Por favor, sube entre 4 y 7 archivos PDF.</p>';
        return;
    }

    const datos = [];

    for (let archivo of archivos) {
        try {
            const texto = await extraerTextoDePDF(archivo);
            const diasTrabajados = obtenerDiasTrabajados(texto);
            const mesAnio = obtenerMesYAnio(texto);
            const comisionVacaciones = obtenerComisionVacaciones(texto);
            const items = extraerItemsDePDF(texto);

            datos.push({ nombre: archivo.name, dias: diasTrabajados, mesAnio, comisionVacaciones, items });
        } catch (err) {
            console.error('Error procesando', archivo.name, err);
            resultadoDiv.innerHTML = `<p style="color:red;">Error leyendo ${archivo.name}: ${err.message}</p>`;
            return;
        }
    }

    const pdfsConComisionVacaciones = datos.filter(d => d.comisionVacaciones);

    if (pdfsConComisionVacaciones.length === 0) {
        resultadoDiv.innerHTML = '<p style="color: red;">No se encontraron PDFs con "COMISION VACACIONES".</p>';
        return;
    }

    pdfsConComisionVacaciones.sort((a, b) => {
        const pa = parseMesAnio(a.mesAnio), pb = parseMesAnio(b.mesAnio);
        if (!pa || !pb) return 0;
        return (pa.anio - pb.anio) || (pa.mesIndex - pb.mesIndex);
    });

    if (pdfsConComisionVacaciones.length === 1) {
        realizarCalculo(datos, pdfsConComisionVacaciones[0]);
        return;
    } else {
        const opcionesValidas = pdfsConComisionVacaciones.map(pdf => {
            const sel = seleccionarLiquidacionesParaPromedio(datos, pdf);
            return { pdf, valido: !sel.error, sel };
        }).filter(x => x.valido);

        if (opcionesValidas.length === 0) {
            resultadoDiv.innerHTML = '<p style="color: red;">No hay PDFs con "COMISION VACACIONES" que cumplan las reglas para el cálculo.</p>';
            return;
        }

        if (opcionesValidas.length > 1) {
            const botones = opcionesValidas.map((op, idx) => `<button class="opcion" data-index="${idx}">${op.pdf.mesAnio}</button>`).join(' ');
            resultadoDiv.innerHTML = `<hr><strong>Elige un período con 'Comisión Vacaciones':</strong><hr> ${botones}`;
            document.querySelectorAll('.opcion').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = Number(btn.dataset.index);
                    realizarCalculo(datos, opcionesValidas[idx].pdf, opcionesValidas[idx].sel.seleccion);
                });
            });
            return;
        }

        realizarCalculo(datos, opcionesValidas[0].pdf, opcionesValidas[0].sel.seleccion);
        return;
    }
});

// Función que realiza el cálculo y muestra detalle por liquidación
function realizarCalculo(datos, pdfSeleccionado, seleccion) {
    const resultadoDiv = document.getElementById('resultadoVacaciones');

    if (!pdfSeleccionado || !pdfSeleccionado.comisionVacaciones) {
        resultadoDiv.innerHTML = `<p style="color: red;">PDF seleccionado no contiene "COMISION VACACIONES".</p>`;
        return;
    }

    const seleccionResult = seleccion || (seleccionarLiquidacionesParaPromedio(datos, pdfSeleccionado).seleccion);

    if (!seleccionResult || seleccionResult.length < 3) {
        resultadoDiv.innerHTML = `<p style="color: red;">No hay suficientes liquidaciones válidas para el cálculo.</p>`;
        return;
    }

    if (!document.getElementById('estilosVacaciones')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'estilosVacaciones';
        styleEl.textContent = `
          #resultadoVacaciones { font-family: Arial, Helvetica, sans-serif; color: #222; line-height: 1.4; }
          #resultadoVacaciones h3 { margin: 0 0 8px 0; font-size: 1.2rem; }
          #resultadoVacaciones p.meta { margin: 4px 0 12px 0; font-size: 0.95rem; }
          .promedio-liquidaciones { margin: 10px 0 18px 0; font-weight: 600; }
          .detalle-liquidacion { margin: 12px 0; padding: 10px 12px; background: #fafafa; border-radius: 6px; border: 1px solid #eee; }
          .liq-titulo { font-weight: 700; font-size: 1rem; margin-bottom: 6px; }
          .liq-subtotal { font-weight: 700; display: inline-block; margin-left: 8px; color: #111; }
          .items-list { margin: 6px 0 0 16px; padding: 0; list-style: none; }
          .items-list li { font-size: 0.88rem; margin: 3px 0; color: #333; }
          .items-list li .monto { float: right; font-weight: 600; }
          .items-list li .concepto { display: inline-block; max-width: 70%; }
          .resumen { margin-top: 18px; padding: 10px 12px; background: #fff; border-radius: 6px; border: 1px solid #eee; }
          .resumen p { margin: 6px 0; font-size: 0.95rem; }
          .resumen p .valor { font-weight: 700; margin-left: 8px; }
          .diferencia-positivo { color: green; }
          .diferencia-negativo { color: red; }
          @media (max-width: 480px) {
            .items-list li { font-size: 0.82rem; }
            .liq-titulo { font-size: 0.95rem; }
          }
        `;
        document.head.appendChild(styleEl);
    }

    let detalleHTML = `<h3>Cálculo de Vacaciones:</h3>
        <p class="meta">Mes evaluado: <strong>${pdfSeleccionado.mesAnio}</strong></p>
        <p class="promedio-liquidaciones">Promedio Liquidaciones: ${seleccionResult.map(pdf => pdf.mesAnio).join(', ')}</p>`;

    const subtotales = seleccionResult.map(p => {
        const subtotal = Array.isArray(p.items) ? p.items.reduce((s, it) => s + (Number(it.monto) || 0), 0) : 0;
        return { mesAnio: p.mesAnio, subtotal };
    });

    seleccionResult.forEach(pdf => {
        const subtotal = (Array.isArray(pdf.items) ? pdf.items.reduce((s, it) => s + (Number(it.monto) || 0), 0) : 0);
        detalleHTML += `<div class="detalle-liquidacion">
            <div class="liq-titulo">${pdf.mesAnio}: <span class="liq-subtotal">${formatearMonto(subtotal)}</span></div>
            <ul class="items-list">`;
        (pdf.items || []).forEach(it => {
            detalleHTML += `<li><span class="concepto">${it.nombre}</span><span class="monto">${formatearMonto(it.monto)}</span></li>`;
        });
        detalleHTML += `</ul></div>`;
    });

    const totalItems = seleccionResult.reduce((s, p) => s + (Array.isArray(p.items) ? p.items.reduce((ss, it) => ss + (Number(it.monto) || 0), 0) : 0), 0);
    const promedioMensual = totalItems / 3;
    const promedioDiario = promedioMensual / 30;
    const diasVac = (pdfSeleccionado.comisionVacaciones && pdfSeleccionado.comisionVacaciones.dias) ? pdfSeleccionado.comisionVacaciones.dias : 30;
    const promedioVacaciones = promedioDiario * diasVac;
    const montoPagado = (pdfSeleccionado.comisionVacaciones && pdfSeleccionado.comisionVacaciones.monto) ? pdfSeleccionado.comisionVacaciones.monto : 0;
    const diferencia = Math.round(promedioVacaciones) - Math.round(montoPagado);

    detalleHTML += `
        <div class="resumen">
        <p>Total items (suma 3 liquidaciones): <span class="valor">${formatearMonto(totalItems)}</span></p>
        <p>Promedio mensual: <span class="valor">${formatearMonto(promedioMensual)}</span></p>
        <p>Promedio diario: <span class="valor">${formatearMonto(promedioDiario)}</span></p>
        <p>Días vacaciones: <span class="valor">${diasVac}</span></p>
        <p>Comisión calculada: <span class="valor">${formatearMonto(Math.round(promedioVacaciones))}</span></p>
        <p>Comisión pagada: <span class="valor">${formatearMonto(Math.round(montoPagado))}</span></p>
        <p>Diferencia: <span class="valor ${diferencia === 0 ? '' : (diferencia > 0 ? 'diferencia-positivo' : 'diferencia-negativo')}">${formatearMonto(diferencia)}</span></p>
        </div>`;

    resultadoDiv.innerHTML = detalleHTML;
}

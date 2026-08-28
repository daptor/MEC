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

// Lista de comisiones
// IMPORTANTE: se ordena de mayor a menor longitud para priorizar conceptos largos
const listaComisionVacaciones = [
    "PREMIO VENTA TIENDA AUT.",
    "DIF PREMIO VENTA TIENDA",
    "PREMIO VENTA TIENDA",
    "DIF PREMIO CLICK AND COLLECT",
    "PREMIO CLICK AND COLLECT",
    "DIF CONCURSO FPAY",
    "CONCURSO FPAY",
    "DIF. ESCANEA Y PAGA",
    "ESCANEA Y PAGA",
    "DIF. COMISIONES",
    "COMISION DIGITA Y GANA",
    "DIF COMISION DIGITA Y GANA",
    "INCENTIVO SELF CHECK OUT",
    "INCENTIVO TIENDA CD/SFS",
    "INCENTIVO CONFIABILIDAD",
    "INCENTIVO RECUPERO",
    "INCENTIVO PRODUC CAJAS AUT",
    "PREMIO CUMPL.GRUPAL VTAS",
    "PREMIO CUMPL.GRUPAL NPS",
    "PREMIO CUMPLIMIENTO DE PLAN",
    "PROMEDIOS VARIOS",
    "COMISION VACACIONES",
    "COMISION CYD",
    "COMISION SEGURO DE VIDA",
    "COMI. KIOSCO OTRAS EMPRESAS",
    "APERTURA CTA CTE",
    "COMPENSACION PERMISO",
    "BONO CLICK AND COLLECT",
    "HORAS RECARGO DOMINGO",
    "HORAS RECARGO NAVIDAD",
    "DIFERENCIA SEMANA CORRIDA",
    "SEMANA CORRIDA",
    "BONO CERTIFICACION",
    "BONO INVENTARIO",
    "BONO DICIEMBRE",
    "BONO CYBER",
    "BONO NEFT",
    "BONO NPS",
    "BONO PUNTUALIDAD AUT.",
    "BONO ASISTENCIA AUT.",
    "ASIG. FAMILIAR",
    "ASIGNACION SALA CUNA",
    "BENEFICIO MATRIMONIO",
    "COLACION",
    "MOVILIZACION",
    "COM.EFECTIVAS",
    "PREMIO NPS",
    "PROMOCIONES CMR",
    "NPS OMNICANAL",
    "GARANTIZADO",
    "QUIEBRE DE STOCK"
]
    .map(s => normalizarTexto(s))
    .sort((a, b) => b.length - a.length);

function construirRegexConcepto(concepto) {
    const esc = concepto.replace(/([.+*?^${}()|\[\]\/\\])/g, "\\$1");
    return new RegExp(`(^|\\s)${esc}(?=\\s|\\(|\\$|$)`, 'i');
}

function extraerMontoDesdeLinea(linea, conceptoNormalizado) {
    const conceptoEsc = conceptoNormalizado.replace(/([.+*?^${}()|\[\]\/\\])/g, "\\$1");

    // 1) Patrón principal: concepto + opcional (x.xx) + monto
    const regex1 = new RegExp(
        `${conceptoEsc}(?:\\s*\\([0-9]+(?:[\\.,][0-9]+)?\\))?\\s*\\$?\\s*([0-9]+(?:[\\.,][0-9]{1,3})*)`,
        "i"
    );
    const res1 = linea.match(regex1);
    if (res1 && res1[1]) return procesarMonto(res1[1]);

    // 2) Buscar cualquier monto posterior en la misma línea
    const pos = linea.search(construirRegexConcepto(conceptoNormalizado));
    if (pos !== -1) {
        const resto = linea.slice(pos + conceptoNormalizado.length);
        const montos = resto.match(/-?\d[\d.,]*/g);
        if (montos && montos.length > 0) {
            return procesarMonto(montos[0]);
        }
    }

    return null;
}

function extraerItemsDePDF(texto) {
    const items = [];
    const lineas = texto.split(/\n+/).map(l => l.trim()).filter(Boolean);

    for (const linea of lineas) {
        const lineaNormalizada = normalizarTexto(linea);
        const conceptosEncontrados = [];
        const rangosUsados = [];

        // Procesar primero los conceptos más largos para evitar confusiones
        for (const item of listaComisionVacaciones) {
            const regexConcepto = construirRegexConcepto(item);

            if (!regexConcepto.test(lineaNormalizada)) continue;

            const inicio = lineaNormalizada.search(regexConcepto);
            if (inicio === -1) continue;
            const fin = inicio + item.length;

            // Evita solapamientos entre conceptos cortos y largos
            const solapa = rangosUsados.some(r => !(fin <= r.inicio || inicio >= r.fin));
            if (solapa) continue;

            const monto = extraerMontoDesdeLinea(lineaNormalizada, item);

            if (monto !== null && !Number.isNaN(monto)) {
                conceptosEncontrados.push({ nombre: item, monto });
                rangosUsados.push({ inicio, fin });
            }
        }

        if (conceptosEncontrados.length > 0) {
            // Eliminar duplicados exactos por nombre+monto dentro de la misma línea
            const vistos = new Set();
            for (const it of conceptosEncontrados) {
                const key = `${it.nombre}|${it.monto}`;
                if (vistos.has(key)) continue;
                vistos.add(key);
                items.push(it);
            }
        }
    }

    // Última limpieza: evitar duplicados globales exactos
    const dedupe = new Map();
    for (const it of items) {
        const key = `${it.nombre}|${it.monto}`;
        if (!dedupe.has(key)) dedupe.set(key, it);
    }

    return Array.from(dedupe.values());
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

// Obtener el mes y año del texto (ej: "JULIO de 2023")
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
        const c3 = candidatos[i], c2 = candidatos[i - 1], c1 = candidatos[i - 2];
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

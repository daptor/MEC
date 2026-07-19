// analisisLiquidacion_hora.js
// Versión unificada y completa para Cálculo por HORA (HRA)
// Basado en el esqueleto original de analisisLiquidacion.js

(function () {
    const NS = window.MEC_HORA = window.MEC_HORA || {};

    // ==================== VARIABLES GLOBALES ====================
    const TOLERANCIA = 1; 
    const SEMANAS_POR_MES = 4.33; 

    const INGRESOS_MINIMOS = {
        2020: { "ENERO": 301000, "FEBRERO": 301000, "MARZO": 301000, "ABRIL": 301000, "MAYO": 301000, "JUNIO": 301000, "JULIO": 320500, "AGOSTO": 320500, "SEPTIEMBRE": 326500, "OCTUBRE": 326500, "NOVIEMBRE": 326500, "DICIEMBRE": 326500 },
        2021: { "ENERO": 326500, "FEBRERO": 326500, "MARZO": 326500, "ABRIL": 326500, "MAYO": 337000, "JUNIO": 337000, "JULIO": 337000, "AGOSTO": 337000, "SEPTIEMBRE": 337000, "OCTUBRE": 337000, "NOVIEMBRE": 337000, "DICIEMBRE": 350000 },
        2022: { "ENERO": 350000, "FEBRERO": 350000, "MARZO": 350000, "ABRIL": 350000, "MAYO": 380000, "JUNIO": 380000, "JULIO": 380000, "AGOSTO": 400000, "SEPTIEMBRE": 400000, "OCTUBRE": 400000, "NOVIEMBRE": 400000, "DICIEMBRE": 400000 },
        2023: { "ENERO": 410000, "FEBRERO": 410000, "MARZO": 410000, "ABRIL": 410000, "MAYO": 440000, "JUNIO": 440000, "JULIO": 440000, "AGOSTO": 440000, "SEPTIEMBRE": 460000, "OCTUBRE": 460000, "NOVIEMBRE": 460000, "DICIEMBRE": 460000 },
        2024: { "ENERO": 460000, "FEBRERO": 460000, "MARZO": 460000, "ABRIL": 460000, "MAYO": 460000, "JUNIO": 460000, "JULIO": 500000, "AGOSTO": 500000, "SEPTIEMBRE": 500000, "OCTUBRE": 500000, "NOVIEMBRE": 500000, "DICIEMBRE": 500000 },
        2025: { "ENERO": 510636, "FEBRERO": 510636, "MARZO": 510636, "ABRIL": 510500, "MAYO": 510500, "JUNIO": 510500, "JULIO": 529000, "AGOSTO": 529000, "SEPTIEMBRE": 529000, "OCTUBRE": 529000, "NOVIEMBRE": 529000, "DICIEMBRE": 529000 },
        2026: { "ENERO": 539000, "FEBRERO": 539000, "MARZO": 539000, "ABRIL": 539000, "MAYO": 553553, "JUNIO": 553553, "JULIO": 553553, "AGOSTO": 553553, "SEPTIEMBRE": 553553, "OCTUBRE": 553553, "NOVIEMBRE": 553553, "DICIEMBRE": 553553 }
    };

     const LISTA_CARGOS = [
        "ASESOR DE CLIENTES", "ASESOR DE COMPRAS", "ASESOR DE MARCA", "ASESOR DE MARCA ETAM", "ASISTENTE DE DISPLAY", 
        "ASISTENTE DE VISUAL", "CAJERA(O) - EMPAQUE", "CONSULTOR DE PERFUMERIA", "COORDINADORA DE VENTAS", "GUARDIA", 
        "OPERADOR DE CCTV", "TRAINEE TIENDA", "VENDEDOR JORNADA PARCIAL MAÑANA", "VENDEDOR", "VENDEDOR JORNADA PARCIAL", 
        "ASISTENTE DE BODEGA", "ASISTENTE DE PROBADORES"
    ];

    const LISTA_COMISIONES = [
        "COM.EFECTIVAS", "COMISION CYD", "CONCURSO FPAY", "COMISION DIGITA Y GANA", "COMISIÓN SEGURO DE VIDA", 
        "COMI. KIOSCO OTRAS EMPRESAS", "APERTURA CTA CTE", "ESCANEA Y PAGA", "DIF. ESCANEA Y PAGA", 
        "INCENTIVO SELF CHECK OUT AUT", "COMPENSACION PERMISO", "DIF CONCURSO FPAY", "PROMOCIONES CMR", 
        "COMISION CONNECT", "DIF. COMISIONES", "INCENTIVO PRODUC CAJAS AUT", "AVANCE CMR", "DIF. INCENTI PRODUCT CAJAS"
    ];

    const LISTA_GRATIFICABLES = [
        "BONO ASISTENCIA", "BONO ASISTENCIA AUT.", "BONO CERTIFICACION", "BONO CLICK AND COLLECT", "BONO CUMPLIMIENTO DE ", 
        "BONO CYBER", "BONO DICIEMBRE", "BONO INVENTARIO", "BONO PUNTUALIDAD AUT.", "BONO VACACIONES", "COMISION VACACIONES", 
        "DIF BONO CUMPLIMIENTO DE HP.", "DIF PREMIO CLICK AND COLLECT", "DIF PREMIO VENTA TIENDA", "DIF. CONTING. MES ANTERIOR", 
        "DIF. SB MES ANTERIOR", "DIF. SUELDO BASE", "DIF.HORAS EXTRAS ", "DIF.SUELDO BASE CONTINGENCIA", "DIFERENCIA 70%", 
        "DIFERENCIA CONTINGENCIA", "DIFERENCIA SEMANA CORRIDA", "GARANTIZADO", "HORAS RECARGO NAVIDAD", "HORAS TRABAJO SIND.", 
        "INCENTIVO CONFIABILIDAD", "INCENTIVO RECUPERO", "INCENTIVO TIENDA CD/SFS", "PREMIO CLICK AND COLLECT", 
        "PREMIO CUMPL.GRUPAL NPS", "PREMIO CUMPL.GRUPAL VTAS", "PREMIO CUMPLIMIENTO DE PLAN", "PREMIO NPS", 
        "PREMIO VENTA TIENDA", "PREMIO VENTA TIENDA AUT.", "PROMEDIOS VARIOS", "QUIEBRE DE STOCK", "QUINQUENIO", 
        "BONO BRIGADISTA", "VACACIONES PT", "INCENTIVO PRODUC CAJAS AUT"
    ];

    function procMonto(txt) {
        if (!txt) return 0;
        return parseFloat(String(txt).replace(/\./g, '').replace(',', '.')) || 0;
    }

    function fmtCLP(v) {
        if (v === null || v === undefined || isNaN(v)) return "$0";
        return "$" + Math.round(v).toLocaleString("es-CL");
    }

    function getIMMmensual(mes, año) {
        if (!mes || !año) return 0;
        const m = mes.toUpperCase();
        return (INGRESOS_MINIMOS[año] && INGRESOS_MINIMOS[año][m]) ? INGRESOS_MINIMOS[año][m] : 0;
    }

    function obtenerJornadaMaxima(mesStr, añoNum) {
        const mesesIdx = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
        const mi = mesesIdx[(mesStr || "ENERO").toUpperCase()] || 1;
        if (añoNum > 2026 || (añoNum === 2026 && mi >= 4)) return 42;
        if (añoNum > 2024 || (añoNum === 2024 && mi >= 5)) return 44;
        return 45;
    }

    function safePdfjs() {
        return typeof window.pdfjsLib !== 'undefined' && !!window.pdfjsLib.getDocument;
    }

    function addResumen(modulo, estado, diferencia = 0) {
        window._resumenHora = window._resumenHora || [];
        window._resumenHora.push({ modulo, estado, diferencia });
    }
    
    async function analizarArchivoPorHora_autonomo(texto, jornada) {
        jornada = Number(jornada) || 0;
        if (!texto || jornada <= 0) return null;

        // 1. Extraer S.BASE PART-TIME (HRA) con Regex Robusta
        const rxHRA = /S\.?BASE\s*PART-?TIME\s*\(HRA\)[^\d\(]*\(?\s*([\d.,]+)\s*\)?[^\$]*\$\s*([\d.]+)/i;
        const mH = texto.match(rxHRA);
        let sueldo = mH ? procMonto(mH[1]) : null;

        // Fallback a SUELDO BASE simple
        const rxSB = /SUELDO\s*BASE.*?\$?\s*([\d\.,]+)/i;
        if (!sueldo) {
            const mSB = texto.match(rxSB);
            if (mSB) sueldo = procMonto(mSB[1]);
        }

        if (!sueldo) return null;

        // 2. Determinar Fecha para IMM
        const rxFecha = /(\b(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b)\s*de\s*(\d{4})/i;
        const mf = texto.match(rxFecha);
        const mes = mf ? mf[1].toUpperCase() : "ENERO";
        const año = mf ? parseInt(mf[2]) : (new Date()).getFullYear();

        // 3. Cálculos de Valor Hora e IMM
        const valorHora = sueldo / (jornada * SEMANAS_POR_MES);
        const jornadaMax = obtenerJornadaMaxima(mes, año);
        const inmMensual = getIMMmensual(mes, año);
        const immPorHora = inmMensual > 0 ? inmMensual / (jornadaMax * SEMANAS_POR_MES) : 0;

        let estadoS = (valorHora >= immPorHora - TOLERANCIA) ? "ok" : "error";
        let diffS = Math.round(Math.max(0, immPorHora - valorHora) * (jornada * SEMANAS_POR_MES));

        addResumen("Sueldo por hora (HRA)", estadoS, diffS);

        return { sueldo, valorHora, immPorHora, estadoS, diffS, mes, año, jornadaMax };
    }

    function calcularHorasExtrasYRecargos(texto, valorHora) {
        const r = {};
        const config = [
            { id: 'he50', label: 'Horas Extras 50%', rx: /HORAS\s*EXTRAS\s*50\s*%\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i, factor: 1.5 },
            { id: 'hedom', label: 'Horas Extras Domingo', rx: /HORAS\s*EXTRAS\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i, factor: 1.3 * 1.5 },
            { id: 'rdom', label: 'Recargo Domingo', rx: /HORAS\s*RECARGO\s*DOMINGO\s*\(([\d.,]+)\)\s*\$\s*([\d.,]+)/i, factor: 0.3 }
        ];

        config.forEach(c => {
            const match = texto.match(c.rx);
            if (match) {
                const h = parseFloat(match[1].replace(',', '.')) || 0;
                const pag = procMonto(match[2]);
                const esp = Math.round(valorHora * c.factor * h);
                const st = Math.abs(pag - esp) < 10 ? "ok" : "error";
                addResumen(c.label, st, Math.abs(pag - esp));
                r[c.id] = { horas: h, pagado: pag, esperado: esp };
            } else {
                addResumen(c.label, "info", 0);
                r[c.id] = { horas: 0, pagado: 0, esperado: 0 };
            }
        });
        return r;
    }

    function calcularSemanaCorridaHRA(texto, valorHora, jornada) {
        let totalCom = 0;
        LISTA_COMISIONES.forEach(c => {
            const rx = new RegExp(`${c.replace('.', '\\.')}[^\\$]*\\$\\s*([\\d\\.,]+)`, 'gi');
            const matches = [...texto.matchAll(rx)];
            matches.forEach(m => totalCom += procMonto(m[1]));
        });

        const mSem = texto.match(/SEMANA\s*CORRIDA\s*\((\d+)\)\s*\$\s*([\d.,]+)/i);
        const pagSem = mSem ? procMonto(mSem[2]) : 0;
        const diasSem = mSem ? parseInt(mSem[1]) : 0;
        const espSem = Math.round(((totalCom / 21) / (jornada / 5)) * (jornada / 5) * diasSem);

        addResumen("Semana Corrida", (Math.abs(pagSem - espSem) < 50) ? "ok" : "warning", Math.abs(pagSem - espSem));
        return { totalCom, pagSem, espSem };
    }

    function calcularGratificacionHRA(texto, valorHora, jornada, año, mes, comisiones) {
        const mG = texto.match(/GRATIFICACION\s*25\s*%.*?\$\s*([\d.,]+)/i);
        const pagG = mG ? procMonto(mG[1]) : 0;
        const haberBase = (valorHora * jornada * SEMANAS_POR_MES) + comisiones;
        const espG = Math.round(haberBase * 0.25);

        addResumen("Gratificación (HRA)", (Math.abs(pagG - espG) < 500) ? "ok" : "warning", Math.abs(pagG - espG));
        return { pagG, espG };
    }

    function renderResultadosHRA(res, extras, vars) {
        const cont = document.getElementById('resultadoAnalisis');
        if (!cont) return;

        cont.innerHTML = `
            <div style="border:2px solid #0056b3; padding:15px; border-radius:12px; background:#f9fbff">
                <h2 style="color:#0056b3; margin-top:0">Resultado Análisis por Hora (HRA)</h2>
                <p><strong>Valor Hora Contractual:</strong> ${fmtCLP(res.valorHora)}</p>
                <p><strong>IMM por Hora (${res.año}):</strong> ${fmtCLP(res.immPorHora)}</p>
                <hr>
                <h4>Sobretiempo y Recargos</h4>
                <p>HE 50%: Pagado ${fmtCLP(extras.he50.pagado)} | Esperado ${fmtCLP(extras.he50.esperado)}</p>
                <p>Recargo Dom: Pagado ${fmtCLP(extras.rdom.pagado)} | Esperado ${fmtCLP(extras.rdom.esperado)}</p>
                <hr>
                <h4>Variable Semanal y Gratificación</h4>
                <p>Semana Corrida: Pagado ${fmtCLP(vars.pagSem)} | Esperado ${fmtCLP(vars.espSem)}</p>
                <p>Gratificación: Pagada ${fmtCLP(vars.pagG)} | Esperada ${fmtCLP(vars.espG)}</p>
            </div>
        `;

        const resCont = document.getElementById('resumenMecContainer');
        if (resCont) {
            const htmlRes = window._resumenHora.map(it => `
                <div style="padding:6px; border-left:4px solid ${it.estado === 'error' ? '#d32f2f' : '#388e3c'}; margin-bottom:4px; background:#fff">
                    <strong>${it.modulo}</strong>: ${it.estado.toUpperCase()} ${it.diferencia > 0 ? ' (Dif: ' + fmtCLP(it.diferencia) + ')' : ''}
                </div>
            `).join('');
            resCont.innerHTML = `<h3>Resumen de Discrepancias</h3>${htmlRes}`;
        }
    }

    function hookHRA() {
        const sel = document.getElementById('jornada');
        if (!sel) return;

        if (![...sel.options].some(o => o.value === 'HORA')) {
            const opt = document.createElement('option');
            opt.value = 'HORA';
            opt.text = 'CÁLCULO POR HORA (HRA)';
            opt.style.backgroundColor = '#eef';
            sel.appendChild(opt);
        }

        sel.addEventListener('change', async () => {
            if (sel.value !== 'HORA') return;
            const fileEl = document.getElementById('fileInput');
            if (!fileEl?.files[0]) { alert("Sube el PDF primero"); sel.value = ""; return; }

            const jUser = prompt("Ingresa la jornada semanal (30, 20, 18):", "30");
            if (!jUser) { sel.value = ""; return; }

            try {
                window._resumenHora = [];
                const pdfData = await fileEl.files[0].arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: pdfData }).promise;
                let texto = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    texto += content.items.map(it => it.str).join(' ') + '\n';
                }

                const res = await analizarArchivoPorHora_autonomo(texto, jUser);
                if (!res) { alert("PDF no compatible con HRA"); return; }

                const extras = calcularHorasExtrasYRecargos(texto, res.valorHora);
                const vars = calcularSemanaCorridaHRA(texto, res.valorHora, Number(jUser));
                const grat = calcularGratificacionHRA(texto, res.valorHora, Number(jUser), res.año, res.mes, vars.totalCom);
                
                renderResultadosHRA(res, extras, {...vars, ...grat});
            } catch (e) { console.error(e); }
        });
    }

    setTimeout(hookHRA, 500);
})(); // FIN COMPLETO

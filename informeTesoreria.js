import { supabase } from './supabaseClient.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnGenerarInforme').addEventListener('click', generarInformeExcel);
});

async function generarInformeExcel() {
  const anioBase = parseInt(document.getElementById('informe-anio-base').value, 10);
  if (isNaN(anioBase)) {
    alert('Año inválido');
    return;
  }

  const btn = document.getElementById('btnGenerarInforme');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    const meses = [
      { nombre: 'ABR', mes: 4, anio: anioBase },
      { nombre: 'MAY', mes: 5, anio: anioBase },
      { nombre: 'JUN', mes: 6, anio: anioBase },
      { nombre: 'JUL', mes: 7, anio: anioBase },
      { nombre: 'AGO', mes: 8, anio: anioBase },
      { nombre: 'SEP', mes: 9, anio: anioBase },
      { nombre: 'OCT', mes: 10, anio: anioBase },
      { nombre: 'NOV', mes: 11, anio: anioBase },
      { nombre: 'DIC', mes: 12, anio: anioBase },
      { nombre: 'ENE', mes: 1, anio: anioBase + 1 },
      { nombre: 'FEB', mes: 2, anio: anioBase + 1 },
      { nombre: 'MAR', mes: 3, anio: anioBase + 1 }
    ];

    // === Cargar datos desde Supabase ===
    const [
      { data: ingresosMensuales, error: errIM },
      { data: ingresosPlenarias, error: errIP },
      { data: otrosIngresos, error: errOI },
      { data: aporteDirectores, error: errAD },
      { data: gastoDirectores, error: errGD },
      { data: gastoPlenarias, error: errGP },
      { data: gastoGestion, error: errGG },
      { data: gastoComisiones, error: errGC },
      { data: gastoOtros, error: errGO }
    ] = await Promise.all([
      supabase.from('ingresos_mensuales').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('ingreso_plenarias').select('*').gte('año', anioBase).lte('año', anioBase + 1),
      supabase.from('otros_ingresos').select('*').gte('anio', anioBase).lte('anio', anioBase + 1),
      supabase.from('aporte_director').select('*').gte('fecha', `${anioBase}-04-01`).lte('fecha', `${anioBase + 1}-03-31`),
      supabase.from('gasto_real_directores').select('*'),
      supabase.from('gasto_real_plenarias').select('*'),
      supabase.from('gasto_real_gestion').select('*'),
      supabase.from('gasto_real_comisiones').select('*'),
      supabase.from('gasto_real_otros').select('*')
    ]);

    if (errIM || errIP || errOI || errAD || errGD || errGP || errGG || errGC || errGO) {
      throw new Error('Error al obtener datos desde Supabase.');
    }

    // --- Auxiliares para acumular datos ---
    function acumularPorSindicato(arr, campoSindicato, campoMesNombre, campoAnio, campoMonto) {
      const res = {};
      for (const item of arr) {
        const sindicato = item[campoSindicato];
        const mesNombre = (item[campoMesNombre] || '').toUpperCase();
        const anio = item[campoAnio];
        const monto = Number(item[campoMonto]) || 0;
        if (!res[sindicato]) res[sindicato] = Array(12).fill(0);
        const idx = meses.findIndex(m => m.nombre === mesNombre && m.anio === anio);
        if (idx !== -1) res[sindicato][idx] += monto;
      }
      return res;
    }

    function acumularPorTipo(arr, campoTipo, campoMes, campoAnio, campoMonto) {
      const res = {};
      for (const item of arr) {
        const tipo = item[campoTipo];
        const mes = Number(item[campoMes]);
        const anio = Number(item[campoAnio]);
        const monto = Number(item[campoMonto]) || 0;
        if (!res[tipo]) res[tipo] = Array(12).fill(0);
        const idx = meses.findIndex(m => m.mes === mes && m.anio === anio);
        if (idx !== -1) res[tipo][idx] += monto;
      }
      return res;
    }

    function acumularPorMesFecha(arr, campoFecha, campoMonto) {
      const res = Array(12).fill(0);
      for (const item of arr) {
        const fecha = new Date(item[campoFecha]);
        const monto = Number(item[campoMonto]) || 0;
        const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
        if (idx !== -1) res[idx] += monto;
      }
      return res;
    }

    // === Acumular datos ===
    const ingresosMensualesPorSind = acumularPorSindicato(ingresosMensuales, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');
    const ingresosPlenariasPorSind = acumularPorSindicato(ingresosPlenarias, 'nombre_sindicato', 'mes_nombre', 'año', 'cuota');

    const sindicatos = Array.from(new Set([...Object.keys(ingresosMensualesPorSind), ...Object.keys(ingresosPlenariasPorSind)])).sort();

    const otrosIngresosPorTipo = acumularPorTipo(otrosIngresos, 'tipo_ingreso', 'mes', 'anio', 'monto');

    const aporteDirectoresPorMes = acumularPorMesFecha(aporteDirectores, 'fecha', 'monto');

    // --- Crear hoja ---
    const sheet = [];

    // --- Estilos ---
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "0070C0" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const subtotalStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { patternType: "solid", fgColor: { rgb: "D9E1F2" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    const totalStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: "002060" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "medium", color: { rgb: "000000" } },
        right: { style: "medium", color: { rgb: "000000" } }
      }
    };

    const moneyStyle = {
      numFmt: '"$"#,##0.00;[Red]\-"$"#,##0.00',
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
      }
    };

    // === Función para convertir AOA con estilos a hoja XLSX ===
    function aoaToSheetWithStyles(aoa, styleMap) {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      for (let R = 0; R < aoa.length; ++R) {
        for (let C = 0; C < aoa[R].length; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];
          if (!cell) continue;
          // Aplicar estilo según map
          if (styleMap[R] && styleMap[R][C]) {
            cell.s = styleMap[R][C];
          }
          // Si es fórmula, mantener
          if (typeof cell.v === 'number' && !cell.f) {
            cell.t = 'n';
          }
        }
      }
      return ws;
    }

    // --- Construir matriz con valores y estilos paralelos ---
    const data = [];
    const styles = [];

    // Encabezado INGRESOS
    data.push(['INGRESOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);
    styles.push([headerStyle, ...Array(meses.length + 1).fill(headerStyle)]);

    // Ingresos por sindicato
    sindicatos.forEach((sindicato, i) => {
      const fila = [sindicato];
      const estiloFila = [subtotalStyle];
      meses.forEach((m, idx) => {
        const val = (ingresosMensualesPorSind[sindicato]?.[idx] || 0) + (ingresosPlenariasPorSind[sindicato]?.[idx] || 0);
        fila.push(val);
        estiloFila.push(moneyStyle);
      });
      fila.push({ f: `SUM(B${i + 2}:M${i + 2})` });
      estiloFila.push(moneyStyle);
      data.push(fila);
      styles.push(estiloFila);
    });

    // Total ingreso sindicatos
    const filaTotalSind = ['INGRESO SINDICATOS'];
    const estiloTotalSind = [totalStyle];
    for (let col = 2; col <= 13; col++) {
      filaTotalSind.push({ f: `SUM(${String.fromCharCode(64 + col)}2:${String.fromCharCode(64 + col)}${sindicatos.length + 1})` });
      estiloTotalSind.push(moneyStyle);
    }
    filaTotalSind.push({ f: `SUM(N2:N${sindicatos.length + 1})` });
    estiloTotalSind.push(moneyStyle);
    data.push(filaTotalSind);
    styles.push(estiloTotalSind);

    // Otros ingresos por tipo
    const startOtros = data.length + 1;
    Object.entries(otrosIngresosPorTipo).forEach(([tipo, valores], idx) => {
      const fila = [tipo];
      const estiloFila = [subtotalStyle];
      valores.forEach(v => {
        fila.push(v);
        estiloFila.push(moneyStyle);
      });
      fila.push({ f: `SUM(B${startOtros + idx}:M${startOtros + idx})` });
      estiloFila.push(moneyStyle);
      data.push(fila);
      styles.push(estiloFila);
    });

    // Aporte directores fila
    const filaAporte = ['APORTE DIRECTORES', ...aporteDirectoresPorMes];
    const estiloAporte = [subtotalStyle];
    aporteDirectoresPorMes.forEach(() => estiloAporte.push(moneyStyle));
    filaAporte.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
    estiloAporte.push(moneyStyle);
    data.push(filaAporte);
    styles.push(estiloAporte);

    // Total ingresos generales
    const startIngreso = 2;
    const endIngreso = data.length;
    const filaTotalIngreso = ['TOTAL INGRESOS'];
    const estiloTotalIngreso = [totalStyle];
    for (let col = 2; col <= 13; col++) {
      filaTotalIngreso.push({ f: `SUM(${String.fromCharCode(64 + col)}${startIngreso}:${String.fromCharCode(64 + col)}${endIngreso})` });
      estiloTotalIngreso.push(moneyStyle);
    }
    filaTotalIngreso.push({ f: `SUM(N${startIngreso}:N${endIngreso})` });
    estiloTotalIngreso.push(moneyStyle);
    data.push(filaTotalIngreso);
    styles.push(estiloTotalIngreso);

    data.push([]);
    styles.push([]);

    // --- GASTOS ---
    data.push(['GASTOS ' + anioBase + '-' + (anioBase + 1), ...meses.map(m => m.nombre), 'ANUAL']);
    styles.push([headerStyle, ...Array(meses.length + 1).fill(headerStyle)]);

    // Gastos directores por rubro
    const rubrosDir = ['remuneracion', 'pasajes', 'colacion', 'metro', 'taxi_colectivo', 'hotel', 'reembolso'];
    const gastosDirPorRubro = {};
    rubrosDir.forEach(rubro => gastosDirPorRubro[rubro] = Array(12).fill(0));

    for (const gasto of gastoDirectores) {
      const fecha = new Date(gasto.fecha);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx === -1) continue;
      rubrosDir.forEach(rubro => {
        gastosDirPorRubro[rubro][idx] += Number(gasto[rubro]) || 0;
      });
    }

    rubrosDir.forEach((rubro, i) => {
      const fila = [rubro.toUpperCase()];
      const estiloFila = [subtotalStyle];
      gastosDirPorRubro[rubro].forEach(val => {
        fila.push(val);
        estiloFila.push(moneyStyle);
      });
      fila.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
      estiloFila.push(moneyStyle);
      data.push(fila);
      styles.push(estiloFila);
    });

    // Total gasto director
    const startGD = data.length - rubrosDir.length + 1;
    const endGD = data.length;
    const filaTotalGD = ['GASTO DIRECTOR'];
    const estiloTotalGD = [totalStyle];
    for (let col = 2; col <= 13; col++) {
      filaTotalGD.push({ f: `SUM(${String.fromCharCode(64 + col)}${startGD}:${String.fromCharCode(64 + col)}${endGD})` });
      estiloTotalGD.push(moneyStyle);
    }
    filaTotalGD.push({ f: `SUM(N${startGD}:N${endGD})` });
    estiloTotalGD.push(moneyStyle);
    data.push(filaTotalGD);
    styles.push(estiloTotalGD);

    // Gastos plenarias
    const gastosPlenariasPorMes = acumularPorMesFecha(gastoPlenarias, 'fecha', 'costo_total');
    const filaGP = ['GASTO PLENARIAS', ...gastosPlenariasPorMes];
    const estiloGP = [subtotalStyle];
    gastosPlenariasPorMes.forEach(() => estiloGP.push(moneyStyle));
    filaGP.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
    estiloGP.push(moneyStyle);
    data.push(filaGP);
    styles.push(estiloGP);

    // Gastos gestion
    const gastosGestionPorMes = acumularPorMesFecha(gastoGestion, 'fecha', 'total');
    const filaGG = ['GASTO GESTION', ...gastosGestionPorMes];
    const estiloGG = [subtotalStyle];
    gastosGestionPorMes.forEach(() => estiloGG.push(moneyStyle));
    filaGG.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
    estiloGG.push(moneyStyle);
    data.push(filaGG);
    styles.push(estiloGG);

    // Gastos comisiones
    const gastosComisionesPorMes = acumularPorMesFecha(gastoComisiones, 'fecha_registro', 'monto');
    const filaGC = ['GASTO COMISIONES', ...gastosComisionesPorMes];
    const estiloGC = [subtotalStyle];
    gastosComisionesPorMes.forEach(() => estiloGC.push(moneyStyle));
    filaGC.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
    estiloGC.push(moneyStyle);
    data.push(filaGC);
    styles.push(estiloGC);

    // Otros gastos por descripción
    const gastosOtrosPorDesc = {};
    for (const gasto of gastoOtros) {
      const fecha = new Date(gasto.fecha_registro);
      const desc = gasto.descripcion || 'SIN DESCRIPCIÓN';
      const monto = Number(gasto.monto) || 0;
      if (!gastosOtrosPorDesc[desc]) gastosOtrosPorDesc[desc] = Array(12).fill(0);
      const idx = meses.findIndex(m => m.anio === fecha.getFullYear() && m.mes === (fecha.getMonth() + 1));
      if (idx !== -1) gastosOtrosPorDesc[desc][idx] += monto;
    }
    Object.entries(gastosOtrosPorDesc).forEach(([desc, valores]) => {
      const fila = [desc.toUpperCase()];
      const estiloFila = [subtotalStyle];
      valores.forEach(v => {
        fila.push(v);
        estiloFila.push(moneyStyle);
      });
      fila.push({ f: `SUM(B${data.length + 1}:M${data.length + 1})` });
      estiloFila.push(moneyStyle);
      data.push(fila);
      styles.push(estiloFila);
    });

    // Total gastos
    const startGastos = data.findIndex(r => r[0] === 'GASTO DIRECTOR') + 1;
    const endGastos = data.length;
    const filaTotalGastos = ['TOTAL GASTOS'];
    const estiloTotalGastos = [totalStyle];
    for (let col = 2; col <= 13; col++) {
      filaTotalGastos.push({ f: `SUM(${String.fromCharCode(64 + col)}${startGastos}:${String.fromCharCode(64 + col)}${endGastos})` });
      estiloTotalGastos.push(moneyStyle);
    }
    filaTotalGastos.push({ f: `SUM(N${startGastos}:N${endGastos})` });
    estiloTotalGastos.push(moneyStyle);
    data.push(filaTotalGastos);
    styles.push(estiloTotalGastos);

    // Ahorro o déficit
    const filaAhorro = ['AHORRO O DÉFICIT'];
    const estiloAhorro = [totalStyle];
    const filaTotalIngresoNum = data.length - 1; // total ingresos antes de gastos
    const filaTotalGastosNum = data.length;
    for (let col = 2; col <= 13; col++) {
      const colLetra = String.fromCharCode(64 + col);
      filaAhorro.push({ f: `${colLetra}${filaTotalIngresoNum} - ${colLetra}${filaTotalGastosNum}` });
      estiloAhorro.push(moneyStyle);
    }
    filaAhorro.push({ f: `N${filaTotalIngresoNum} - N${filaTotalGastosNum}` });
    estiloAhorro.push(moneyStyle);
    data.push(filaAhorro);
    styles.push(estiloAhorro);

    // Convertir a hoja con estilos
    const ws = aoaToSheetWithStyles(data, styles);

    // Anchos de columna (nombre sindicato / concepto + 12 meses + anual)
    ws['!cols'] = [{ wch: 25 }, ...Array(12).fill({ wch: 12 }), { wch: 14 }];

    // Fila alto para header
    ws['!rows'] = [{ hpt: 24 }];

    // Crear libro
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen Tesorería');

    // Descargar
    XLSX.writeFile(wb, `Informe_Tesoreria_${anioBase}-${anioBase + 1}.xlsx`);

  } catch (error) {
    alert('Error generando informe: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '📊 Generar Informe Excel';
  }
}

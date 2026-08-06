// ****************** Funciones para la Pantalla de Cálculo de Horas ******************

function calcularHoras() {

    // 🔒 BLOQUEO FREEMIUM (Horas → SOLO PRO)
    if (!window.PERMISSIONS || !PERMISSIONS.isPro()) {
        alert("Esta función está disponible en MEC PRO");
        return;
    }

    const sueldoTexto = document.getElementById("horas-sueldoBase").value.trim();
    const valorHoraTexto = document.getElementById("horas-valorHoraIngresado").value.trim();

    const sueldo = parseFloat(sueldoTexto);
    const valorHoraIngresado = parseFloat(valorHoraTexto);

    const jornada = document.getElementById("horas-jornada").value;

    const extra = parseFloat(document.getElementById("horas-horasExtras").value) || 0;
    const recargo = parseFloat(document.getElementById("horas-horasRecargoDomingo").value) || 0;
    const extraDomingo = parseFloat(document.getElementById("horas-horasExtrasDomingo").value) || 0;

    /*
     * Existen 2 formas de cálculo:
     *
     * 1) Valor por hora ingresado directamente.
     * 2) Sueldo + jornada.
     *
     * Si se ingresa valor por hora, se usa ese cálculo.
     * Si el valor por hora está vacío, se usa sueldo + jornada.
     */

    const usarValorHoraIngresado =
        valorHoraTexto !== "" &&
        !isNaN(valorHoraIngresado) &&
        valorHoraIngresado > 0;

    const usarSueldoYJornada =
        sueldoTexto !== "" &&
        !isNaN(sueldo) &&
        sueldo > 0 &&
        jornada !== "";

    // Validar datos
    if (!usarValorHoraIngresado && !usarSueldoYJornada) {
        alert("Por favor, ingrese un valor por hora o un sueldo válido con jornada.");
        return;
    }

    let valorHoraBase = 0;
    let factor = 0;
    let valorHorasExtras = 0;

    // =========================================================
    // PROCESO 1: CÁLCULO POR VALOR HORA INGRESADO
    // =========================================================
    if (usarValorHoraIngresado) {

        // Se usa directamente el valor por hora ingresado
        valorHoraBase = valorHoraIngresado;

        // En este modo no se calcula por jornada, por eso el factor es 1
        factor = 1;

        /*
         * Horas extras en modo valor por hora:
         *
         * valorHoraBase × 1.50 × cantidad de horas extras
         *
         * Ejemplo:
         * 5000 × 1.50 × 1 = 7500
         */
        valorHorasExtras = valorHoraBase * 1.50 * extra;

    } else {

        // =====================================================
        // PROCESO 2: CÁLCULO ORIGINAL POR SUELDO Y JORNADA
        // =====================================================

        // Cálculo del valor de la hora base
        valorHoraBase = (sueldo / 30) * (28 / (parseInt(jornada) * 4));

        // Factor jornada
        const factorObj = listaHoraExtra.find(item => item.horas === jornada);
        factor = factorObj ? factorObj.factor : 0;

        /*
         * Horas extras en modo sueldo + jornada:
         *
         * Se mantiene tu fórmula original:
         *
         * sueldo × factor × cantidad de horas extras
         */
        valorHorasExtras = sueldo * factor * extra;
    }

    // Mostrar valor hora base
    document.getElementById("horas-valorHoraBase").textContent =
        formatearCLP(valorHoraBase);

    // Mostrar factor como número con 7 decimales
    document.getElementById("horas-factor").textContent =
        Number(factor).toFixed(7);

    // Mostrar horas extras
    document.getElementById("horas-valorHorasExtras").textContent =
        formatearCLP(valorHorasExtras);

    /*
     * =========================================================
     * RECARGO DOMINGO
     * =========================================================
     *
     * Se calcula con el valorHoraBase obtenido según el modo usado:
     *
     * - Si se ingresó valor por hora, usa ese valor.
     * - Si se usó sueldo + jornada, usa el valor hora calculado.
     *
     * Fórmula:
     * valorHoraBase × 0.30 × cantidad de horas domingo
     */
    const valorRecargoDomingo = valorHoraBase * 0.30 * recargo;

    document.getElementById("horas-valorRecargoDomingo").textContent =
        formatearCLP(valorRecargoDomingo);

    /*
     * =========================================================
     * HORAS EXTRAS DOMINGO
     * =========================================================
     *
     * Se calcula con el valorHoraBase obtenido según el modo usado.
     *
     * Fórmula:
     * valorHoraBase × 1.30 × 1.50 × cantidad de horas extras domingo
     *
     * Ejemplo con valor hora 5000 y 1 hora:
     * 5000 × 1.30 × 1.50 × 1 = 9750
     */
    const valorHorasExtrasDomingo = valorHoraBase * 1.30 * 1.50 * extraDomingo;

    document.getElementById("horas-valorHorasExtrasDomingo").textContent =
        formatearCLP(valorHorasExtrasDomingo);
}


function refrescarHoras() {
    document.getElementById("horas-sueldoBase").value = "";
    document.getElementById("horas-valorHoraIngresado").value = "";
    document.getElementById("horas-jornada").value = "";
    document.getElementById("horas-horasExtras").value = "";
    document.getElementById("horas-horasRecargoDomingo").value = "";
    document.getElementById("horas-horasExtrasDomingo").value = "";

    document.getElementById("horas-factor").textContent = "";
    document.getElementById("horas-valorHoraBase").textContent = "";
    document.getElementById("horas-valorHorasExtras").textContent = "";
    document.getElementById("horas-valorRecargoDomingo").textContent = "";
    document.getElementById("horas-valorHorasExtrasDomingo").textContent = "";
}

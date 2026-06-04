// ****************** Funciones para la Pantalla de Cálculo de Horas ******************

function calcularHoras() {

    // 🔒 BLOQUEO FREEMIUM (Horas → SOLO PRO)
    if (!window.PERMISSIONS || !PERMISSIONS.isPro()) {
        alert("Esta función está disponible en MEC PRO");
        return;
    }

    const sueldo = parseFloat(document.getElementById("horas-sueldoBase").value);
    const jornada = document.getElementById("horas-jornada").value;
    const extra = parseFloat(document.getElementById("horas-horasExtras").value) || 0;
    const recargo = parseFloat(document.getElementById("horas-horasRecargoDomingo").value) || 0;
    const extraDomingo = parseFloat(document.getElementById("horas-horasExtrasDomingo").value) || 0;

    // Validar datos
    if (isNaN(sueldo) || !jornada) {
        alert("Por favor, ingrese un sueldo válido y seleccione una jornada.");
        return;
    }

    // Cálculo del valor de la hora base
    const valorHoraBase = (sueldo / 30) * (28 / (parseInt(jornada) * 4));
    document.getElementById("horas-valorHoraBase").textContent = formatearCLP(valorHoraBase);

// Factor jornada
    const factorObj = listaHoraExtra.find(item => item.horas === jornada);
    const factor = factorObj ? factorObj.factor : 0;
    // Mostrar como número con 7 decimales (sin formato CLP)
    document.getElementById("horas-factor").textContent = factor.toFixed(7);


    // Horas extras
    const valorHorasExtras = sueldo * factor * extra;
    document.getElementById("horas-valorHorasExtras").textContent = formatearCLP(valorHorasExtras);

    // Recargo domingo
    const valorRecargoDomingo = valorHoraBase * 0.30 * recargo;
    document.getElementById("horas-valorRecargoDomingo").textContent = formatearCLP(valorRecargoDomingo);

    // Horas extras domingo
    const valorHorasExtrasDomingo = valorHoraBase * 1.3 * 1.5 * extraDomingo;
    document.getElementById("horas-valorHorasExtrasDomingo").textContent = formatearCLP(valorHorasExtrasDomingo);
}

function refrescarHoras() {
    document.getElementById("horas-sueldoBase").value = "";
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
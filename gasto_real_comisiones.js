// Cuando se muestra la pantalla de "Gasto Real de Comisiones"
function cargarPantallaGastoReal() {
    // Mostrar la pantalla de gasto real de comisiones
    document.getElementById("pantalla-rgasto-comisiones").style.display = "block";

    // Llamada a Supabase para obtener los datos necesarios (Mes comercial y Comisión)
    obtenerMesesComerciales();
    obtenerComisiones();

    // Obtener historial de gastos reales de la base de datos
    obtenerHistorialGastosReales();
}

// Función para cargar los meses comerciales
async function obtenerMesesComerciales() {
    try {
        // Ejemplo de cómo obtener meses comerciales desde tu base de datos
        const { data, error } = await supabase
            .from('meses_comerciales')
            .select('*');

        if (error) throw error;

        const mesComercialSelect = document.getElementById('mesComercial');
        mesComercialSelect.innerHTML = '<option value="">-- Elige mes --</option>'; // Limpiar las opciones

        // Rellenar el select con los meses comerciales
        data.forEach(mes => {
            const option = document.createElement('option');
            option.value = mes.id; // Asumiendo que 'id' es el valor para seleccionar
            option.textContent = mes.nombre; // Asumiendo que 'nombre' es el mes
            mesComercialSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar los meses comerciales: ", error);
    }
}

// Función para cargar las comisiones
async function obtenerComisiones() {
    try {
        // Llamada a la base de datos para obtener las comisiones
        const { data, error } = await supabase
            .from('comisiones')
            .select('*');

        if (error) throw error;

        const comisionSelect = document.getElementById('comisionSelect');
        comisionSelect.innerHTML = '<option value="">-- Elige comisión --</option>'; // Limpiar opciones

        // Llenar las comisiones en el select
        data.forEach(comision => {
            const option = document.createElement('option');
            option.value = comision.id; // Asumiendo que 'id' es el valor para seleccionar
            option.textContent = comision.nombre; // Asumiendo que 'nombre' es el nombre de la comisión
            comisionSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar las comisiones: ", error);
    }
}

// Función para cargar el historial de gastos reales
async function obtenerHistorialGastosReales() {
    try {
        // Obtener los gastos reales desde la base de datos
        const { data, error } = await supabase
            .from('comisiones')
            .select('*');

        const historialContainer = document.getElementById("tablaGastosReales");
        const historialTitulo = document.querySelector("h3");

        if (error) throw error;

        // Si no hay datos
        if (data.length === 0) {
            historialContainer.style.display = "none"; // Ocultar la tabla
            historialTitulo.textContent = "Historial de gastos reales: No hay datos";
        } else {
            // Si hay datos, mostrar y rellenar la tabla
            historialContainer.style.display = "block"; // Mostrar la tabla
            historialTitulo.textContent = "Historial de gastos reales";

            // Limpiar cualquier fila existente
            const tbody = document.querySelector("#tablaGastosReales tbody");
            tbody.innerHTML = "";

            let totalMensual = 0;
            let totalAnual = 0;

            data.forEach(gasto => {
                const tr = document.createElement('tr');

                // Fecha de registro
                const tdFecha = document.createElement('td');
                tdFecha.textContent = formatDate(gasto.fecha_registro);
                tr.appendChild(tdFecha);

                // Mes
                const tdMes = document.createElement('td');
                tdMes.textContent = gasto.mes;
                tr.appendChild(tdMes);

                // Comisión
                const tdComision = document.createElement('td');
                tdComision.textContent = gasto.comision;
                tr.appendChild(tdComision);

                // Director
                const tdDirector = document.createElement('td');
                tdDirector.textContent = gasto.director;
                tr.appendChild(tdDirector);

                // Fecha de prestación
                const tdFechaPrestacion = document.createElement('td');
                tdFechaPrestacion.textContent = formatDate(gasto.fecha_prestacion);
                tr.appendChild(tdFechaPrestacion);

                // Horas
                const tdHoras = document.createElement('td');
                tdHoras.textContent = gasto.horas;
                tr.appendChild(tdHoras);

                // Monto
                const tdMonto = document.createElement('td');
                tdMonto.textContent = `₱ ${gasto.monto}`;
                tr.appendChild(tdMonto);

                // Acción
                const tdAccion = document.createElement('td');
                tdAccion.innerHTML = '<button onclick="eliminarGasto(' + gasto.id + ')">Eliminar</button>';
                tr.appendChild(tdAccion);

                tbody.appendChild(tr);

                totalMensual += parseFloat(gasto.monto); // Sumar al total mensual
                totalAnual += parseFloat(gasto.monto); // Sumar al total anual
            });

            // Mostrar los totales
            document.getElementById("totalMes").textContent = totalMensual.toFixed(2);
            document.getElementById("totalMesMonto").textContent = `₱ ${totalMensual.toFixed(2)}`;
            document.getElementById("totalAnio").textContent = totalAnual.toFixed(2);
            document.getElementById("totalAnioMonto").textContent = `₱ ${totalAnual.toFixed(2)}`;
        }
    } catch (error) {
        console.error("Error al cargar el historial de gastos: ", error);
    }
}

// Función para formatear la fecha
function formatDate(fecha) {
    const date = new Date(fecha);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Función para eliminar un gasto real
async function eliminarGasto(id) {
    try {
        // Eliminar el gasto real desde la base de datos
        const { data, error } = await supabase
            .from('comisiones')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Recargar el historial de gastos reales después de eliminar
        obtenerHistorialGastosReales();
    } catch (error) {
        console.error("Error al eliminar el gasto real: ", error);
    }
}

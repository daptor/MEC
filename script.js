// ========================================
// 🔐 ESPERAR PLAN USUARIO (FIX ORDEN SAAS)
// ========================================
function esperarPlanUsuario() {
    return new Promise(resolve => {

        let intentos = 0;

        const intervalo = setInterval(async () => {

            if (window.userPlan) {

                clearInterval(intervalo);
                console.log("🎯 Plan listo para usar:", window.userPlan);

                actualizarUIsegunPlan();
                await registrarVisitaGlobalUnaVez();

                resolve(window.userPlan);
                return;
            }

            intentos++;

            if (intentos > 50) {
                clearInterval(intervalo);

                console.warn("⚠ Plan fallback FREE");

                window.userPlan = "free";
                actualizarUIsegunPlan();
                await registrarVisitaGlobalUnaVez();

                resolve("free");
            }

        }, 100);
    });
}

// =========================================
// 📈 VISITAS GLOBALES (1 sola ejecución)
// =========================================
let visitaRegistrada = false;

async function registrarVisitaGlobalUnaVez() {
    if (visitaRegistrada) return;
    visitaRegistrada = true;

    try {
        await incrementarVisitas();
        await mostrarContadorVisitas();
        console.log("📈 Visita global registrada correctamente");
    } catch (err) {
        console.warn("⚠ Error visitas:", err);
    }
}

// =========================================
// 🧮 ANÁLISIS FREEMIUM (CONTROL ÚNICO)
// =========================================
async function puedeUsarAnalisisTotal() {

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { data, error } = await supabase
        .from("profiles")
        .select("analisis_usados")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error usos:", error);
        return false;
    }

    const usados = data.analisis_usados || 0;
    console.log("📊 Análisis usados:", usados, "/ 2");

    return usados < 2;
}

// =========================================
// ➕ SUMAR ANÁLISIS (RPC BACKEND)
// =========================================
async function sumarUsoAnalisisTotal() {

    try {
        const { error } = await supabase.rpc("incrementar_analisis");
        if (error) throw error;

        console.log("➕ Uso registrado vía backend (RPC)");
        await actualizarContadorAnalisisUI();

    } catch (error) {
        console.warn("⚠ Límite alcanzado o error:", error.message);
    }
}

// =========================================
// 🧮 UI CONTADOR ANÁLISIS
// =========================================
async function actualizarContadorAnalisisUI() {

    const el = document.getElementById("contador-analisis");
    if (!el) return;

    if (window.userPlan === "pro") {
        el.textContent = "💎 Plan PRO activo | Ilimitado";
        return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data, error } = await supabase
        .from("profiles")
        .select("analisis_usados")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    el.textContent = `${data.analisis_usados || 0} de 2`;
}

// =========================================
// 📈 CONTADOR GLOBAL SUPABASE
// =========================================
async function incrementarVisitas() {

    const { data: { session } } = await supabase.auth.getSession();
    const rol = localStorage.getItem("rol");

    if (rol === "admin") return;

    const adminEmail = "christorfu@gmail.com";
    if (session?.user?.email === adminEmail) return;

    if (!session && rol !== "usuario") return;

    try {
        await registrarUso("visita");
        console.log("✅ Visita incrementada en Supabase");
    } catch (error) {
        console.error("❌ Error al incrementar visitas:", error);
        return;
    }

    await mostrarContadorVisitas();
}

// 🔵 Mostrar contador visitas
async function mostrarContadorVisitas() {

    const el = document.getElementById("contador");
    if (!el) return;

    const { data, error } = await supabase
        .from('contador')
        .select('visitas')
        .eq('id', 1)
        .single();

    if (error) {
        console.error("Error al obtener contador:", error);
        return;
    }

    el.textContent = data.visitas;
}

// 🕒 Fecha y hora
function actualizarFechaHora() {
    const fechaElemento = document.getElementById("fecha");
    const horaElemento = document.getElementById("hora");

    const ahora = new Date();
    if (fechaElemento) fechaElemento.textContent = ahora.toLocaleDateString();
    if (horaElemento) horaElemento.textContent = ahora.toLocaleTimeString();
}

// =========================================
// 👤 PERSONALIZAR BOTÓN CERRAR SESIÓN
// =========================================
async function personalizarBotonLogout() {

    const btn = document.getElementById("btnLogout");
    if (!btn) return;

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    // Texto elegante del botón
    btn.textContent = `Cerrar: ${user.email}`;

    btn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };
}

// 🚀 INICIALIZACIÓN APP
document.addEventListener("DOMContentLoaded", async () => {

    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);

    await esperarPlanUsuario();
    await mostrarContadorVisitas();
    await actualizarContadorAnalisisUI();
    await personalizarBotonLogout();   // ⭐ NUEVO
});

// =========================================
// 🔑 LOGIN POR CÓDIGO (REEMPLAZO COMPLETO)
// Usa /api/validate-clave y setea window.rolFederacion + window.directorCodigoFederacion
// =========================================
async function obtenerClaves() {
  // mantener por compatibilidad si hay otras partes que la llaman
  const response = await fetch("/api/keys");
  return await response.json();
}

const btnIngresar = document.getElementById("ingresarBtn");

if (btnIngresar) {
  // remover listeners previos por seguridad
  try { btnIngresar.removeEventListener("click", window._oldIngresarListener); } catch(e){}

  btnIngresar.addEventListener("click", async function () {
    const codigoIngresado = document.getElementById("codigoAcceso").value;

    try {
      // Llamar al endpoint en Vercel que valida la clave y devuelve { role, director_code }
      const resp = await fetch("/api/validate-clave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave: codigoIngresado })
      });

      const j = await resp.json();

      if (!resp.ok) {
        const mensajeError = document.getElementById("mensajeError");
        if (mensajeError) {
          mensajeError.style.display = "block";
          mensajeError.textContent = j.error || "Código incorrecto.";
        }
        return;
      }

      // Guardar valores que usará el flujo de Rendición de viáticos
      // role: ej. "DIRECTOR_3" o "TESORERO"
      // director_code: valor EXACTO que las policies esperan (usar como x-director-codigo y primer segmento del path)
      window.rolFederacion = j.role;
      window.directorCodigoFederacion = j.director_code;

      // Persistir localmente si quieres
      try {
        localStorage.setItem("rolFederacion", window.rolFederacion);
        localStorage.setItem("directorCodigoFederacion", window.directorCodigoFederacion);
      } catch(e){ /* ignore storage errors */ }

      // Mantener UX existente de Archivo Sindical
      const loginContainer = document.getElementById("login-container");
      const menuPrincipal = document.getElementById("menu-principal");
      if (loginContainer) loginContainer.style.display = "none";
      if (menuPrincipal) menuPrincipal.style.display = "block";

      // conservar llamadas previas si existen
      if (typeof mostrarContadorVisitas === "function") await mostrarContadorVisitas();
      if (typeof incrementarVisitas === "function") await incrementarVisitas();

    } catch (e) {
      console.error("Error validando clave:", e);
      const mensajeError = document.getElementById("mensajeError");
      if (mensajeError) {
        mensajeError.style.display = "block";
        mensajeError.textContent = "Error al validar clave.";
      }
    }
  });
}


// =========================================
// 🧭 NAVEGACIÓN PANTALLAS
// =========================================
function mostrarPantalla(idPantalla) {
    document.querySelectorAll(".pantalla").forEach(p => p.style.display = "none");
    const pantalla = document.getElementById(idPantalla);
    if (pantalla) pantalla.style.display = "block";
}

function volverAlMenu() {
    mostrarPantalla('menu-principal');
}

// ==================== CONFIGURACIÓN DE NAVEGACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a las pantallas (ajusta los IDs según tu HTML)
    const pantallaPrincipal = document.getElementById('pantalla-principal');
    const pantallaAnalizar = document.getElementById('pantalla-analizar');

    // Botón para ir a la pantalla de análisis
    const analizarBtn = document.getElementById('analizarLiquidacionBtn');

    // Botones comunes en cada pantalla (volver y refrescar)
    const volverBtns = document.querySelectorAll('.volverBtn');
    const refrescarBtns = document.querySelectorAll('.refrescarBtn');

    // Función para mostrar una pantalla específica
    function mostrarPantalla(pantalla) {
        pantallaPrincipal.style.display = 'none';
        pantallaAnalizar.style.display = 'none';
        pantalla.style.display = 'block';
    }

    // Navegación: Al presionar el botón de analizar, se muestra la pantalla de análisis
    if (analizarBtn) {
        analizarBtn.addEventListener('click', () => {
            mostrarPantalla(pantallaAnalizar);
        });
    }

    // Funcionalidad de los botones "Volver"
    volverBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            mostrarPantalla(pantallaPrincipal);
        });
    });

    // Funcionalidad de los botones "Refrescar"
  const refrescarBtnAnalisis = document.getElementById('refrescarBtnAnalisis');
  if (refrescarBtnAnalisis) {
      refrescarBtnAnalisis.addEventListener('click', () => {
          // Limpiar los resultados previos de análisis
          document.getElementById('resultadoAnalisis').innerHTML = '';

          // Limpiar el contenedor de gratificación
          const gratificacionMec = document.getElementById('gratificacionMec');
          if (gratificacionMec) {
              gratificacionMec.style.display = 'none'; // Esconder el contenedor
          }

          // Limpiar el contenido de gratificación calculada
          const resultadoGratificacion = document.getElementById('resultadoGratificacion');
          if (resultadoGratificacion) {
              resultadoGratificacion.innerHTML = ''; // Limpiar la información de gratificación
          }

          // Limpiar el archivo PDF seleccionado
          const fileInput = document.getElementById('fileInput');
          if (fileInput) {
              fileInput.value = ''; // Limpiar el archivo PDF
          }

          // Resetear el campo de jornada seleccionada
          const jornadaSelect = document.getElementById('jornada');
          if (jornadaSelect) {
              jornadaSelect.value = ''; // Limpiar la selección de jornada
          }

          // Resetear el campo de informe de ventas de asesor
            const filePremio = document.getElementById('filePremio');
            if (filePremio) filePremio.value = "";
      });
  }

  const refrescarBtnVacaciones = document.getElementById('refrescarBtnVacaciones');
  if (refrescarBtnVacaciones) {
      refrescarBtnVacaciones.addEventListener('click', () => {
          // Limpiar los archivos seleccionados para vacaciones
          const vacacionInput = document.getElementById('vacacionInput');
          if (vacacionInput) {
              vacacionInput.value = ''; // Limpiar el campo de archivos
          }

          // Limpiar los resultados previos de vacaciones
          const resultadoVacaciones = document.getElementById('resultadoVacaciones');
          if (resultadoVacaciones) {
              resultadoVacaciones.innerHTML = ''; // Limpiar los resultados previos
          }
      });
  }

  // Funcionalidad del botón "Refrescar" en el cálculo de finiquito
  const refrescarBtnFiniquito = document.getElementById('refrescarFiniquito');
  if (refrescarBtnFiniquito) {
      refrescarBtnFiniquito.addEventListener('click', () => {
          refrescarFiniquito();
      });
  }

  // Función para refrescar la pantalla de Finiquito
  function refrescarFiniquito() {
      // Limpiar los campos de entrada
      document.getElementById('fechaInicioContrato').value = '';  // Limpiar fecha inicio contrato
      document.getElementById('fechaDesvinculacion').value = '';  // Limpiar fecha desvinculación
      document.getElementById('diasVacacionesPendientes').value = ''; // Limpiar días de vacaciones pendientes
      document.getElementById('diasTrabajadosUltimoMes').value = ''; // Limpiar días trabajados del último mes
      document.getElementById('fileFiniquito').value = ''; // Limpiar el campo de archivo

      // Limpiar los resultados de finiquito
      const resultadosFiniquito = document.getElementById('resultadosFiniquito');
      if (resultadosFiniquito) {
          resultadosFiniquito.classList.add('hidden'); // Ocultar los resultados
          resultadosFiniquito.innerHTML = ''; // Limpiar cualquier contenido previo
      }

      // Limpiar los resultados de los ítems no finiquito (Valores Excluidos)
      const resultadosNoFiniquito = document.getElementById('resultadosNoFiniquito');
      if (resultadosNoFiniquito) {
          resultadosNoFiniquito.innerHTML = ''; // Limpiar los resultados de ítems no finiquito
      }
  }

  // Inicialmente muestra la pantalla principal
  if (pantallaPrincipal) pantallaPrincipal.style.display = 'block';
  if (pantallaAnalizar) pantallaAnalizar.style.display = 'none';

});


// **************** Función de cálculo de vacaciones ****************
document.addEventListener("DOMContentLoaded", function () {
    const vacacionesBtn = document.getElementById("vacacionesBtn");
    const volverBtn = document.getElementById("volverBtn");
    const refrescarBtn = document.getElementById("refrescarBtnVacaciones"); // Nota: Usamos el ID específico para Vacaciones

    if (vacacionesBtn) {
        vacacionesBtn.addEventListener("click", () => {
            document.getElementById("menu-principal").style.display = "none";
            document.getElementById("pantalla-vacaciones").style.display = "block";
        });
    }

    if (volverBtn) {
        volverBtn.addEventListener("click", () => {
            document.getElementById("pantalla-vacaciones").style.display = "none";
            document.getElementById("menu-principal").style.display = "block";
        });
    }

    if (refrescarBtn) {
        refrescarBtn.addEventListener("click", () => {
            const vacacionInput = document.getElementById("vacacionInput");
            const resultadoVacaciones = document.getElementById("resultadoVacaciones");
            if (vacacionInput) { vacacionInput.value = ""; }
            if (resultadoVacaciones) { resultadoVacaciones.innerHTML = ""; }
        });
    }
});


// ***********Función para mostrar una pantalla y ocultar las demás**********
function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.style.display = 'none');
  const p = document.getElementById(id);
  if (p) {
    p.style.display = 'block';

    // ✅ Si la pantalla es “Otros Gastos”, recarga el historial automáticamente
    if (id === 'pantalla-otros-gastos' && typeof window.cargarHistorialOtrosGastos === 'function') {
      window.cargarHistorialOtrosGastos();
    }
  } else {
    console.warn(`La pantalla "${id}" no existe`);
  }
}


// Función para salir con confirmación
function salirAplicacion() {
    // Mostrar cuadro de confirmación
    const confirmacion = confirm("¿Desea salir de la aplicación?");

    // Si el usuario confirma, se recarga la página o se redirige
    if (confirmacion) {
        alert("Cerrando la aplicación...");
        window.location.href = "https://www.google.cl"; // Redirige a Google, o puedes poner la URL que prefieras
    }
}


// **************** archivo sindical ********************
document.addEventListener("DOMContentLoaded", function () {

    // Documentos varios (que deben aparecer después de los públicos)
    const documentosVarios = [
        { nombre: "Código del Trabajo 2024", url: "Documento Público General/Datos/Cod Trab ene24.pdf" },
        { nombre: "Bono Lider", url: "Documento Público General/Datos/Bono lider sueldo convenido.pdf" },
        { nombre: "Feriado", url: "Documento Público General/Datos/Feriado.pdf" },
        { nombre: "ley de la silla", url: "Documento Público General/Datos/ley de la silla.pdf" },
        { nombre: "Codigo de Integridad", url: "Documento Público General/Datos/CODIGO-DE-INTEGRIDAD_SA-2023-actualizado-1.pdf" },
        { nombre: "Flex it - Documt. Electronica", url: "Documento Público General/Datos/Ord. 243 G.Avilez.pdf" },
        { nombre: "Flex it - Extension", url: "Documento Público General/Datos/ord 704 Valentina Molfino.pdf" },
        { nombre: "Politica Acoso Sexual - Laboral", url: "Documento Público General/Datos/Politica-contra-el-Acoso-Sexual-Acoso-Laboral-y-Violencia-en-el-Trabajo-2024.pdf" },
        { nombre: "Politica Derechos Humano", url: "Documento Público General/Datos/Politica-de-Derechos-Humano-y-Empresa-Falabella-2024.pdf" },
        { nombre: "Politica Donaciones", url: "Documento Público General/Datos/Politica-de-Donaciones-y-Membresias-2024.pdf" },
        { nombre: "Politica Equidad de Genero", url: "Documento Público General/Datos/Politica-de-Equidad-de-Genero.pdf" },
        { nombre: "Politica General de Investigacion", url: "Documento Público General/Datos/Politica-General-de-Investigacion.pdf" },
        { nombre: "Procedimiento General de Investigacion", url: "Documento Público General/Datos/Procedimiento-General-de-Investigacion.pdf" }
    ];

    // Variable para almacenar el sindicato seleccionado
    let sindicatoSeleccionado = "";
    window.usuarioFederacion = null;
    window.sindicatoFederacionActual = null;

    // Función para obtener las claves desde la API en Vercel
    async function obtenerClaves() {
        const response = await fetch("/api/keys");  // Llama a la API en Vercel
        const data = await response.json();
        return data;
    }

    // Función para mostrar una pantalla y ocultar las demás
    function mostrarPantalla(idPantalla) {
        const pantallas = document.querySelectorAll(".pantalla");
        pantallas.forEach(p => p.style.display = "none");
        const pantalla = document.getElementById(idPantalla);
        if (pantalla) {
            pantalla.style.display = "block";
        }

        if (idPantalla === "pantalla-archivosindical" || idPantalla === "menu-principal") {
            // Limpiar la selección de sindicato al regresar al menú
            const selectSindicato = document.getElementById("select-sindicato");
            if (selectSindicato) selectSindicato.value = "";

            // Limpiar cualquier mensaje de error
            const mensajeError = document.getElementById("mensaje-error");
            if (mensajeError) mensajeError.style.display = "none";

            // Limpiar los documentos previamente mostrados
            const listaDocumentos = document.getElementById("lista-documentos-sindicato");
            if (listaDocumentos) listaDocumentos.innerHTML = "";

            const listaPublicos = document.getElementById("lista-documentos-publicos");
            if (listaPublicos) listaPublicos.innerHTML = "";

            const listaVarios = document.getElementById("lista-documentos-varios");
            if (listaVarios) listaVarios.innerHTML = "";

            // Limpiar el nombre del sindicato
            const nombreSindicato = document.getElementById("nombre-sindicato");
            if (nombreSindicato) nombreSindicato.textContent = "";

            // Restablecer la variable de sindicato seleccionado
            sindicatoSeleccionado = "";
        }
    }

// Función para mostrar el modal de clave
function mostrarClaveInput() {

    // Obtén el sindicato seleccionado
    sindicatoSeleccionado = document.getElementById("select-sindicato").value;
    const modalClave = document.getElementById("modal-clave");
    const descripcion = document.getElementById("descripcion-acceso");

    if (sindicatoSeleccionado) {
        // Limpia campo clave
        document.getElementById("clave-input").value = "";
        // Oculta errores previos
        document.getElementById("mensaje-error").style.display =
            "none";

// ======================================================
// 🧠 MENSAJE DINÁMICO SEGÚN MÓDULO
// ======================================================
        if (sindicatoSeleccionado === "RendicionFederacion") {
            descripcion.innerHTML = `
                🔐 Ingreso Rendición Federación<br><br>
                • Director: usar clave DIRECTOR<br>
                • Tesorero: usar clave ADMIN
            `;

        } else if (
            sindicatoSeleccionado === "ReunionFederacion"
        ) {
            descripcion.innerHTML = `
            🧑‍⚖️ Ingreso Mesa Sindical Digital<br><br>
            • Utiliza la misma clave del sindicato
            `;
        } else {
            descripcion.innerHTML = `
                🏢 Ingreso Archivo Sindical<br><br>
                • Ingresa clave del sindicato seleccionado
            `;
        }
        // Mostrar modal
        modalClave.classList.remove("oculto");
    } else {
        // Ocultar modal si no hay selección
        modalClave.classList.add("oculto");
    }
}

// Función para verificar la clave ingresada desde la API
async function verificarClave() {

    const claveIngresada = document.getElementById("clave-input").value;
    const claves = await obtenerClaves();
    const sindicatoSeleccionado = document.getElementById("select-sindicato").value;
    const mensajeError = document.getElementById("mensaje-error");

// ======================================================
// 🧑‍⚖️ CASO ESPECIAL: REUNIÓN FEDERACIÓN
// ======================================================
    if (sindicatoSeleccionado === "ReunionFederacion") {

        let sindicatoValido = null;

        // Validar claves sindicales existentes
        const sindicatos = [
            "Concepcion",
            "Costanera",
            "Curico",
            "Iquique",
            "PlazaNorte",
            "PuertoMontt",
            "Rancagua",
            "Trebol"
        ];

        for (const sindicato of sindicatos) {
            const claveCorrecta =
                claves[`CLAVE_${sindicato.toUpperCase()}`];
            if (claveIngresada === claveCorrecta) {
                sindicatoValido = sindicato;
                break;
            }
        }

        // ❌ Clave inválida
        if (!sindicatoValido) {
            mensajeError.innerText =
                "Clave inválida para Reunión Federación.";
            mensajeError.style.display = "block";
            return;
        }

        try {

            // ==================================================
            // MAPEO NOMBRE → UUID REAL
            // ==================================================
            const mapaSindicato = {
                "Concepcion": "9ca693bd-8284-41ae-943f-cb6ec8e76c2c",
                "Costanera": "de394bc2-fef6-4a68-9998-d68223183905",
                "Curico": "64cfea41-937d-48e7-876d-578c3aba7941",
                "Iquique": "af3b44d8-8bb3-4d8c-b066-1060b5daaa48",
                "PlazaNorte": "4361900f-099b-4419-8bbe-f801817f673f",
                "PuertoMontt": "732f660b-d50e-4b59-8859-ab8ee046626e",
                "Rancagua": "c255adf1-0c00-4aa2-aac7-ffbe590534ec",
                "Trebol": "c0e6834e-73fa-4bf0-a5b9-778848e388a8"
            };

            const sindicatoUUID =
                mapaSindicato[sindicatoValido];

            window.sindicatoFederacionActual = {
                nombre: sindicatoValido,
                id: sindicatoUUID
            };

            // ==================================================
            // CONSULTAR SOCIOS
            // ==================================================
            const { data: socios, error } = await supabase
                .from("socios")
                .select("*")
                .eq("sindicato_id", sindicatoUUID)
                .eq("estado", "activo")
                .order("nombre");

            if (error) {
                console.error(error);
                mensajeError.innerText =
                    "Error cargando socios.";
                mensajeError.style.display = "block";

                return;
            }

            // ==================================================
            // RENDER LISTA
            // ==================================================
            const lista =
                document.getElementById("lista-socios-reunion");

            lista.innerHTML = "";
            socios.forEach((socio) => {
                const div = document.createElement("div");
                div.className = "item-socio-reunion";
                div.innerHTML = `
                    <label>
                        <input
                            type="radio"
                            name="socioReunion"
                            value="${socio.id}"
                        >
                        ${socio.nombre}
                        (${socio.rol})
                    </label>
                `;
                lista.appendChild(div);
            });

            // ==================================================
            // TITULO
            // ==================================================
            document.getElementById(
                "reunion-sindicato-actual"
            ).innerText =
                "Sindicato: " + sindicatoValido;

            // ==================================================
            // MOSTRAR PANTALLA
            // ==================================================
            cerrarModalClave();
            mostrarPantalla(
                "pantalla-reunion-acceso"
            );

        } catch (err) {
            console.error(err);
            mensajeError.innerText =
                "Error inesperado.";
            mensajeError.style.display = "block";
        }

        return;
}

// ======================================================
// 🧾 CASO ESPECIAL: RENDICIÓN VIÁTICOS FEDERACIÓN
// ======================================================
if (sindicatoSeleccionado === "RendicionFederacion") {
  let directorCodigo = "";
  let esTesorero = false;

  // TESORERO usa ADMIN_KEY
  if (claveIngresada === claves.ADMIN_KEY) {
    esTesorero = true;
  } else {
    // DIRECTORES 1..8
    for (let i = 1; i <= 8; i++) {
      const keyName = `DIRECTOR_${i}`;
      if (claveIngresada === claves[keyName]) {
        directorCodigo = `DIRECTOR_${i}`;
        break;
      }
    }
  }

  // ❌ Clave incorrecta
  if (!esTesorero && !directorCodigo) {
    mensajeError.innerText = "Clave incorrecta para Rendición Federación.";
    mensajeError.style.display = "block";
    return;
  }

  // Guardamos identidad global (se usará con Supabase después)
  if (esTesorero) {
    window.rolFederacion = "tesorero";
    window.directorCodigoFederacion = "TESORERO"; // código genérico tesorero

    // Buscar nombre del tesorero en socios (rol = TESORERO)
    try {
      supabase
        .from("socios")
        .select("nombre")
        .eq("rol", "TESORERO")
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data && data.nombre) {
            const el = document.getElementById("rv-nombre-tesorero");
            if (el) el.textContent = `(${data.nombre})`;
          }
        });
    } catch (e) {
      console.warn("No se pudo obtener nombre tesorero:", e);
    }

    mostrarPantalla("pantalla-rendicion-federacion-tesorero");
    if (typeof cargarRendicionesTesorero === "function") {
      cargarRendicionesTesorero();
    }
  } else {
    window.rolFederacion = "director";
    window.directorCodigoFederacion = directorCodigo;

    // Buscar nombre del director en socios (rol = DIRECTOR_X)
    try {
      supabase
        .from("socios")
        .select("nombre")
        .eq("rol", directorCodigo) // ej: DIRECTOR_3
        .maybeSingle()
        .then(async ({ data, error }) => {
          let nombre = data?.nombre || null;

          // ⚠ Caso especial: si NO existe DIRECTOR_3, usar TESORERO como nombre
          if ((!nombre || error) && directorCodigo === "DIRECTOR_3") {
            const { data: socioTes, error: errTes } = await supabase
              .from("socios")
              .select("nombre")
              .eq("rol", "TESORERO")
              .maybeSingle();
            if (!errTes && socioTes?.nombre) {
              nombre = socioTes.nombre;
            }
          }

          if (nombre) {
            const el = document.getElementById("rv-nombre-director");
            if (el) el.textContent = `(${nombre})`;
          }
        });
    } catch (e) {
      console.warn("No se pudo obtener nombre director:", e);
    }

    mostrarPantalla("pantalla-rendicion-federacion-director");
    if (typeof cargarMisRendiciones === "function") {
      cargarMisRendiciones();
    }
  }

  cerrarModalClave();
  return; // evita que siga la lógica de sindicatos normales
}


// ======================================================
// 📊 ACCESO ASISTENCIA Y ESTADÍSTICAS
// ======================================================
if (sindicatoSeleccionado === "AsistenciaEstadisticas") {

    console.log("📊 Acceso correcto → Asistencia y Estadísticas");

    // Cerramos modal de clave
    document.getElementById("modal-clave").classList.add("oculto");

    // Limpiamos input
    document.getElementById("clave-input").value = "";

    // Abrimos nueva pantalla
    mostrarPantalla("pantalla-asistencia-estadisticas");

    return;
}

// ======================================================
// 📊 CASO ESPECIAL: ASISTENCIA HISTÓRICA FEDERACIÓN
// ======================================================
if (sindicatoSeleccionado === "AsistenciaFederacion") {

    const todasLasClaves = Object.values(claves);

    if (!todasLasClaves.includes(claveIngresada)) {
        mensajeError.innerText = "Clave incorrecta para Asistencia Federación.";
        mensajeError.style.display = "block";
        return;
    }

    cerrarModalClave();
    mostrarPantalla("pantalla-asistencia-historica");
    iniciarModulosAsistenciaCerrados();


    // ⏳ Esperar a que MEC renderice la pantalla
    setTimeout(() => {

        if (typeof cargarDashboardAsistencia === "function") {
            cargarDashboardAsistencia();
        }
        if (typeof cargarHistorialReuniones === "function") {
            cargarHistorialReuniones();
        }
        if (typeof cargarRankingSindicatos === "function") {
            cargarRankingSindicatos();
        }
        if (typeof cargarRankingDirectores === "function") {
            cargarRankingDirectores();
        }

    }, 300); // mismo patrón usado en Reunión Federación

    return;
}

    // ======================================================
    // 🏢 FLUJO ORIGINAL – SINDICATOS (NO TOCAR)
    // ======================================================
    if (claveIngresada === claves[`CLAVE_${sindicatoSeleccionado.toUpperCase()}`]) {
        mostrarDocumentos(sindicatoSeleccionado);
    } else {
        mensajeError.innerText = "Clave incorrecta. Inténtalo de nuevo.";
        mensajeError.style.display = "block";
    }
}

// Función para mostrar la pantalla de documentos para el sindicato autenticado (v2 Supabase)
async function mostrarDocumentos(sindicato) {
  // 1) Determinar UUID real del sindicato
  //    Usamos el mismo mapa que en helpers as_* (AS_MAPA_SINDICATOS_UUID)
  const sindicatoId = AS_MAPA_SINDICATOS_UUID[sindicato] || null;

  if (!sindicatoId) {
    console.warn("No se encontró UUID para el sindicato:", sindicato);
    alert("No se pudo identificar el sindicato en Supabase.");
    return;
  }

  // 2) Guardar contexto global (para Archivo Sindical / Mesa, etc.)
  window.sindicatoFederacionActual = {
    id: sindicatoId,
    nombre: sindicato
  };

  // 3) Cabecera
  const nombreSindicatoEl = document.getElementById("nombre-sindicato");
  if (nombreSindicatoEl) {
    nombreSindicatoEl.textContent = "Sindicato de " + sindicato;
  }

  // 4) Limpiar listas antes de cargar
  const listaSindicato = document.getElementById("lista-documentos-sindicato");
  const listaPublicos  = document.getElementById("lista-documentos-publicos");
  const listaVarios    = document.getElementById("lista-documentos-varios");

  if (listaSindicato) listaSindicato.innerHTML = "";
  if (listaPublicos)  listaPublicos.innerHTML  = "";
  if (listaVarios)    listaVarios.innerHTML    = "";

  // 5) Documentos MEC (estáticos) → mismos documentosVarios de antes
  if (listaVarios && Array.isArray(documentosVarios)) {
    documentosVarios.forEach(doc => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${doc.url}" target="_blank">${doc.nombre}</a>`;
      listaVarios.appendChild(li);
    });
  }

  // 6) Cargar desde Supabase:
  //    - Mis archivos (sindicato_archivos donde sindicato_id = sindicatoId)
  //    - Archivos compartidos (visibilidad = 'federacion' de otros sindicatos)
  await as_listarMisArchivos(sindicatoId, sindicato);
  await as_listarArchivosFederacion(sindicatoId);

  // 7) Limpiar clave y select, cerrar modal y mostrar pantalla
  const claveInput = document.getElementById("clave-input");
  if (claveInput) claveInput.value = "";

  const selectSindicato = document.getElementById("select-sindicato");
  if (selectSindicato) selectSindicato.value = "";

  cerrarModalClave();
  mostrarPantalla("pantalla-documentos");
}

// Función para cerrar el modal de clave
function cerrarModalClave() {
  const modalClave = document.getElementById("modal-clave");
  if (modalClave) modalClave.classList.add("oculto");

  const claveInput = document.getElementById("clave-input");
  if (claveInput) claveInput.value = "";

  const mensajeError = document.getElementById("mensaje-error");
  if (mensajeError) {
    mensajeError.style.display = "none";
    mensajeError.textContent = "";
  }

  // 🔄 Resetear el selector al cerrar el modal (Cancelar)
  const selectSindicato = document.getElementById("select-sindicato");
  if (selectSindicato) {
    selectSindicato.selectedIndex = 0; // Primera opción: "Seleccione una opción"
    selectSindicato.value = "";
  }
}


// Asignar las funciones al objeto global 'window'
window.mostrarClaveInput = mostrarClaveInput;
window.verificarClave = verificarClave;
window.cerrarModalClave = cerrarModalClave;

// Enlazar las funciones a los botones del DOM
document.getElementById("select-sindicato")?.addEventListener("change", mostrarClaveInput);
document.getElementById("ingresarBtn")?.addEventListener("click", verificarClave);
});

// ======================================================
// 📄 ACTA ESCALABLE
// ======================================================

function toggleActaContenido() {

    const contenido =
        document.getElementById(
            "acta-contenido-expandible"
        );

    const btn =
        document.getElementById(
            "btnToggleActa"
        );

    if (!contenido || !btn) return;

    const oculto =
        contenido.style.display === "none";

    contenido.style.display =
        oculto ? "block" : "none";

    btn.textContent =
        oculto ? "Ocultar" : "Mostrar";
}

function toggleListaActa(id, boton) {

    const lista =
        document.getElementById(id);

    if (!lista) return;

    const oculto =
        lista.style.display === "none";

    lista.style.display =
        oculto ? "block" : "none";

    boton.textContent =
        oculto ? "Ocultar" : "Mostrar";
}

// ======================================================
// 📅 HISTORIAL ESCALABLE
// ======================================================

function toggleHistorialReuniones(boton) {

    const contenedor =
        document.getElementById(
            "historial-reuniones-contenido"
        );

    if (!contenedor) return;

    const oculto =
        contenedor.style.display === "none";

    contenedor.style.display =
        oculto ? "block" : "none";

    boton.textContent =
        oculto ? "Ocultar" : "Mostrar";
}

// ======================================================
// 🏢 RANKING SINDICATOS
// ======================================================

function toggleRankingSindicato(boton) {

    const contenedor =
        document.getElementById(
            "ranking-sindicato-contenido"
        );

    if (!contenedor) return;

    const oculto =
        contenedor.style.display === "none";

    contenedor.style.display =
        oculto ? "block" : "none";

    boton.textContent =
        oculto ? "Ocultar" : "Mostrar";
}

// ======================================================
// 👥 RANKING DIRECTORES
// ======================================================

function toggleRankingDirectores(boton) {

    const contenedor =
        document.getElementById(
            "ranking-directores-contenido"
        );

    if (!contenedor) return;

    const oculto =
        contenedor.style.display === "none";

    contenedor.style.display =
        oculto ? "block" : "none";

    boton.textContent =
        oculto ? "Ocultar" : "Mostrar";
}

// ======================================================
// 📊 INICIAR MÓDULOS CERRADOS
// ======================================================

function iniciarModulosAsistenciaCerrados() {

    // Dashboard
    const dashboard =
        document.getElementById(
            "dashboard-asistencia-contenido"
        );

    const btnDashboard =
        document.getElementById(
            "btnToggleDashboard"
        );

    if (dashboard && btnDashboard) {

        dashboard.style.display = "none";
        btnDashboard.textContent = "Mostrar";
    }

    // Historial
    const historial =
        document.getElementById(
            "historial-reuniones-contenido"
        );

    const btnHistorial =
        document.getElementById(
            "btnToggleHistorial"
        );

    if (historial && btnHistorial) {

        historial.style.display = "none";
        btnHistorial.textContent = "Mostrar";
    }

    // Ranking sindicatos
    const rankingSindicato =
        document.getElementById(
            "ranking-sindicato-contenido"
        );

    const btnRankingSindicato =
        document.getElementById(
            "btnToggleRankingSindicato"
        );

    if (rankingSindicato && btnRankingSindicato) {

        rankingSindicato.style.display = "none";
        btnRankingSindicato.textContent = "Mostrar";
    }

    // Ranking directores
    const rankingDirectores =
        document.getElementById(
            "ranking-directores-contenido"
        );

    const btnRankingDirectores =
        document.getElementById(
            "btnToggleRankingDirectores"
        );

    if (rankingDirectores && btnRankingDirectores) {

        rankingDirectores.style.display = "none";
        btnRankingDirectores.textContent = "Mostrar";
    }
}

// ****************************bienvenida*********************************
document.addEventListener("DOMContentLoaded", function () {
    const intro = document.getElementById("introBienvenida");
    const btnEntendido = document.getElementById("btnEntendido");
    const btnSolicitarClave = document.getElementById("btnSolicitarClave");

    const rol = localStorage.getItem("rol"); // Obtener el rol desde el localStorage

    // Mostrar solo si el rol no es admin
    if (intro && rol !== "admin") {
        intro.style.display = "block";
    }

    // Al hacer clic en "Entendido"
    if (btnEntendido) {
        btnEntendido.addEventListener("click", function () {
            intro.style.display = "none";
        });
    }

    // Al hacer clic en "Solicita tu clave"
    if (btnSolicitarClave) {
        btnSolicitarClave.addEventListener("click", function () {
            document.getElementById("modalClave").style.display = "block";
        });
    }
});

// ======================================================
// 📥 Cargar rendiciones del director desde Supabase
// ======================================================
async function cargarMisRendiciones() {
  const contenedor = document.getElementById("rv-lista-director");
  if (!contenedor) return;
  contenedor.innerHTML = "Cargando rendiciones...";

  try {
    const supa = getSupabaseFederacion(); // envía x-rol y x-director-codigo
    const { data, error } = await supa
      .from("rendiciones_viaticos")
      .select("*")
      .eq("director_codigo", window.directorCodigoFederacion) // coincide con header x-director-codigo
      .order("fecha_creacion", { ascending: false });

    if (error) {
      console.error(error);
      contenedor.innerHTML = "Error al cargar rendiciones.";
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML = "<p>No tienes rendiciones aún.</p>";
      return;
    }

    let html = "<ul>";
    data.forEach(r => {
      html += `
        <li>
          <strong>${r.fecha_boleta || "Sin fecha"}</strong> — 
          ${r.descripcion || "Sin descripción"} 
          (${r.estado})
        </li>
      `;
    });
    html += "</ul>";
    contenedor.innerHTML = html;
  } catch (err) {
    console.error(err);
    contenedor.innerHTML = "Error inesperado.";
  }
}

// -----------------------------
// Handler definitivo: "Enviar rendición" (Federación)
// -----------------------------
async function rvGuardarHandler(event) {
  event && event.preventDefault && event.preventDefault();

  const btn = document.getElementById("rv-btn-guardar");
  const inputFecha = document.getElementById("rv-fecha-boleta");
  const inputDesc = document.getElementById("rv-descripcion");
  const inputMonto = document.getElementById("rv-monto");
  const inputFile = document.getElementById("rv-boleta-file");
  if (!btn) return console.warn("Botón #rv-btn-guardar no encontrado.");

  const BUCKET = "rendiciones_viaticos";
  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED = ["application/pdf","image/jpeg","image/png"];

  btn.disabled = true;
  const originalText = btn.innerText || "Enviar rendición";

  try {
    const rol = window.rolFederacion;                  // "director" o "tesorero"
    const directorCode = window.directorCodigoFederacion; // "DIRECTOR_1", "DIRECTOR_4", etc.
    if (!rol || !directorCode) throw new Error("Sesión inválida. Reingrese la clave.");

    // validar formulario
    const fechaBoleta = inputFecha?.value?.trim();
    const descripcion = inputDesc?.value?.trim();
    const montoRaw = inputMonto?.value?.trim();
    if (!fechaBoleta) throw new Error("Ingrese fecha de boleta.");
    if (!descripcion) throw new Error("Ingrese descripción.");
    const monto = montoRaw ? Number(montoRaw) : null;
    if (montoRaw && isNaN(monto)) throw new Error("Monto inválido.");

    // archivo obligatorio
    if (!inputFile || !inputFile.files || inputFile.files.length === 0) {
      throw new Error("Se requiere boleta (archivo).");
    }
    const file = inputFile.files[0];
    if (file.size > MAX_BYTES) throw new Error("El archivo excede 5 MB.");
    if (!ALLOWED.includes(file.type)) throw new Error("Tipo de archivo no permitido.");

    // path en Storage (para organizar)
    const ts = Date.now();
    const safe = file.name.replace(/\s+/g,"_").replace(/[^a-zA-Z0-9_\-\.]/g,"");
    const path = `rendiciones/${directorCode}/${ts}_${safe}`;

    // subir boleta con cliente autenticado de Supabase
    const { data: upData, error: upErr } = await window.supabase
      .storage.from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) throw new Error("Error subiendo boleta: " + upErr.message);
    const boletaPath = upData?.path || path;

    // obtener director_nombre solo si es un director
    let directorNombre = null;
    if (rol === "director") {
      try {
        const { data: socio, error: socioErr } = await window.supabase
          .from("socios")
          .select("nombre, rol")
          .eq("rol", directorCode)   // DIRECTOR_1..7
          .limit(1)
          .maybeSingle();

        if (socioErr) {
          console.warn("Error consultando socios:", socioErr.message);
        } else if (socio && socio.nombre) {
          directorNombre = socio.nombre;
        }
      } catch (e) {
        console.warn("No se obtuvo nombre:", e?.message || e);
      }
    }

    // insertar en rendiciones_viaticos
    const payload = {
      director_codigo: directorCode,   // DIRECTOR_1..7 o TESORERO
      director_nombre: directorNombre, // puede ser null si no se obtuvo o es tesorero
      fecha_boleta: fechaBoleta,
      descripcion,
      monto,
      boleta_path: boletaPath,
      boleta_nombre: file.name,
      boleta_mime: file.type,
      estado: "pendiente"
    };

    const supaDb = getSupabaseFederacion();
    const { error: insertErr } = await supaDb
      .from("rendiciones_viaticos")
      .insert([payload]);

    if (insertErr) {
      await window.supabase.storage.from(BUCKET).remove([boletaPath]).catch(()=>{});
      throw new Error("Error guardando rendición: " + insertErr.message);
    }

    if (typeof cargarMisRendiciones === "function") cargarMisRendiciones();
    inputFecha.value = "";
    inputDesc.value = "";
    inputMonto.value = "";
    inputFile.value = "";
    alert("Rendición enviada correctamente.");

  } catch (err) {
    console.error(err);
    alert(err?.message || "Error al enviar rendición.");
  } finally {
    btn.disabled = false;
    btn.innerText = originalText;
  }
}

// asociar listener (idempotente)
(function attachRvListener(){
  const btnRv = document.getElementById("rv-btn-guardar");
  if (btnRv) {
    btnRv.removeEventListener("click", rvGuardarHandler);
    btnRv.addEventListener("click", rvGuardarHandler);
  }
})();


// ======================================================
// 👀 Vista Tesorero: ver y gestionar todas las rendiciones
// ======================================================

async function cargarRendicionesTesorero() {
  const contenedor = document.getElementById("rv-lista-tesorero");
  const filtroSelect = document.getElementById("rv-filtro-estado");
  if (!contenedor) return;

  contenedor.innerHTML = "Cargando rendiciones...";

  try {
    const supa = getSupabaseFederacion();
    let query = supa
      .from("rendiciones_viaticos")
      .select("*")
      .order("fecha_creacion", { ascending: false });

    const estado = filtroSelect ? filtroSelect.value : "";
    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;

    if (error) {
      console.error(error);
      contenedor.innerHTML = "Error al cargar rendiciones.";
      return;
    }

    if (!data || data.length === 0) {
      contenedor.innerHTML = "<p>No hay rendiciones registradas.</p>";
      return;
    }

    let html = "";
    data.forEach(r => {
      const montoStr = r.monto != null ? r.monto : "";
html += `
  <div class="rv-card-rendicion" data-id="${r.id}">
<div class="rv-card-header">
  <div class="rv-card-header-main">
    #${r.id} · ${r.director_nombre || r.director_codigo}
  </div>
  <span>${r.fecha_boleta || ""}</span>
</div>
    <div class="rv-card-body">
      <p><strong>Descripción:</strong> ${r.descripcion || ""}</p>
      <p><strong>Monto:</strong> ${montoStr}</p>
    </div>
    <div class="rv-card-footer">
      <span class="rv-badge-estado ${r.estado}">${r.estado}</span>
      <div class="rv-card-actions">
        ${r.boleta_path ? `<button class="rv-btn-ver-boleta" data-path="${r.boleta_path}">Ver boleta</button>` : ""}
        <button class="rv-btn-marcar-pagada">Pagada</button>
        <button class="rv-btn-marcar-rechazada">Rechazar</button>
      </div>
    </div>
  </div>
`;
    });

    contenedor.innerHTML = html;

  } catch (err) {
    console.error(err);
    contenedor.innerHTML = "Error inesperado.";
  }
}

// Actualizar estado (pagada / rechazada) + observación opcional
async function actualizarEstadoRendicion(id, nuevoEstado) {
  const observacion = nuevoEstado === "rechazada"
    ? (prompt("Ingrese motivo de rechazo (opcional):", "") || null)
    : null;

  try {
    const supa = getSupabaseFederacion(); // x-rol="tesorero"
    const { error } = await supa
      .from("rendiciones_viaticos")
      .update({
        estado: nuevoEstado,
        observacion_tesorero: observacion,
        fecha_pago: nuevoEstado === "pagada" ? new Date().toISOString() : null
      })
      .eq("id", id);

    if (error) throw error;
    alert("Estado actualizado.");
    cargarRendicionesTesorero();
  } catch (e) {
    console.error(e);
    alert("Error actualizando estado: " + (e.message || e));
  }
}

// Ver boleta (abre en nueva pestaña usando signed URL)
async function verBoletaRendicion(path) {
  try {
    const { data, error } = await window.supabase.storage
      .from("rendiciones_viaticos")
      .createSignedUrl(path, 60 * 10); // 10 minutos

    if (error) throw error;
    if (!data || !data.signedUrl) throw new Error("No se pudo generar URL firmada.");

    window.open(data.signedUrl, "_blank");
  } catch (e) {
    console.error(e);
    alert("Error abriendo boleta: " + (e.message || e));
  }
}

// ================================
// Listeners para la UI del tesorero
// ================================
(function initTesoreroEventos() {
  const filtroSelect = document.getElementById("rv-filtro-estado");
  if (filtroSelect) {
    filtroSelect.addEventListener("change", cargarRendicionesTesorero);
  }

  const contenedor = document.getElementById("rv-lista-tesorero");
  if (contenedor) {
    contenedor.addEventListener("click", function (e) {
      const target = e.target;
      const card = target.closest(".rv-card-rendicion");
      if (!card) return;
      const id = Number(card.getAttribute("data-id"));

      if (target.classList.contains("rv-btn-marcar-pagada")) {
        actualizarEstadoRendicion(id, "pagada");
      } else if (target.classList.contains("rv-btn-marcar-rechazada")) {
        actualizarEstadoRendicion(id, "rechazada");
      } else if (target.classList.contains("rv-btn-ver-boleta")) {
        const path = target.getAttribute("data-path");
        if (path) verBoletaRendicion(path);
      }
    });
  }
})();

// ------------------------------------------------------------------------------------------------
// 🎙 MEC — GRABACIÓN EXPOSITOR
// ------------------------------------------------------------------------------------------------
window.msd2Expositor = {
  recorder: null,
  stream: null,
  chunks: [],
  estado: "idle",
  inicio: null,
  blobFinal: null,
  audioURL: null,
  autoPaused: false
};

// ======================================================
// ▶ INICIAR EXPOSICIÓN
// ======================================================
async function msd2IniciarExposicion() {
  try {
    // evitar doble inicio
    if (
      window.msd2Expositor.estado === "recording"
    ) {
      return;
    }
    // solicitar micrófono
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});

    // crear recorder
    const recorder = new MediaRecorder(stream,
      {mimeType: "audio/webm;codecs=opus"}
    );

    // limpiar estado
    window.msd2Expositor.chunks = [];
    window.msd2Expositor.stream = stream;
    window.msd2Expositor.recorder = recorder;
    window.msd2Expositor.estado = "recording";
    msd2ActualizarUIExpositor();
    window.msd2Expositor.inicio = Date.now();

// --- PASO 1: INICIAR RELOJ MAESTRO ---------------------------------------------------
const horaInicioISO = new Date().toISOString();

await supabase
    .from("reuniones")
    .update({ 
        inicio_reunion: horaInicioISO, 
        reloj_activo: true 
    })
    .eq("id", window.reunionFederacionActual.id);

// Guardamos también en la memoria local del Moderador para referencia inmediata
window.reunionFederacionActual.inicio_reunion = horaInicioISO;
// ------------------------------------------------------------------------------------
 

    // capturar chunks
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        window.msd2Expositor.chunks.push(
          event.data
        );
      }
    };

    // iniciar grabación
    recorder.start();

    // actualizar UI
    document.getElementById("msd2-estado-expositor").innerHTML ="🔴 Exposición grabando";
    console.log("🎙 Exposición iniciada");
    console.log(window.msd2Expositor);
  } catch(error){
    console.error("❌ Error iniciar exposición", error);
  }
}

// ======================================================
// ⏹ FINALIZAR EXPOSICIÓN
// ======================================================
function msd2FinalizarExposicion() {
  const expositor = window.msd2Expositor;

  // validar recorder
  if (!expositor.recorder) {
    console.warn("⚠ No existe recorder");
    return;
  }

  // evento stop
  expositor.recorder.onstop = async () => {   // 👈 async
    console.log("⏹ Recorder detenido");

    // crear blob final
    const blob = new Blob(expositor.chunks, { type: "audio/webm" });
    expositor.blobFinal = blob;
    console.log("✅ Blob final creado");
    console.log(blob);

    // crear URL local
    const audioURL = URL.createObjectURL(blob);
    expositor.audioURL = audioURL;
    console.log("🎧 URL local creada");
    console.log(audioURL);

    // mostrar reproductor
    const audio = document.getElementById("audio-expositor-preview");
    audio.src = audioURL;
    // audio.style.display = "block";

    // detener tracks micrófono
    expositor.stream
      .getTracks()
      .forEach(track => track.stop());

    expositor.estado = "stopped";
    msd2ActualizarUIExpositor();

    // actualizar UI
    document.getElementById("msd2-estado-expositor").innerHTML = "✅ Exposición finalizada";
    console.log("✅ Exposición finalizada");

    // 🟢 NUEVO: subir a Supabase + guardar en reunion_exposiciones
    const reunionId = window.reunionFederacionActual?.id;
    await guardarExposicionPrincipal(blob, reunionId);
  };

  // detener recorder
  expositor.recorder.stop();
}


// ======================================================
// ⏸ PAUSAR EXPOSICIÓN
// ======================================================
function msd2PausarExposicion() {
  const expositor = window.msd2Expositor;
  if (
    !expositor.recorder
  ) {
    return;
  }

  if (
    expositor.estado !== "recording"
  ) {
    return;
  }
  expositor.recorder.pause();
  expositor.estado = "paused";
  msd2ActualizarUIExpositor();

  // actualizar UI
  document.getElementById("msd2-estado-expositor").innerHTML ="⏸ Exposición pausada";
  console.log("⏸ Exposición pausada");
}

// ======================================================
// ▶ REANUDAR EXPOSICIÓN
// ======================================================
function msd2ReanudarExposicion() {
  const expositor = window.msd2Expositor;

  if (
    !expositor.recorder
  ) {
    return;
  }

  if (
    expositor.estado !== "paused"
  ) {
    return;
  }

  expositor.recorder.resume();
  expositor.estado = "recording";
  msd2ActualizarUIExpositor();

  // actualizar UI
  document.getElementById("msd2-estado-expositor").innerHTML = "🔴 Exposición grabando";
  console.log("▶ Exposición reanudada");
}

// ======================================================
// 🎛 ACTUALIZAR UI EXPOSITOR
// ======================================================
function msd2ActualizarUIExpositor() {
  const estado = window.msd2Expositor.estado;
  const btnIniciar = document.getElementById("btn-expositor-iniciar");
  const btnPausar = document.getElementById("btn-expositor-pausar");
  const btnReanudar = document.getElementById("btn-expositor-reanudar");
  const btnFinalizar = document.getElementById("btn-expositor-finalizar");

  // ocultar todos
  btnIniciar.style.display ="none";
  btnPausar.style.display ="none";
  btnReanudar.style.display ="none";
  btnFinalizar.style.display ="none";

  // =========================
  // idle
  // =========================
  if (estado === "idle"
  ) {
    btnIniciar.style.display = "block";
  }
  // =========================
  // recording
  // =========================
  if (estado === "recording"
  ) {
    btnPausar.style.display ="block";
    btnFinalizar.style.display ="block";
  }
  // =========================
  // paused
  // =========================
  if (estado === "paused"
  ) {
    btnReanudar.style.display ="block";
    btnFinalizar.style.display ="block";
  }
  // =========================
  // stopped
  // =========================
  if (estado === "stopped"
  ) {
    // no mostrar botones
  }
}

// ======================================================
// 💾 GUARDAR EXPOSICIÓN EN STORAGE + BD
// ======================================================
async function guardarExposicionAudio(
  blob,
  reunionId
) {

  try {

    if (!blob) {
      console.warn("⚠️ Blob exposición vacío");
      return;
    }

    if (
      !window.usuarioFederacion ||
      !window.usuarioFederacion.socio_id
    ) {
      console.warn(
        "⚠️ Usuario federación no disponible."
      );
      return;
    }

    const socio =
      window.usuarioFederacion;

    const BUCKET =
      "reunion_exposiciones";

    const ts = Date.now();

    const safeNombre =
      (socio.nombre || "expositor")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_\-]/g, "_");

    const path =
      `${reunionId}/${socio.socio_id}/exposicion_${ts}_${safeNombre}.webm`;

    // --------------------------------------------------
    // ☁️ STORAGE
    // --------------------------------------------------
    const { error: errUpload } =
      await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "audio/webm"
        });

    if (errUpload) {

      console.error(
        "❌ Error subiendo exposición:",
        errUpload
      );

      return;
    }

    console.log(
      "☁️ Exposición subida:",
      path
    );

    // --------------------------------------------------
    // 🗂 BD
    // --------------------------------------------------
    const { error: errInsert } =
      await supabase
        .from("reunion_exposiciones")
        .insert({

          reunion_id:
            reunionId,

          socio_id:
            socio.socio_id,

          socio_nombre:
            socio.nombre,

          audio_path:
            path
        });

    if (errInsert) {

      console.error(
        "❌ Error registrando exposición:",
        errInsert
      );

      return;
    }

    console.log(
      "✅ Exposición registrada"
    );

  } catch(err) {

    console.error(
      "❌ guardarExposicionAudio:",
      err
    );
  }
}



// =========================================
// 💰 FREEMIUM — MOSTRAR RESULTADO DEL ANÁLISIS
// =========================================
function mostrarResultadoFreemium(htmlResultado) {

    const contenedor = document.getElementById('resultadoAnalisis');

    if (!contenedor) {
        console.error("❌ No existe #resultadoAnalisis en el HTML");
        return;
    }

    const plan = window.userPlan;

    if (plan === "pro") {
        console.log("💎 Usuario PRO → mostrando análisis completo");
        contenedor.innerHTML += htmlResultado;
        return;
    }

    if (plan === "pro_pending") {
        console.log("⏳ PRO_PENDING → mostrando análisis");
        contenedor.innerHTML += htmlResultado;
        return;
    }

    console.log("🆓 FREE → mostrando análisis");
    contenedor.innerHTML += htmlResultado;
}

// ========================================
// 🔄 CUANDO EL PLAN CAMBIA
// ========================================
document.addEventListener("planUpdated", () => {
  console.log("🔄 Plan actualizado en memoria → refrescando UI");
  actualizarUIsegunPlan();
});

// ========================================
// 🎨 ACTUALIZAR UI SEGÚN PLAN (BOTÓN REAL)
// ========================================
function actualizarUIsegunPlan() {

  const plan = window.userPlan || "free";
  console.log("🎨 Actualizando UI según plan:", plan);

  const btnMenu = document.getElementById("btnUpgradeMenu");

  if (btnMenu) {

    // 💎 PRO → ocultar botón
    if (plan === "pro") {
      btnMenu.style.display = "none";
    }

    // 🆓 FREE → activar PRO
    if (plan === "free") {
      btnMenu.style.display = "block";
      btnMenu.innerHTML = "⭐ Activar versión PRO";

      btnMenu.onclick = () => {
        console.log("🚀 Botón Activar PRO (FREE)");
        PAYWALL.show();
      };
    }

    // ⏳ TRIAL → ir a pago
    if (plan === "pro_pending") {
      btnMenu.style.display = "block";
      btnMenu.innerHTML = "⏳ Trial 24 hrs activo — Ir a pagar";

      btnMenu.onclick = () => {
        console.log("💳 Usuario en trial → ir a pago");
        PAYWALL.irAPago();
      };
    }
  }

  // ===================================
  // 🔐 BLOQUEO FUNCIONES PRO
  // ===================================

  const botonesPro = [
    document.getElementById("btnAnalisisCompleto"),
    document.getElementById("btnVacaciones"),
    document.getElementById("btnFiniquito"),
    document.getElementById("btnHorasExtra"),
    document.getElementById("btnArchivoSindical")
  ];

  if (plan === "pro") {
    botonesPro.forEach(btn => { if (btn) btn.style.display = "block"; });
    window.bloquearContadorFree = true;
  }

  else if (plan === "pro_pending") {
    botonesPro.forEach(btn => { if (btn) btn.style.display = "none"; });
    window.bloquearContadorFree = true;
  }

  else {
    botonesPro.forEach(btn => { if (btn) btn.style.display = "block"; });
    window.bloquearContadorFree = false;
  }

  // 🔥 SIEMPRE actualizar candados (clave)
  actualizarCandadosUI();
}

// =====================================
// 🔐 ACTUALIZAR CANDADOS VISUALES
// =====================================
function actualizarCandadosUI() {

    const botones = document.querySelectorAll(".btn-pro-lock");

    botones.forEach(btn => {

        // Guardar texto original SOLO una vez
        if (!btn.dataset.originalText) {
            btn.dataset.originalText = btn.innerText.replace("🔐", "").trim();
        }

        const esPro = PERMISSIONS.isPro && PERMISSIONS.isPro();
        const esAdmin = PERMISSIONS.isAdmin && PERMISSIONS.isAdmin();

        // 💎 PRO o 👑 ADMIN → desbloqueado visual
        if (esPro || esAdmin) {
            btn.innerText = btn.dataset.originalText;
            btn.classList.remove("btn-pro-lock");
        } else {
            // 🆓 FREE / ⏳ PENDING → bloqueado visual
            btn.innerText = "🔐 " + btn.dataset.originalText;
            btn.classList.add("btn-pro-lock");
        }

    });
}


async function iniciarPagoMEC() {
  try {
    // 1) Obtener sesión actual de Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Debes iniciar sesión para pagar.");
      return;
    }

    // 2) Leer Device ID de Mercado Pago (si existe)
    const deviceId = window.MP_DEVICE_SESSION_ID || null;
    console.log("MP_DEVICE_SESSION_ID:", deviceId);

    // 3) Llamar a tu API de crear-suscripción
    const resp = await fetch("/api/mercadopago/crear-suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "X-Meli-Session-Id": deviceId || ""
      },
      body: JSON.stringify({
        tipo: "trabajador"  // o "sindicato" si corresponde
      })
    });

    const json = await resp.json();

    if (!resp.ok) {
      console.error("Error crear suscripción:", json);
      alert("No se pudo iniciar el pago.");
      return;
    }

    // 4) Redirigir al Checkout Pro
    window.location.href = json.init_point;

  } catch (e) {
    console.error("Error iniciarPagoMEC:", e);
    alert("Ocurrió un error al iniciar el pago.");
  }
}
window.iniciarPagoMEC = iniciarPagoMEC;

// ======================================================
// 📂 ARCHIVO SINDICAL v2 (Supabase) – helpers
// ======================================================

// Mapeo nombre visual → UUID real (mismo que usas en Mesa Sindical)
const AS_MAPA_SINDICATOS_UUID = {
  "Concepcion":  "9ca693bd-8284-41ae-943f-cb6ec8e76c2c",
  "Costanera":   "de394bc2-fef6-4a68-9998-d68223183905",
  "Curico":      "64cfea41-937d-48e7-876d-578c3aba7941",
  "Iquique":     "af3b44d8-8bb3-4d8c-b066-1060b5daaa48",
  "PlazaNorte":  "4361900f-099b-4419-8bbe-f801817f673f",
  "PuertoMontt": "732f660b-d50e-4b59-8859-ab8ee046626e",
  "Rancagua":    "c255adf1-0c00-4aa2-aac7-ffbe590534ec",
  "Trebol":      "c0e6834e-73fa-4bf0-a5b9-778848e388a8"
};

function as_obtenerSindicatoIdDesdeNombre(nombreSindicato) {
  return AS_MAPA_SINDICATOS_UUID[nombreSindicato] || null;
}

// Límite y tipos coherentes con bucket archivos_sindicato
const AS_MAX_BYTES = 30 * 1024 * 1024; // 10 MB
const AS_ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "image/jpeg",
  "image/png"
];

function as_validarArchivo(file) {
  if (!file) {
    alert("Debes seleccionar un archivo.");
    return false;
  }
  if (file.size > AS_MAX_BYTES) {
    alert("El archivo supera el límite de 10 MB.");
    return false;
  }
  if (!AS_ALLOWED_MIME.includes(file.type)) {
    alert("Tipo de archivo no permitido. Usa PDF, Word, Excel, JPG o PNG.");
    return false;
  }
  return true;
}

// Crear URL firmada para ver/descargar
async function as_crearSignedUrl(storagePath) {
  const { data, error } = await supabase
    .storage
    .from("archivos_sindicato")
    .createSignedUrl(storagePath, 60 * 10); // 10 minutos

  if (error || !data?.signedUrl) {
    console.error("Error creando URL firmada:", error);
    alert("No se pudo generar el enlace de descarga.");
    return null;
  }
  return data.signedUrl;
}

// ===============================
// LISTAR: Mis archivos
// ===============================
async function as_listarMisArchivos(sindicatoId, sindicatoNombre) {
  const lista = document.getElementById("lista-documentos-sindicato");
  const titulo = document.getElementById("nombre-sindicato");
  if (!lista) return;

  lista.innerHTML = "Cargando archivos...";
  if (titulo && sindicatoNombre) {
    titulo.textContent = "Sindicato de " + sindicatoNombre;
  }

  const { data, error } = await supabase
    .from("sindicato_archivos")
    .select("*")
    .eq("sindicato_id", sindicatoId)
    .order("tipo", { ascending: true })
    .order("nombre_mostrado", { ascending: true });

  if (error) {
    console.error("Error cargando archivos del sindicato:", error);
    lista.innerHTML = "<li>Error al cargar archivos.</li>";
    return;
  }

  const archivos = data || [];
  lista.innerHTML = "";

  if (!archivos.length) {
    lista.innerHTML = "<li>No hay archivos cargados aún.</li>";
    return;
  }

  archivos.forEach(archivo => {
    const li = document.createElement("li");
    li.className = "as-archivo-item";

    const etiquetaVis = archivo.visibilidad === "federacion"
      ? "Compartido con Federación"
      : "Privado";

    const tam = archivo.size_bytes
      ? (Math.round(archivo.size_bytes / 1024) + " KB")
      : "N/D";

    const fecha = archivo.creado_en
      ? new Date(archivo.creado_en).toLocaleString("es-CL")
      : "N/D";

    li.innerHTML = `
      <div class="as-archivo-header">
        <div class="as-archivo-titulo">
          <strong>${archivo.nombre_mostrado}</strong>
          <span class="as-archivo-tipo">· ${archivo.tipo || "otro"}</span>
        </div>
        <div class="as-archivo-meta">
          <span>${etiquetaVis}</span>
          <span>· ${tam}</span>
          <span>· ${fecha}</span>
        </div>
      </div>
      <div class="as-archivo-actions">
        <button class="as-btn-ver" data-id="${archivo.id}">Ver</button>
        <button class="as-btn-toggle" data-id="${archivo.id}" data-vis="${archivo.visibilidad}">
          Compartir
        </button>
        <button class="as-btn-eliminar" data-id="${archivo.id}">Eliminar</button>
      </div>
    `;

    lista.appendChild(li);
  });

}

// ===============================
// LISTAR: Archivos federación (otros sindicatos)
// ===============================
async function as_listarArchivosFederacion(sindicatoIdActual) {
  const lista = document.getElementById("lista-documentos-publicos");
  if (!lista) return;

  lista.innerHTML = "Cargando archivos...";

  const { data, error } = await supabase
    .from("sindicato_archivos")
    .select("*")
    .eq("visibilidad", "federacion")
    .neq("sindicato_id", sindicatoIdActual)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error cargando archivos federación:", error);
    lista.innerHTML = "<li>Error al cargar archivos compartidos.</li>";
    return;
  }

  const archivos = data || [];
  lista.innerHTML = "";

  if (!archivos.length) {
    lista.innerHTML = "<li>No hay archivos compartidos por otros sindicatos.</li>";
    return;
  }

  archivos.forEach(archivo => {
    const li = document.createElement("li");
    li.className = "as-archivo-item";

    const tam = archivo.size_bytes
      ? (Math.round(archivo.size_bytes / 1024) + " KB")
      : "N/D";

    const fecha = archivo.creado_en
      ? new Date(archivo.creado_en).toLocaleString("es-CL")
      : "N/D";

    li.innerHTML = `
      <div class="as-archivo-header">
        <div class="as-archivo-titulo">
          <strong>${archivo.nombre_mostrado}</strong>
          <span class="as-archivo-tipo">· ${archivo.tipo || "otro"}</span>
        </div>
        <div class="as-archivo-meta">
          <span>Compartido con Federación</span>
          <span>· ${tam}</span>
          <span>· ${fecha}</span>
        </div>
      </div>
      <div class="as-archivo-actions">
        <button class="as-btn-ver" data-id="${archivo.id}">Ver</button>
      </div>
    `;

    lista.appendChild(li);
  });

}

// ===============================
// SUBIR ARCHIVO
// ===============================
async function as_subirArchivo(sindicatoId, sindicatoNombre) {
  const fileInput   = document.getElementById("as-file");
  const nombreInput = document.getElementById("as-nombre");
  const tipoSelect  = document.getElementById("as-tipo");
  const visSelect   = document.getElementById("as-visibilidad");

  if (!fileInput) {
    alert("No se encontró el input de archivo.");
    return;
  }

  const file = fileInput.files[0];
  if (!as_validarArchivo(file)) return;

  const nombre_mostrado = (nombreInput && nombreInput.value.trim()) || file.name;
  const tipo        = (tipoSelect && tipoSelect.value) || "otro";
  const visibilidad = (visSelect && visSelect.value) || "privado";

  // Obtener usuario actual para trazabilidad
  const { data: udata } = await supabase.auth.getUser();
  const currentUser = udata?.user || null;

  const extension = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf(".") + 1)
    : "bin";

  const randomId = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now());
  const path = `${sindicatoId}/${randomId}.${extension}`;

  // 1) Subir al bucket
  const { error: upErr } = await supabase
    .storage
    .from("archivos_sindicato")
    .upload(path, file);

  if (upErr) {
    console.error("Error subiendo archivo:", upErr);
    alert("No se pudo subir el archivo.");
    return;
  }

  // 2) Insertar registro en tabla
  const payload = {
    sindicato_id: sindicatoId,
    nombre_mostrado,
    storage_path: path,
    tipo,
    visibilidad,
    mime_type: file.type,
    size_bytes: file.size,
    creado_por_user: currentUser ? currentUser.id : null,
    creado_por_text: currentUser ? (currentUser.email || null) : null
  };

  const { error: insErr } = await supabase
    .from("sindicato_archivos")
    .insert(payload);

  if (insErr) {
    console.error("Error registrando archivo:", insErr);
    alert("El archivo se subió, pero no se pudo registrar en la base de datos.");
    return;
  }

  // limpiar formulario
  fileInput.value = "";
  if (nombreInput) nombreInput.value = "";

  // refrescar listas
  await as_listarMisArchivos(sindicatoId, sindicatoNombre);
  await as_listarArchivosFederacion(sindicatoId);
  alert("Archivo subido correctamente.");
}

// ===============================
// CAMBIAR VISIBILIDAD
// ===============================
async function as_cambiarVisibilidad(idArchivo, visActual, sindicatoId, sindicatoNombre) {
  const nuevaVis = visActual === "privado" ? "federacion" : "privado";

  const { error } = await supabase
    .from("sindicato_archivos")
    .update({ visibilidad: nuevaVis })
    .eq("id", idArchivo);

  if (error) {
    console.error("Error cambiando visibilidad:", error);
    alert("No se pudo cambiar la visibilidad del archivo.");
    return;
  }

  await as_listarMisArchivos(sindicatoId, sindicatoNombre);
  await as_listarArchivosFederacion(sindicatoId);
}

// ===============================
// ELIMINAR ARCHIVO
// ===============================
async function as_eliminarArchivo(idArchivo, sindicatoId, sindicatoNombre) {
  const confirmar = window.confirm("¿Seguro que deseas eliminar este archivo?");
  if (!confirmar) return;

  // Primero obtener storage_path
  const { data, error } = await supabase
    .from("sindicato_archivos")
    .select("storage_path")
    .eq("id", idArchivo)
    .maybeSingle();

  if (error || !data) {
    console.error("Error obteniendo archivo:", error);
    alert("No se pudo obtener información del archivo.");
    return;
  }

  const storagePath = data.storage_path;

  // Borrar de storage
  const { error: stErr } = await supabase
    .storage
    .from("archivos_sindicato")
    .remove([storagePath]);

  if (stErr) {
    console.error("Error borrando archivo de storage:", stErr);
    alert("No se pudo borrar el archivo del almacenamiento.");
    return;
  }

  // Borrar registro en tabla
  const { error: delErr } = await supabase
    .from("sindicato_archivos")
    .delete()
    .eq("id", idArchivo);

  if (delErr) {
    console.error("Error borrando registro de archivo:", delErr);
    alert("No se pudo borrar el registro del archivo.");
    return;
  }

  await as_listarMisArchivos(sindicatoId, sindicatoNombre);
  await as_listarArchivosFederacion(sindicatoId);
}

// ===============================
// DELEGACIÓN DE EVENTOS EN LISTAS
// ===============================
document.addEventListener("click", function (ev) {
  const target = ev.target;
  const listaSindicato = document.getElementById("lista-documentos-sindicato");
  const listaPublicos  = document.getElementById("lista-documentos-publicos");

  // Determinar sindicato actual (todavía usaremos esto más adelante cuando integremos con verificarClave)
  // Por ahora asumimos que window.sindicatoFederacionActual será seteado en el flujo de clave.
  const sfa = window.sindicatoFederacionActual;
  const sindicatoId   = sfa?.id || null;
  const sindicatoNombre = sfa?.nombre || null;

  if (!sindicatoId) return; // si aún no hay sindicato, no hacemos nada

  // Clicks en "Mis archivos"
  if (listaSindicato && listaSindicato.contains(target)) {
    if (target.classList.contains("as-btn-ver")) {
      const id = target.getAttribute("data-id");
      if (!id) return;
      supabase
        .from("sindicato_archivos")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(async ({ data, error }) => {
          if (error || !data) {
            alert("No se pudo obtener el archivo.");
            return;
          }
          const url = await as_crearSignedUrl(data.storage_path);
          if (url) window.open(url, "_blank");
        });
    }

    if (target.classList.contains("as-btn-toggle")) {
      const id  = target.getAttribute("data-id");
      const vis = target.getAttribute("data-vis");
      if (!id) return;
      as_cambiarVisibilidad(id, vis, sindicatoId, sindicatoNombre);
    }

    if (target.classList.contains("as-btn-eliminar")) {
      const id = target.getAttribute("data-id");
      if (!id) return;
      as_eliminarArchivo(id, sindicatoId, sindicatoNombre);
    }
  }

  // Clicks en "Compartidos con Federación"
  if (listaPublicos && listaPublicos.contains(target)) {
    if (target.classList.contains("as-btn-ver")) {
      const id = target.getAttribute("data-id");
      if (!id) return;
      supabase
        .from("sindicato_archivos")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(async ({ data, error }) => {
          if (error || !data) {
            alert("No se pudo obtener el archivo.");
            return;
          }
          const url = await as_crearSignedUrl(data.storage_path);
          if (url) window.open(url, "_blank");
        });
    }
  }
});

// ===============================
// HOOK BOTÓN SUBIR (formulario)
// ===============================
document.addEventListener("DOMContentLoaded", function () {
  const btnSubir = document.getElementById("as-btn-subir");
  if (!btnSubir) return;

  btnSubir.addEventListener("click", function () {
    const sfa = window.sindicatoFederacionActual;
    const sindicatoId   = sfa?.id || null;
    const sindicatoNombre = sfa?.nombre || null;
    if (!sindicatoId) {
      alert("No hay sindicato seleccionado.");
      return;
    }
    as_subirArchivo(sindicatoId, sindicatoNombre);
  });
});

// ======================================================
// 📊 Archivo Sindical – Vista Tesorero (admin)
// Se inicializa cuando el plan/perfil ya están listos (planReady)
// ======================================================
window.addEventListener("planReady", function () {
  const btnAdmin = document.getElementById("as-btn-admin-consolidado");
  if (!btnAdmin) return;

  if (window.PERMISSIONS && PERMISSIONS.isAdmin && PERMISSIONS.isAdmin()) {
    btnAdmin.style.display = "block";

    btnAdmin.addEventListener("click", function () {
      mostrarPantalla("pantalla-archivosindical-admin");
      as_admin_listarConsolidado();
    });
  }
});


// Listar todos los archivos (consolidado)
async function as_admin_listarConsolidado() {
  const lista = document.getElementById("as-admin-list");
  if (!lista) return;

  lista.innerHTML = "<li>Cargando...</li>";

  const { data, error } = await supabase
    .from("sindicato_archivos")
    .select("id, nombre_mostrado, tipo, visibilidad, size_bytes, creado_en, sindicato_id, sindicatos(nombre)")
    .order("sindicatos(nombre)", { ascending: true })
    .order("tipo", { ascending: true })
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error cargando archivos consolidados:", error);
    lista.innerHTML = "<li>Error al cargar datos.</li>";
    return;
  }

  const archivos = data || [];
  lista.innerHTML = "";

  if (!archivos.length) {
    lista.innerHTML = "<li>No hay archivos registrados.</li>";
    return;
  }

  archivos.forEach(row => {
    const li = document.createElement("li");
    li.className = "as-archivo-item";

    const tam = row.size_bytes
      ? (Math.round(row.size_bytes / 1024) + " KB")
      : "N/D";

    const fecha = row.creado_en
      ? new Date(row.creado_en).toLocaleString("es-CL")
      : "N/D";

    const visTxt = row.visibilidad === "federacion" ? "Federación" : "Privado";
    const sindicatoNombre = row.sindicatos?.nombre || row.sindicato_id || "";

    li.innerHTML = `
      <div class="as-archivo-header">
        <div class="as-archivo-titulo">
          <strong>${row.nombre_mostrado}</strong>
          <span class="as-archivo-tipo">· ${row.tipo || "otro"}</span>
        </div>
        <div class="as-archivo-meta">
          <span>${sindicatoNombre}</span>
          <span>· ${visTxt}</span>
          <span>· ${tam}</span>
          <span>· ${fecha}</span>
        </div>
      </div>
      <div class="as-archivo-actions">
        <button class="as-admin-ver" data-id="${row.id}">Ver</button>
        <button class="as-admin-eliminar" data-id="${row.id}">Eliminar</button>
      </div>
    `;

    lista.appendChild(li);
  });
}


// Ver archivo desde vista admin
document.addEventListener("click", function (ev) {
  const target = ev.target;
  if (target.classList.contains("as-admin-ver")) {
    const id = target.getAttribute("data-id");
    if (!id) return;
    supabase
      .from("sindicato_archivos")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          alert("No se pudo obtener el archivo.");
          return;
        }
        const url = await as_crearSignedUrl(data.storage_path);
        if (url) window.open(url, "_blank");
      });
  }

  if (target.classList.contains("as-admin-eliminar")) {
    const id = target.getAttribute("data-id");
    if (!id) return;
    as_admin_eliminarArchivo(id);
  }
});

// Eliminar archivo desde vista admin (tesorero)
async function as_admin_eliminarArchivo(idArchivo) {
  const confirmar = window.confirm("¿Seguro que deseas eliminar este archivo para todos los usuarios?");
  if (!confirmar) return;

  // Primero obtener storage_path
  const { data, error } = await supabase
    .from("sindicato_archivos")
    .select("storage_path")
    .eq("id", idArchivo)
    .maybeSingle();

  if (error || !data) {
    console.error("Error obteniendo archivo:", error);
    alert("No se pudo obtener información del archivo.");
    return;
  }

  const storagePath = data.storage_path;

  // Borrar de storage
  const { error: stErr } = await supabase
    .storage
    .from("archivos_sindicato")
    .remove([storagePath]);

  if (stErr) {
    console.error("Error borrando archivo de storage:", stErr);
    alert("No se pudo borrar el archivo del almacenamiento.");
    return;
  }

  // Borrar registro en tabla
  const { error: delErr } = await supabase
    .from("sindicato_archivos")
    .delete()
    .eq("id", idArchivo);

  if (delErr) {
    console.error("Error borrando registro de archivo:", delErr);
    alert("No se pudo borrar el registro del archivo.");
    return;
  }

  await as_admin_listarConsolidado();
  alert("Archivo eliminado correctamente.");
}


// ------------------  18 DE JUNIO TODO CORRECTO  --------------------------

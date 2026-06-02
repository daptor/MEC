// =====================================================
// 💳 PAYWALL UX V3 – flujo único real unificado
// =====================================================

let PAYWALL_STATE = "blocked";
let paywallOpen = false;

// =====================================================
// 🧩 CREAR MODAL BASE (único)
// =====================================================

function crearModalBase() {
  if (paywallOpen) return;
  paywallOpen = true;

  const overlay = document.createElement("div");
  overlay.id = "paywall-overlay";
  overlay.style = `
    position:fixed; inset:0; background:rgba(0,0,0,.6);
    display:flex; align-items:center; justify-content:center;
    z-index:9999;
  `;

  overlay.innerHTML = `
    <div id="paywall-box" style="
      background:#fff;
      padding:30px;
      border-radius:14px;
      width:90%;
      max-width:420px;
      font-family:sans-serif;
      text-align:center;
    ">
      <div id="paywall-content"></div>
    </div>
  `;

  document.body.appendChild(overlay);
}

function cerrarModal() {
  const overlay = document.getElementById("paywall-overlay");
  if (overlay) overlay.remove();
  paywallOpen = false;
}

// =====================================================
// 🟡 PASO 1 — BLOQUEO
// =====================================================

function renderPasoBloqueo(featureName = "esta función") {
  PAYWALL_STATE = "blocked";
  crearModalBase();

  document.getElementById("paywall-content").innerHTML = `
    <h2>⭐ Desbloquea el análisis completo</h2>
    <p>Has alcanzado el límite gratuito.</p>
    <p><b>Activa PRO para continuar usando MEC sin límites.</b></p>

    <button id="btnIrRegistro" class="btn-principal">
      Activar PRO ahora
    </button>

    <button id="btnCerrar" class="btn-secundario">
      Volver
    </button>
  `;

  document.getElementById("btnIrRegistro").onclick = renderPasoFormulario;
  document.getElementById("btnCerrar").onclick = cerrarModal;
}

// =====================================================
// 🟠 PASO 2 — FORMULARIO
// =====================================================

function renderPasoFormulario() {
  PAYWALL_STATE = "form";

  document.getElementById("paywall-content").innerHTML = `
    <h2>💎 Activar Plan PRO</h2>
    <p>Completa tus datos para continuar.</p>

    <input id="proNombre" placeholder="Nombre completo"
      style="width:100%;padding:10px;margin-top:10px"/>

    <input id="proRut" placeholder="RUT (ej: 12.345.678-9)"
      style="width:100%;padding:10px;margin-top:10px"/>

    <button id="btnGuardarPro" class="btn-principal">
      Continuar
    </button>

    <button id="btnVolver" class="btn-secundario">
      Volver
    </button>
  `;

  document.getElementById("btnGuardarPro").onclick = guardarDatosPro;
  document.getElementById("btnVolver").onclick = renderPasoBloqueo;
}

// =====================================================
// 🟢 PASO 3 — RPC activar_pro (trial)
// =====================================================

async function guardarDatosPro() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    const nombre = document.getElementById("proNombre").value.trim();
    const rut = document.getElementById("proRut").value.trim();

    if (!nombre || !rut) {
      alert("Completa los datos");
      return;
    }

    console.log("🟡 RPC activar_pro para:", user.id);

    const { error } = await supabase.rpc("activar_pro", {
      p_nombre: nombre,
      p_rut: rut
    });

    if (error && error.message?.includes("TRIAL_ALREADY_USED")) {
      console.warn("🚫 Trial ya usado → pago real");
      renderPasoPagoReal();
      return;
    }

    if (error) {
      console.error(error);
      alert("Error guardando datos.");
      return;
    }

    console.log("🟢 PRO_PENDING activado");

    window.planTransition = true;
    window.userPlan = "pro_pending";
    document.dispatchEvent(new Event("planUpdated"));

    renderPasoExito();

    setTimeout(() => (window.planTransition = false), 1500);
  } catch (err) {
    console.error(err);
    alert("Error inesperado");
  }
}

// =====================================================
// 🎉 PASO 4 — ÉXITO TRIAL
// =====================================================

function renderPasoExito() {
  PAYWALL_STATE = "success";

  document.getElementById("paywall-content").innerHTML = `
    <h2>✅ PRO activado</h2>
    <p><b>Tu acceso PRO temporal está activo.</b></p>

    <button id="cerrarPaywall" class="btn-principal">
      Continuar usando MEC
    </button>
  `;

  document.getElementById("cerrarPaywall").onclick = cerrarModal;
}

// =====================================================
// 💳 PASO EXTRA — PAYWALL REAL (Mercado Pago)
// =====================================================

function renderPasoPagoReal() {
  crearModalBase();
  PAYWALL_STATE = "payment";

  document.getElementById("paywall-content").innerHTML = `
    <h2>💳 Activar Suscripción PRO</h2>
    <p>Tu periodo de prueba ya fue utilizado.</p>
    <p>Para seguir usando MEC debes activar tu suscripción.</p>

    <button id="btnPago" class="btn-principal">
      Ir a pagar
    </button>

    <button id="btnCerrar" class="btn-secundario">
      Volver
    </button>
  `;

  document.getElementById("btnPago").onclick = async () => {
    try {
      // CORRECCIÓN AQUÍ: Agregada la ruta /api/
      const resp = await fetch("/api/mercadopago/crear-suscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "trabajador" }) 
      });
      
      const data = await resp.json();

      if (!resp.ok || !data.init_point) {
        alert("No se pudo iniciar el pago.");
        return;
      }

      // Redirige al checkout de Mercado Pago
      window.location.href = data.init_point;
    } catch (e) {
      console.error(e);
      alert("Error iniciando pago.");
    }
  };

  document.getElementById("btnCerrar").onclick = cerrarModal;
}

// =====================================================
// 🔐 API GLOBAL PAYWALL
// =====================================================

function showPaywall(featureName = "esta función") {
  renderPasoBloqueo(featureName);
}

function requireFeature(feature, featureName) {
  if (window.planTransition) return true;

  if (!PERMISSIONS.canUse(feature)) {
    showPaywall(featureName);
    return false;
  }
  return true;
}

// Botón del menú y botones globales usan esto
function mostrarUpgradeGlobal() {
  console.log("🚀 Botón Activar PRO presionado desde menú/app");
  showPaywall("Activar versión PRO");
}

window.PAYWALL = {
  show: showPaywall,
  require: requireFeature,
  mostrarUpgrade: mostrarUpgradeGlobal
};

console.log("💳 Paywall UX V3 cargado");

// ========================================
// 💳 IR A PAGO REAL CUANDO ESTÁ EN TRIAL
// ========================================

window.PAYWALL.irAPago = function () {
  console.log("💳 Usuario en trial → abrir pantalla de pago");
  renderPasoPagoReal();
};

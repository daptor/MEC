// paywall.js
// PAYWALL UX V2 – flujo único sin fricción

let PAYWALL_STATE = "blocked"; 
// blocked → form → success

// =====================================================
// 🧩 CREAR MODAL BASE
// =====================================================

function crearModalBase() {
  if (document.getElementById("paywall-overlay")) return;

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

// =====================================================
// 🟡 PASO 1 — BLOQUEO + CTA
// =====================================================

function renderPasoBloqueo(featureName="esta función") {
  PAYWALL_STATE = "blocked";
  crearModalBase();

  document.getElementById("paywall-content").innerHTML = `
    <h2>⭐ Desbloquea el análisis completo</h2>
    <p>Has alcanzado el límite gratuito.</p>
    <p><b>Activa PRO para continuar usando MEC sin límites.</b></p>

    <button id="btnIrRegistro"
      style="margin-top:18px;padding:12px 18px;
      background:#4CAF50;color:white;border:none;border-radius:8px;width:100%">
      Activar PRO ahora
    </button>
  `;

  document.getElementById("btnIrRegistro").onclick = renderPasoFormulario;
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

    <button id="btnGuardarPro"
      style="margin-top:15px;padding:12px;width:100%;
      background:#4CAF50;color:#fff;border:none;border-radius:8px">
      Continuar
    </button>
  `;

  document.getElementById("btnGuardarPro").onclick = guardarDatosPro;
}

// =====================================================
// 🟢 PASO 3 — GUARDAR DATOS VIA RPC
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

    console.log("🟡 Guardando datos PRO vía RPC para:", user.id);

    const { error } = await supabase.rpc("activar_pro", {
      p_nombre: nombre,
      p_rut: rut
    });

    if (error) {
      console.error(error);
      alert("Error guardando datos");
      return;
    }

    console.log("🟢 Datos PRO guardados vía RPC");

    window.userPlan = "pro_pending";
    document.dispatchEvent(new Event("planUpdated"));

    renderPasoExito();

  } catch (err) {
    console.error(err);
    alert("Error inesperado");
  }
}

// =====================================================
// 🎉 PASO FINAL — CONFIRMACIÓN
// =====================================================

function renderPasoExito() {
  PAYWALL_STATE = "success";

  document.getElementById("paywall-content").innerHTML = `
    <h2>✅ PRO activado</h2>
    <p><b>Tu acceso PRO temporal está activo.</b></p>
    <p>Puedes seguir usando MEC sin límites.</p>

    <button id="cerrarPaywall"
      style="margin-top:18px;padding:12px 18px;
      background:#4CAF50;color:white;border:none;border-radius:8px;width:100%">
      Continuar usando MEC
    </button>
  `;

  document.getElementById("cerrarPaywall").onclick = () => {
    document.getElementById("paywall-overlay").remove();
  };
}

// =====================================================
// 🔐 FUNCIÓN GLOBAL PAYWALL
// =====================================================

function showPaywall(featureName="esta función") {
  renderPasoBloqueo(featureName);
}

function requireFeature(feature, featureName) {
  if (!PERMISSIONS.canUse(feature)) {
    showPaywall(featureName);
    return false;
  }
  return true;
}

window.PAYWALL = { show: showPaywall, require: requireFeature };

console.log("💳 Paywall UX V2 cargado");
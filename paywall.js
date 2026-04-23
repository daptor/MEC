// paywall.js
// Sistema de bloqueo suave + flujo real PRO (pre-pago)

// ========================================
// ⭐ PAYWALL BASE (no rompe funciones)
// ========================================

function showPaywall(featureName = "esta función") {
  if (document.getElementById("paywall-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "paywall-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  overlay.innerHTML = `
    <div style="
      background:#fff;
      padding:30px;
      border-radius:12px;
      max-width:350px;
      text-align:center;
      font-family:sans-serif;
    ">
      <h2>⭐ Función Pro</h2>
      <p>${featureName} está disponible en el plan Pro.</p>
      <button id="closePaywall"
        style="margin-top:15px;padding:10px 20px;border:none;
        background:#4CAF50;color:#fff;border-radius:6px;cursor:pointer">
        Entendido
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById("closePaywall").onclick = () => overlay.remove();
}

function requireFeature(feature, featureName) {
  if (!PERMISSIONS.canUse(feature)) {
    showPaywall(featureName);
    return false;
  }
  return true;
}

window.PAYWALL = { show: showPaywall, require: requireFeature };

console.log("💳 Sistema de paywall listo");


// ========================================
// 💎 NUEVO FLUJO ACTIVAR PRO (registro previo al pago)
// ========================================

function abrirRegistroPro() {
  if (document.getElementById("modal-pro")) return;

  const overlay = document.createElement("div");
  overlay.id = "modal-pro";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  overlay.innerHTML = `
    <div style="
      background:#fff;
      padding:30px;
      border-radius:12px;
      max-width:420px;
      width:90%;
      font-family:sans-serif;
    ">
      <h2>💎 Activar Plan PRO</h2>
      <p>Completa tus datos para continuar con la suscripción.</p>

      <input id="proNombre" placeholder="Nombre completo"
        style="width:100%;padding:10px;margin-top:10px"/>

      <input id="proRut" placeholder="RUT (ej: 12.345.678-9)"
        style="width:100%;padding:10px;margin-top:10px"/>

      <button id="guardarDatosPro"
        style="margin-top:15px;padding:12px;width:100%;
        background:#4CAF50;color:#fff;border:none;border-radius:6px">
        Continuar
      </button>

      <button id="cerrarModalPro"
        style="margin-top:10px;padding:8px;width:100%">
        Cancelar
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("cerrarModalPro").onclick = () => overlay.remove();
  document.getElementById("guardarDatosPro").onclick = guardarDatosPro;
}


// ========================================
// 💾 Guardar datos PRO → usuario listo para pagar
// ========================================

async function guardarDatosPro() {

  const btn = document.getElementById("btnContinuarPago");
  if (btn) btn.disabled = true;

  try {

    // 1️⃣ Obtener usuario autenticado
    const { data, error: authError } = await supabase.auth.getUser();

    if (authError || !data?.user) {
      alert("Debes iniciar sesión nuevamente.");
      location.reload();
      return;
    }

    const user = data.user;

    // 2️⃣ Obtener datos del formulario
    const nombre = document.getElementById("proNombre").value.trim();
    const rut = document.getElementById("proRut").value.trim();

    if (!nombre || !rut) {
      alert("Completa todos los campos");
      if (btn) btn.disabled = false;
      return;
    }

    // 3️⃣ Validación simple de RUT (mínima pero útil)
    if (rut.length < 8) {
      alert("RUT inválido");
      if (btn) btn.disabled = false;
      return;
    }

    console.log("🟡 Guardando datos PRO para:", user.id);

    // 4️⃣ Guardar datos en profiles
    const { data: updateData, error: updateError } = await supabase
      .from("profiles")
      .update({
        nombre_real: nombre,
        rut: rut,
        plan: "pro_pending",      // ⭐ estado previo al pago
        pro_desde: null,
        pro_hasta: null
      })
      .eq("id", user.id)
      .select();  // 👈 IMPORTANTE para confirmar update

    if (updateError) {
      console.error("❌ Error update:", updateError);
      alert("Error guardando datos.");
      if (btn) btn.disabled = false;
      return;
    }

    if (!updateData || updateData.length === 0) {
      console.error("❌ No se actualizó ninguna fila");
      alert("No se pudo actualizar el perfil.");
      if (btn) btn.disabled = false;
      return;
    }

    console.log("🟢 Datos PRO guardados:", updateData);

    // 5️⃣ Cerrar modal
    const modal = document.getElementById("modal-pro");
    if (modal) modal.remove();

    // 6️⃣ Notificar al sistema que el plan cambió
    document.dispatchEvent(new Event("planUpdated"));

    alert("Datos guardados ✅\nAhora continúa al pago.");

    // 🔜 AQUÍ LUEGO CONECTAREMOS MERCADOPAGO / STRIPE
    // iniciarFlujoPago();

  } catch (err) {
    console.error("🔥 Error inesperado:", err);
    alert("Error inesperado.");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ========================================
// 🔌 Conectar botón "Activar PRO"
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnUpgradePro");
  if (btn) btn.addEventListener("click", abrirRegistroPro);
});


// paywall.js
// Sistema de bloqueo suave (no rompe funcionalidades)

// Crear modal dinámico simple
function showPaywall(featureName = "esta función") {
  // Evitar duplicados
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
      <button id="closePaywall" style="
        margin-top:15px;
        padding:10px 20px;
        border:none;
        background:#4CAF50;
        color:#fff;
        border-radius:6px;
        cursor:pointer;
      ">Entendido</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("closePaywall").onclick = () => {
    overlay.remove();
  };
}

// Helper SaaS global
function requireFeature(feature, featureName) {
  if (!PERMISSIONS.canUse(feature)) {
    showPaywall(featureName);
    return false;
  }
  return true;
}

window.PAYWALL = {
  show: showPaywall,
  require: requireFeature
};

console.log("💳 Sistema de paywall listo");

// ========================================
// 💎 ACTIVAR PLAN PRO
// ========================================

async function upgradeToPro() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ plan: "pro" })
      .eq("id", user.id);

    if (error) {
      console.error("Error upgrade:", error);
      alert("Error al activar PRO");
      return;
    }

    // actualizar estado global
    window.userPlan = "pro";
    window.userProfile.plan = "pro";

    alert("🎉 ¡PRO activado!");

    // avisar al resto del sistema
    document.dispatchEvent(new Event("planUpdated"));

  } catch (err) {
    console.error(err);
    alert("Error inesperado");
  }
}

// conectar botón PRO
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnUpgradePro");
  if (btn) btn.addEventListener("click", upgradeToPro);
});

// FUNCION DE INICIAR PAGO REAL

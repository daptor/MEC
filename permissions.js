// permissions.js
// Sistema de permisos MEC (alineado a modelo real)

// Obtener plan actual
function getUserPlan() {
  return window.userPlan || "free";
}

// Helpers
function isFree() {
  return getUserPlan() === "free";
}

function isPro() {
  return getUserPlan() === "pro";
}

function isProPending() {
  return getUserPlan() === "pro_pending";
}

// 🔐 FEATURES REALES DE MEC
const FEATURES = {
  CHAT_GRUPAL: "chat_grupal",
  CHAT_PRIVADO: "chat_privado",
  ANALISIS: "analisis",
  VACACIONES: "vacaciones",
  FINIQUITO: "finiquito"
};

// Permisos por plan
const PLAN_PERMISSIONS = {
  free: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO
  ],

  // 🔥 CORREGIDO: ya NO tiene acceso a todo
  pro_pending: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO,
    FEATURES.ANALISIS
  ],

  pro: Object.values(FEATURES) // todo habilitado
};

function isAdmin() {
  const user = window.currentUser;
  if (!user) return false;

  return user.email === "christorfu@gmail.com";
}

// Verificar acceso
function canUse(feature) {

  // 🟢 ADMIN → acceso total SIEMPRE
  if (isAdmin()) return true;

  const plan = getUserPlan();
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;

  return permissions.includes(feature);
}

// Bloqueo simple
function requireFeature(feature, featureName = "esta función") {

  // 👑 ADMIN pasa siempre
  if (isAdmin()) return true;

  if (!canUse(feature)) {

    // 👉 usar paywall en vez de alert
    if (window.PAYWALL && PAYWALL.require) {
      PAYWALL.require(feature, featureName);
    } else {
      console.warn("⚠ PAYWALL no disponible");
    }

    return false;
  }

  return true;
}

// Exponer globalmente
window.PERMISSIONS = {
  FEATURES,
  isFree,
  isPro,
  isProPending,
  isAdmin,
  canUse,
  requireFeature
};

console.log("🔐 Sistema de permisos MEC cargado");
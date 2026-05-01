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

  pro_pending: Object.values(FEATURES), // todo habilitado

  pro: Object.values(FEATURES) // todo habilitado
};

// Verificar acceso
function canUse(feature) {
  const plan = getUserPlan();
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  return permissions.includes(feature);
}

// Bloqueo simple
function requireFeature(feature) {
  if (!canUse(feature)) {
    alert("Esta función está disponible en MEC PRO");
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
  canUse,
  requireFeature
};

console.log("🔐 Sistema de permisos MEC cargado");
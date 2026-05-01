// permissions.js
// Sistema base de permisos freemium (extendido sin romper lógica existente)

// Espera a que planGuard cargue el plan
function getUserPlan() {
  return window.userPlan || "free";
}

// Helpers simples
function isFree() {
  return getUserPlan() === "free";
}

function isPro() {
  return getUserPlan() === "pro";
}

function isProPending() {
  return getUserPlan() === "pro_pending";
}

// Definición centralizada de features SaaS
const FEATURES = {
  CHAT_GRUPAL: "chat_grupal",
  CHAT_PRIVADO: "chat_privado",
  RECURSOS: "recursos",
  FUNCIONES_AVANZADAS: "funciones_avanzadas",
  EXPORTES: "exportes",
  PRIORIDAD_RESPUESTAS: "prioridad_respuestas"
};

// Permisos por plan (extendido)
const PLAN_PERMISSIONS = {
  free: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO
    // ❗ dejamos fuera funciones avanzadas
  ],

  pro_pending: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO,
    FEATURES.RECURSOS,
    FEATURES.FUNCIONES_AVANZADAS,
    FEATURES.EXPORTES
  ],

  pro: Object.values(FEATURES) // acceso total
};

// Función principal del SaaS
function canUse(feature) {
  const plan = getUserPlan();
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  return permissions.includes(feature);
}

// 🔥 NUEVO: función para bloquear sin repetir código
function requireFeature(feature) {
  if (!canUse(feature)) {
    mostrarPaywall(feature);
    return false;
  }
  return true;
}

// 🔥 NUEVO: paywall simple (puedes mejorar después)
function mostrarPaywall(feature) {
  alert("Esta función está disponible en MEC PRO");
}

// Exponer globalmente (sin romper nada existente)
window.PERMISSIONS = {
  FEATURES,
  isFree,
  isPro,
  isProPending,
  canUse,
  requireFeature
};

console.log("🔐 Sistema de permisos cargado (extendido)");
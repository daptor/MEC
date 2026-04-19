// permissions.js
// Sistema base de permisos freemium (no bloquea nada aún)

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

// Definición centralizada de features SaaS
const FEATURES = {
  CHAT_GRUPAL: "chat_grupal",
  CHAT_PRIVADO: "chat_privado",
  RECURSOS: "recursos",
  FUNCIONES_AVANZADAS: "funciones_avanzadas",
  EXPORTES: "exportes",
  PRIORIDAD_RESPUESTAS: "prioridad_respuestas"
};

// Permisos por plan (versión inicial)
const PLAN_PERMISSIONS = {
  free: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO,
    FEATURES.RECURSOS
  ],
  pro: [
    FEATURES.CHAT_GRUPAL,
    FEATURES.CHAT_PRIVADO,
    FEATURES.RECURSOS,
    FEATURES.FUNCIONES_AVANZADAS,
    FEATURES.EXPORTES,
    FEATURES.PRIORIDAD_RESPUESTAS
  ]
};

// Función principal del SaaS
function canUse(feature) {
  const plan = getUserPlan();
  const permissions = PLAN_PERMISSIONS[plan] || PLAN_PERMISSIONS.free;
  return permissions.includes(feature);
}

// Exponer globalmente (sin romper nada existente)
window.PERMISSIONS = {
  FEATURES,
  isFree,
  isPro,
  canUse
};

console.log("🔐 Sistema de permisos cargado");
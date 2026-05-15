// supabaseClient.js
const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

let supabaseFederacionClient = null; // cache para evitar múltiples GoTrueClient

(function initSupabaseGlobal() {
  // Si no existe nada, cargar la librería desde CDN
  if (typeof window.supabase === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        window._supabaseLib = window.supabase; // librería
        window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey); // cliente global
      }
    };
    document.head.appendChild(script);
  } else if (typeof window.supabase.createClient === "function") {
    // Ya es librería
    window._supabaseLib = window.supabase;
    window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey);
  } else {
    // Ya es cliente
    window._supabaseLib = window._supabaseLib || null;
  }
})();

// Cliente “Federación”: usar un solo cliente con headers por sesión
function getSupabaseFederacion() {
  if (!window.supabase && !window._supabaseLib) {
    throw new Error("Supabase no inicializado aún.");
  }

  // Si ya creamos el cliente especial, reutilizarlo (evita warnings de múltiples GoTrueClient)
  if (supabaseFederacionClient) return supabaseFederacionClient;

  // Si tenemos librería, creamos cliente con headers una sola vez
  if (window._supabaseLib && typeof window._supabaseLib.createClient === "function") {
    supabaseFederacionClient = window._supabaseLib.createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          "x-rol": window.rolFederacion || "",
          "x-director-codigo": window.directorCodigoFederacion || ""
        }
      }
    });
    return supabaseFederacionClient;
  }

  // Fallback: usamos el global (sin headers extra)
  return window.supabase;
}

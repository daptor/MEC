// supabaseClient.js
const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

(function initSupabaseGlobal() {
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
    window._supabaseLib = window.supabase;
    window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey);
  } else {
    window._supabaseLib = window._supabaseLib || null;
  }
})();

// Crear SIEMPRE un cliente con headers a partir de la librería
function getSupabaseFederacion() {
  if (window._supabaseLib && typeof window._supabaseLib.createClient === "function") {
    return window._supabaseLib.createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          "x-rol": window.rolFederacion || "",
          "x-director-codigo": window.directorCodigoFederacion || ""
        }
      }
    });
  }
  if (window.supabase) return window.supabase;
  throw new Error("Supabase no inicializado aún.");
}

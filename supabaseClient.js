// supabaseClient.js
const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

// Carga la librería si hace falta y crea la instancia cliente.
// Mantiene referencia a la librería en window._supabaseLib y la instancia en window.supabase
if (typeof window.supabase === "undefined" || typeof window.supabase.createClient !== "function") {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = initSupabase;
  document.head.appendChild(script);
} else {
  initSupabase();
}

function initSupabase() {
  if (typeof window.supabase.createClient === "function") {
    window._supabaseLib = window.supabase; // referencia a la librería
    window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey); // instancia cliente
  } else {
    // si window.supabase ya es instancia cliente preservarla
    window._supabaseLib = window._supabaseLib || null;
  }
}

// Cliente con headers específicos para RLS — usar desde UI (no tocar credenciales aquí)
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
  throw new Error("Supabase no inicializado correctamente.");
}

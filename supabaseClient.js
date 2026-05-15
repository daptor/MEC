// supabaseClient.js
const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

// Inicializar cliente global y guardar referencia a la librería
(function initSupabaseGlobal() {
  // Si no existe nada, cargar la librería desde CDN
  if (typeof window.supabase === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => {
      // Aquí window.supabase es la LIBRERÍA supabase-js
      if (window.supabase && typeof window.supabase.createClient === "function") {
        window._supabaseLib = window.supabase; // guardar referencia a la librería
        window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey); // cliente global
      }
    };
    document.head.appendChild(script);
  } else if (typeof window.supabase.createClient === "function") {
    // Si ya es librería (caso raro), igual que arriba
    window._supabaseLib = window.supabase;
    window.supabase = window._supabaseLib.createClient(supabaseUrl, supabaseKey);
  } else {
    // Si ya es cliente, asumimos que otro código lo creó; no sobreescribimos
    // En este caso no tendremos _supabaseLib, pero getSupabaseFederacion hará fallback
    window._supabaseLib = window._supabaseLib || null;
  }
})();

// Cliente “Federación”: crea un cliente SOLO para consultas con headers RLS
function getSupabaseFederacion() {
  // Si tenemos la librería, creamos un cliente con headers en cada llamada
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
  // Fallback: si solo tenemos el cliente global, usarlo (sin headers extra)
  if (window.supabase) return window.supabase;
  throw new Error("Supabase no inicializado aún.");
}

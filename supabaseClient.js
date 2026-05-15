// supabaseClient.js
const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

// Inicializar un único cliente Supabase global
(function initSupabaseGlobal() {
  // Si no existe nada aún, cargar la librería desde CDN
  if (typeof window.supabase === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => {
      // Aquí window.supabase es la librería, creamos el cliente y la sobreescribimos
      if (window.supabase && typeof window.supabase.createClient === "function") {
        window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      }
    };
    document.head.appendChild(script);
  } else if (typeof window.supabase.createClient === "function") {
    // Si ya está cargada la librería (caso raro), crear directamente el cliente
    window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  } else {
    // Si ya es cliente, no hacemos nada (evita múltiples instancias)
    // window.supabase ya es usable
  }
})();

// Cliente "Federación": ahora solo devolvemos el cliente global
function getSupabaseFederacion() {
  if (!window.supabase) {
    throw new Error("Supabase no inicializado aún.");
  }
  return window.supabase;
}

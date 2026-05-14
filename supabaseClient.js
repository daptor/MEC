// cliente Supabase compatible con navegador (SIN imports)

const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs";

// cargar librería Supabase desde CDN si aún no existe
if (!window.supabase) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = initSupabase;
  document.head.appendChild(script);
} else {
  initSupabase();
}

// Inicializa/Reinicializa el cliente Supabase con la cabecera x-director-codigo tomada de sessionStorage
function initSupabase() {
  const directorCodigo = window.sessionStorage.getItem('director_codigo') || '';

  // intenta limpiar canales antiguos si existían (opcional)
  try {
    if (window.supabase && typeof window.supabase.removeAllChannels === 'function') {
      window.supabase.removeAllChannels();
    }
  } catch (e) {
    // no hacer nada si falla
  }

  window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-director-codigo': directorCodigo
      }
    }
  });
}

// Helper para actualizar el código de director/tesorero y reinicializar Supabase
function setDirectorCodigo(codigo) {
  if (!codigo) {
    window.sessionStorage.removeItem('director_codigo');
  } else {
    window.sessionStorage.setItem('director_codigo', codigo);
  }
  if (typeof initSupabase === 'function') initSupabase();
}

// Exponer helpers al scope global
window.initSupabase = initSupabase;
window.setDirectorCodigo = setDirectorCodigo;


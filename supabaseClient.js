// cliente Supabase compatible con navegador (SIN imports)

const supabaseUrl = "https://mxqrzhpyfwuutardehyu.supabase.co";
const supabaseKey = "sb_publishable_ltaNA7nnVozoSCOcZIjg";

// cargar librería Supabase desde CDN si aún no existe
if (!window.supabase) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = initSupabase;
  document.head.appendChild(script);
} else {
  initSupabase();
}

function initSupabase() {
  window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
}

// session.js (CONTROL GLOBAL DE SESIÓN MEC)

// NO crea cliente Supabase (usa el global de supabaseClient.js)

document.addEventListener("DOMContentLoaded", async () => {

  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirige al login
  if (!session) {
    window.location.href = "/login.html";
    return;
  }

});

// authGuard.js
// 🔐 Solo protege acceso a la app (sin UI)
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    history.replaceState(null, "", "/login.html");
    window.location.replace("login.html");
    return;
  }
});
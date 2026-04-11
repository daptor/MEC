// authGuard.js
// 🔐 Solo protege acceso a la app (sin UI)

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }
});
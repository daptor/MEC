// session.js  (CONTROL GLOBAL DE SESIÓN MEC)

const supabase = window.supabase.createClient(
  "https://mxqrzhpyfwuutardehyu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs"
);

document.addEventListener("DOMContentLoaded", async () => {

  // 🔐 1) Obtener sesión
  const { data: { session } } = await supabase.auth.getSession();

  // ❌ Si no hay sesión → enviar a login
  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const user = session.user;

  // 🧠 2) Obtener perfil desde tabla profiles
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  let planUsuario = "free";

  if (profile && profile.plan) {
    planUsuario = profile.plan;
  }

  // 🖥️ 3) Crear barra superior de usuario
  const barra = document.createElement("div");
  barra.style.position = "fixed";
  barra.style.top = "0";
  barra.style.right = "0";
  barra.style.background = "#111";
  barra.style.color = "white";
  barra.style.padding = "8px 12px";
  barra.style.fontSize = "14px";
  barra.style.zIndex = "9999";
  barra.style.borderBottomLeftRadius = "10px";

  barra.innerHTML = `
    👤 ${user.email} | Plan: ${planUsuario}
    <button id="logoutBtn" style="margin-left:10px; cursor:pointer;">Cerrar sesión</button>
  `;

  document.body.appendChild(barra);

  // 🚪 4) Logout
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
  });

});

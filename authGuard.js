// authGuard.js
// 🔐 Protección de sesión + barra usuario + botón logout

// Crear cliente Supabase (solo una vez)
const supabase = window.supabase.createClient(
  "https://mxqrzhpyfwuutardehyu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14cXJ6aHB5Znd1dXRhcmRlaHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjE0NDUsImV4cCI6MjA1OTAzNzQ0NX0.JaXYgxWKcbI_b7z0-ihvEHuueU7SSSy-_LlJfiYS9xs"
);

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const user = session.user;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  // Crear barra usuario si no existe
  if (!document.getElementById("userBar")) {
    const barra = document.createElement("div");
    barra.id = "userBar";
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
      👤 ${user.email} | Plan: ${profile?.plan || "free"}
      <button id="logoutBtn" style="margin-left:10px">Cerrar sesión</button>
    `;

    document.body.appendChild(barra);

    document.getElementById("logoutBtn").onclick = async () => {
      await supabase.auth.signOut();
      window.location.href = "/login.html";
    };
  }
});
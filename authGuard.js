// authGuard.js  (USA el cliente ya creado en supabaseClient.js)

document.addEventListener("DOMContentLoaded", async () => {

  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión → enviar a login
  if (!session) {
    window.location.href = "/login.html";
    return;
  }

  const user = session.user;

  // Obtener plan desde profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  // Barra superior usuario
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
    👤 ${user.email} | Plan: ${profile?.plan || "free"}
    <button id="logoutBtn" style="margin-left:10px">Cerrar sesión</button>
  `;

  document.body.appendChild(barra);

  document.getElementById("logoutBtn").onclick = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
  };

});
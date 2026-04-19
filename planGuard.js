// planGuard.js
// Carga el perfil y plan del usuario logeado (sin bloquear nada)

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // 1️⃣ Obtener sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error obteniendo sesión:", sessionError);
      return;
    }

    if (!session) {
      console.warn("No hay sesión activa");
      return;
    }

    const user = session.user;

    // 2️⃣ Obtener perfil desde Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error cargando perfil:", profileError);
      return;
    }

    // 3️⃣ Guardar globalmente (infraestructura SaaS)
    window.userProfile = profile;
    window.userPlan = profile.plan || "free";

    console.log("✅ Perfil cargado:", profile.email);
    console.log("💰 Plan cargado:", window.userPlan);

  } catch (err) {
    console.error("Error inesperado planGuard:", err);
  }
});
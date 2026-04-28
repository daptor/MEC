// planGuard.js
// Carga el perfil y plan del usuario logeado (sin bloquear nada)

document.addEventListener("DOMContentLoaded", async () => {
  try {

    // 🔒 SI HAY TRANSICIÓN DE PLAN, NO INTERFERIR
    if (window.planTransition) {
      console.log("⏳ Transición de plan activa, planGuard en espera...");
      return;
    }

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

    // ⏰ Verificar expiración automática de PRO_PENDING (24h) en Supabase
    try {
      await supabase.rpc("verificar_expiracion_pro_pending");
      console.log("⏰ Verificación de expiración PRO_PENDING ejecutada");
    } catch (e) {
      console.warn("No se pudo verificar expiración PRO_PENDING", e);
    }

    // 2️⃣ Obtener perfil desde Supabase (YA ACTUALIZADO)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error cargando perfil:", profileError);
      return;
    }

    // 3️⃣ Guardar globalmente
    window.userProfile = profile;
    window.userPlan = profile.plan || "free";

    // 🔓 liberar transición si venía bloqueado por flujo externo
    window.planTransition = false;

    console.log("✅ Perfil cargado:", profile.email);
    console.log("💰 Plan cargado:", window.userPlan);

  } catch (err) {
    console.error("Error inesperado planGuard:", err);
  }
});
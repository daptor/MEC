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

    // ⏰ Verificar expiración automática de PRO_PENDING (24h)
    try {
      await supabase.rpc("verificar_expiracion_pro_pending");
      console.log("⏰ Verificación de expiración PRO_PENDING ejecutada");
    } catch (e) {
      console.warn("No se pudo verificar expiración PRO_PENDING", e);
    }

    // 2️⃣ Obtener perfil desde Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error cargando perfil:", profileError);
      return;
    }

    let finalProfile = profile;

    // 🔥 SI NO EXISTE PERFIL → CREARLO AUTOMÁTICAMENTE
    if (!profile) {
      console.warn("⚠ Perfil no existe, creando automáticamente...");

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          plan: "free",
          analisis_usados: 0
        });

      if (insertError) {
        console.error("❌ Error creando perfil:", insertError);
        return;
      }

      // 🔄 volver a cargar el perfil recién creado
      const { data: newProfile, error: reloadError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (reloadError || !newProfile) {
        console.error("❌ Error recargando perfil:", reloadError);
        return;
      }

      finalProfile = newProfile;
    }

    // 3️⃣ Guardar globalmente
    window.userProfile = finalProfile;
    window.userPlan = finalProfile.plan || "free";

    // 🔓 liberar transición si venía bloqueado por flujo externo
    window.planTransition = false;

    console.log("✅ Perfil cargado:", finalProfile.email);
    console.log("💰 Plan cargado:", window.userPlan);

    // 🚀 AVISAR A TODA LA APP QUE EL PLAN YA ESTÁ LISTO
    window.dispatchEvent(new Event("planReady"));
    console.log("📢 Evento planReady enviado");

  } catch (err) {
    console.error("Error inesperado planGuard:", err);
  }
});
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

    // 🧠 3️⃣ CONTROL DE EXPIRACIÓN pro_pending usando pro_desde

    if (profile.plan === "pro_pending" && profile.pro_desde) {

      const ahora = Date.now();
      const inicio = new Date(profile.pro_desde).getTime();

      const minutos = (ahora - inicio) / 1000 / 60;

      console.log(`⏳ pro_pending activo: ${minutos.toFixed(1)} min`);

      if (minutos > 15) {

        console.log("🔄 pro_pending expirado → volviendo a FREE");

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: "free",
            pro_desde: null
          })
          .eq("id", profile.id);

        if (updateError) {
          console.error("Error actualizando plan:", updateError);
        } else {
          // 🔥 sincronizar el objeto local
          profile.plan = "free";
        }
      }
    }

    // 4️⃣ Guardar globalmente (YA VALIDADO)
    window.userProfile = profile;
    window.userPlan = profile.plan || "free";

    console.log("✅ Perfil cargado:", profile);
    console.log("💰 Plan cargado:", window.userPlan);

  } catch (err) {
    console.error("Error inesperado planGuard:", err);
  }
});
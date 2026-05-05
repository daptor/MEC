// planGuard.js (versión robusta)

document.addEventListener("DOMContentLoaded", async () => {
  await cargarPlanUsuario();
});

async function cargarPlanUsuario() {
  try {

    // 1️⃣ Obtener sesión
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("❌ Error sesión:", sessionError);
      setPlanFallback();
      return;
    }

    if (!session) {
      console.warn("⚠️ Sin sesión");
      return;
    }

    const user = session.user;

    // 2️⃣ Expiración automática (no bloquea flujo)
    try {
      await supabase.rpc("verificar_expiracion_pro_pending");
    } catch (e) {
      console.warn("⚠ No se pudo verificar expiración", e);
    }

    // 3️⃣ Obtener perfil
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("❌ Error perfil:", error);
      setPlanFallback();
      return;
    }

    // 4️⃣ Crear perfil si no existe
    if (!profile) {
      console.warn("⚠ Perfil no existe → creando");

      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          plan: "free",
          analisis_usados: 0
        });

      if (insertError) {
        console.error("❌ Error creando perfil:", insertError);
        setPlanFallback();
        return;
      }

      const { data: newProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      profile = newProfile;
    }

    // 5️⃣ Asignar SIEMPRE
    const plan = profile?.plan || "free";

    window.userProfile = profile;
    window.userPlan = plan;

    console.log("✅ Plan cargado:", plan);

    // 6️⃣ Notificar
    window.dispatchEvent(new Event("planReady"));

  } catch (err) {
    console.error("❌ Error inesperado:", err);
    setPlanFallback();
  }
}

// 🔻 fallback seguro
function setPlanFallback() {
  window.userPlan = "free";
  window.userProfile = null;

  console.warn("⚠ Plan fallback FREE activado");

  window.dispatchEvent(new Event("planReady"));
}
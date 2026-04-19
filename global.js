// global.js

// 🔑 CONFIG
const ADMIN_EMAIL = "christorfu@gmail.com";

// Función para mostrar una pantalla específica y ocultar las demás
function mostrarPantallaGastoReal(idPantalla) {
  document.querySelectorAll('.pantalla, .menu').forEach(el => {
    el.style.display = 'none';
  });

  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}

// Hacerla global
window.mostrarPantallaGastoReal = mostrarPantallaGastoReal;


// 🔐 CONTROL DE USUARIO
document.addEventListener("DOMContentLoaded", async () => {

  const { data: { user } } = await supabase.auth.getUser();

  // Mostrar email
  const emailSpan = document.getElementById("userEmail");
  if (emailSpan && user) {
    emailSpan.innerText = user.email;
  }

  // Botón cerrar sesión
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.replace("/");
    });
  }

  await obtenerUsosMes();
});


// 🔥 ESCUCHAR CAMBIOS DE SESIÓN
supabase.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    window.location.replace("/login.html");
  }
});


// 🔥 REGISTRO DE USO (CONTROL CENTRAL)
async function registrarUso(tipo) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("⚠️ No hay usuario logueado");
      return;
    }

    const esAdmin = user.email === ADMIN_EMAIL;

    // 🟢 ADMIN: no suma nada
    if (esAdmin) {
      console.log("🟢 Admin detectado - no suma uso ni visitas");
      return;
    }

    // 🌐 visitas (solo usuarios reales)
    await supabase.rpc("incrementar_visitas");

    // 🔥 uso real
    const { error } = await supabase
      .from("uso_usuario")
      .insert([
        {
          user_id: user.id,
          tipo: tipo
        }
      ]);

    if (error) {
      console.error("❌ Error registrando uso:", error);
    } else {
      console.log("✅ Uso registrado:", tipo);
    }

  } catch (err) {
    console.error("❌ Error inesperado:", err);
  }
}

// Hacerla global
window.registrarUso = registrarUso;


// 📊 OBTENER USOS DEL MES
async function obtenerUsosMes() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0,0,0,0);

    const { data, error } = await supabase
      .from("uso_usuario")
      .select("*")
      .eq("user_id", user.id)
      .gte("fecha", inicioMes.toISOString());

    if (error) {
      console.error("Error obteniendo usos:", error);
      return;
    }

    const total = data.length;

    const el = document.getElementById("contadorUsos");
    if (el) {
      el.textContent = `${total} / 5`;
    }

  } catch (err) {
    console.error("Error inesperado:", err);
  }
}


// 🚫 VALIDAR SI PUEDE USAR
async function puedeUsar() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 🟢 ADMIN: ilimitado
    if (user.email === ADMIN_EMAIL) {
      return true;
    }

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0,0,0,0);

    const { data, error } = await supabase
      .from("uso_usuario")
      .select("*")
      .eq("user_id", user.id)
      .gte("fecha", inicioMes.toISOString());

    if (error) {
      console.error("Error validando uso:", error);
      return false;
    }

    return data.length < 5;

  } catch (err) {
    console.error("Error inesperado:", err);
    return false;
  }
}

// =============================
// Helper global SaaS (bloqueos)
// =============================
function requireProFeature(featureName = "Esta función") {
  return PAYWALL.require(
    PERMISSIONS.FEATURES.FUNCIONES_AVANZADAS,
    featureName
  );
}
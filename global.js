// global.js

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


// 🔐 CONTROL DE USUARIO (mostrar email + logout + sync entre pestañas)
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


// 🔥 ESCUCHAR CAMBIOS DE SESIÓN (esto arregla tu problema)
supabase.auth.onAuthStateChange((event, session) => {

  if (event === "SIGNED_OUT") {
    window.location.replace("/login.html");
  }

});

// 🔥 REGISTRO DE USO (NUEVO - NO TOCA NADA EXISTENTE)
async function registrarUso(tipo) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("⚠️ No hay usuario logueado");
      return;
    }

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

// Hacerla global (para poder probar desde consola)
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
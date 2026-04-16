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

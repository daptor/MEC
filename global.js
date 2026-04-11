// global.js

// Función para mostrar una pantalla específica y ocultar las demás
function mostrarPantallaGastoReal(idPantalla) {
  // Oculta todas las pantallas y menús
  document.querySelectorAll('.pantalla, .menu').forEach(el => {
    el.style.display = 'none';
  });
  // Muestra la pantalla solicitada
  const pantalla = document.getElementById(idPantalla);
  if (pantalla) pantalla.style.display = 'block';
}

// Hacerla global para que pueda llamarse desde HTML
window.mostrarPantallaGastoReal = mostrarPantallaGastoReal;

// 🔐 CONTROL DE USUARIO (mostrar email + logout)
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
      window.location.href = "login.html";
    });
  }
});

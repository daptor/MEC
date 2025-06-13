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

document.addEventListener('DOMContentLoaded', () => {
  // Función maestra para ocultar TODO y luego mostrar SOLO la pantalla indicada
  function mostrarPantalla(id) {
    // 1) ocultar todas las pantallas y menús
    document.querySelectorAll('.pantalla, .menu').forEach(el => {
      el.style.display = 'none';
    });
    // 2) mostrar la que toca
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
    else console.error(`Pantalla "${id}" no existe`);
  }

  // Eventos de tus botones
  document.getElementById('btnIngresos')
    .addEventListener('click', () => mostrarPantalla('pantalla-tesoreria'));

  document.getElementById('btnGastos')
    .addEventListener('click', () => mostrarPantalla('pantalla-gastos'));

  document.getElementById('btnResultadoIngresos')
    .addEventListener('click', () => mostrarPantalla('pantalla-resultado-ingresos'));

  document.getElementById('btnResultadoGastos')
    .addEventListener('click', () => mostrarPantalla('pantalla-resultados-gastos'));

  // Volver al Menú Principal (ocultará *todo* lo que sea .pantalla o .menu)
  document.getElementById('volverBtn')
    .addEventListener('click', () => mostrarPantalla('menu-principal'));

  // Volver al Menú Tesorería desde Tesorería Federación
  document.getElementById('volverTesoreriaBtn')
    .addEventListener('click', () => mostrarPantalla('pantalla-menu-tesoreria'));
});

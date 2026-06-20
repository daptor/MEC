// ============================
// 📅 Agenda Federación MEC
// VERSIÓN SIMPLE (PRUEBA)
// ============================

console.log("📅 agendaFederacion.js cargado (versión simple)");

// Esta función se llamará desde verificarClave() en script.js
function agendaInit() {
  console.log("🔄 agendaInit (simple) llamada");

  const pantalla = document.getElementById("pantalla-agenda-federacion");
  const lista = document.getElementById("agenda-lista");

  console.log("📌 pantalla-agenda-federacion:", !!pantalla);
  console.log("📌 agenda-lista:", !!lista);

  if (!lista) return;

  // NO usamos Supabase aquí, solo texto estático.
  lista.innerHTML = `
    <div style="
      background:#ffffff;
      border-radius:10px;
      padding:10px 12px;
      margin-bottom:8px;
      border-left: 6px solid #22c55e;
      ">
      <div><strong>Ejemplo de reunión</strong> · (esto viene de agendaInit)</div>
      <div style="font-size:13px; color:#4b5563;">
        Si ves esta tarjeta, la Agenda está conectada correctamente.
      </div>
    </div>
  `;
}

// Exportamos al scope global
window.agendaInit = agendaInit;

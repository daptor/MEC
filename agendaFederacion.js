// ============================
// 📅 Agenda Federación MEC
// VERSIÓN SIMPLE (PRUEBA)
// ============================

console.log("📅 agendaFederacion.js cargado (versión simple)");

function agendaInit() {
  console.log("🔄 agendaInit (simple) llamada");

  const pantalla = document.getElementById("pantalla-agenda-federacion");
  const lista = document.getElementById("agenda-lista");

  console.log("📌 pantalla-agenda-federacion:", !!pantalla);
  console.log("📌 agenda-lista:", !!lista);

  if (!lista) return;

  // Forzamos estilo MUY visible
  lista.style.border = "3px solid red";
  lista.style.padding = "10px";
  lista.style.background = "yellow";
  lista.style.minHeight = "100px";

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

window.agendaInit = agendaInit;

//***************************** chat grupal ********************************

let canalGrupal = null;
let contadorNotificaciones = 0;

// 🧠 NUEVO: control de mensajes ya renderizados
let mensajesRenderizados = new Set();

// =========================
// RESET NOTIFICACIONES
// =========================
function resetearNotificaciones() {
    contadorNotificaciones = 0;
    actualizarBadge();
}

// =========================
// INGRESO AL CHAT
// =========================
async function ingresarAlChat() {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert("Usuario no autenticado");
        return;
    }

    const user_id = user.id;

    resetearNotificaciones();

    localStorage.removeItem("rol");
    localStorage.removeItem("nick");

    const { data: usuarioDB } = await supabase
        .from("usuarios")
        .select("nick, rol")
        .eq("user_id", user_id)
        .maybeSingle();

    let usuarioFinal = usuarioDB;

    if (!usuarioDB) {
        console.warn("⚠ Usuario no existe en tabla usuarios, creando...");

        const { error: insertError } = await supabase
            .from("usuarios")
            .insert({
                user_id: user_id,
                nick: null,
                rol: "usuario"
            });

        if (insertError) {
            console.error("❌ Error creando usuario:", insertError);
            return;
        }

        const { data: nuevo } = await supabase
            .from("usuarios")
            .select("nick, rol")
            .eq("user_id", user_id)
            .maybeSingle();

        usuarioFinal = nuevo;
    }

    if (usuarioFinal) {
        localStorage.setItem("user_id", user_id);
        localStorage.setItem("nick", usuarioFinal.nick || ""); // 🔥 FIX
        localStorage.setItem("rol", usuarioFinal.rol);
    }

    // 🔥 VALIDACIÓN CORREGIDA
    const nickActual = localStorage.getItem("nick");

    if (!nickActual || nickActual === "null" || nickActual.trim() === "") {

        let nick = prompt("Por favor, ingresa tu Nick:");

        if (!nick || nick.trim() === "") {
            alert("Debes ingresar un Nick para acceder al chat.");
            return;
        }

        const { error } = await supabase
            .from("usuarios")
            .update({ nick: nick.trim() })
            .eq("user_id", user_id);

        if (error) {
            console.error("Error guardando nick:", error);
            return;
        }

        localStorage.setItem("nick", nick.trim());
        await cargarMensajes();

    } else {
        await cargarMensajes();
    }

    suscribirseChatGrupal();
    mostrarPantalla("pantalla-chat");
}

// =========================
// SUSCRIPCIÓN REALTIME
// =========================
function suscribirseChatGrupal() {

    const user_id = localStorage.getItem("user_id");

    if (canalGrupal) {
        supabase.removeChannel(canalGrupal);
        canalGrupal = null;
    }

    canalGrupal = supabase.channel('mensajes_channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes'
        }, payload => {

            console.log("📩 Mensaje realtime:", payload);

            agregarMensajeAlDOM(payload.new);

            if (payload.new.user_id !== user_id) {
                contadorNotificaciones++;
                actualizarBadge();

                const audio = new Audio('https://mxqrzhpyfwuutardehyu.supabase.co/storage/v1/object/public/audios/campanilla.mp3');
                audio.play();
            }

        })
        .subscribe((status) => {
            console.log("📡 Canal grupal:", status);
        });
}

// =========================
// BADGE
// =========================
function actualizarBadge() {
    const badge = document.getElementById("badgeChat");
    if (!badge) return;

    badge.style.display = contadorNotificaciones > 0 ? "inline-block" : "none";
    badge.textContent = contadorNotificaciones;
}

// =========================
// CARGA INICIAL
// =========================
async function cargarMensajes() {

    const { data: mensajes, error } = await supabase
        .from('mensajes')
        .select('id, mensaje, respuesta, fecha_envio, rol, user_id, nick')
        .order('fecha_envio', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const contenedor = document.getElementById('mensaje-chat');
    contenedor.innerHTML = '';

    mensajesRenderizados.clear();

    mensajes.forEach(m => agregarMensajeAlDOM(m));
}

// =========================
// 🔥 RENDER INCREMENTAL REAL
// =========================
function agregarMensajeAlDOM(mensaje) {

    if (mensajesRenderizados.has(mensaje.id)) return;

    const contenedor = document.getElementById('mensaje-chat');

    const fecha = new Date(mensaje.fecha_envio);
    const fechaStr = fecha.toLocaleDateString('es-CL');
    const horaStr = fecha.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const ultimo = contenedor.lastElementChild;
    const ultimaFecha = ultimo?.dataset?.fecha;

    if (ultimaFecha !== fechaStr) {
        const sep = document.createElement('div');
        sep.classList.add('fecha-separador');
        sep.dataset.fecha = fechaStr;
        sep.innerHTML = fechaStr;
        contenedor.appendChild(sep);
    }

    const div = document.createElement('div');
    div.classList.add('mensaje');
    div.dataset.id = mensaje.id;

    div.innerHTML = `
        <p><strong>${mensaje.rol === 'admin' ? 'Admin:' : mensaje.nick + ':'}</strong> ${mensaje.mensaje}</p>
        <p><span class="hora">${horaStr}</span></p>
    `;

    if (mensaje.respuesta) {
        div.innerHTML += `<p><strong>Respuesta:</strong> ${mensaje.respuesta}</p>`;
    }

    contenedor.appendChild(div);

    mensajesRenderizados.add(mensaje.id);

    contenedor.scrollTop = contenedor.scrollHeight;
}

// =========================
// ENVIAR MENSAJE
// =========================
const btnEnviar = document.getElementById('enviarMensajeBtn');

if (btnEnviar) {
    btnEnviar.addEventListener('click', async function () {

        const mensaje = document.getElementById('mensajeUsuario').value;
        const user_id = localStorage.getItem("user_id");
        const rol = localStorage.getItem("rol");
        const nick = localStorage.getItem("nick");

        if (!mensaje) {
            alert("Ingresa un mensaje");
            return;
        }

        const { error } = await supabase
            .from('mensajes')
            .insert([{
                user_id,
                mensaje,
                estado: 'pendiente',
                fecha_envio: new Date(),
                rol,
                nick
            }]);

        if (!error) {
            document.getElementById('mensajeUsuario').value = '';
            // ❌ NO cargarMensajes()
        }
    });
}

// *************************** CHAT PRIVADO  ****************************

let canalPrivadoActivo = null;
let canalAdminActivo = null;
let idConversacionAdminActual = null;

contadorNotificaciones = 0;
actualizarBadge();

// 🧠 NUEVO: control de render + cache
let mensajesPrivadosRenderizados = new Set();
let cacheNicks = {};

// =========================
// OBTENER USUARIO REAL
// =========================
async function getUser() {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

// =========================
// BOTONES SEGÚN ROL
// =========================
document.addEventListener("DOMContentLoaded", async function () {

    const user = await getUser();
    if (!user) return;

    const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("user_id", user.id)
        .maybeSingle();

    const btnAdmin = document.getElementById("btnAdminChatPrivado");
    const btnUser = document.getElementById("btnChatPrivado");

    if (data?.rol === "admin") {
        if (btnAdmin) btnAdmin.style.display = "block";
        if (btnUser) btnUser.style.display = "none";
    } else {
        if (btnAdmin) btnAdmin.style.display = "none";
        if (btnUser) btnUser.style.display = "block";
    }
});

// =========================
// OBTENER NICK (CON CACHE)
// =========================
async function obtenerNickPorId(userId) {

    if (cacheNicks[userId]) {
        return cacheNicks[userId];
    }

    const { data } = await supabase
        .from('usuarios')
        .select('nick')
        .eq('user_id', userId)
        .maybeSingle();

    const nick = data?.nick || "Usuario";

    cacheNicks[userId] = nick;

    return nick;
}

// =========================
// SUBIR ARCHIVO CHAT PRIVADO (usuario)
// =========================
async function subirArchivoPrivado(file, idConversacion) {
  if (!file) return null;

  // Validar tamaño (3 MB)
  const maxBytes = 3 * 1024 * 1024; // 3MB
  if (file.size > maxBytes) {
    alert("El archivo supera los 3 MB permitidos.");
    return null;
  }

  // Validar tipo
  const mime = file.type;
  const tiposPermitidos = [
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];
  if (!tiposPermitidos.includes(mime)) {
    alert("Solo se permiten PDF y archivos Excel (.xls / .xlsx).");
    return null;
  }

  // Obtener usuario actual
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) {
    alert("No hay usuario autenticado.");
    return null;
  }

  // Obtener nick del usuario para el nombre del archivo
  let nick = "Usuario";
  try {
    const { data: dataNick } = await supabase
      .from("usuarios")
      .select("nick")
      .eq("user_id", user.id)
      .maybeSingle();

    if (dataNick?.nick) {
      nick = dataNick.nick;
    }
  } catch (e) {
    console.warn("No se pudo obtener nick, usando 'Usuario'", e);
  }

  // Fecha actual YYYY-MM-DD
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, "0");
  const dd = String(hoy.getDate()).padStart(2, "0");
  const fechaStr = `${yyyy}-${mm}-${dd}`;

  // Extensión original
  const originalName = file.name;
  const lastDot = originalName.lastIndexOf(".");
  const ext = lastDot > 0 ? originalName.slice(lastDot + 1) : "";
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, "");

  // Limpiar nick
  const safeNick = nick.replace(/[^a-zA-Z0-9]/g, "_");

  // Nombre final para MOSTRAR: Nick_Fecha.ext
  const nombreFinal = safeExt
    ? `${safeNick}_${fechaStr}.${safeExt}`
    : `${safeNick}_${fechaStr}`;

  // Path interno ÚNICO en Storage (incluye timestamp)
  const path = `${user.id}/${idConversacion}/${Date.now()}_${nombreFinal}`;

  const { error } = await supabase
    .storage
    .from("chat_privado_adjuntos")
    .upload(path, file);

  if (error) {
    console.error("Error subiendo archivo privado:", error);
    alert("No se pudo subir el archivo. Inténtalo nuevamente.");
    return null;
  }

  // Devolvemos datos para guardar en mensajes_privados
  return {
    archivo_path: path,        // único por mensaje
    archivo_nombre: nombreFinal, // lo que se muestra en el chat
    archivo_mime: mime
  };
}

// =========================
// INICIAR CHAT USUARIO
// =========================
async function iniciarChatPrivado() {

    const user = await getUser();
    if (!user) {
        alert("No autenticado");
        return;
    }

    const idConversacion = await obtenerOcrearConversacionPrivada(user.id);

    if (!idConversacion) {
        alert("Error creando conversación");
        return;
    }

    mostrarPantalla('pantalla-chat-privado');

    await cargarMensajesPrivados(idConversacion);
    await suscribirChatPrivado(idConversacion);

    const btn = document.getElementById("enviarMensajePrivadoBtn");
    if (btn) btn.onclick = () => enviarMensajePrivado(idConversacion);
}

// =========================
// CREAR / OBTENER CONVERSACIÓN
// =========================
async function obtenerOcrearConversacionPrivada(usuarioId) {

    const { data } = await supabase
        .from('conversaciones_privadas')
        .select('*')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

    if (data) return data.id;

    const { data: adminData } = await supabase
        .from("usuarios")
        .select("user_id")
        .eq("rol", "admin")
        .maybeSingle();

    if (!adminData) {
        alert("No existe admin configurado");
        return null;
    }

    const { data: nueva, error } = await supabase
        .from('conversaciones_privadas')
        .insert([{
            usuario_id: usuarioId,
            admin_id: adminData.user_id,
            estado: 'abierta'
        }])
        .select()
        .single();

    if (error) {
        console.error("Error creando conversación:", error);
        return null;
    }

    return nueva.id;
}

// =========================
// REALTIME USUARIO (SIN REFRESH)
// =========================
async function suscribirChatPrivado(idConversacion) {

    if (canalPrivadoActivo) {
        await supabase.removeChannel(canalPrivadoActivo);
    }

    canalPrivadoActivo = supabase.channel('chat_privado_' + idConversacion)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes_privados',
            filter: `conversation_privada_id=eq.${idConversacion}`
        }, async (payload) => {

            const user = await getUser();
            if (!user) return;

            // 🔥 SOLO agregar mensaje nuevo (NO recargar todo)
            await agregarMensajePrivadoAlDOM(payload.new);

            if (payload.new.user_id !== user.id) {

                contadorNotificaciones++;
                actualizarBadge();

                const audio = new Audio('https://mxqrzhpyfwuutardehyu.supabase.co/storage/v1/object/public/audios/campanilla.mp3');
                audio.play();
            }

        })
        .subscribe((status) => {
            console.log("📡 Canal privado:", status);
        });
}

// =========================
// CARGA INICIAL (UNA SOLA VEZ)
// =========================
async function cargarMensajesPrivados(idConversacion) {

    const user = await getUser();
    if (!user) return;

    const { data } = await supabase
        .from('mensajes_privados')
        .select('*')
        .eq('conversation_privada_id', idConversacion)
        .order('fecha_envio', { ascending: true });

    const contenedor = document.getElementById("mensaje-chat-privado");
    if (!contenedor) return;

    contenedor.innerHTML = '';
    mensajesPrivadosRenderizados.clear();

    if (data) {
        for (const msg of data) {
            await agregarMensajePrivadoAlDOM(msg);
        }
    }
}

// =========================
// RENDER INCREMENTAL REAL
// =========================
async function agregarMensajePrivadoAlDOM(msg) {
  if (mensajesPrivadosRenderizados.has(msg.id)) return;
  const user = await getUser();
  const contenedor = document.getElementById("mensaje-chat-privado");
  const div = document.createElement('div');
  div.style.textAlign = (msg.user_id === user.id) ? "right" : "left";
  const nick = await obtenerNickPorId(msg.user_id);

  let html = `
    <strong>${nick}:</strong> ${msg.mensaje}
    <br><small>${new Date(msg.fecha_envio).toLocaleTimeString()}</small>
  `;

  if (msg.archivo_path && msg.archivo_nombre) {
    html += `
      <br>
      <button type="button"
        style="margin-top:4px; padding:4px 8px; font-size:12px;"
        onclick="verArchivoAdjunto('${msg.archivo_path}', '${msg.archivo_nombre.replace(/'/g, "\\'")}')">
        📎 Ver archivo: ${msg.archivo_nombre}
      </button>
    `;
  }

  div.innerHTML = html;
  contenedor.appendChild(div);
  mensajesPrivadosRenderizados.add(msg.id);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// =========================
// ENVIAR MENSAJE USUARIO
// =========================
async function enviarMensajePrivado(idConversacion) {
  const user = await getUser();
  if (!user) return;

  const inputTexto = document.getElementById('mensajeUsuarioPrivado');
  const inputArchivo = document.getElementById('archivoPrivado');
  if (!inputTexto) return;

  const mensaje = (inputTexto.value || "").trim();
  const file = inputArchivo ? inputArchivo.files[0] : null;

  if (!mensaje && !file) {
    alert("Escribe un mensaje o adjunta un archivo.");
    return;
  }

  // 1) Subir archivo si existe
  let datosArchivo = null;
  if (file) {
    datosArchivo = await subirArchivoPrivado(file, idConversacion);
    if (!datosArchivo) {
      // Falló subida → no enviamos nada
      return;
    }
  }

  // 2) Insertar mensaje en la tabla mensajes_privados
  const payload = {
    conversation_privada_id: idConversacion,
    mensaje: mensaje || "(Adjunto enviado)",
    user_id: user.id,
    rol: 'usuario'
  };

  if (datosArchivo) {
    payload.archivo_path   = datosArchivo.archivo_path;
    payload.archivo_nombre = datosArchivo.archivo_nombre;
    payload.archivo_mime   = datosArchivo.archivo_mime;
  }

  const { error } = await supabase.from('mensajes_privados').insert([payload]);
  if (error) {
    console.error("Error insertando mensaje privado:", error);
    alert("No se pudo enviar el mensaje.");
    return;
  }

  // 3) Limpiar inputs
  inputTexto.value = '';
  if (inputArchivo) inputArchivo.value = '';

  const confirmacion = document.getElementById('confirmacionEnvioPrivado');
  if (confirmacion) {
    confirmacion.style.display = "block";
    setTimeout(() => { confirmacion.style.display = "none"; }, 1500);
  }
}

// =========================
// VER ARCHIVO ADJUNTO (URL firmada)
// =========================
async function verArchivoAdjunto(archivoPath, archivoNombre) {
  if (!archivoPath) return;

  try {
    const { data, error } = await supabase
      .storage
      .from("chat_privado_adjuntos")
      .createSignedUrl(archivoPath, 60 * 10); // 10 minutos

    if (error || !data?.signedUrl) {
      console.error("Error obteniendo URL firmada:", error);
      alert("No se pudo abrir el archivo.");
      return;
    }

    window.open(data.signedUrl, "_blank");
  } catch (e) {
    console.error("Error verArchivoAdjunto:", e);
    alert("No se pudo abrir el archivo.");
  }
}


// =========================
// ADMIN - CONTROL RENDER
// =========================
let mensajesAdminRenderizados = new Set();


// =========================
// ADMIN - LISTA DE CHATS (SIN CAMBIOS CRÍTICOS)
// =========================
async function mostrarPantallaAdminChat() {

    mostrarPantalla('pantalla-admin-chat');

    const user = await getUser();
    if (!user) return;

    const { data, error } = await supabase
        .from('conversaciones_privadas')
        .select('*')
        .eq('admin_id', user.id)
        .eq('estado', 'abierta');

    if (error) {
        console.error("Error:", error);
        return;
    }

    const lista = document.getElementById("lista-conversaciones");
    const contador = document.getElementById("contador-conversaciones");

    if (!lista) return;

    lista.innerHTML = '';

    if (data && data.length > 0) {

        contador.textContent = `Hay ${data.length} conversaciones activas`;

        for (const conv of data) {

            const nick = await obtenerNickPorId(conv.usuario_id);

            const btn = document.createElement('button');
            btn.textContent = `Chat con ${nick}`;
            btn.onclick = () => abrirChatComoAdmin(conv.id, conv.usuario_id);

            lista.appendChild(btn);
        }

    } else {
        contador.textContent = "No hay conversaciones activas";
    }
}

// =========================
// ADMIN - ABRIR CHAT (CORREGIDO)
// =========================
async function abrirChatComoAdmin(idConversacion, userIdUsuario) {

    idConversacionAdminActual = idConversacion;

    const nickUsuario = await obtenerNickPorId(userIdUsuario);

    document.getElementById("nombreUsuarioChat").textContent = nickUsuario;
    document.getElementById("chat-admin-panel").style.display = "block";

    await cargarMensajesAdmin(idConversacion, userIdUsuario);

    if (canalAdminActivo) {
        await supabase.removeChannel(canalAdminActivo);
    }

    canalAdminActivo = supabase.channel('admin_chat_' + idConversacion)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes_privados',
            filter: `conversation_privada_id=eq.${idConversacion}`
        }, async (payload) => {

            const user = await getUser();
            if (!user) return;

            // 🔥 SOLO agregar nuevo mensaje (NO recargar todo)
            await agregarMensajeAdminAlDOM(payload.new, userIdUsuario);

            if (payload.new.user_id !== user.id) {

                contadorNotificaciones++;
                actualizarBadge();

                const audio = new Audio('https://mxqrzhpyfwuutardehyu.supabase.co/storage/v1/object/public/audios/campanilla.mp3');
                audio.play();
            }

        })
        .subscribe((status) => {
            console.log("📡 Canal admin:", status);
        });
}

// =========================
// ADMIN - CARGA INICIAL
// =========================
async function cargarMensajesAdmin(idConversacion, userIdUsuario) {

    const { data } = await supabase
        .from('mensajes_privados')
        .select('*')
        .eq('conversation_privada_id', idConversacion)
        .order('fecha_envio', { ascending: true });

    const contenedor = document.getElementById("admin-chat-mensajes");
    if (!contenedor) return;

    contenedor.innerHTML = '';
    mensajesAdminRenderizados.clear();

    const nickUsuario = await obtenerNickPorId(userIdUsuario);

    if (data) {
        for (const msg of data) {
            agregarMensajeAdminAlDOM(msg, userIdUsuario, nickUsuario);
        }
    }
}

// =========================
// ADMIN - RENDER INCREMENTAL
// =========================
async function agregarMensajeAdminAlDOM(msg, userIdUsuario, nickUsuarioCache = null) {
  if (mensajesAdminRenderizados.has(msg.id)) return;
  const contenedor = document.getElementById("admin-chat-mensajes");
  const div = document.createElement('div');
  div.style.textAlign = (msg.rol === "admin") ? "right" : "left";

  let nick;
  if (msg.rol === "admin") {
    nick = "Admin";
  } else {
    nick = nickUsuarioCache || await obtenerNickPorId(userIdUsuario);
  }

  let html = `
    <strong>${nick}:</strong> ${msg.mensaje}
    <br><small>${new Date(msg.fecha_envio).toLocaleTimeString()}</small>
  `;

  if (msg.archivo_path && msg.archivo_nombre) {
    html += `
      <br>
      <button type="button"
        style="margin-top:4px; padding:4px 8px; font-size:12px;"
        onclick="verArchivoAdjunto('${msg.archivo_path}', '${msg.archivo_nombre.replace(/'/g, "\\'")}')">
        📎 Ver archivo: ${msg.archivo_nombre}
      </button>
    `;
  }

  div.innerHTML = html;
  contenedor.appendChild(div);
  mensajesAdminRenderizados.add(msg.id);
  contenedor.scrollTop = contenedor.scrollHeight;
}

// =========================
// ADMIN - ENVIAR MENSAJE
// =========================
async function enviarMensajePrivadoAdmin() {

    const user = await getUser();
    if (!user || !idConversacionAdminActual) return;

    const input = document.getElementById('mensajeAdminPrivado');
    if (!input) return;

    const mensaje = input.value.trim();
    if (!mensaje) return;

    await supabase.from('mensajes_privados').insert([{
        conversation_privada_id: idConversacionAdminActual,
        mensaje,
        user_id: user.id,
        rol: 'admin'
    }]);

    input.value = '';
}

// =========================
// ADMIN - VOLVER
// =========================
function mostrarListaConversaciones() {
    document.getElementById("chat-admin-panel").style.display = "none";
    mostrarPantallaAdminChat();
}

// =========================
// ADMIN - CERRAR CHAT
// =========================
async function cerrarConversacion() {

    if (!idConversacionAdminActual) return;

    await supabase
        .from('conversaciones_privadas')
        .update({ estado: 'cerrada' })
        .eq('id', idConversacionAdminActual);

    alert("Conversación cerrada");

    idConversacionAdminActual = null;

    document.getElementById("chat-admin-panel").style.display = "none";

    await mostrarPantallaAdminChat();
}

//--------------------------------- fin chats ----------------------------------

window.ingresarAlChat = ingresarAlChat;
window.iniciarChatPrivado = iniciarChatPrivado;
window.mostrarPantallaAdminChat = mostrarPantallaAdminChat;
window.verArchivoAdjunto = verArchivoAdjunto;

window.actualizarBadge = actualizarBadge;
window.resetearNotificaciones = resetearNotificaciones;

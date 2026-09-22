import mercadopago from "mercadopago";
import { createClient } from "@supabase/supabase-js";

// Cliente ADMIN para escribir en Supabase
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Configurar Mercado Pago con el token de entorno
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

// Leer token de Supabase desde las cookies de Vercel
function getSupabaseTokenFromCookies(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/sb-access-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    // 1) Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({ error: "No autorizado (falta token)" });
    }

    // 2) Cliente Supabase "de usuario" usando el token recibido
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { 
        global: { headers: { Authorization: `Bearer ${token}` } } 
      }
    );

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Usuario inválido o sesión expirada" });
    }
    const user = userData.user;

       // 3) Tipo de suscripción (por ahora siempre trabajador)
    const { tipo } = req.body || {};
    const plan_id =
      tipo === "sindicato" ? "pro_anual_sindicato" : "pro_mensual_trabajador";

    // 4) Precio (duro por ahora)
    const precio_clp = 2990; // Precio temporal para prueba real $2990

    // 5) Crear preferencia en Mercado Pago
    const preference = {
      items: [
        {
          title: "MEC PRO",
          description: plan_id,
          quantity: 1,
          unit_price: precio_clp
        }
      ],
      external_reference: `${user.id}:${plan_id}`,
        back_urls: {
          success: "https://mec1.vercel.app/app-protegida.html",
          failure: "https://mec1.vercel.app/app-protegida.html",
          pending: "https://mec1.vercel.app/app-protegida.html"
        },
        auto_return: "approved"

    };

    const mpResp = await mercadopago.preferences.create(preference);

    // 6) Registrar suscripción pendiente en Supabase
    await supabaseAdmin.from("suscripciones").insert({
      user_id: user.id,
      plan: plan_id,
      estado: "pendiente_pago",
      mp_preference_id: mpResp.body.id
    });

    // 7) Devolver URL de pago
    return res.status(200).json({ init_point: mpResp.body.init_point });
  } catch (e) {
    console.error("MP crear-suscripcion error:", e);
    return res.status(500).json({ error: "mp_error" });
  }
}

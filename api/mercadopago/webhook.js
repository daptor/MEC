import mercadopago from "mercadopago";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

export default async function handler(req, res) {
  try {

    console.log("====================================");
    console.log("🚀 WEBHOOK MERCADO PAGO RECIBIDO");
    console.log("METHOD:", req.method);
    console.log("QUERY:", JSON.stringify(req.query, null, 2));
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("====================================");

    // Mercado Pago puede enviar el tipo en query o body
    const topic =
      req.query.topic ||
      req.query.type ||
      req.body?.type;

    // Mercado Pago puede enviar el id en distintos formatos
    const id =
      req.query.id ||
      req.body?.data?.id ||
      req.body?.data?.resource_id;

    console.log("📌 topic:", topic);
    console.log("📌 id:", id);

    if (!topic || !id) {
      console.log("⚠️ Falta topic o id. Se ignora evento.");
      return res.status(200).end();
    }

    // Solo pagos
    if (topic !== "payment") {
      console.log("ℹ️ Evento ignorado:", topic);
      return res.status(200).end();
    }

    console.log("🔍 Consultando pago en Mercado Pago...");

    const payment = await mercadopago.payment.findById(id);
    const info = payment.body;

    console.log(
      "💳 PAYMENT INFO:",
      JSON.stringify(info, null, 2)
    );

    console.log("📌 Estado pago:", info.status);

    if (info.status !== "approved") {
      console.log(
        "⏳ Pago aún no aprobado. Estado:",
        info.status
      );
      return res.status(200).end();
    }

    const externalReference =
      info.external_reference || "";

    console.log(
      "📌 external_reference:",
      externalReference
    );

    const [user_id, plan_id] =
      externalReference.split(":");

    if (!user_id || !plan_id) {
      console.log(
        "❌ external_reference inválido:",
        externalReference
      );
      return res.status(200).end();
    }

    console.log(
      "✅ Pago aprobado para usuario:",
      user_id,
      "plan:",
      plan_id
    );

    // =====================================================
    // 1) Activar suscripción
    // =====================================================

    const {
      data: suscripcionData,
      error: suscripcionError
    } = await supabaseAdmin
      .from("suscripciones")
      .update({
        estado: "activa"
      })
      .eq("user_id", user_id)
      .eq("plan", plan_id)
      .select(); // 👈 añadimos select() para ver qué fila tocó

    console.log("📄 UPDATE SUSCRIPCION:", {
      user_id,
      plan_id,
      suscripcionData,
      suscripcionError
    });

    // =====================================================
    // 2) Actualizar profile
    // =====================================================

    const ahora = new Date();

    const hasta = new Date(
      ahora.getTime() +
      30 * 24 * 60 * 60 * 1000
    );

    const {
      data: profileData,
      error: profileError
    } = await supabaseAdmin
      .from("profiles")
      .update({
        plan: "pro",
        pro_desde: ahora.toISOString(),
        pro_hasta: hasta.toISOString()
      })
      .eq("id", user_id)
      .select(); // 👈 clave: ver realmente qué devuelve

    console.log("👤 UPDATE PROFILE:", {
      user_id,
      profileData,
      profileError
    });

    // Clasificación según tu plan MEC
    if (profileError) {
      console.log(">>> ESCENARIO A: PROFILE ERROR");
    } else if (Array.isArray(profileData) && profileData.length === 0) {
      console.log(">>> ESCENARIO B: PROFILE RESULT = [] (0 filas afectadas)");
    } else if (Array.isArray(profileData) && profileData.length === 1) {
      console.log(">>> ESCENARIO C: PROFILE ACTUALIZADO:", profileData[0]);
    }

    if (profileError) {
      console.error(
        "❌ Error actualizando profile:",
        profileError
      );
    }

    console.log(
      "🎉 PRO ACTIVADO PARA:",
      user_id
    );

    return res.status(200).end();

  } catch (e) {

    console.error(
      "💥 MP webhook error:"
    );

    console.error(e);

    return res.status(500).end();
  }
}

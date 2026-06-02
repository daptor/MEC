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
    const topic = req.query.topic || req.query.type;
    const id =
      req.query.id ||
      (req.body && req.body.data && (req.body.data.id || req.body.data.resource_id));

    if (!topic || !id) {
      return res.status(200).end();
    }

    // Solo pagos por ahora
    if (topic !== "payment") {
      return res.status(200).end();
    }

    const payment = await mercadopago.payment.findById(id);
    const info = payment.body;

    if (info.status !== "approved") {
      return res.status(200).end();
    }

    const [user_id, plan_id] = (info.external_reference || "").split(":");
    if (!user_id || !plan_id) {
      return res.status(200).end();
    }

    console.log("✅ Pago aprobado para usuario:", user_id, "plan:", plan_id);

    // 1) Marcar suscripción como activa
    await supabaseAdmin
      .from("suscripciones")
      .update({ estado: "activa" })
      .eq("user_id", user_id)
      .eq("plan", plan_id);

    // 2) Actualizar perfil del usuario a PRO con fechas
    const ahora = new Date();
    const hasta = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días

    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "pro",
        pro_desde: ahora.toISOString(),
        pro_hasta: hasta.toISOString()
      })
      .eq("id", user_id);

    return res.status(200).end();
  } catch (e) {
    console.error("MP webhook error:", e);
    return res.status(500).end();
  }
}

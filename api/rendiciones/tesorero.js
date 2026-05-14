// pages/api/rendiciones/tesorero.js
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

function esTesorero(clave) {
  return !!(clave && process.env.ADMIN_KEY && clave === process.env.ADMIN_KEY);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { clave, estado } = req.query || {};
    if (!esTesorero(clave || "")) return res.status(401).json({ error: "CLAVE_INVALIDA" });

    let query = supabaseAdmin
      .from("rendiciones_viaticos")
      .select("*")
      .order("fecha_boleta", { ascending: false });

    if (estado) query = query.eq("estado", estado);

    const { data, error } = await query;
    if (error) {
      console.error("DB LIST ERROR:", error);
      return res.status(500).json({ error: "DB_ERROR" });
    }
    return res.status(200).json({ rendiciones: data || [] });
  }

  if (req.method === "POST") {
    // Marca como pagada. Se espera JSON { clave, id, observacion_tesorero }
    const body = req.body || {};
    const clave = body.clave || "";
    if (!esTesorero(clave)) return res.status(401).json({ error: "CLAVE_INVALIDA" });

    const id = Number(body.id || 0);
    const obs = body.observacion_tesorero || null;
    if (!id) return res.status(400).json({ error: "ID_REQUERIDO" });

    const { data, error } = await supabaseAdmin
      .from("rendiciones_viaticos")
      .update({ estado: "pagada", fecha_pago: new Date().toISOString(), observacion_tesorero: obs })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("UPDATE ERROR:", error);
      return res.status(500).json({ error: "UPDATE_ERROR" });
    }
    return res.status(200).json({ rendicion: data });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}

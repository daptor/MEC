// pages/api/rendiciones/director.js
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

// Valida clave contra env DIRECTOR_1..DIRECTOR_9 (ajusta el tope si necesitas más)
function validarClaveDirector(clave) {
  for (let i = 1; i <= 9; i++) {
    const envKey = process.env[`DIRECTOR_${i}`];
    if (envKey && clave === envKey) return `DIRECTOR_${i}`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { clave } = req.query || {};
    const directorCodigo = validarClaveDirector(clave || "");
    if (!directorCodigo) return res.status(401).json({ error: "CLAVE_INVALIDA" });

    const { data, error } = await supabaseAdmin
      .from("rendiciones_viaticos")
      .select("*")
      .eq("director_codigo", directorCodigo)
      .order("fecha_boleta", { ascending: false });

    if (error) {
      console.error("DB LIST ERROR:", error);
      return res.status(500).json({ error: "DB_ERROR" });
    }
    return res.status(200).json({ rendiciones: data || [] });
  }

  if (req.method === "POST") {
    // Parse multipart/form-data con busboy (simple y sin dependencias adicionales)
    const busboy = require("busboy");
    const bb = busboy({ headers: req.headers });
    const fields = {};
    let fileBuffer = null;
    let fileInfo = null;

    await new Promise((resolve, reject) => {
      bb.on("field", (name, val) => { fields[name] = val; });
      bb.on("file", (name, file, info) => {
        fileInfo = info;
        const chunks = [];
        file.on("data", (d) => chunks.push(d));
        file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });
      bb.on("close", resolve);
      bb.on("error", reject);
      req.pipe(bb);
    });

    const clave = fields.clave || "";
    const directorCodigo = validarClaveDirector(clave);
    if (!directorCodigo) return res.status(401).json({ error: "CLAVE_INVALIDA" });

    const fecha_boleta = fields.fecha_boleta;
    const descripcion = fields.descripcion;
    const monto = fields.monto ? Number(fields.monto) : null;

    if (!fecha_boleta || !descripcion || !fileBuffer || !fileInfo) {
      return res.status(400).json({ error: "DATOS_INCOMPLETOS" });
    }

    const mime = fileInfo.mimeType || fileInfo.mime || "application/octet-stream";
    const ext = mime === "application/pdf" ? "pdf" : mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "bin";
    const now = Date.now();
    const safeName = `boleta_${now}.${ext}`;
    const path = `${directorCodigo}/${safeName}`;

    // Subir a storage con service role
    const { error: storageError } = await supabaseAdmin.storage
      .from("rendiciones_viaticos")
      .upload(path, fileBuffer, { contentType: mime, upsert: false });

    if (storageError) {
      console.error("UPLOAD ERROR:", storageError);
      return res.status(500).json({ error: "UPLOAD_ERROR" });
    }

    // Insertar registro
    const { data, error: insertError } = await supabaseAdmin
      .from("rendiciones_viaticos")
      .insert({
        director_codigo: directorCodigo,
        director_nombre: directorCodigo,
        sindicato_nombre: "", // no usado en este flujo
        fecha_boleta,
        descripcion,
        monto,
        boleta_path: path,
        boleta_nombre: safeName,
        boleta_mime: mime,
        estado: "pendiente"
      })
      .select()
      .single();

    if (insertError) {
      console.error("INSERT ERROR:", insertError);
      return res.status(500).json({ error: "INSERT_ERROR" });
    }

    return res.status(201).json({ rendicion: data });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end("Method Not Allowed");
}

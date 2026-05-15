// /api/validate-clave.js
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { clave } = req.body || {};
  if (!clave) return res.status(400).json({ error: "clave required" });

  // Mapear claves desde env vars (ajusta si tus env names difieren)
  const mapping = {
    [process.env.CODIGO_ACCESO]: { role: "USUARIO", director_code: null },
    [process.env.ADMIN_KEY]: { role: "TESORERO", director_code: "TESORERO" },
    [process.env.CLAVE_CONCEPCION]: { role: "DIRECTOR_1", director_code: process.env.DIRECTOR_1 || "DIRECTOR_1" },
    [process.env.CLAVE_COSTANERA]: { role: "DIRECTOR_2", director_code: process.env.DIRECTOR_2 || "DIRECTOR_2" },
    [process.env.CLAVE_CURICO]: { role: "DIRECTOR_3", director_code: process.env.DIRECTOR_3 || "DIRECTOR_3" },
    [process.env.CLAVE_IQUIQUE]: { role: "DIRECTOR_4", director_code: process.env.DIRECTOR_4 || "DIRECTOR_4" },
    [process.env.CLAVE_PLAZANORTE]: { role: "DIRECTOR_5", director_code: process.env.DIRECTOR_5 || "DIRECTOR_5" },
    [process.env.CLAVE_PUERTOMONTT]: { role: "DIRECTOR_6", director_code: process.env.DIRECTOR_6 || "DIRECTOR_6" },
    [process.env.CLAVE_RANCAGUA]: { role: "DIRECTOR_7", director_code: process.env.DIRECTOR_7 || "DIRECTOR_7" },
    [process.env.CLAVE_TREBOL]: { role: "OTRO", director_code: process.env.DIRECTOR_7 || "OTRO" }
  };

  const entry = mapping[clave];
  if (!entry) return res.status(401).json({ error: "Clave inválida" });

  return res.status(200).json({
    role: entry.role,
    director_code: entry.director_code
  });
}

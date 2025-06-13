// Este archivo debe ser ubicado en la carpeta `api/keys.js` en tu repositorio
export default function handler(req, res) {
    res.json({
        ADMIN_KEY: process.env.ADMIN_KEY,  // Clave de administrador (para tesorero también)
        CODIGO_ACCESO: process.env.CODIGO_ACCESO,  // Código de acceso para usuarios normales
        CLAVE_CONCEPCION: process.env.CLAVE_CONCEPCION,
        CLAVE_COSTANERA: process.env.CLAVE_COSTANERA,
        CLAVE_CURICO: process.env.CLAVE_CURICO,
        CLAVE_IQUIQUE: process.env.CLAVE_IQUIQUE,
        CLAVE_PLAZANORTE: process.env.CLAVE_PLAZANORTE,
        CLAVE_PUERTOMONTT: process.env.CLAVE_PUERTOMONTT,
        CLAVE_RANCAGUA: process.env.CLAVE_RANCAGUA,
        CLAVE_TREBOL: process.env.CLAVE_TREBOL,
        DIRECTOR_1: process.env.DIRECTOR_1,
        DIRECTOR_2: process.env.DIRECTOR_2,
        DIRECTOR_3: process.env.DIRECTOR_3,
        DIRECTOR_4: process.env.DIRECTOR_4,
        DIRECTOR_5: process.env.DIRECTOR_5,
        DIRECTOR_6: process.env.DIRECTOR_6,
        DIRECTOR_7: process.env.DIRECTOR_7
    });
}

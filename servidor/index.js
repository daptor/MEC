const express = require('express');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Configurar dotenv para cargar las variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();

// Usar JSON para las respuestas
app.use(express.json());

// Función para quitar tildes de los nombres
function quitarTildes(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Verificar la clave de acceso principal
app.post('/verificar-codigo', async (req, res) => {
    const { codigoAcceso } = req.body;
    const codigoCorrecto = process.env.CODIGO_ACCESO;

    // Comparar la clave ingresada con la clave cifrada
    const match = await bcrypt.compare(codigoAcceso, codigoCorrecto);

    if (match) {
        res.status(200).json({ mensaje: "Acceso concedido" });
    } else {
        res.status(401).json({ mensaje: "Código incorrecto" });
    }
});

// Verificar la clave del módulo de sindicatos
app.post('/verificar-sindicato', async (req, res) => {
    const { nombreSindicato, claveSindicato } = req.body;

    // Asegurarse de que el nombre del sindicato está presente
    if (!nombreSindicato) {
        return res.status(400).json({ mensaje: "Nombre del sindicato es requerido" });
    }

    // Imprimir el valor recibido de nombreSindicato
    console.log('Nombre recibido del sindicato:', nombreSindicato);

    // Buscar la clave cifrada del sindicato en el .env (sin quitar tildes)
    const claveCifrada = process.env[nombreSindicato];

    if (!claveCifrada) {
        return res.status(404).json({ mensaje: "Sindicato no encontrado" });
    }

    // Comparar la clave ingresada con la clave cifrada
    const match = await bcrypt.compare(claveSindicato, claveCifrada);

    if (match) {
        res.status(200).json({ mensaje: "Acceso al módulo de sindicatos concedido" });
    } else {
        res.status(401).json({ mensaje: "Clave de sindicato incorrecta" });
    }
});



// Iniciar el servidor en el puerto 3000
const port = 3000;
app.listen(port, () => {
    console.log(`Servidor funcionando en http://localhost:${port}`);
});

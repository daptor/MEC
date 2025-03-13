const bcrypt = require('bcryptjs');

// Función para cifrar las claves
async function cifrarClave(clave) {
    const salt = await bcrypt.genSalt(10); // Genera un salt con 10 rondas de salting
    const claveCifrada = await bcrypt.hash(clave, salt); // Cifra la clave con el salt
    console.log(claveCifrada); // Imprime la clave cifrada para que la puedas copiar
}

// Clave de acceso principal
const codigoAcceso = 'fthf1999';
cifrarClave(codigoAcceso);

// Claves de acceso de los sindicatos
const sindicatos = [
    'Concepcion=135scc',
    'Costanera=257scc',
    'Curico=351scc',
    'Iquique=456sic',
    'PlazaNorte=555spn',
    'PuertoMontt=660spm',
    'Rancagua=736srm',
    'Trebol=845stm'
];

// Cifra cada clave de sindicato y la imprime
sindicatos.forEach(async (sindicato) => {
    const [nombre, clave] = sindicato.split('=');
    console.log(`${nombre}:`);
    await cifrarClave(clave);
});

// Configuración del sistema.
//
// 1) Crea un proyecto gratis en https://console.firebase.google.com
// 2) Agrega una "App web" y copia aquí los valores de firebaseConfig.
// 3) Sigue el README: Firestore + reglas + usuario organizador en Authentication.
//
// Mientras apiKey empiece con "TU_", el sistema funciona en MODO DEMO:
// los datos se guardan solo en el navegador actual (sirve para probar).

export const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: '',
  appId: '',
};

export const ajustes = {
  evento: 'Intercambio de Regalos',
  subtitulo: 'Navidad 2026',
  red: 'Red Asencios',
  grupo: 'Grupo Conexión Guzmán',
  montoMinimo: 40,
  moneda: 'S/',
  cantidadRegalos: 3,
  // Acceso del organizador: en el panel solo se escribe el PIN.
  // - Con Firebase: el PIN es la contraseña del usuario `correoAdmin` creado en
  //   Firebase > Authentication (se valida en el servidor; el PIN no vive en este código).
  // - En MODO DEMO (solo pruebas locales): se compara con pinAdmin.
  //   No pongas aquí el PIN real: este archivo es público.
  correoAdmin: 'organizador@intercambio-regalos.app',
  pinAdmin: 'demo',
};

export const grupos = {
  mayores: 'Intercambio de mayores',
  menores: 'Intercambio de hijos',
};

// Botón "Cargar lista inicial" del panel (solo aparece si no hay participantes).
// cupo = a cuántas personas regala. responsable = quién llena la página (niños).
export const participantesIniciales = [
  { nombre: 'Freddy', grupo: 'mayores' },
  { nombre: 'Gladys', grupo: 'mayores' },
  { nombre: 'Kathy', grupo: 'mayores' },
  { nombre: 'Gian', grupo: 'mayores', cupo: 2 },
  { nombre: 'Wiliam', grupo: 'mayores' },
  { nombre: 'Gisela', grupo: 'mayores' },
  { nombre: 'Sarai', grupo: 'mayores' },
  { nombre: 'Aisquel', grupo: 'mayores' },
  { nombre: 'Gregory', grupo: 'mayores' },
  { nombre: 'Victor', grupo: 'mayores' },
  { nombre: 'Paola', grupo: 'mayores' },
  { nombre: 'Lara', grupo: 'menores', responsable: 'Victor y Sarai' },
  { nombre: 'Aslan', grupo: 'menores', responsable: 'Gian y Kathy' },
  { nombre: 'Mati', grupo: 'menores', responsable: 'Aisquel y Gregory' },
  { nombre: 'Richard', grupo: 'menores', responsable: 'Freddy y Gladys' },
];

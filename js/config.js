// Configuración del sistema.
//
// 1) Crea un proyecto gratis en https://console.firebase.google.com
// 2) Agrega una "App web" y copia aquí los valores de firebaseConfig.
// 3) Sigue el README: Firestore + reglas + usuario organizador en Authentication.
//
// Mientras apiKey empiece con "TU_", el sistema funciona en MODO DEMO:
// los datos se guardan solo en el navegador actual (sirve para probar).

export const firebaseConfig = {
  apiKey: 'AIzaSyCR3PFXz8Uzahb9QfelTIpFiPacGH04vc8',
  authDomain: 'intercambio-regalos-c4da5.firebaseapp.com',
  projectId: 'intercambio-regalos-c4da5',
  storageBucket: 'intercambio-regalos-c4da5.firebasestorage.app',
  messagingSenderId: '120297489133',
  appId: '1:120297489133:web:efaf70bb29d44c488642e4',
};

export const ajustes = {
  evento: 'Intercambio de Regalos',
  subtitulo: 'Navidad 2026',
  red: 'Red Asencios',
  grupo: 'Grupo Conexión Guzmán',
  montoMinimo: 40,
  moneda: 'S/',
  cantidadRegalos: 3,
  // Para el mensaje de invitación que se envía con cada link.
  fecha: '19 de diciembre',
  firma: 'Giancarlo',
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
// sexo: F (mujer) o M (hombre), solo para ordenar el panel.
// cupo = a cuántas personas regala. responsable = quién llena la página (niños).
export const sexos = { F: 'Mujeres', M: 'Hombres' };

export const participantesIniciales = [
  { nombre: 'Freddy', grupo: 'mayores', sexo: 'M' },
  { nombre: 'Gladys', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Kathy', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Gian', grupo: 'mayores', sexo: 'M', cupo: 2 },
  { nombre: 'Wiliam', grupo: 'mayores', sexo: 'M' },
  { nombre: 'Gisela', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Sarai', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Aisquel', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Gregory', grupo: 'mayores', sexo: 'M' },
  { nombre: 'Victor', grupo: 'mayores', sexo: 'M' },
  { nombre: 'Paola', grupo: 'mayores', sexo: 'F' },
  { nombre: 'Lara', grupo: 'menores', sexo: 'F', responsable: 'Victor y Sarai' },
  { nombre: 'Aslan', grupo: 'menores', sexo: 'M', responsable: 'Gian y Kathy' },
  { nombre: 'Mati', grupo: 'menores', sexo: 'M', responsable: 'Aisquel y Gregory' },
  { nombre: 'Richard', grupo: 'menores', sexo: 'M', responsable: 'Freddy y Gladys' },
];

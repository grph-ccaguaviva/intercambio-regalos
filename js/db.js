// Capa de datos: Firestore si está configurado, si no localStorage (modo demo).
//
// Colecciones:
//   personas/{clave}  PRIVADA. El id es el código secreto del link. Contiene a quién regala (amigos).
//                     Solo se lee con la clave exacta; listarla requiere ser organizador.
//   listas/{publicId} Pública: nombre, grupo, regalos y si ya fue elegido (tomado), sin decir por quién.
//   firmas/{publicId} Solo escritura: prueba de que quien edita una lista es su dueño.
import { firebaseConfig } from './config.js';

// ?demo en la URL: vista de demostración con datos de ejemplo (nunca toca Firebase).
export const modoDemoVista = new URLSearchParams(location.search).has('demo');
export const CLAVE_DEMO = 'demo-clave';

const usaFirebase = !modoDemoVista && Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.startsWith('TU_');
export const modoDemo = !usaFirebase;

function imagenDemo(texto, c1, c2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="600" height="450" fill="url(#g)"/>
    <circle cx="480" cy="80" r="130" fill="#fff" opacity=".13"/><circle cx="80" cy="420" r="160" fill="#fff" opacity=".1"/>
    <g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(240 100) scale(5)">
      <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></g>
    <text x="300" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#fff">${texto}</text></svg>`;
  const bytes = new TextEncoder().encode(svg);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCodePoint(b); });
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

function datosDemo() {
  const ahora = Date.now();
  return {
    personas: {
      [CLAVE_DEMO]: { nombre: 'Invitado', grupo: 'mayores', sexo: '', cupo: 1, responsable: '', publicId: 'demo-yo', amigos: ['demo-maria'], visto: true, creado: ahora, actualizado: ahora },
    },
    listas: {
      'demo-yo': { nombre: 'Invitado', grupo: 'mayores', regalos: [], tomado: false, actualizado: ahora },
      'demo-jose': { nombre: 'José', grupo: 'mayores', regalos: [], tomado: false, actualizado: ahora },
      'demo-maria': {
        nombre: 'María', grupo: 'mayores', tomado: true, actualizado: ahora,
        regalos: [
          { nombre: 'Audífonos inalámbricos', precio: 120, donde: 'https://www.falabella.com.pe', detalle: 'Color blanco o negro. Si es posible con cancelación de ruido; los uso para el gimnasio y el bus.', imagen: imagenDemo('Audífonos', '#004d74', '#00b5cf') },
          { nombre: 'Set de libros devocionales', precio: 60, donde: 'Librería Crisol (Jockey Plaza)', detalle: 'De preferencia de Max Lucado o Charles Stanley. Tapa blanda está bien.', imagen: imagenDemo('Libros', '#1d6f63', '#2a9d8c') },
          { nombre: 'Taza térmica personalizada', precio: 45, donde: '', detalle: 'Con mi nombre: María. Tamaño mediano, que mantenga el café caliente por varias horas.', imagen: imagenDemo('Taza térmica', '#e07b00', '#ffb547') },
        ],
      },
    },
  };
}

let api;

if (usaFirebase) {
  const V = '10.12.2';
  const base = `https://www.gstatic.com/firebasejs/${V}`;
  const [{ initializeApp }, fs, au] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-firestore.js`),
    import(`${base}/firebase-auth.js`),
  ]);
  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);
  const auth = au.getAuth(app);
  const conId = (d) => ({ id: d.id, ...d.data() });

  api = {
    escucharDoc: (col, id, cb, err) =>
      fs.onSnapshot(fs.doc(db, col, id), (s) => cb(s.exists() ? conId(s) : null), err),
    escucharCol: (col, cb, err) =>
      fs.onSnapshot(fs.collection(db, col), (s) => cb(s.docs.map(conId)), err),
    async lote(ops) {
      const b = fs.writeBatch(db);
      for (const op of ops) {
        const ref = fs.doc(db, op.col, op.id);
        if (op.tipo === 'set') b.set(ref, op.datos);
        else if (op.tipo === 'update') b.update(ref, op.datos);
        else if (op.tipo === 'delete') b.delete(ref);
      }
      await b.commit();
    },
    estadoAdmin: (cb) => au.onAuthStateChanged(auth, (u) => cb(Boolean(u))),
    entrarAdmin: async (pin) => {
      const { ajustes } = await import('./config.js');
      return au.signInWithEmailAndPassword(auth, ajustes.correoAdmin, pin);
    },
    salirAdmin: () => au.signOut(auth),
  };
} else {
  const { ajustes } = await import('./config.js');
  const KEY = modoDemoVista ? 'intercambio-demo-vista' : 'intercambio-demo-v2';
  if (modoDemoVista) {
    try { localStorage.setItem(KEY, JSON.stringify(datosDemo())); } catch { /* sin storage */ }
  }
  const KEY_ADMIN = 'intercambio-demo-admin';
  const subs = new Set();
  const leer = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const avisar = () => { const d = leer(); subs.forEach((fn) => fn(d)); };
  window.addEventListener('storage', (e) => { if (e.key === KEY) avisar(); });
  const suscribir = (fn) => { subs.add(fn); fn(leer()); return () => subs.delete(fn); };
  let avisarAdmin = () => {};

  api = {
    escucharDoc: (col, id, cb) =>
      suscribir((d) => { const v = d[col]?.[id]; cb(v ? { id, ...v } : null); }),
    escucharCol: (col, cb) =>
      suscribir((d) => cb(Object.entries(d[col] || {}).map(([id, v]) => ({ id, ...v })))),
    async lote(ops) {
      const d = leer();
      for (const op of ops) {
        d[op.col] ??= {};
        if (op.tipo === 'set') d[op.col][op.id] = { ...op.datos };
        else if (op.tipo === 'update') {
          if (!d[op.col][op.id]) throw new Error(`No existe ${op.col}/${op.id}`);
          Object.assign(d[op.col][op.id], op.datos);
        } else if (op.tipo === 'delete') delete d[op.col][op.id];
      }
      localStorage.setItem(KEY, JSON.stringify(d));
      avisar();
    },
    estadoAdmin(cb) {
      avisarAdmin = () => cb(sessionStorage.getItem(KEY_ADMIN) === '1');
      avisarAdmin();
    },
    async entrarAdmin(pin) {
      if (pin !== String(ajustes.pinAdmin)) throw new Error('PIN incorrecto');
      sessionStorage.setItem(KEY_ADMIN, '1');
      avisarAdmin();
    },
    async salirAdmin() { sessionStorage.removeItem(KEY_ADMIN); avisarAdmin(); },
  };
}

export default api;

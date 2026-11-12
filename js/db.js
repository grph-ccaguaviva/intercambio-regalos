// Capa de datos: Firestore si está configurado, si no localStorage (modo demo).
//
// Colecciones:
//   personas/{clave}  PRIVADA. El id es el código secreto del link. Contiene a quién regala (amigos).
//                     Solo se lee con la clave exacta; listarla requiere ser organizador.
//   listas/{publicId} Pública: nombre, grupo, regalos y si ya fue elegido (tomado), sin decir por quién.
//   firmas/{publicId} Solo escritura: prueba de que quien edita una lista es su dueño.
import { firebaseConfig } from './config.js';

const usaFirebase = Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.startsWith('TU_');
export const modoDemo = !usaFirebase;

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
  const KEY = 'intercambio-demo-v2';
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

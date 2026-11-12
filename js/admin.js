import api, { modoDemo } from './db.js';
import { ajustes, grupos, participantesIniciales } from './config.js';
import {
  esc, linkPersonal, copiar, toast, waUrl, dinero, confirmar, cargando, listaCompleta,
  htmlRegalos, normalizar, codigo, aplicarMarca, ordenarPorNombre,
} from './util.js';

const N = ajustes.cantidadRegalos;
const raiz = document.getElementById('admin');
const abiertos = new Set();
let personas = [];
let listas = [];
let filtro = '';
let iniciado = false;

aplicarMarca();
document.getElementById('aviso-demo').hidden = !modoDemo;

api.estadoAdmin((ok) => (ok ? iniciar() : pedirPin()));

/* ---------- Acceso ---------- */

function pedirPin() {
  iniciado = false;
  raiz.innerHTML = `<section class="card">
    <h2 class="card-titulo">Acceso del organizador</h2>
    <form id="form-pin" class="pila">
      <label class="campo"><span>PIN</span>
        <input type="password" inputmode="numeric" id="pin" autocomplete="current-password" required>
      </label>
      <button class="btn btn-primario" type="submit">Entrar</button>
    </form></section>`;
  document.getElementById('form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    cargando(btn, true);
    try {
      await api.entrarAdmin(document.getElementById('pin').value);
    } catch (err) {
      console.error(err);
      toast('PIN incorrecto', 'error');
    } finally {
      cargando(btn, false);
    }
  });
}

function iniciar() {
  if (iniciado) return;
  iniciado = true;
  raiz.innerHTML = `
    <div id="inicial"></div>
    <div class="fila-buscar card">
      <input type="search" id="filtro" placeholder="Buscar participante…" aria-label="Buscar participante">
    </div>
    <div id="grupos" class="pila-grupos"></div>
    <section class="card">
      <h2 class="card-titulo">Agregar participantes</h2>
      <form id="form-agregar" class="pila">
        <label class="campo"><span>Intercambio</span>
          <select id="nuevo-grupo">
            ${Object.entries(grupos).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}
          </select>
        </label>
        <label class="campo"><span>Un nombre por línea <small>(para niños: Nombre | Papás)</small></span>
          <textarea id="nuevos" rows="4" placeholder="Ana&#10;Luis&#10;Lara | Victor y Sarai"></textarea>
        </label>
        <button class="btn btn-primario" type="submit">Agregar</button>
      </form>
    </section>
    <p class="centro"><button class="btn-link" type="button" data-accion="cerrar">Cerrar sesión de organizador</button></p>`;

  const onErr = (err) => { console.error(err); toast('No se pudieron cargar los datos.', 'error'); };
  api.escucharCol('personas', (l) => { personas = ordenarPorNombre(l); pintar(); }, onErr);
  api.escucharCol('listas', (l) => { listas = l; pintar(); }, onErr);
}

/* ---------- Render ---------- */

function listaDe(p) { return listas.find((l) => l.id === p.publicId) || { regalos: [] }; }
function cupoDe(p) { return p.cupo ?? 1; }

function pintar() {
  if (!iniciado) return;
  const inicial = document.getElementById('inicial');
  inicial.innerHTML = personas.length ? '' : `<section class="card">
    <h2 class="card-titulo">Empezar</h2>
    <p class="nota">Carga los ${participantesIniciales.length} participantes configurados (mayores e hijos) con un clic. Gian ya va con 2 amigos secretos.</p>
    <div class="pila"><button class="btn btn-primario" type="button" data-accion="cargar-inicial">Cargar lista inicial</button></div>
  </section>`;

  // A quién le regala cada uno, visto desde quien recibe.
  const dador = new Map();
  personas.forEach((p) => (p.amigos || []).forEach((id) => dador.set(id, p)));

  const f = normalizar(filtro);
  document.getElementById('grupos').innerHTML = Object.entries(grupos).map(([g, titulo]) => {
    const delGrupo = personas.filter((p) => p.grupo === g);
    if (!delGrupo.length) return '';
    const faltanDar = delGrupo.filter((p) => (p.amigos || []).length < cupoDe(p));
    const faltanRecibir = delGrupo.filter((p) => !dador.has(p.publicId));
    const asignados = delGrupo.reduce((s, p) => s + (p.amigos || []).length, 0);
    const cupos = delGrupo.reduce((s, p) => s + cupoDe(p), 0);
    const visibles = delGrupo.filter((p) => !f || normalizar(p.nombre).includes(f));
    const nombres = (l) => l.map((p) => esc(p.nombre)).join(', ');

    return `<section class="card">
      <h2 class="card-titulo">${esc(titulo)}</h2>
      <div class="stats">
        <div class="stat"><b>${delGrupo.length}</b><span>Participantes</span></div>
        <div class="stat"><b>${delGrupo.filter((p) => p.visto).length}</b><span>Abrieron su link</span></div>
        <div class="stat"><b>${asignados}/${cupos}</b><span>Regalos asignados</span></div>
        <div class="stat"><b>${delGrupo.filter((p) => listaCompleta(listaDe(p))).length}</b><span>Listas completas</span></div>
      </div>
      ${cupos !== delGrupo.length ? `<p class="aviso aviso-card mt">Hay ${cupos} regalos para ${delGrupo.length} personas: revisa los cupos ("Regala a").</p>` : ''}
      ${faltanDar.length ? `<p class="nota mt"><b>Faltan indicar a quién regalan:</b> ${nombres(faltanDar)}</p>` : ''}
      ${faltanRecibir.length ? `<p class="nota"><b>Nadie los eligió aún:</b> ${nombres(faltanRecibir)}</p>` : ''}
      <div class="personas">
        ${visibles.length ? visibles.map((p) => htmlPersona(p, delGrupo, dador)).join('') : '<p class="vacio">Sin resultados.</p>'}
      </div>
    </section>`;
  }).join('');
}

function mensajeWa(p) {
  const link = linkPersonal(p.id);
  const min = dinero(ajustes.montoMinimo);
  if (p.grupo === 'menores') {
    return `Hola ${p.responsable || ''}! Este es el link de ${p.nombre} para el ${grupos.menores}: ${link}\n\n` +
      `Ahí registran a quién le tocó a ${p.nombre} y su lista de ${N} regalos (mínimo ${min}). Es personal, no lo compartan.`;
  }
  return `Hola ${p.nombre}! Este es tu link para el ${ajustes.evento}: ${link}\n\n` +
    `Ahí registras a quién te tocó y escribes tus ${N} opciones de regalo (mínimo ${min}). Es personal, no lo compartas.`;
}

function htmlPersona(p, delGrupo, dador) {
  const lista = listaDe(p);
  const amigos = p.amigos || [];
  const total = cupoDe(p);
  const otros = ordenarPorNombre(delGrupo.filter((o) => o.id !== p.id));

  let selects = '';
  for (let i = 0; i < total; i++) {
    const actual = amigos[i] || '';
    const opciones = otros.map((o) => {
      const d = dador.get(o.publicId);
      const tomado = d && !(d.id === p.id && o.publicId === actual);
      return `<option value="${esc(o.publicId)}" ${o.publicId === actual ? 'selected' : ''} ${tomado ? 'disabled' : ''}>${esc(o.nombre)}${tomado ? ' (ya tiene)' : ''}</option>`;
    }).join('');
    selects += `<label class="campo"><span>${total > 1 ? `Le regala a (${i + 1})` : 'Le regala a'}</span>
      <select data-slot="${i}" data-id="${esc(p.id)}"><option value="">— Sin asignar —</option>${opciones}</select>
    </label>`;
  }

  return `<article class="persona">
    <div>
      <h3>${esc(p.nombre)}</h3>
      ${p.responsable ? `<p class="nota">Papás: ${esc(p.responsable)}</p>` : ''}
      <div class="chips">
        <span class="chip ${p.visto ? 'ok' : ''}">${p.visto ? 'Abrió su link' : 'No abre su link'}</span>
        <span class="chip ${listaCompleta(lista) ? 'ok' : ''}">Lista ${Math.min(lista.regalos?.length || 0, N)}/${N}</span>
      </div>
    </div>
    <label class="campo campo-linea"><span>Regalos que da</span>
      <select data-cupo="${esc(p.id)}">
        ${[0, 1, 2, 3].map((n) => `<option value="${n}" ${n === total ? 'selected' : ''}>${n}</option>`).join('')}
      </select>
    </label>
    ${selects}
    <details data-id="${esc(p.id)}" ${abiertos.has(p.id) ? 'open' : ''}>
      <summary>Ver su lista de deseos</summary>
      ${lista.regalos?.length ? htmlRegalos(lista.regalos) : '<p class="vacio">Aún no la llena.</p>'}
    </details>
    <div class="persona-acciones">
      <button class="btn btn-chico" type="button" data-accion="copiar" data-id="${esc(p.id)}">Copiar link</button>
      <a class="btn btn-chico btn-wa" href="${esc(waUrl(mensajeWa(p)))}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn btn-chico" href="${esc(`${linkPersonal(p.id)}&admin=1`)}" target="_blank" rel="noopener">Abrir / llenar</a>
      <button class="btn btn-chico" type="button" data-accion="nuevo-link" data-id="${esc(p.id)}">Nuevo link</button>
      <button class="btn btn-chico btn-peligro" type="button" data-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>
    </div>
  </article>`;
}

/* ---------- Operaciones ---------- */

function opsCrear({ nombre, grupo, cupo = 1, responsable = '' }) {
  const clave = codigo(24);
  const publicId = codigo(12);
  const ahora = Date.now();
  return [
    { tipo: 'set', col: 'personas', id: clave, datos: { nombre, grupo, cupo, responsable, publicId, amigos: [], visto: false, creado: ahora, actualizado: ahora } },
    { tipo: 'set', col: 'listas', id: publicId, datos: { nombre, grupo, regalos: [], tomado: false, actualizado: ahora } },
  ];
}

// Cambia los amigos de una persona y mantiene "tomado" de las listas en sincronía.
function opsAmigos(p, nuevos) {
  const antes = p.amigos || [];
  const ahora = Date.now();
  const ops = [{ tipo: 'update', col: 'personas', id: p.id, datos: { amigos: nuevos, actualizado: ahora } }];
  antes.filter((id) => !nuevos.includes(id)).forEach((id) => {
    if (listas.some((l) => l.id === id)) ops.push({ tipo: 'update', col: 'listas', id, datos: { tomado: false, actualizado: ahora } });
  });
  nuevos.filter((id) => !antes.includes(id)).forEach((id) => {
    ops.push({ tipo: 'update', col: 'listas', id, datos: { tomado: true, actualizado: ahora } });
  });
  return ops;
}

async function ejecutar(ops, ok) {
  try {
    await api.lote(ops);
    if (ok) toast(ok);
  } catch (err) {
    console.error(err);
    toast('No se pudo guardar.', 'error');
    pintar();
  }
}

/* ---------- Eventos ---------- */

raiz.addEventListener('input', (e) => {
  if (e.target.id === 'filtro') { filtro = e.target.value; pintar(); }
});

raiz.addEventListener('toggle', (e) => {
  const id = e.target.dataset?.id;
  if (!id || e.target.tagName !== 'DETAILS') return;
  if (e.target.open) abiertos.add(id);
  else abiertos.delete(id);
}, true);

raiz.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset.cupo) {
    const p = personas.find((x) => x.id === el.dataset.cupo);
    const cupo = Number(el.value);
    const amigos = (p.amigos || []).slice(0, cupo);
    const ops = opsAmigos(p, amigos);
    ops[0].datos.cupo = cupo;
    return ejecutar(ops, 'Cupo actualizado');
  }
  if (el.dataset.slot) {
    const p = personas.find((x) => x.id === el.dataset.id);
    const i = Number(el.dataset.slot);
    const amigos = [...(p.amigos || [])];
    if (el.value && amigos.includes(el.value) && amigos[i] !== el.value) {
      toast('Ya está asignado a esta persona.', 'error');
      return pintar();
    }
    if (el.value) amigos[i] = el.value;
    else amigos.splice(i, 1);
    return ejecutar(opsAmigos(p, amigos.filter(Boolean)), el.value ? 'Asignación guardada' : 'Asignación quitada');
  }
});

raiz.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-agregar') return;
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  const area = document.getElementById('nuevos');
  const grupo = document.getElementById('nuevo-grupo').value;
  const existentes = new Set(personas.filter((p) => p.grupo === grupo).map((p) => normalizar(p.nombre)));
  const ops = [];
  let repetidos = 0;
  for (const linea of area.value.split('\n')) {
    const [nombreCrudo, resp = ''] = linea.split('|');
    const nombre = nombreCrudo.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!nombre) continue;
    if (existentes.has(normalizar(nombre))) { repetidos++; continue; }
    existentes.add(normalizar(nombre));
    ops.push(...opsCrear({ nombre, grupo, responsable: resp.trim().slice(0, 80) }));
  }
  if (!ops.length) return toast(repetidos ? 'Esos nombres ya existen.' : 'Escribe al menos un nombre.', 'error');
  cargando(btn, true);
  await ejecutar(ops, `${ops.length / 2} agregado(s)${repetidos ? `, ${repetidos} repetido(s) omitido(s)` : ''}`);
  area.value = '';
  cargando(btn, false);
});

raiz.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const p = personas.find((x) => x.id === b.dataset.id);
  switch (b.dataset.accion) {
    case 'cargar-inicial': {
      cargando(b, true);
      await ejecutar(participantesIniciales.flatMap(opsCrear), 'Lista inicial cargada');
      break;
    }
    case 'copiar':
      copiar(linkPersonal(p.id), `Link de ${p.nombre} copiado`);
      break;
    case 'nuevo-link':
      if (await confirmar({
        titulo: `¿Nuevo link para <b>${esc(p.nombre)}</b>?`,
        texto: 'El link anterior dejará de funcionar. Úsalo si el link se compartió por error. Sus datos se mantienen.',
        aceptar: 'Generar',
      })) {
        const { id, ...datos } = p;
        const nueva = codigo(24);
        await ejecutar([
          { tipo: 'set', col: 'personas', id: nueva, datos: { ...datos, visto: false, actualizado: Date.now() } },
          { tipo: 'delete', col: 'personas', id },
        ], 'Link nuevo generado. Envíaselo por WhatsApp.');
      }
      break;
    case 'eliminar':
      if (await confirmar({
        titulo: `¿Eliminar a <b>${esc(p.nombre)}</b>?`,
        texto: 'Se borrarán su lista y sus asignaciones. No se puede deshacer.',
        aceptar: 'Eliminar',
      })) {
        const ops = opsAmigos(p, []).slice(1);
        personas.filter((o) => o.id !== p.id && (o.amigos || []).includes(p.publicId)).forEach((o) => {
          ops.push({ tipo: 'update', col: 'personas', id: o.id, datos: { amigos: o.amigos.filter((x) => x !== p.publicId), actualizado: Date.now() } });
        });
        ops.push(
          { tipo: 'delete', col: 'personas', id: p.id },
          { tipo: 'delete', col: 'listas', id: p.publicId },
          { tipo: 'delete', col: 'firmas', id: p.publicId },
        );
        // Las listas que borramos no necesitan actualizar "tomado".
        await ejecutar(ops.filter((op) => !(op.col === 'listas' && op.tipo === 'update' && op.id === p.publicId)), 'Participante eliminado');
      }
      break;
    case 'cerrar':
      await api.salirAdmin();
      location.reload();
      break;
  }
});

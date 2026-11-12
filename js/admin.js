import api, { modoDemo } from './db.js';
import { ajustes, grupos, sexos, participantesIniciales } from './config.js';
import {
  esc, linkPersonal, copiar, toast, waUrl, dinero, confirmar, cargando, listaCompleta,
  htmlRegalos, normalizar, codigo, aplicarMarca, ordenarPorNombre,
} from './util.js';

const N = ajustes.cantidadRegalos;
const KEY_TAB = 'intercambio-admin-tab';
const raiz = document.getElementById('admin');

let personas = [];
let listas = [];
let filtro = '';
let iniciado = false;
let detalleId = null;
let grupoActivo = leerTab();

const ICO = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.7-.4Z"/></svg>',
  copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  cerrar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  mas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  abrir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
};

aplicarMarca();
document.getElementById('aviso-demo').hidden = !modoDemo;

api.estadoAdmin((ok) => (ok ? iniciar() : pedirPin()));

function leerTab() {
  try { return sessionStorage.getItem(KEY_TAB) || 'mayores'; } catch { return 'mayores'; }
}

/* ---------- Acceso ---------- */

function pedirPin() {
  iniciado = false;
  raiz.innerHTML = `<section class="card acceso">
    <h2 class="card-titulo">Acceso del organizador</h2>
    <p class="nota">Ingresa tu PIN para administrar el intercambio.</p>
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
    <div class="barra-admin">
      <div class="segmento tabs" role="tablist" id="tabs"></div>
      <div class="barra-acciones">
        <input type="search" id="filtro" placeholder="Buscar…" aria-label="Buscar participante">
        <button class="btn btn-primario btn-agregar" type="button" data-accion="agregar">${ICO.mas}<span>Agregar</span></button>
      </div>
    </div>
    <section class="card resumen" id="resumen"></section>
    <section class="card tabla">
      <div class="tabla-cab" aria-hidden="true">
        <span>Participante</span><span>Le regala a</span><span>Estado</span><span></span>
      </div>
      <ul class="filas" id="filas"></ul>
    </section>
    <p class="centro"><button class="btn-link" type="button" data-accion="cerrar">Cerrar sesión de organizador</button></p>
    <dialog class="hoja" id="hoja" aria-labelledby="hoja-titulo"></dialog>
    <dialog class="dialogo dialogo-form" id="dlg-agregar" aria-labelledby="agregar-titulo"></dialog>`;

  const onErr = (err) => { console.error(err); toast('No se pudieron cargar los datos.', 'error'); };
  api.escucharCol('personas', (l) => { personas = ordenarPorNombre(l); pintar(); }, onErr);
  api.escucharCol('listas', (l) => { listas = l; pintar(); }, onErr);
}

/* ---------- Datos derivados ---------- */

function listaDe(p) { return listas.find((l) => l.id === p.publicId) || { regalos: [] }; }
function cupoDe(p) { return p.cupo ?? 1; }
function delGrupo(g) { return personas.filter((p) => p.grupo === g); }
function mapaDadores() {
  const m = new Map();
  personas.forEach((p) => (p.amigos || []).forEach((id) => m.set(id, p)));
  return m;
}
function nombrePorPublicId(id) {
  return personas.find((p) => p.publicId === id)?.nombre || '—';
}
function iniciales(nombre) {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

/* ---------- Render ---------- */

function pintar() {
  if (!iniciado) return;
  pintarInicial();
  pintarTabs();
  pintarResumen();
  pintarFilas();
  const hoja = document.getElementById('hoja');
  if (hoja.open) pintarHoja();
}

// Participantes ya creados sin sexo que coinciden con la lista inicial.
function sinSexoConocido() {
  return personas.filter((p) => !p.sexo).map((p) => {
    const ini = participantesIniciales.find((i) => i.grupo === p.grupo && normalizar(i.nombre) === normalizar(p.nombre));
    return ini?.sexo ? { p, sexo: ini.sexo } : null;
  }).filter(Boolean);
}

function pintarInicial() {
  const pendientes = sinSexoConocido();
  if (personas.length && pendientes.length) {
    document.getElementById('inicial').innerHTML = `<section class="card">
      <h2 class="card-titulo">Separar por mujeres y hombres</h2>
      <p class="nota">${pendientes.length} participantes aún no tienen sexo asignado. Puedo completarlo con la lista inicial (${pendientes.map(({ p, sexo }) => `${esc(p.nombre)}: ${sexo === 'F' ? 'mujer' : 'hombre'}`).join(', ')}). Luego puedes corregir cualquiera con <b>Editar datos</b>.</p>
      <div class="pila"><button class="btn btn-primario" type="button" data-accion="completar-sexo">Completar automáticamente</button></div>
    </section>`;
    return;
  }
  document.getElementById('inicial').innerHTML = personas.length ? '' : `<section class="card">
    <h2 class="card-titulo">Empezar</h2>
    <p class="nota">Carga los ${participantesIniciales.length} participantes configurados (mayores e hijos) con un clic. Luego puedes editarlos o agregar más.</p>
    <div class="pila"><button class="btn btn-primario" type="button" data-accion="cargar-inicial">Cargar lista inicial</button></div>
  </section>`;
}

function pintarTabs() {
  document.getElementById('tabs').innerHTML = Object.entries(grupos).map(([g, t]) => {
    const activo = g === grupoActivo;
    const corto = g === 'menores' ? 'Hijos' : 'Mayores';
    return `<button type="button" role="tab" aria-selected="${activo}" class="tab ${activo ? 'activo' : ''}" data-accion="tab" data-grupo="${g}" title="${esc(t)}">
      ${corto} <span class="contador">${delGrupo(g).length}</span></button>`;
  }).join('');
}

function barra(etiqueta, valor, total) {
  const pct = total ? Math.round((valor / total) * 100) : 0;
  return `<div class="progreso-item">
    <div class="progreso-txt"><span>${etiqueta}</span><b>${valor}/${total}</b></div>
    <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(etiqueta)}"><span style="width:${pct}%"></span></div>
  </div>`;
}

function chipsPersonas(lista) {
  return lista.map((p) => `<button type="button" class="chip chip-btn" data-accion="detalle" data-id="${esc(p.id)}">${esc(p.nombre)}</button>`).join('');
}

function pintarResumen() {
  const sec = document.getElementById('resumen');
  const gente = delGrupo(grupoActivo);
  if (!gente.length) {
    sec.innerHTML = `<h2 class="card-titulo">${esc(grupos[grupoActivo])}</h2>
      <p class="vacio">Aún no hay participantes. Usa <b>Agregar</b> para sumar el primero.</p>`;
    return;
  }
  const dador = mapaDadores();
  const asignados = gente.reduce((s, p) => s + (p.amigos || []).length, 0);
  const cupos = gente.reduce((s, p) => s + cupoDe(p), 0);
  const faltanDar = gente.filter((p) => (p.amigos || []).length < cupoDe(p));
  const faltanRecibir = gente.filter((p) => !dador.has(p.publicId));

  sec.innerHTML = `
    <div class="resumen-cab">
      <h2 class="card-titulo">${esc(grupos[grupoActivo])}</h2>
      <span class="nota">${gente.length} participantes</span>
    </div>
    <div class="progresos">
      ${barra('Abrieron su link', gente.filter((p) => p.visto).length, gente.length)}
      ${barra('Regalos asignados', asignados, cupos)}
      ${barra('Listas completas', gente.filter((p) => listaCompleta(listaDe(p))).length, gente.length)}
    </div>
    ${cupos === gente.length ? '' : `<p class="alerta">Hay <b>${cupos} regalos</b> para <b>${gente.length} personas</b>. Ajusta "Regalos que da" para que coincidan (por ejemplo, 0 a quien no regala).</p>`}
    ${faltanDar.length ? `<div class="pendientes"><span class="pendientes-tit">Falta indicar a quién regalan</span><div class="chips">${chipsPersonas(faltanDar)}</div></div>` : ''}
    ${faltanRecibir.length ? `<div class="pendientes"><span class="pendientes-tit">Nadie los eligió aún</span><div class="chips">${chipsPersonas(faltanRecibir)}</div></div>` : ''}
    ${!faltanDar.length && !faltanRecibir.length ? '<p class="exito">Todas las asignaciones están completas.</p>' : ''}`;
}

function pintarFilas() {
  const f = normalizar(filtro);
  const gente = delGrupo(grupoActivo).filter((p) => !f || normalizar(p.nombre).includes(f));
  const ul = document.getElementById('filas');
  document.querySelector('.tabla').hidden = !delGrupo(grupoActivo).length;
  if (!gente.length) {
    ul.innerHTML = '<li class="vacio">Sin resultados.</li>';
    return;
  }
  const secciones = [
    ...Object.entries(sexos).map(([k, titulo]) => ({ titulo, gente: gente.filter((p) => p.sexo === k) })),
    { titulo: 'Sin definir', gente: gente.filter((p) => !sexos[p.sexo]) },
  ].filter((s) => s.gente.length);
  ul.innerHTML = secciones.map((s) =>
    `<li class="fila-grupo"><span>${esc(s.titulo)}</span><span class="contador">${s.gente.length}</span></li>${s.gente.map(htmlFila).join('')}`).join('');
}

function htmlFila(p) {
    const lista = listaDe(p);
    const amigos = (p.amigos || []).map(nombrePorPublicId);
    const total = cupoDe(p);
    let regala;
    if (total === 0) regala = '<span class="tenue">No regala</span>';
    else if (!amigos.length) regala = '<span class="pendiente">Sin asignar</span>';
    else regala = `${esc(amigos.join(', '))}${amigos.length < total ? ` <span class="pendiente">+${total - amigos.length}</span>` : ''}`;
    const nLista = Math.min(lista.regalos?.length || 0, N);

    return `<li class="fila">
      <button type="button" class="fila-principal" data-accion="detalle" data-id="${esc(p.id)}" aria-label="Ver detalle de ${esc(p.nombre)}">
        <span class="col-persona">
          <span class="avatar" aria-hidden="true">${esc(iniciales(p.nombre))}</span>
          <span class="fila-texto">
            <span class="fila-nombre">${esc(p.nombre)}${total > 1 ? ` <span class="insignia">da ${total}</span>` : ''}</span>
            ${p.responsable ? `<span class="fila-sub">Papás: ${esc(p.responsable)}</span>` : ''}
          </span>
        </span>
        <span class="col-regala"><span class="etq-movil">Regala a: </span>${regala}</span>
        <span class="col-estado">
          <span class="estado ${p.visto ? 'ok' : ''}" title="${p.visto ? 'Ya abrió su link' : 'Aún no abre su link'}">${p.visto ? 'Link abierto' : 'Sin abrir'}</span>
          <span class="estado ${nLista >= N ? 'ok' : ''}">Lista ${nLista}/${N}</span>
        </span>
        <span class="col-flecha">${ICO.flecha}</span>
      </button>
      <div class="fila-acciones">
        <a class="btn-icono btn-icono-wa" href="${esc(waUrl(mensajeWa(p)))}" target="_blank" rel="noopener" title="Enviar link por WhatsApp" aria-label="Enviar link de ${esc(p.nombre)} por WhatsApp">${ICO.wa}</a>
        <button type="button" class="btn-icono" data-accion="copiar" data-id="${esc(p.id)}" title="Copiar link" aria-label="Copiar link de ${esc(p.nombre)}">${ICO.copiar}</button>
      </div>
    </li>`;
}

function nombreSexo(s) {
  if (s === 'F') return 'Mujer';
  if (s === 'M') return 'Hombre';
  return '';
}

function segmentoSexo(actual = '') {
  return `<div class="campo">
    <span id="lbl-sexo">Sexo</span>
    <div class="segmento" role="radiogroup" aria-labelledby="lbl-sexo">
      <label><input type="radio" name="sexo" value="F" ${actual === 'F' ? 'checked' : ''}><span>Mujer</span></label>
      <label><input type="radio" name="sexo" value="M" ${actual === 'M' ? 'checked' : ''}><span>Hombre</span></label>
    </div>
  </div>`;
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

/* ---------- Hoja de detalle ---------- */

function abrirDetalle(id) {
  detalleId = id;
  const hoja = document.getElementById('hoja');
  pintarHoja(true);
  if (!hoja.open) hoja.showModal();
}

function pintarHoja(forzar = false) {
  const hoja = document.getElementById('hoja');
  const p = personas.find((x) => x.id === detalleId);
  if (!p) { if (hoja.open) hoja.close(); return; }
  const activo = document.activeElement;
  if (!forzar && activo?.tagName === 'SELECT' && hoja.contains(activo)) return;

  const lista = listaDe(p);
  const total = cupoDe(p);
  const amigos = p.amigos || [];
  const dador = mapaDadores();
  const otros = ordenarPorNombre(delGrupo(p.grupo).filter((o) => o.id !== p.id));
  const quienLeRegala = dador.get(p.publicId);

  let selects = '';
  for (let i = 0; i < total; i++) {
    const actual = amigos[i] || '';
    const opciones = otros.map((o) => {
      const d = dador.get(o.publicId);
      const tomado = d && !(d.id === p.id && o.publicId === actual);
      return `<option value="${esc(o.publicId)}" ${o.publicId === actual ? 'selected' : ''} ${tomado ? 'disabled' : ''}>${esc(o.nombre)}${tomado ? ` (ya lo eligió ${esc(d.nombre)})` : ''}</option>`;
    }).join('');
    selects += `<label class="campo"><span>${total > 1 ? `Le regala a (${i + 1} de ${total})` : 'Le regala a'}</span>
      <select data-slot="${i}" data-id="${esc(p.id)}"><option value="">— Sin asignar —</option>${opciones}</select>
    </label>`;
  }

  hoja.innerHTML = `
    <div class="hoja-cab">
      <span class="avatar avatar-grande" aria-hidden="true">${esc(iniciales(p.nombre))}</span>
      <div class="hoja-titulos">
        <h2 id="hoja-titulo">${esc(p.nombre)}</h2>
        <p>${[grupos[p.grupo], nombreSexo(p.sexo), p.responsable ? `Papás: ${p.responsable}` : ''].filter(Boolean).map(esc).join(' · ')}</p>
      </div>
      <button type="button" class="btn-icono" data-accion="cerrar-hoja" aria-label="Cerrar">${ICO.cerrar}</button>
    </div>
    <div class="hoja-cuerpo">
      <section class="bloque">
        <h3>Link personal</h3>
        <p class="nota">${p.visto ? 'Ya abrió su link.' : 'Todavía no abre su link.'} Envíaselo solo a ${p.grupo === 'menores' ? 'sus papás' : 'esta persona'}.</p>
        <div class="acciones-2">
          <a class="btn btn-wa" href="${esc(waUrl(mensajeWa(p)))}" target="_blank" rel="noopener">${ICO.wa}<span>Enviar por WhatsApp</span></a>
          <button class="btn btn-secundario" type="button" data-accion="copiar" data-id="${esc(p.id)}">${ICO.copiar}<span>Copiar link</span></button>
        </div>
        <a class="enlace-sec" href="${esc(`${linkPersonal(p.id)}&admin=1`)}" target="_blank" rel="noopener">${ICO.abrir}Abrir su página para llenarla por esta persona</a>
      </section>

      <section class="bloque">
        <h3>Amigo secreto</h3>
        <label class="campo campo-linea"><span>Regalos que da</span>
          <select data-cupo="${esc(p.id)}">${[0, 1, 2, 3].map((n) => `<option value="${n}" ${n === total ? 'selected' : ''}>${n}</option>`).join('')}</select>
        </label>
        ${selects || '<p class="nota">No regala en este intercambio.</p>'}
        <p class="nota">${quienLeRegala ? 'Ya alguien lo eligió como amigo secreto.' : 'Nadie lo ha elegido todavía.'}</p>
      </section>

      <section class="bloque">
        <h3>Lista de deseos <span class="estado ${listaCompleta(lista) ? 'ok' : ''}">${Math.min(lista.regalos?.length || 0, N)}/${N}</span></h3>
        ${lista.regalos?.length ? htmlRegalos(lista.regalos) : '<p class="vacio">Aún no escribe su lista.</p>'}
      </section>

      <section class="bloque">
        <h3>Opciones</h3>
        <div class="acciones-3">
          <button class="btn btn-secundario" type="button" data-accion="editar" data-id="${esc(p.id)}">Editar datos</button>
          <button class="btn btn-secundario" type="button" data-accion="nuevo-link" data-id="${esc(p.id)}">Nuevo link</button>
          <button class="btn btn-secundario btn-peligro" type="button" data-accion="eliminar" data-id="${esc(p.id)}">Eliminar</button>
        </div>
      </section>
    </div>`;
}

/* ---------- Diálogo agregar ---------- */

function abrirAgregar() {
  const d = document.getElementById('dlg-agregar');
  d.innerHTML = `<form id="form-agregar" class="pila sin-margen" autocomplete="off">
    <div class="dialogo-cab">
      <h3 id="agregar-titulo">Agregar participante</h3>
      <button type="button" class="btn-icono" data-accion="cerrar-agregar" aria-label="Cerrar">${ICO.cerrar}</button>
    </div>
    <div class="campo">
      <span id="lbl-grupo">Intercambio</span>
      <div class="segmento" role="radiogroup" aria-labelledby="lbl-grupo">
        ${Object.keys(grupos).map((g) => `<label><input type="radio" name="grupo" value="${g}" ${g === grupoActivo ? 'checked' : ''}><span>${g === 'menores' ? 'Hijos' : 'Mayores'}</span></label>`).join('')}
      </div>
    </div>
    ${segmentoSexo()}
    <label class="campo"><span>Nombre</span>
      <input id="nuevo-nombre" maxlength="60" placeholder="${grupoActivo === 'menores' ? 'Ej.: Lara' : 'Ej.: Paola'}" enterkeyhint="done">
    </label>
    <label class="campo" id="campo-resp" ${grupoActivo === 'menores' ? '' : 'hidden'}><span>Papás o responsables</span>
      <input id="nuevo-resp" maxlength="80" placeholder="Ej.: Victor y Sarai" enterkeyhint="done">
    </label>
    <label class="campo campo-linea"><span>Regalos que da</span>
      <select id="nuevo-cupo">${[0, 1, 2, 3].map((n) => `<option value="${n}" ${n === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select>
    </label>
    <div class="acciones">
      <button class="btn btn-secundario" type="button" data-accion="cerrar-agregar">Listo</button>
      <button class="btn btn-primario" type="submit">Agregar</button>
    </div>
    <p class="nota">Puedes agregar varios seguidos: el formulario se limpia después de cada uno.</p>
  </form>`;
  d.showModal();
  document.getElementById('nuevo-nombre').focus();
}

/* ---------- Operaciones ---------- */

function opsCrear({ nombre, grupo, sexo = '', cupo = 1, responsable = '' }) {
  const clave = codigo(24);
  const publicId = codigo(12);
  const ahora = Date.now();
  return [
    { tipo: 'set', col: 'personas', id: clave, datos: { nombre, grupo, sexo, cupo, responsable, publicId, amigos: [], visto: false, creado: ahora, actualizado: ahora } },
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
    return true;
  } catch (err) {
    console.error(err);
    toast('No se pudo guardar.', 'error');
    pintar();
    return false;
  }
}

function limpiar(texto, max) {
  return texto.trim().replace(/\s+/g, ' ').slice(0, max);
}

async function agregar(f) {
  const btn = f.querySelector('[type="submit"]');
  const inNombre = document.getElementById('nuevo-nombre');
  const inResp = document.getElementById('nuevo-resp');
  const grupo = f.grupo.value;
  const nombre = limpiar(inNombre.value, 60);
  const responsable = grupo === 'menores' ? limpiar(inResp.value, 80) : '';
  const cupo = Number(document.getElementById('nuevo-cupo').value);
  const sexo = f.sexo.value;

  if (!sexo) return toast('Elige si es mujer u hombre.', 'error');
  if (!nombre) { inNombre.focus(); return toast('Escribe el nombre.', 'error'); }
  const repetido = personas.find((p) => p.grupo === grupo && normalizar(p.nombre) === normalizar(nombre));
  if (repetido) {
    inNombre.select();
    return toast(`${repetido.nombre} ya está en el ${grupos[grupo].toLowerCase()}.`, 'error');
  }

  cargando(btn, true);
  const ok = await ejecutar(opsCrear({ nombre, grupo, sexo, cupo, responsable }), `${nombre} agregado`);
  cargando(btn, false);
  if (!ok) return;
  if (grupo !== grupoActivo) cambiarTab(grupo);
  inNombre.value = '';
  inResp.value = '';
  f.querySelectorAll('input[name="sexo"]').forEach((r) => { r.checked = false; });
  document.getElementById('nuevo-cupo').value = '1';
  inNombre.focus();
}

async function editarPersona(p) {
  const esHijo = p.grupo === 'menores';
  const d = document.createElement('dialog');
  d.className = 'dialogo dialogo-form';
  d.innerHTML = `<form method="dialog" class="pila sin-margen">
    <h3>Editar participante</h3>
    ${segmentoSexo(p.sexo)}
    <label class="campo"><span>Nombre</span><input name="nombre" maxlength="60" value="${esc(p.nombre)}"></label>
    ${esHijo ? `<label class="campo"><span>Papás o responsables</span><input name="responsable" maxlength="80" value="${esc(p.responsable || '')}"></label>` : ''}
    <div class="dialogo-acciones">
      <button value="no" class="btn btn-secundario">Cancelar</button>
      <button value="si" class="btn btn-primario">Guardar</button>
    </div>
  </form>`;
  document.body.append(d);
  d.showModal();
  await new Promise((r) => d.addEventListener('close', r, { once: true }));
  const form = d.querySelector('form');
  const nombre = limpiar(form.nombre.value, 60);
  const responsable = esHijo ? limpiar(form.responsable.value, 80) : '';
  const sexo = form.sexo.value || p.sexo || '';
  d.remove();
  if (d.returnValue !== 'si') return;
  if (!nombre) return toast('El nombre no puede quedar vacío.', 'error');
  if (personas.some((o) => o.id !== p.id && o.grupo === p.grupo && normalizar(o.nombre) === normalizar(nombre))) {
    return toast('Ya existe otro participante con ese nombre.', 'error');
  }
  const ahora = Date.now();
  await ejecutar([
    { tipo: 'update', col: 'personas', id: p.id, datos: { nombre, responsable, sexo, actualizado: ahora } },
    { tipo: 'update', col: 'listas', id: p.publicId, datos: { nombre, actualizado: ahora } },
  ], 'Cambios guardados');
}

async function nuevoLink(p) {
  const ok = await confirmar({
    titulo: `¿Nuevo link para <b>${esc(p.nombre)}</b>?`,
    texto: 'El link anterior dejará de funcionar. Úsalo si el link se compartió por error. Sus datos se mantienen.',
    aceptar: 'Generar',
  });
  if (!ok) return;
  const { id, ...datos } = p;
  const nueva = codigo(24);
  const hecho = await ejecutar([
    { tipo: 'set', col: 'personas', id: nueva, datos: { ...datos, visto: false, actualizado: Date.now() } },
    { tipo: 'delete', col: 'personas', id },
  ], 'Link nuevo generado. Envíaselo por WhatsApp.');
  if (hecho) detalleId = nueva;
}

async function eliminar(p) {
  const ok = await confirmar({
    titulo: `¿Eliminar a <b>${esc(p.nombre)}</b>?`,
    texto: 'Se borrarán su lista y sus asignaciones. No se puede deshacer.',
    aceptar: 'Eliminar',
  });
  if (!ok) return;
  const ahora = Date.now();
  const ops = opsAmigos(p, []).slice(1);
  personas.filter((o) => o.id !== p.id && (o.amigos || []).includes(p.publicId)).forEach((o) => {
    ops.push({ tipo: 'update', col: 'personas', id: o.id, datos: { amigos: o.amigos.filter((x) => x !== p.publicId), actualizado: ahora } });
  });
  ops.push(
    { tipo: 'delete', col: 'personas', id: p.id },
    { tipo: 'delete', col: 'listas', id: p.publicId },
    { tipo: 'delete', col: 'firmas', id: p.publicId },
  );
  if (await ejecutar(ops, 'Participante eliminado')) {
    const hoja = document.getElementById('hoja');
    if (hoja.open) hoja.close();
  }
}

function cambiarTab(g) {
  grupoActivo = g;
  try { sessionStorage.setItem(KEY_TAB, g); } catch { /* sin storage */ }
  pintar();
}

/* ---------- Eventos ---------- */

raiz.addEventListener('input', (e) => {
  if (e.target.id === 'filtro') { filtro = e.target.value; pintarFilas(); }
});

raiz.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.name === 'grupo') {
    const hijos = el.value === 'menores';
    document.getElementById('campo-resp').hidden = !hijos;
    document.getElementById('nuevo-nombre').placeholder = hijos ? 'Ej.: Lara' : 'Ej.: Paola';
    return;
  }
  if (el.dataset.cupo) {
    const p = personas.find((x) => x.id === el.dataset.cupo);
    const cupo = Number(el.value);
    const ops = opsAmigos(p, (p.amigos || []).slice(0, cupo));
    ops[0].datos.cupo = cupo;
    el.blur();
    return ejecutar(ops, 'Cupo actualizado');
  }
  if (el.dataset.slot) {
    const p = personas.find((x) => x.id === el.dataset.id);
    const i = Number(el.dataset.slot);
    const amigos = [...(p.amigos || [])];
    if (el.value && amigos.includes(el.value) && amigos[i] !== el.value) {
      toast('Ya está asignado a esta persona.', 'error');
      return pintarHoja(true);
    }
    if (el.value) amigos[i] = el.value;
    else amigos.splice(i, 1);
    el.blur();
    return ejecutar(opsAmigos(p, amigos.filter(Boolean)), el.value ? 'Asignación guardada' : 'Asignación quitada');
  }
});

raiz.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-agregar') return;
  e.preventDefault();
  await agregar(e.target);
});

// Cerrar diálogos al tocar el fondo.
raiz.addEventListener('click', (e) => {
  if (e.target.tagName === 'DIALOG' && e.target.open) e.target.close();
});

raiz.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const p = personas.find((x) => x.id === b.dataset.id);
  switch (b.dataset.accion) {
    case 'tab':
      cambiarTab(b.dataset.grupo);
      break;
    case 'detalle':
      abrirDetalle(b.dataset.id);
      break;
    case 'cerrar-hoja':
      document.getElementById('hoja').close();
      break;
    case 'agregar':
      abrirAgregar();
      break;
    case 'cerrar-agregar':
      document.getElementById('dlg-agregar').close();
      break;
    case 'cargar-inicial':
      cargando(b, true);
      await ejecutar(participantesIniciales.flatMap(opsCrear), 'Lista inicial cargada');
      break;
    case 'completar-sexo': {
      cargando(b, true);
      const ahora = Date.now();
      await ejecutar(sinSexoConocido().map(({ p: x, sexo }) =>
        ({ tipo: 'update', col: 'personas', id: x.id, datos: { sexo, actualizado: ahora } })), 'Listo: separados por mujeres y hombres');
      break;
    }
    case 'copiar':
      copiar(linkPersonal(p.id), `Link de ${p.nombre} copiado`);
      break;
    case 'editar':
      await editarPersona(p);
      break;
    case 'nuevo-link':
      await nuevoLink(p);
      break;
    case 'eliminar':
      await eliminar(p);
      break;
    case 'cerrar':
      await api.salirAdmin();
      location.reload();
      break;
  }
});

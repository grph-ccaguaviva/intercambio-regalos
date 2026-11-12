import api, { modoDemo } from './db.js';
import { ajustes, grupos } from './config.js';
import {
  esc, linkPersonal, copiar, toast, waUrl, dinero, confirmar, cargando, listaCompleta,
  htmlRegalos, ICONO_REGALO, aplicarMarca, ordenarPorNombre,
} from './util.js';

const KEY_CLAVE = 'intercambio-clave';
const N = ajustes.cantidadRegalos;
const MIN = ajustes.montoMinimo;
const EJEMPLOS = ['Ej.: Perfume floral', 'Ej.: Polo deportivo talla M', 'Ej.: Libro devocional'];

const params = new URLSearchParams(location.search);
const vistaAdmin = params.has('admin'); // el organizador abre la página de alguien
const app = document.getElementById('app');

let clave = params.get('k');
let persona;          // undefined = cargando, null = link inválido
let listas = [];
let listasCargadas = false;
let editando = false;
let marcandoVisto = false;
let amigoElegido = '';

const leerClave = () => { try { return localStorage.getItem(KEY_CLAVE); } catch { return null; } };
function guardarClave(v) {
  try { v ? localStorage.setItem(KEY_CLAVE, v) : localStorage.removeItem(KEY_CLAVE); } catch { /* sin storage */ }
}

aplicarMarca();
document.getElementById('hero-sub').textContent =
  `Registra a quién te tocó y escribe tus ${N} opciones de regalo (mínimo ${dinero(MIN)}).`;
document.getElementById('aviso-demo').hidden = !modoDemo;

if (!clave && leerClave()) {
  clave = leerClave();
  history.replaceState(null, '', `?k=${encodeURIComponent(clave)}`);
}

if (clave) {
  api.escucharDoc('personas', clave, (p) => { persona = p; render(); }, mostrarError);
  api.escucharCol('listas', (l) => { listas = ordenarPorNombre(l); listasCargadas = true; render(); }, mostrarError);
} else {
  renderSinLink();
}

/* ---------- Render ---------- */

function tutorialHtml(abierto) {
  return `<details class="card tutorial" ${abierto ? 'open' : ''}>
    <summary><h2 class="card-titulo">¿Cómo funciona?</h2></summary>
    <ol class="pasos-tuto">
      <li><div><b>Abre tu link personal</b>El organizador te lo envía por WhatsApp. Es solo tuyo: no lo compartas.</div></li>
      <li><div><b>Indica a quién te tocó</b>Elige el nombre de la persona que sacaste en el sorteo. Nadie más verá a quién elegiste.</div></li>
      <li><div><b>Escribe tus ${N} opciones de regalo</b>Cosas que te gustaría recibir, de ${dinero(MIN)} a más. Puedes poner talla, color o un link.</div></li>
      <li><div><b>Mira lo que pidió tu amigo secreto</b>Vuelve con tu link cuando quieras para ver si ya llenó su lista.</div></li>
    </ol>
  </details>`;
}

function renderSinLink() {
  app.dataset.vista = 'sin-link';
  app.innerHTML = `
    <section class="card">
      <h2 class="card-titulo">Necesitas tu link personal</h2>
      <p class="nota">Para que nadie vea a quién le tocó a otro, cada participante entra con un link secreto. Pídeselo al organizador por WhatsApp y ábrelo desde tu celular.</p>
    </section>
    ${tutorialHtml(true)}`;
}

function render() {
  if (persona === undefined || !listasCargadas) return;
  if (persona === null) {
    if (!vistaAdmin) guardarClave(null);
    app.dataset.vista = 'invalido';
    app.innerHTML = `<section class="card">
      <h2 class="card-titulo">Este link no es válido</h2>
      <p class="nota">Puede que esté incompleto o que el organizador lo haya cambiado. Pídele tu link actual.</p>
    </section>${tutorialHtml(true)}`;
    return;
  }
  if (!vistaAdmin) {
    guardarClave(clave);
    if (!persona.visto && !marcandoVisto) {
      marcandoVisto = true;
      api.lote([{ tipo: 'update', col: 'personas', id: clave, datos: { visto: true, actualizado: Date.now() } }])
        .catch(() => { marcandoVisto = false; });
    }
  }
  renderPanel();
}

function miLista() { return listas.find((l) => l.id === persona.publicId) || { regalos: [] }; }
function misAmigos() { return (persona.amigos || []).map((id) => listas.find((l) => l.id === id)).filter(Boolean); }
function cupo() { return persona.cupo ?? 1; }
function esMenor() { return persona.grupo === 'menores'; }

function renderPanel() {
  const vista = `panel-${clave}`;
  if (app.dataset.vista !== vista) {
    app.dataset.vista = vista;
    editando = !listaCompleta(miLista());
    const link = linkPersonal(clave);
    const msg = `Mi link para el ${ajustes.evento} (es personal, no lo compartas): ${link}`;
    app.innerHTML = `
      ${vistaAdmin ? '<p class="aviso aviso-card">Estás viendo esta página como organizador. Los cambios se guardan a nombre de esta persona.</p>' : ''}
      <section class="card saludo">
        <div>
          <p class="saludo-pre">${esMenor() ? 'Página de' : 'Hola,'}</p>
          <h2 id="mi-nombre"></h2>
          <p class="nota" id="mi-grupo"></p>
        </div>
        ${vistaAdmin ? '' : '<button class="btn-link" type="button" data-accion="salir">Salir</button>'}
      </section>
      <div class="progreso" id="progreso"></div>
      <section class="card card-link">
        <h2 class="card-titulo">Tu link personal</h2>
        <p class="nota">Es tu llave: con este link vuelves a tu página desde cualquier celular. <b>No lo compartas</b>, quien lo tenga puede ver a quién le regalas.</p>
        <div class="link-box">
          <input readonly value="${esc(link)}" aria-label="Tu link personal">
          <button class="btn btn-secundario" type="button" data-accion="copiar-link">Copiar</button>
        </div>
        <a class="btn btn-wa" href="${esc(waUrl(msg))}" target="_blank" rel="noopener">Guardármelo en WhatsApp</a>
      </section>
      <section class="card" id="sec-amigo"></section>
      <section class="card" id="sec-lista"></section>
      <section class="card card-destacada" id="sec-deseos"></section>
      ${tutorialHtml(false)}`;
  }

  document.getElementById('mi-nombre').textContent = persona.nombre;
  document.getElementById('mi-grupo').textContent = esMenor()
    ? `${grupos.menores}${persona.responsable ? ` · La llenan ${persona.responsable}` : ''}`
    : grupos[persona.grupo] || '';
  pintarProgreso();
  pintarAmigo();
  pintarLista();
  document.getElementById('sec-deseos').innerHTML = htmlDeseos();
}

function pintarProgreso() {
  const amigos = misAmigos();
  const chip = (ok, txt) => `<span class="chip ${ok ? 'ok' : ''}">${ok ? '✓ ' : ''}${txt}</span>`;
  document.getElementById('progreso').innerHTML =
    chip(amigos.length >= cupo(), cupo() > 1 ? `Amigos secretos ${amigos.length}/${cupo()}` : 'Amigo secreto') +
    chip(listaCompleta(miLista()), 'Mi lista') +
    chip(amigos.length > 0 && amigos.every((a) => a.regalos?.length), 'Lista de mi amigo');
}

function pintarAmigo(forzar = false) {
  const sec = document.getElementById('sec-amigo');
  const activo = document.activeElement;
  if (!forzar && activo?.tagName === 'SELECT' && sec.contains(activo)) return;

  const amigos = misAmigos();
  const total = cupo();
  if (total === 0) {
    sec.innerHTML = `<h2 class="card-titulo">Tu amigo secreto</h2>
      <p class="vacio">En este intercambio no te toca regalar. Igual escribe tu lista de deseos.</p>`;
    return;
  }
  const completo = amigos.length >= total;
  const titulo = total > 1 ? `Tus amigos secretos (${amigos.length}/${total})` : 'Tu amigo secreto';
  const bloques = amigos.map((a) =>
    `<div class="amigo">${ICONO_REGALO}<p class="amigo-nombre">${esc(a.nombre)}</p></div>`).join('');

  let form = '';
  if (!completo) {
    const opciones = listas.filter((l) => l.grupo === persona.grupo && l.id !== persona.publicId && !l.tomado);
    form = opciones.length
      ? `<form id="form-amigo" class="pila">
          <label class="campo"><span>${amigos.length ? 'Te toca regalar a una persona más. ¿A quién?' : 'Me tocó…'}</span>
            <select id="sel-amigo" required>
              <option value="">— Selecciona un nombre —</option>
              ${opciones.map((l) => `<option value="${esc(l.id)}" ${l.id === amigoElegido ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}
            </select>
          </label>
          <button class="btn btn-primario" type="submit">Guardar</button>
        </form>`
      : '<p class="vacio">No hay nombres disponibles. Avisa al organizador.</p>';
  }

  sec.innerHTML = `<h2 class="card-titulo"><span class="paso ${completo ? 'hecho' : ''}">${completo ? '✓' : '2'}</span> ${completo ? titulo : '¿A quién le regalas?'}</h2>
    ${completo ? '' : `<p class="nota">Elige el nombre de la persona que ${esMenor() ? `le tocó a ${esc(persona.nombre)}` : 'te tocó'} en el sorteo. Solo tú lo verás.</p>`}
    ${bloques}
    ${form}
    ${completo ? '<p class="nota">Ya quedó registrado. Si hay un error, avisa al organizador para corregirlo.</p>' : ''}`;
}

function pintarLista(forzar = false) {
  const sec = document.getElementById('sec-lista');
  const lista = miLista();
  if (editando) {
    if (forzar || !sec.querySelector('#form-lista')) sec.innerHTML = htmlFormLista(lista);
  } else {
    sec.innerHTML = `<h2 class="card-titulo"><span class="paso hecho">✓</span> ${esMenor() ? `Lista de deseos de ${esc(persona.nombre)}` : 'Tu lista de deseos'}</h2>
      <p class="nota">Esto es lo que verá quien ${esMenor() ? 'le' : 'te'} regala.</p>
      ${htmlRegalos(lista.regalos)}
      <button class="btn btn-secundario btn-bloque" type="button" data-accion="editar-lista">Editar lista</button>`;
  }
}

function htmlFormLista(lista) {
  const r = lista.regalos || [];
  let items = '';
  for (let i = 0; i < N; i++) {
    const g = r[i] || {};
    items += `<fieldset class="regalo-form">
      <legend>Opción ${i + 1}</legend>
      <label class="campo"><span>¿Qué regalo ${esMenor() ? 'le' : 'te'} gustaría? *</span>
        <input name="nombre-${i}" maxlength="80" value="${esc(g.nombre || '')}" placeholder="${EJEMPLOS[i] || 'Ej.: Taza personalizada'}">
      </label>
      <label class="campo"><span>Precio aproximado (${esc(ajustes.moneda)}) *</span>
        <input name="precio-${i}" type="number" inputmode="decimal" min="${MIN}" step="0.10" value="${esc(g.precio ?? '')}" placeholder="Mínimo ${MIN}">
      </label>
      <label class="campo"><span>¿Dónde lo encuentran? <small>(opcional)</small></span>
        <input name="donde-${i}" maxlength="300" value="${esc(g.donde || '')}" placeholder="Tienda o link de la web">
      </label>
      <label class="campo"><span>Detalles <small>(talla, color, modelo, opcional)</small></span>
        <textarea name="detalle-${i}" rows="2" maxlength="160">${esc(g.detalle || '')}</textarea>
      </label>
    </fieldset>`;
  }
  return `<h2 class="card-titulo"><span class="paso">3</span> ${esMenor() ? `Lista de deseos de ${esc(persona.nombre)}` : 'Tu lista de deseos'}</h2>
    <p class="nota">Escribe <b>${N} opciones</b> que ${esMenor() ? 'le' : 'te'} gustaría recibir. Cada una debe costar al menos <b>${dinero(MIN)}</b>. Así quien regala puede elegir.</p>
    <form id="form-lista" class="pila" novalidate>
      ${items}
      <div class="acciones">
        ${listaCompleta(lista) ? '<button type="button" class="btn btn-secundario" data-accion="cancelar-edicion">Cancelar</button>' : ''}
        <button class="btn btn-primario" type="submit">Guardar lista</button>
      </div>
    </form>`;
}

function htmlDeseos() {
  const amigos = misAmigos();
  const titulo = (txt) => `<h2 class="card-titulo"><span class="paso">4</span> ${txt}</h2>`;
  if (cupo() === 0) return `${titulo('Lo que desea tu amigo secreto')}<p class="vacio">No aplica en tu caso.</p>`;
  if (!amigos.length) {
    return `${titulo('Lo que desea tu amigo secreto')}
      <p class="vacio">Primero indica a quién ${esMenor() ? 'le' : 'te'} tocó (paso 2).</p>`;
  }
  const bloques = amigos.map((a) => (a.regalos?.length
    ? `${amigos.length > 1 ? `<h3 class="sub-titulo">${esc(a.nombre)}</h3>` : ''}${htmlRegalos(a.regalos)}`
    : `${amigos.length > 1 ? `<h3 class="sub-titulo">${esc(a.nombre)}</h3>` : ''}
       <p class="vacio">${esc(a.nombre)} todavía no escribe su lista. Esta página se actualiza sola: vuelve más tarde con tu link.</p>`)).join('');
  const nombre = amigos.length === 1 ? esc(amigos[0].nombre) : 'tus amigos secretos';
  return `${titulo(`Lo que desea ${nombre}`)}
    <p class="nota">Elige una de estas opciones. ¡Recuerda que es secreto!</p>
    ${bloques}`;
}

function mostrarError(err) {
  console.error(err);
  app.dataset.vista = 'error';
  app.innerHTML = `<section class="card"><h2 class="card-titulo">No se pudo cargar</h2>
    <p class="nota">Revisa tu conexión a internet y recarga la página.</p></section>`;
}

/* ---------- Eventos ---------- */

app.addEventListener('change', (e) => {
  if (e.target.id === 'sel-amigo') amigoElegido = e.target.value;
});

app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  switch (b.dataset.accion) {
    case 'copiar-link':
      copiar(linkPersonal(clave));
      break;
    case 'salir':
      if (await confirmar({
        titulo: '¿Salir en este celular?',
        texto: 'Para volver necesitarás abrir tu link personal otra vez.',
        aceptar: 'Salir',
      })) {
        guardarClave(null);
        location.href = location.pathname;
      }
      break;
    case 'editar-lista':
      editando = true;
      pintarLista(true);
      document.getElementById('sec-lista').scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    case 'cancelar-edicion':
      editando = false;
      pintarLista(true);
      break;
  }
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('[type="submit"]');
  try {
    if (f.id === 'form-amigo') await elegirAmigo(btn);
    if (f.id === 'form-lista') await guardarLista(f, btn);
  } catch (err) {
    console.error(err);
    const msg = err?.code === 'permission-denied'
      ? 'No se pudo guardar: esa persona ya fue elegida o el plazo cerró. Avisa al organizador.'
      : 'No se pudo guardar. Revisa tu conexión e intenta otra vez.';
    toast(msg, 'error');
  } finally {
    cargando(btn, false);
  }
});

async function elegirAmigo(btn) {
  const id = document.getElementById('sel-amigo').value;
  const amigo = listas.find((l) => l.id === id);
  if (!amigo) return toast('Elige un nombre de la lista', 'error');
  const ok = await confirmar({
    titulo: `¿${esMenor() ? `A ${esc(persona.nombre)} le` : 'Te'} tocó <b>${esc(amigo.nombre)}</b>?`,
    texto: 'Revisa bien: después solo el organizador podrá cambiarlo.',
    aceptar: 'Sí, confirmar',
  });
  if (!ok) return;
  if (listas.find((l) => l.id === id)?.tomado) {
    return toast('Esa persona ya fue elegida por otro participante. Avisa al organizador.', 'error');
  }

  cargando(btn, true);
  const ahora = Date.now();
  await api.lote([
    { tipo: 'update', col: 'personas', id: clave, datos: { amigos: [...(persona.amigos || []), id], actualizado: ahora } },
    { tipo: 'update', col: 'listas', id, datos: { tomado: true, actualizado: ahora } },
  ]);
  amigoElegido = '';
  btn.blur();
  toast('¡Listo! Quedó registrado.');
}

async function guardarLista(f, btn) {
  f.querySelectorAll('.error-msg').forEach((el) => el.remove());
  f.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const marcar = (input, msg) => {
    input.setAttribute('aria-invalid', 'true');
    const m = document.createElement('small');
    m.className = 'error-msg';
    m.textContent = msg;
    input.after(m);
  };

  const regalos = [];
  for (let i = 0; i < N; i++) {
    const nombre = f[`nombre-${i}`];
    const precio = f[`precio-${i}`];
    const valor = Number(String(precio.value).replace(',', '.'));
    if (!nombre.value.trim()) marcar(nombre, 'Escribe qué regalo te gustaría.');
    if (!precio.value || Number.isNaN(valor)) marcar(precio, 'Escribe el precio aproximado.');
    else if (valor < MIN) marcar(precio, `El monto mínimo es ${dinero(MIN)}.`);
    regalos.push({
      nombre: nombre.value.trim(),
      precio: Math.round(valor * 100) / 100,
      donde: f[`donde-${i}`].value.trim(),
      detalle: f[`detalle-${i}`].value.trim(),
    });
  }

  const primero = f.querySelector('[aria-invalid="true"]');
  if (primero) {
    primero.focus();
    primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return toast('Revisa los campos marcados en rojo.', 'error');
  }

  cargando(btn, true);
  const id = persona.publicId;
  await api.lote([
    { tipo: 'set', col: 'firmas', id, datos: { clave } },
    { tipo: 'update', col: 'listas', id, datos: { regalos, actualizado: Date.now() } },
  ]);
  editando = false;
  pintarLista(true);
  document.getElementById('sec-lista').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('¡La lista quedó guardada!');
}

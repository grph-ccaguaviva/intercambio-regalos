import api, { modoDemo, modoDemoVista, CLAVE_DEMO } from './db.js';
import { ajustes, grupos } from './config.js';
import {
  esc, linkPersonal, copiar, toast, waUrl, dinero, confirmar, cargando, listaCompleta,
  htmlTarjetasRegalos, ICONO_REGALO, ICONO_WA, aplicarMarca, ordenarPorNombre, celebrar,
  comprimirImagen, imagenSegura,
} from './util.js';

const KEY_CLAVE = 'intercambio-clave';
const N = ajustes.cantidadRegalos;
const MIN = ajustes.montoMinimo;
const EJEMPLOS = ['Ej.: Perfume floral', 'Ej.: Polo deportivo', 'Ej.: Libro devocional'];
const TABS = ['amigo', 'lista', 'deseos'];

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICO = {
  link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
  candado: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  persona: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  lista: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>'),
  corazon: svg('<path d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.2 4.5 7 4.5c2.1 0 3.6 1.2 5 3 1.4-1.8 2.9-3 5-3 3.8 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21Z"/>'),
  camara: svg('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>'),
  galeria: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 9"/>'),
  quitar: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  flecha: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  editar: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
};

const params = new URLSearchParams(location.search);
const vistaAdmin = params.has('admin'); // el organizador abre la página de alguien
const app = document.getElementById('app');

let clave = params.get('k') || (modoDemoVista ? CLAVE_DEMO : null);
let persona; // undefined = cargando, null = link inválido
let listas = [];
let listasCargadas = false;
let editando = false;
let marcandoVisto = false;
let amigoElegido = '';
let tab = TABS.includes(params.get('tab')) ? params.get('tab') : null;
let fotos = [];
const revelados = new Set();

const leerClave = () => { try { return localStorage.getItem(KEY_CLAVE); } catch { return null; } };
function guardarClave(v) {
  try { v ? localStorage.setItem(KEY_CLAVE, v) : localStorage.removeItem(KEY_CLAVE); } catch { /* sin storage */ }
}

aplicarMarca();
document.getElementById('hero-sub').textContent =
  `Registra a quién te tocó y escribe tus ${N} opciones de regalo (mínimo ${dinero(MIN)}).`;
const aviso = document.getElementById('aviso-demo');
aviso.hidden = !modoDemo;
if (modoDemoVista) {
  aviso.textContent = 'Vista de demostración con datos de ejemplo: puedes probar todo, nada se guarda de verdad.';
}

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

/* ---------- Datos derivados ---------- */

function miLista() { return listas.find((l) => l.id === persona.publicId) || { regalos: [] }; }
function misAmigos() { return (persona.amigos || []).map((id) => listas.find((l) => l.id === id)).filter(Boolean); }
function cupo() { return persona.cupo ?? 1; }
function esMenor() { return persona.grupo === 'menores'; }
function amigoCompleto() { return misAmigos().length >= cupo(); }
function deseosListos() { const a = misAmigos(); return a.length > 0 && a.every((x) => x.regalos?.length); }

/* ---------- Pantallas sin panel ---------- */

function tutorialHtml(abierto, clase = '') {
  return `<details class="card tutorial ${clase}" ${abierto ? 'open' : ''}>
    <summary><h2 class="card-titulo">¿Cómo funciona?</h2></summary>
    <ol class="pasos-tuto">
      <li><div><b>Abre tu link personal</b>El organizador te lo envía por WhatsApp. Es solo tuyo: no lo compartas.</div></li>
      <li><div><b>Indica a quién te tocó</b>Elige el nombre de la persona que sacaste en el sorteo. Nadie más verá a quién elegiste.</div></li>
      <li><div><b>Escribe tus ${N} opciones de regalo</b>Cosas que te gustaría recibir, de ${dinero(MIN)} a más. Puedes agregar foto, talla, color o un link.</div></li>
      <li><div><b>Mira lo que pidió tu amigo secreto</b>Vuelve con tu link cuando quieras para ver si ya llenó su lista.</div></li>
    </ol>
  </details>`;
}

function tarjetaAcceso(titulo, texto) {
  return `<section class="card bienvenida-card">
    <div class="icono-circulo" aria-hidden="true">${ICO.link}</div>
    <h2 class="card-titulo">${titulo}</h2>
    <p class="nota">${texto}</p>
    <ul class="claves">
      <li><span class="clave-ico ico-wa">${ICONO_WA}</span><span><b>Te llega por WhatsApp</b>El organizador te lo envía.</span></li>
      <li><span class="clave-ico">${ICO.candado}</span><span><b>Es solo tuyo</b>No lo compartas con nadie.</span></li>
      <li><span class="clave-ico ico-regalo">${ICONO_REGALO}</span><span><b>Sin contraseñas</b>Abres el link y listo.</span></li>
    </ul>
  </section>`;
}

function renderSinLink() {
  app.dataset.vista = 'sin-link';
  app.classList.add('app-ancho');
  app.innerHTML = `<div class="duo">
    ${tarjetaAcceso('Necesitas tu link personal', 'Para que nadie vea a quién le tocó a otro, cada participante entra con un link secreto. Pídeselo al organizador y ábrelo desde tu celular.')}
    ${tutorialHtml(true)}
  </div>`;
}

function mostrarError(err) {
  console.error(err);
  app.dataset.vista = 'error';
  app.innerHTML = `<section class="card"><h2 class="card-titulo">No se pudo cargar</h2>
    <p class="nota">Revisa tu conexión a internet y recarga la página.</p></section>`;
}

/* ---------- Render principal ---------- */

function render() {
  if (persona === undefined || !listasCargadas) return;
  if (persona === null) {
    if (!vistaAdmin) guardarClave(null);
    document.body.classList.remove('con-nav');
    app.dataset.vista = 'invalido';
    app.classList.add('app-ancho');
    app.innerHTML = `<div class="duo">
      ${tarjetaAcceso('Este link no es válido', 'Puede que esté incompleto o que el organizador lo haya cambiado. Pídele tu link actual.')}
      ${tutorialHtml(true)}
    </div>`;
    return;
  }
  if (!vistaAdmin && !modoDemoVista) {
    guardarClave(clave);
    if (!persona.visto && !marcandoVisto) {
      marcandoVisto = true;
      api.lote([{ tipo: 'update', col: 'personas', id: clave, datos: { visto: true, actualizado: Date.now() } }])
        .catch(() => { marcandoVisto = false; });
    }
  }
  renderPanel();
}

function tabInicial() {
  if (cupo() > 0 && !amigoCompleto()) return 'amigo';
  if (!listaCompleta(miLista())) return 'lista';
  return cupo() > 0 ? 'deseos' : 'lista';
}

function renderPanel() {
  const vista = `panel-${clave}`;
  if (app.dataset.vista !== vista) {
    app.dataset.vista = vista;
    app.classList.add('app-ancho');
    document.body.classList.add('con-nav');
    editando = !listaCompleta(miLista());
    if (editando) prepararFotos();
    tab ??= tabInicial();
    const link = linkPersonal(clave);
    const msg = `Mi link para el ${ajustes.evento} (es personal, no lo compartas): ${link}`;
    app.innerHTML = `
      ${vistaAdmin ? '<p class="aviso aviso-card">Estás viendo esta página como organizador. Los cambios se guardan a nombre de esta persona.</p>' : ''}
      <section class="card saludo saludo-panel">
        <div class="saludo-fila">
          <span class="avatar avatar-grande" id="mi-avatar" aria-hidden="true"></span>
          <div class="saludo-textos">
            <p class="saludo-pre">${esMenor() ? 'Página de' : 'Hola,'}</p>
            <h2 id="mi-nombre"></h2>
            <p class="nota" id="mi-grupo"></p>
          </div>
          ${vistaAdmin || modoDemoVista ? '' : '<button class="btn-link" type="button" data-accion="salir">Salir</button>'}
        </div>
      </section>

      <nav class="nav-admin nav-part" aria-label="Secciones">
        <button type="button" class="nav-item" data-accion="tab" data-tab="amigo">${ICO.persona}<span>Amigo secreto</span><i class="punto" id="punto-amigo"></i></button>
        <button type="button" class="nav-item" data-accion="tab" data-tab="lista">${ICO.lista}<span>Mi lista</span><i class="punto" id="punto-lista"></i></button>
        <button type="button" class="nav-item" data-accion="tab" data-tab="deseos">${ICO.corazon}<span>Lo que desea</span><i class="punto" id="punto-deseos"></i></button>
      </nav>

      <div class="vista tab-amigo" id="tab-amigo" hidden>
        <section class="card" id="sec-amigo"></section>
        <div class="pila-lateral">
          <section class="card card-link">
            <h2 class="card-titulo">Tu link personal</h2>
            <p class="nota">Es tu llave para volver desde cualquier celular. <b>No lo compartas.</b></p>
            <div class="link-box">
              <input readonly value="${esc(link)}" aria-label="Tu link personal">
              <button class="btn btn-secundario" type="button" data-accion="copiar-link">Copiar</button>
              <a class="btn-icono btn-icono-wa" href="${esc(waUrl(msg))}" target="_blank" rel="noopener" title="Guardármelo en WhatsApp" aria-label="Guardármelo en WhatsApp">${ICONO_WA}</a>
            </div>
          </section>
          ${tutorialHtml(false)}
        </div>
      </div>
      <div class="vista" id="tab-lista" hidden><section class="card" id="sec-lista"></section></div>
      <div class="vista" id="tab-deseos" hidden><section class="card card-destacada" id="sec-deseos"></section></div>`;
  }

  document.getElementById('mi-nombre').textContent = persona.nombre;
  document.getElementById('mi-avatar').textContent = persona.nombre.slice(0, 1).toUpperCase();
  document.getElementById('mi-grupo').textContent = esMenor()
    ? `${grupos.menores}${persona.responsable ? ` · La llenan ${persona.responsable}` : ''}`
    : grupos[persona.grupo] || '';
  pintarNav();
  pintarAmigo();
  pintarLista();
  pintarDeseos();
}

function pintarNav() {
  const estado = { amigo: cupo() === 0 || amigoCompleto(), lista: listaCompleta(miLista()), deseos: deseosListos() };
  TABS.forEach((t) => {
    const activo = t === tab;
    const b = app.querySelector(`.nav-item[data-tab="${t}"]`);
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-current', activo ? 'page' : 'false');
    document.getElementById(`punto-${t}`).className = `punto ${estado[t] ? 'ok' : ''}`;
    document.getElementById(`tab-${t}`).hidden = !activo;
  });
}

function irA(t) {
  tab = t;
  pintarNav();
  const nav = app.querySelector('.nav-part');
  if (nav && window.matchMedia('(min-width: 760px)').matches) {
    nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: app.offsetTop - 12, behavior: 'smooth' });
  }
}

/* ---------- Pestaña: amigo secreto ---------- */

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
  const bloques = amigos.map((a) =>
    `<div class="amigo ${revelados.has(a.id) ? '' : 'revelar'}">${ICONO_REGALO}<div><span class="amigo-etq">${esMenor() ? 'Le regala a' : 'Le regalas a'}</span><p class="amigo-nombre">${esc(a.nombre)}</p></div></div>`).join('');
  amigos.forEach((a) => revelados.add(a.id));

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

  const quien = esMenor() ? `le tocó a ${esc(persona.nombre)}` : 'te tocó';
  const titulo = total > 1 ? `Tus amigos secretos (${amigos.length}/${total})` : 'Tu amigo secreto';
  const verDeseos = amigos.length === 1 ? `Ver lo que desea ${esc(amigos[0].nombre)}` : 'Ver lo que desean';
  sec.innerHTML = `<h2 class="card-titulo"><span class="paso ${completo ? 'hecho' : ''}">${completo ? '✓' : '1'}</span> ${completo ? titulo : '¿A quién le regalas?'}</h2>
    ${completo ? '' : `<p class="nota">Elige el nombre de la persona que ${quien} en el sorteo. Solo tú lo verás.</p>`}
    ${bloques}
    ${form}
    ${completo ? `<button type="button" class="btn btn-primario btn-bloque mt-btn" data-accion="tab" data-tab="deseos">${verDeseos} ${ICO.flecha}</button>
      <p class="nota centro">Si hay un error, avisa al organizador para corregirlo.</p>` : ''}`;
}

/* ---------- Pestaña: mi lista ---------- */

function prepararFotos() {
  const r = miLista().regalos || [];
  fotos = Array.from({ length: N }, (_, i) => (imagenSegura(r[i]?.imagen) ? r[i].imagen : ''));
}

function pintarLista(forzar = false) {
  const sec = document.getElementById('sec-lista');
  const lista = miLista();
  const de = esMenor() ? `de ${esc(persona.nombre)}` : '';
  if (editando) {
    if (forzar || !sec.querySelector('#form-lista')) sec.innerHTML = htmlFormLista(lista);
    return;
  }
  sec.innerHTML = `<div class="sec-cab">
      <div>
        <h2 class="card-titulo"><span class="paso hecho">✓</span> Lista de deseos ${de}</h2>
        <p class="nota">Esto es lo que verá quien ${esMenor() ? 'le' : 'te'} regala.</p>
      </div>
      <button class="btn btn-secundario" type="button" data-accion="editar-lista">${ICO.editar}<span>Editar</span></button>
    </div>
    ${htmlTarjetasRegalos(lista.regalos)}`;
}

// Dos entradas: galería (álbum del celular o archivo en PC) y cámara (solo en celulares).
function botonesFoto(i, cambiar) {
  return `<div class="foto-botones">
      <label class="foto-btn">${ICO.galeria}<span class="solo-movil">${cambiar ? 'Otra de galería' : 'Galería'}</span><span class="solo-pc">${cambiar ? 'Cambiar foto' : 'Elegir foto'}</span>
        <input type="file" accept="image/*" data-foto="${i}" hidden></label>
      <label class="foto-btn solo-movil">${ICO.camara}<span>${cambiar ? 'Tomar otra' : 'Cámara'}</span>
        <input type="file" accept="image/*" capture="environment" data-foto="${i}" hidden></label>
    </div>`;
}

function htmlFoto(i) {
  const src = fotos[i];
  if (src) {
    return `<div class="foto-prev">
        <img src="${esc(src)}" alt="Foto de la opción ${i + 1}">
        <button type="button" class="foto-quitar" data-accion="quitar-foto" data-i="${i}" aria-label="Quitar foto">${ICO.quitar}</button>
      </div>
      ${botonesFoto(i, true)}`;
  }
  return `<div class="foto-drop">
      <span class="foto-ico">${ICO.camara}</span>
      <span class="foto-txt"><b>Agregar foto</b><small>Opcional · ayuda a acertar</small></span>
      ${botonesFoto(i, false)}
    </div>`;
}

function htmlFormLista(lista) {
  const r = lista.regalos || [];
  const le = esMenor() ? 'le' : 'te';
  let items = '';
  for (let i = 0; i < N; i++) {
    const g = r[i] || {};
    items += `<fieldset class="regalo-form">
      <legend><span class="regalo-num">${i + 1}</span> Opción ${i + 1}</legend>
      <div class="rf-grid">
        <div class="rf-foto" id="foto-box-${i}">${htmlFoto(i)}</div>
        <div class="rf-campos">
          <label class="campo c-nombre"><span>¿Qué regalo ${le} gustaría? *</span>
            <input name="nombre-${i}" maxlength="80" value="${esc(g.nombre || '')}" placeholder="${EJEMPLOS[i] || 'Ej.: Taza personalizada'}">
          </label>
          <label class="campo c-precio"><span>Precio aprox. (${esc(ajustes.moneda)}) *</span>
            <input name="precio-${i}" type="number" inputmode="decimal" min="${MIN}" step="0.10" value="${esc(g.precio ?? '')}" placeholder="Mínimo ${MIN}">
          </label>
          <label class="campo c-donde"><span>¿Dónde lo encuentran? <small>(opcional)</small></span>
            <input name="donde-${i}" maxlength="300" value="${esc(g.donde || '')}" placeholder="Nombre de la tienda o link de la web">
          </label>
          <label class="campo c-detalle"><span>Detalles <small>(opcional)</small></span>
            <textarea name="detalle-${i}" rows="3" maxlength="300" placeholder="Talla, color, modelo, marca, sabor… todo lo que ayude a acertar">${esc(g.detalle || '')}</textarea>
          </label>
        </div>
      </div>
    </fieldset>`;
  }
  return `<div class="sec-cab">
      <div>
        <h2 class="card-titulo"><span class="paso">2</span> Lista de deseos ${esMenor() ? `de ${esc(persona.nombre)}` : ''}</h2>
        <p class="nota">Escribe <b>${N} opciones</b> que ${le} gustaría recibir, de <b>${dinero(MIN)}</b> a más. Así quien regala puede elegir.</p>
      </div>
    </div>
    <form id="form-lista" class="pila" novalidate>
      ${items}
      <div class="acciones acciones-fijas">
        ${listaCompleta(lista) ? '<button type="button" class="btn btn-secundario" data-accion="cancelar-edicion">Cancelar</button>' : ''}
        <button class="btn btn-primario" type="submit">Guardar lista</button>
      </div>
    </form>`;
}

/* ---------- Pestaña: lo que desea ---------- */

function pintarDeseos() {
  const sec = document.getElementById('sec-deseos');
  const amigos = misAmigos();
  const titulo = (txt) => `<h2 class="card-titulo"><span class="paso">3</span> ${txt}</h2>`;
  if (cupo() === 0) {
    sec.innerHTML = `${titulo('Lo que desea tu amigo secreto')}<p class="vacio">No aplica en tu caso.</p>`;
    return;
  }
  if (!amigos.length) {
    sec.innerHTML = `${titulo('Lo que desea tu amigo secreto')}
      <div class="vacio vacio-accion">
        <p>Primero indica a quién ${esMenor() ? 'le' : 'te'} tocó.</p>
        <button type="button" class="btn btn-primario" data-accion="tab" data-tab="amigo">Elegir amigo secreto</button>
      </div>`;
    return;
  }
  const encabezado = amigos.length === 1
    ? `Lo que desea ${esc(amigos[0].nombre)}`
    : `Lo que desean ${amigos.map((a) => esc(a.nombre)).join(' y ')}`;
  const bloques = amigos.map((a) => {
    const cab = amigos.length > 1 ? `<h3 class="sub-titulo">${esc(a.nombre)}</h3>` : '';
    if (!a.regalos?.length) {
      return `${cab}<p class="vacio">${esc(a.nombre)} todavía no escribe su lista. Esta página se actualiza sola: vuelve más tarde con tu link.</p>`;
    }
    return `${cab}${htmlTarjetasRegalos(a.regalos)}`;
  }).join('');
  sec.innerHTML = `${titulo(encabezado)}
    <p class="nota">Elige una de estas opciones. ¡Recuerda que es secreto!</p>
    ${bloques}`;
}

/* ---------- Eventos ---------- */

app.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.id === 'sel-amigo') amigoElegido = el.value;
  if (el.dataset.foto !== undefined) {
    const i = Number(el.dataset.foto);
    const file = el.files?.[0];
    if (!file) return;
    const box = document.getElementById(`foto-box-${i}`);
    box.classList.add('cargando-foto');
    try {
      fotos[i] = await comprimirImagen(file);
      box.innerHTML = htmlFoto(i);
    } catch (err) {
      console.error(err);
      toast('No se pudo usar esa imagen. Prueba con otra foto.', 'error');
    } finally {
      box.classList.remove('cargando-foto');
    }
  }
});

app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  switch (b.dataset.accion) {
    case 'tab':
      irA(b.dataset.tab);
      break;
    case 'copiar-link':
      copiar(linkPersonal(clave));
      break;
    case 'quitar-foto': {
      const i = Number(b.dataset.i);
      fotos[i] = '';
      document.getElementById(`foto-box-${i}`).innerHTML = htmlFoto(i);
      break;
    }
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
      prepararFotos();
      pintarLista(true);
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
  celebrar();
  toast('¡Listo! Quedó registrado.');
  if (amigoCompleto() && !listaCompleta(miLista())) setTimeout(() => irA('lista'), 1600);
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
      imagen: fotos[i] || '',
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
  celebrar();
  toast('¡La lista quedó guardada!');
  if (cupo() > 0) setTimeout(() => irA(amigoCompleto() ? 'deseos' : 'amigo'), 1600);
}

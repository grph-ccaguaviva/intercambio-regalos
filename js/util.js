import { ajustes } from './config.js';

export const ICONO_REGALO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;

export const ICONO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.7-.4Z"/></svg>';

// Confeti con los colores de Agua Viva. Se omite si el usuario pidió reducir movimiento.
export function celebrar() {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colores = ['#f39200', '#00b5cf', '#2a9d8c', '#004d74', '#ffc857', '#ffffff'];
  const capa = document.createElement('div');
  capa.className = 'confeti';
  capa.setAttribute('aria-hidden', 'true');
  document.body.append(capa);
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('i');
    c.style.background = colores[i % colores.length];
    if (i % 3 === 0) c.style.borderRadius = '50%';
    capa.append(c);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
    const dist = 180 + Math.random() * 340;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    c.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx * 1.15}px, ${dy + 420}px) rotate(${Math.random() * 1080}deg)`, opacity: 0 },
    ], { duration: 1700 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
  setTimeout(() => capa.remove(), 2900);
}

const ESCAPES ={ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const normalizar = (s = '') =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function urlSegura(u = '') {
  try {
    const x = new URL(String(u).trim());
    return /^https?:$/.test(x.protocol) ? x.href : '';
  } catch {
    return '';
  }
}

export function linkPersonal(clave) {
  const u = new URL('./', location.href);
  u.search = `?k=${encodeURIComponent(clave)}`;
  u.hash = '';
  return u.href;
}

// Código aleatorio criptográfico (sin caracteres ambiguos). 24 caracteres ≈ 139 bits.
const ALFABETO = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codigo(n = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

export const ordenarPorNombre = (l) => l.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export function aplicarMarca() {
  const valores = { evento: ajustes.evento, subtitulo: ajustes.subtitulo, red: ajustes.red, grupo: ajustes.grupo };
  for (const [k, v] of Object.entries(valores)) {
    document.querySelectorAll(`[data-${k}]`).forEach((el) => { el.textContent = v; });
  }
}

export const waUrl = (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`;

export const dinero = (n) => {
  const v = Number(n || 0);
  return `${ajustes.moneda} ${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

// Cuántos regalos recibe una persona y cuántas veces ya la eligieron.
// Listas antiguas solo tienen "tomado" (sin "veces"): cuenta como 1.
export const recibeDe = (l) => l?.recibe ?? 1;
export const vecesDe = (l) => l?.veces ?? (l?.tomado ? 1 : 0);
export const disponible = (l) => vecesDe(l) < recibeDe(l);

export const listaCompleta = (p) =>
  Array.isArray(p?.regalos) && p.regalos.length >= ajustes.cantidadRegalos;

export function toast(msg, tipo = 'ok') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = msg;
  el.dataset.tipo = tipo;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 3000);
}

export async function copiar(texto, msg = 'Link copiado') {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = document.createElement('textarea');
    t.value = texto;
    document.body.append(t);
    t.select();
    document.execCommand('copy');
    t.remove();
  }
  toast(msg);
}

// titulo y texto aceptan HTML: quien llama debe escapar los datos de usuario.
export function confirmar({ titulo, texto = '', aceptar = 'Confirmar', cancelar = 'Cancelar' }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dialogo';
    d.innerHTML = `<form method="dialog">
      <h3>${titulo}</h3>${texto ? `<p>${texto}</p>` : ''}
      <div class="dialogo-acciones">
        <button value="no" class="btn btn-secundario">${esc(cancelar)}</button>
        <button value="si" class="btn btn-primario">${esc(aceptar)}</button>
      </div></form>`;
    document.body.append(d);
    d.addEventListener('close', () => { resolve(d.returnValue === 'si'); d.remove(); });
    d.showModal();
  });
}

export function cargando(btn, activo) {
  if (!btn) return;
  if (activo) { btn.dataset.texto = btn.textContent; btn.textContent = 'Guardando…'; btn.disabled = true; }
  else { btn.textContent = btn.dataset.texto || btn.textContent; btn.disabled = false; }
}

// Solo imágenes embebidas propias (data URL base64). En <img> un SVG no ejecuta scripts.
// Las fotos que quedaron en blanco por el error de iPhone pesan ~2.5 KB: se tratan como "sin foto".
export function imagenSegura(src = '') {
  return typeof src === 'string' && !(src.startsWith('data:image/jpeg') && src.length < 3500)
    && /^data:image\/(jpeg|png|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(src);
}

// Carga la foto y espera a que esté decodificada: en iPhone, dibujarla antes de
// terminar de decodificar (fotos grandes/HEIC) deja el lienzo en blanco.
async function cargarImagen(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer la imagen'));
      i.src = url;
    });
    try { await img.decode(); } catch { /* algunos navegadores no lo necesitan */ }
    return { fuente: img, ancho: img.naturalWidth, alto: img.naturalHeight, cerrar: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

async function cargarBitmap(file) {
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const b = await createImageBitmap(file);
    return { fuente: b, ancho: b.width, alto: b.height, cerrar: () => b.close?.() };
  } catch { return null; }
}

// true si el lienzo quedó todo blanco (la foto no se llegó a dibujar).
function enBlanco(c) {
  const m = document.createElement('canvas');
  m.width = 24; m.height = 24;
  const ctx = m.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(c, 0, 0, 24, 24);
  const px = ctx.getImageData(0, 0, 24, 24).data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250) return false;
  }
  return true;
}

function dibujar(origen, max) {
  const factor = Math.min(1, max / Math.max(origen.ancho, origen.alto));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(origen.ancho * factor));
  c.height = Math.max(1, Math.round(origen.alto * factor));
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(origen.fuente, 0, 0, c.width, c.height);
  return c;
}

// Reduce la foto en el navegador (máx. ~140 KB) para guardarla junto a la lista sin costo.
// Si el resultado sale en blanco, reintenta con otro método; si sigue en blanco, avisa.
export async function comprimirImagen(file, lado = 640) {
  if (!file?.type?.startsWith('image/') && !/\.(heic|heif)$/i.test(file?.name || '')) {
    throw new Error('El archivo no es una imagen');
  }
  const metodos = [cargarImagen, cargarBitmap];
  for (const metodo of metodos) {
    let origen = null;
    try { origen = await metodo(file); } catch { origen = null; }
    if (!origen?.ancho) continue;
    try {
      let max = lado;
      for (let intento = 0; intento < 3; intento++) {
        const c = dibujar(origen, max);
        if (enBlanco(c)) break;
        let q = 0.8;
        let url = c.toDataURL('image/jpeg', q);
        while (url.length > 140000 && q > 0.45) { q -= 0.07; url = c.toDataURL('image/jpeg', q); }
        if (url.length <= 140000 || intento === 2) return url;
        max = Math.round(max * 0.75);
      }
    } finally {
      origen.cerrar();
    }
  }
  throw new Error('La foto quedó en blanco');
}

export function htmlTarjetasRegalos(regalos = []) {
  return `<div class="deseos-grid">${regalos.map((g, i) => {
    const url = urlSegura(g.donde);
    let donde = '';
    if (url) donde = `<a class="deseo-enlace" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver dónde comprarlo <span aria-hidden="true">↗</span></a>`;
    else if (g.donde) donde = `<p class="deseo-donde"><b>Dónde:</b> ${esc(g.donde)}</p>`;
    const img = imagenSegura(g.imagen)
      ? `<button type="button" class="deseo-zoom" data-zoom data-titulo="${esc(g.nombre)}" aria-label="Ver foto de ${esc(g.nombre)} en grande">
          <img src="${esc(g.imagen)}" alt="Foto: ${esc(g.nombre)}" loading="lazy">
          <span class="zoom-pista" aria-hidden="true">${ICONO_LUPA} Ver foto</span></button>`
      : `<span class="deseo-sin-foto">${ICONO_REGALO}</span>`;
    return `<article class="deseo">
      <div class="deseo-img">${img}<span class="deseo-num">Opción ${i + 1}</span></div>
      <div class="deseo-cuerpo">
        <h3>${esc(g.nombre)}</h3>
        <span class="precio">aprox. ${dinero(g.precio)}</span>
        ${g.detalle ? `<p class="deseo-detalle">${esc(g.detalle)}</p>` : ''}
        ${donde}
      </div>
    </article>`;
  }).join('')}</div>`;
}

export function htmlRegalos(regalos = []) {
  return `<ol class="regalos">${regalos.map((g, i) => {
    const url = urlSegura(g.donde);
    const donde = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver dónde comprarlo</a>`
      : g.donde ? `<p class="regalo-donde">Dónde: ${esc(g.donde)}</p>` : '';
    const marca = imagenSegura(g.imagen)
      ? `<button type="button" class="regalo-zoom" data-zoom data-titulo="${esc(g.nombre)}" aria-label="Ver foto de ${esc(g.nombre)} en grande"><img class="regalo-thumb" src="${esc(g.imagen)}" alt=""></button>`
      : `<span class="regalo-num">${i + 1}</span>`;
    return `<li class="regalo">
      ${marca}
      <div>
        <p class="regalo-nombre">${esc(g.nombre)}</p>
        <p class="regalo-precio">aprox. ${dinero(g.precio)}</p>
        ${g.detalle ? `<p class="regalo-detalle">${esc(g.detalle)}</p>` : ''}
        ${donde}
      </div></li>`;
  }).join('')}</ol>`;
}

const ICONO_LUPA = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M11 8v6M8 11h6"/></svg>';

// Visor de fotos a pantalla completa: toca la foto de un regalo para verla entera.
// Dentro del visor, tocar la foto la amplía (y se puede desplazar); tocar fuera cierra.
function abrirVisor(boton) {
  const origen = boton.querySelector('img');
  if (!origen || !imagenSegura(origen.getAttribute('src'))) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'visor';
  dlg.innerHTML = `<div class="visor-barra">
      <p class="visor-titulo"></p>
      <button type="button" class="visor-cerrar" aria-label="Cerrar">×</button>
    </div>
    <div class="visor-marco"><img alt=""></div>
    <p class="visor-ayuda">Toca la foto para acercar</p>`;
  const img = dlg.querySelector('.visor-marco img');
  img.src = origen.getAttribute('src');
  img.alt = boton.dataset.titulo ? `Foto: ${boton.dataset.titulo}` : 'Foto del regalo';
  dlg.querySelector('.visor-titulo').textContent = boton.dataset.titulo || '';
  const ayuda = dlg.querySelector('.visor-ayuda');
  dlg.addEventListener('click', (e) => {
    if (e.target === img) {
      const marco = img.parentElement;
      const r = img.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      const ampliada = dlg.classList.toggle('ampliada');
      ayuda.textContent = ampliada ? 'Toca otra vez para alejar' : 'Toca la foto para acercar';
      if (ampliada) {
        marco.scrollLeft = fx * marco.scrollWidth - marco.clientWidth / 2;
        marco.scrollTop = fy * marco.scrollHeight - marco.clientHeight / 2;
      }
      return;
    }
    if (!e.target.closest('.visor-titulo')) dlg.close();
  });
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-zoom]');
    if (boton) { e.preventDefault(); abrirVisor(boton); }
  });
}

import { ajustes } from './config.js';

export const ICONO_REGALO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
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

export function htmlRegalos(regalos = []) {
  return `<ol class="regalos">${regalos.map((g, i) => {
    const url = urlSegura(g.donde);
    const donde = url
      ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver dónde comprarlo</a>`
      : g.donde ? `<p class="regalo-donde">Dónde: ${esc(g.donde)}</p>` : '';
    return `<li class="regalo">
      <span class="regalo-num">${i + 1}</span>
      <div>
        <p class="regalo-nombre">${esc(g.nombre)}</p>
        <p class="regalo-precio">aprox. ${dinero(g.precio)}</p>
        ${g.detalle ? `<p class="regalo-detalle">${esc(g.detalle)}</p>` : ''}
        ${donde}
      </div></li>`;
  }).join('')}</ol>`;
}

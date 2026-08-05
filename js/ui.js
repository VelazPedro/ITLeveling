/* =========================================================
   INTERFAZ
   Pinta el dashboard a partir del estado. No calcula nada.
   ========================================================= */

import {
  ESTADISTICAS, TIPOS_TICKET, URGENCIAS, ROLES, RECEPCIONES,
  rangoPorNivel, buscarTipo, buscarUrgencia, buscarRol, buscarRecepcion
} from './config.js';
import { spriteEstadistica, spriteAvatar } from './pixelart.js';
import { escapar } from './estado.js';

const $ = (sel) => document.querySelector(sel);

/* Formato "05/08/2026 15:42" a partir de un ISO guardado en la base */
function formatearFecha(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

/* ---------------- Reloj ---------------- */
export function iniciarReloj() {
  const fechaEl = $('#clock-date');
  const horaEl  = $('#clock-time');

  const pintar = () => {
    const ahora = new Date();
    const dd = String(ahora.getDate()).padStart(2, '0');
    const mm = String(ahora.getMonth() + 1).padStart(2, '0');
    const aa = ahora.getFullYear();
    const hh = String(ahora.getHours()).padStart(2, '0');
    const mi = String(ahora.getMinutes()).padStart(2, '0');
    const ss = String(ahora.getSeconds()).padStart(2, '0');

    fechaEl.textContent = `${dd}/${mm}/${aa}`;
    horaEl.textContent  = `${hh}:${mi}:${ss}`;
  };

  pintar();
  setInterval(pintar, 1000);
}

/* ---------------- Estructura de las tarjetas ---------------- */
export function construirTarjetasEstadisticas() {
  const grid = $('#stats-grid');
  grid.innerHTML = '';

  for (const def of ESTADISTICAS) {
    const card = document.createElement('article');
    card.className = 'stat-card' + (def.sinTope ? ' sin-tope' : '');
    card.dataset.stat = def.id;

    card.innerHTML = `
      <div class="stat-name">${def.nombre}</div>
      <div class="stat-art">${spriteEstadistica(def.arte)}</div>
      <div class="stat-value" data-rol="valor">0<span class="cap">/0</span></div>
      <div class="stat-bar"><i data-rol="barra"></i></div>
      <div class="stat-delta" data-rol="delta"></div>
    `;

    grid.appendChild(card);
  }
}

/* ---------------- Selects del formulario ---------------- */
export function poblarFormulario() {
  const opciones = (lista, etiqueta = (o) => o.nombre) =>
    lista.map(o => `<option value="${o.id}">${etiqueta(o)}</option>`).join('');

  $('#f-categoria').innerHTML  = opciones(TIPOS_TICKET, t => `${t.nombre} (dif. ${t.dificultad})`);
  $('#f-urgencia').innerHTML   = opciones(URGENCIAS);
  $('#f-rol').innerHTML        = opciones(ROLES);
  $('#f-recepcion').innerHTML  = opciones(RECEPCIONES);

  $('#f-urgencia').value = 'media';
  $('#avatar-slot').innerHTML = spriteAvatar();
}

/* ---------------- Pintado principal ---------------- */
export function pintarDashboard(estado) {
  const nivel = estado.nivel;

  $('#user-name').textContent = estado.nombre;
  $('#level-value').textContent = nivel.actual;
  $('#level-max').textContent = nivel.maximoPosible;
  $('#rank-text').textContent = rangoPorNivel(nivel.actual);

  /* Barra de experiencia */
  const enTope = nivel.actual >= nivel.maximoPosible;
  const porcentaje = enTope ? 100 : Math.min(100, (nivel.xp / nivel.xpProximoNivel) * 100);
  $('#xp-fill').style.width = `${porcentaje}%`;
  $('#xp-label').textContent = enTope
    ? 'NIVEL MÁXIMO ALCANZADO'
    : `${nivel.xp} / ${nivel.xpProximoNivel} XP`;

  /* Estadísticas */
  for (const def of ESTADISTICAS) {
    const stat = estado.estadisticas[def.id];
    const card = document.querySelector(`.stat-card[data-stat="${def.id}"]`);
    if (!card) continue;

    const valorEl = card.querySelector('[data-rol="valor"]');
    const barraEl = card.querySelector('[data-rol="barra"]');

    if (def.sinTope) {
      valorEl.innerHTML = `${stat.actual}<span class="cap">/&#8734;</span>`;
      /* Sin tope: la barra usa una escala relativa que nunca se llena del todo */
      barraEl.style.width = `${Math.min(96, stat.actual % 100)}%`;
      valorEl.classList.remove('tope');
    } else {
      valorEl.innerHTML = `${stat.actual}<span class="cap">/${stat.maximo}</span>`;
      barraEl.style.width = `${Math.min(100, (stat.actual / stat.maximo) * 100)}%`;
      valorEl.classList.toggle('tope', stat.actual >= stat.maximo);
    }
  }

  /* Informe automático */
  $('#feedback-text').innerHTML = estado.ultimoInforme
    ?? 'Sin registros todavía. Cargá tu primer ticket para que el sistema evalúe tu desempeño.';
}

/* ---------------- Burbujas de delta sobre cada tarjeta ---------------- */
export function mostrarDeltas(aplicados) {
  for (const [id, info] of Object.entries(aplicados)) {
    const card = document.querySelector(`.stat-card[data-stat="${id}"]`);
    if (!card || info.delta === 0) continue;

    const burbuja = card.querySelector('[data-rol="delta"]');
    burbuja.textContent = (info.delta > 0 ? '+' : '') + info.delta;
    burbuja.className = 'stat-delta ' + (info.delta > 0 ? 'pos' : 'neg');
    /* Reinicia la animación aunque se dispare dos veces seguidas */
    void burbuja.offsetWidth;
    burbuja.classList.add('show');
  }
}

/* ---------------- Modales ---------------- */
export function abrirModal(sel) {
  $(sel).classList.remove('hidden');
}

export function cerrarModal(sel) {
  $(sel).classList.add('hidden');
}

/* ---------------- Pantalla de ingreso ---------------- */
export function pintarLogin(usuarios) {
  $('#login-avatar').innerHTML = spriteAvatar();

  const cont = $('#login-existentes');
  if (!usuarios.length) { cont.innerHTML = ''; return; }

  const chips = usuarios.slice(0, 12).map(u => `
    <button type="button" class="chip-usuario" data-nombre="${escapar(u.nombre)}">
      ${escapar(u.nombre)}<br><span class="chip-nvl">NVL ${u.nivelActual}</span>
    </button>
  `).join('');

  cont.innerHTML = `
    <div class="titulo">PERSONAJES GUARDADOS — ELEGÍ UNO PARA CONTINUAR</div>
    <div class="login-chips">${chips}</div>
  `;
}

export function mostrarLogin(visible) {
  $('#login').classList.toggle('hidden', !visible);
  if (visible) $('#f-login-nombre').focus();
}

export function mensajeLogin(texto, clase = '') {
  const el = $('#login-msg');
  el.textContent = texto;
  el.className = 'login-msg ' + clase;
}

/* ---------------- Menú ---------------- */
export function alternarMenu(forzar) {
  const drop = $('#menu-drop');
  const abierto = forzar ?? drop.classList.contains('hidden');
  drop.classList.toggle('hidden', !abierto);
  $('#btn-menu').setAttribute('aria-expanded', String(abierto));
}

/* ---------------- Clasificación de experiencia ---------------- */
export function pintarRanking(usuarios, claveActual) {
  const body = $('#ranking-body');

  if (!usuarios.length) {
    body.innerHTML = `<tr><td colspan="6" class="vacio">Todavía no hay personajes creados.</td></tr>`;
    return;
  }

  body.innerHTML = usuarios.map((u, i) => {
    const pos = i + 1;
    const clases = [
      pos <= 3 ? `podio-${pos}` : '',
      u.clave === claveActual ? 'yo' : ''
    ].filter(Boolean).join(' ');

    return `
      <tr class="${clases}">
        <td class="pos">${pos}</td>
        <td>${escapar(u.nombre)}${u.clave === claveActual ? ' (VOS)' : ''}</td>
        <td class="nvl">${u.nivelActual}</td>
        <td class="rango">${rangoPorNivel(u.nivelActual)}</td>
        <td class="xp">${u.xpTotal ?? 0}</td>
        <td>${u.ticketsTotales ?? 0}</td>
      </tr>
    `;
  }).join('');
}

/* ---------------- Compilado de tickets ---------------- */
export function pintarTickets(tickets, { mostrarAutor }) {
  const lista = $('#tickets-lista');
  const resumen = $('#tickets-resumen');

  if (!tickets.length) {
    lista.innerHTML = `<div class="vacio">No hay tickets registrados todavía.</div>`;
    resumen.textContent = '';
    return;
  }

  const totalXp = tickets.reduce((acc, t) => acc + (t.xp ?? 0), 0);
  const demoraProm = Math.round(tickets.reduce((acc, t) => acc + (t.demora ?? 0), 0) / tickets.length);
  resumen.innerHTML = `${tickets.length} TICKETS &nbsp;·&nbsp; ${totalXp} XP ACUMULADA &nbsp;·&nbsp; DEMORA PROMEDIO ${demoraProm} MIN`;

  lista.innerHTML = tickets.map(t => {
    const tipo      = buscarTipo(t.categoria);
    const urgencia  = buscarUrgencia(t.urgencia);
    const rol       = buscarRol(t.rol);
    const recepcion = buscarRecepcion(t.recepcion);

    const esperado = t.tiempoEsperado ?? tipo.tiempoEsperado;
    const claseTiempo = t.demora <= esperado ? 'rapido' : 'lento';

    const chips = ESTADISTICAS.map(def => {
      const d = t.deltas?.[def.id] ?? 0;
      const clase = d > 0 ? 'pos' : (d < 0 ? 'neg' : 'cero');
      const signo = d > 0 ? '+' : '';
      return `<span class="delta-chip ${clase}">${def.nombre} ${signo}${d}</span>`;
    }).join('');

    return `
      <article class="ticket-item">
        <div class="ticket-cab">
          <div class="ticket-nombre">#${t.id} ${escapar(t.nombre)}</div>
          <div>
            ${mostrarAutor ? `<div class="ticket-autor">${escapar(t.usuarioNombre ?? '--')}</div>` : ''}
            <div class="ticket-fecha">${formatearFecha(t.fecha)}</div>
          </div>
        </div>

        <div class="ticket-datos">
          <div class="dato"><b>CATEGORÍA</b><span>${tipo.nombre} (dif. ${tipo.dificultad})</span></div>
          <div class="dato"><b>DEMORA</b><span class="${claseTiempo}">${t.demora} min / esperado ${esperado} min</span></div>
          <div class="dato"><b>URGENCIA</b><span>${urgencia.nombre}</span></div>
          <div class="dato"><b>CREADO POR</b><span>${rol.nombre}</span></div>
          <div class="dato"><b>TDR</b><span>${recepcion.nombre}</span></div>
          <div class="dato"><b>NIVEL RESULTANTE</b><span>${t.nivelResultante ?? '--'}</span></div>
        </div>

        <div class="ticket-deltas">
          ${chips}
          <span class="delta-chip xp">+${t.xp ?? 0} XP</span>
        </div>
      </article>
    `;
  }).join('');
}

export function mostrarSubidaDeNivel({ nivelAnterior, nivelNuevo, rangoNuevo, topeNuevo }) {
  $('#levelup-old').textContent = nivelAnterior;
  $('#levelup-new').textContent = nivelNuevo;
  $('#levelup-rank').textContent = rangoNuevo;
  $('#levelup-cap-note').textContent = `Nuevo tope de estadísticas: ${topeNuevo}`;
  abrirModal('#modal-levelup');
}

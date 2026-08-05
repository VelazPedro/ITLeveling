/* =========================================================
   IT LEVELING — punto de entrada
   Une base de datos, estado, motor e interfaz. Sigue el flujo
   del diagrama: el usuario carga un ticket, el sistema calcula
   experiencia y estadísticas, y actualiza usuario y ticket.
   ========================================================= */

import * as db from './db.js';
import { crearEstado, hidratarEstado, serializarEstado, aplicarTicket } from './estado.js';
import {
  iniciarReloj, construirTarjetasEstadisticas, poblarFormulario,
  pintarDashboard, mostrarDeltas, abrirModal, cerrarModal, mostrarSubidaDeNivel,
  pintarLogin, mostrarLogin, mensajeLogin, alternarMenu, pintarRanking, pintarTickets
} from './ui.js';

let estado = null;   // personaje con la sesión abierta

/* ---------- Arranque ---------- */
async function iniciar() {
  iniciarReloj();
  construirTarjetasEstadisticas();
  poblarFormulario();
  conectarEventos();

  await db.abrirDb();
  await migrarPartidaVieja();
  await refrescarLogin();
  mostrarLogin(true);
}

/* Si existe una partida de la versión anterior (localStorage), se importa una sola vez */
async function migrarPartidaVieja() {
  const CLAVE = 'itleveling.save.v1';
  const crudo = localStorage.getItem(CLAVE);
  if (!crudo) return;

  try {
    const viejo = JSON.parse(crudo);
    const nombre = viejo?.usuario?.nombre || 'OPERADOR';

    if (!await db.obtenerUsuario(nombre)) {
      const importado = hidratarEstado({
        nombre,
        clave: db.normalizarNombre(nombre),
        nivel: viejo.nivel,
        estadisticas: viejo.estadisticas,
        ticketsTotales: viejo.tickets?.length ?? 0,
        xpTotal: (viejo.historial ?? []).reduce((acc, h) => acc + (h.xp ?? 0), 0),
        ultimoInforme: viejo.ultimoInforme
      });
      await db.guardarUsuario(serializarEstado(importado));
    }
  } catch {
    /* Partida vieja ilegible: se ignora */
  } finally {
    localStorage.removeItem(CLAVE);
  }
}

async function refrescarLogin() {
  pintarLogin(await db.listarUsuarios());
}

/* ---------- Eventos ---------- */
function conectarEventos() {
  /* --- Ingreso --- */
  document.querySelector('#form-login').addEventListener('submit', alIngresar);

  document.querySelector('#f-login-nombre').addEventListener('input', async (ev) => {
    const nombre = db.normalizarNombre(ev.target.value);
    if (nombre.length < 2) { mensajeLogin(''); return; }

    const existente = await db.obtenerUsuario(nombre);
    if (existente) {
      mensajeLogin(`Continuás como ${existente.nombre} — nivel ${existente.nivelActual}`, '');
    } else {
      mensajeLogin(`Se creará el personaje ${nombre} en nivel 1`, 'nuevo');
    }
  });

  document.querySelector('#login-existentes').addEventListener('click', (ev) => {
    const chip = ev.target.closest('.chip-usuario');
    if (!chip) return;
    document.querySelector('#f-login-nombre').value = chip.dataset.nombre;
    document.querySelector('#form-login').requestSubmit();
  });

  /* --- Menú --- */
  document.querySelector('#btn-menu').addEventListener('click', (ev) => {
    ev.stopPropagation();
    alternarMenu();
  });

  document.querySelector('#menu-drop').addEventListener('click', (ev) => {
    const item = ev.target.closest('.menu-item');
    if (!item) return;
    alternarMenu(false);
    manejarMenu(item.dataset.accion);
  });

  document.addEventListener('click', () => alternarMenu(false));

  /* --- Carga de ticket --- */
  const modalTicket = document.querySelector('#modal-ticket');

  document.querySelector('#btn-add-ticket').addEventListener('click', () => {
    abrirModal('#modal-ticket');
    document.querySelector('#f-nombre').focus();
  });

  document.querySelector('#btn-cancel-ticket').addEventListener('click', () => cerrarModal('#modal-ticket'));

  modalTicket.addEventListener('click', (ev) => {
    if (ev.target === modalTicket) cerrarModal('#modal-ticket');
  });

  document.querySelector('#form-ticket').addEventListener('submit', alEnviarTicket);

  /* --- Cierre genérico de ventanas --- */
  document.addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-cerrar]');
    if (boton) cerrarModal(boton.dataset.cerrar);
  });

  for (const sel of ['#modal-ranking', '#modal-tickets']) {
    const modal = document.querySelector(sel);
    modal.addEventListener('click', (ev) => { if (ev.target === modal) cerrarModal(sel); });
  }

  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    cerrarModal('#modal-ticket');
    cerrarModal('#modal-ranking');
    cerrarModal('#modal-tickets');
    alternarMenu(false);
  });

  document.querySelector('#btn-close-levelup').addEventListener('click', () => cerrarModal('#modal-levelup'));

  /* --- Filtro del compilado de tickets --- */
  document.querySelector('#f-filtro-tickets').addEventListener('change', abrirVentanaTickets);
}

/* ---------- Ingreso de usuario ---------- */
async function alIngresar(ev) {
  ev.preventDefault();

  const entrada = document.querySelector('#f-login-nombre').value;
  const nombre = db.normalizarNombre(entrada);

  if (nombre.length < 2) {
    mensajeLogin('El nombre necesita al menos 2 caracteres.', 'error');
    return;
  }

  const registro = await db.obtenerUsuario(nombre);

  if (registro) {
    estado = hidratarEstado(registro);
  } else {
    estado = crearEstado(nombre);
    await db.guardarUsuario(serializarEstado(estado));
  }

  mensajeLogin('');
  document.querySelector('#form-login').reset();
  mostrarLogin(false);
  pintarDashboard(estado);
}

/* ---------- Flujo principal: cargar ticket ---------- */
async function alEnviarTicket(ev) {
  ev.preventDefault();
  if (!estado) return;

  const form = ev.currentTarget;
  const datos = {
    nombre:    form.nombre.value.trim() || 'Ticket sin nombre',
    categoria: form.categoria.value,
    demora:    Number(form.demora.value),
    urgencia:  form.urgencia.value,
    rol:       form.rol.value,
    recepcion: form.recepcion.value
  };

  if (!Number.isFinite(datos.demora) || datos.demora <= 0) return;

  const resultado = aplicarTicket(estado, datos);

  /* Persistencia: primero el ticket, después el personaje actualizado */
  await db.agregarTicket(resultado.ticket);
  await db.guardarUsuario(serializarEstado(estado));

  form.reset();
  document.querySelector('#f-urgencia').value = 'media';
  cerrarModal('#modal-ticket');

  pintarDashboard(estado);
  mostrarDeltas(resultado.aplicados);

  if (resultado.subioNivel) {
    /* Se muestra apenas después del repintado para que se vea la barra moverse */
    setTimeout(() => mostrarSubidaDeNivel(resultado), 420);
  }
}

/* ---------- Ventanas del menú ---------- */
async function manejarMenu(accion) {
  if (accion === 'clasificacion') return abrirVentanaRanking();
  if (accion === 'tickets')       return abrirVentanaTickets();
  if (accion === 'cambiar')       return cambiarUsuario();
}

async function abrirVentanaRanking() {
  pintarRanking(await db.listarUsuarios(), estado?.clave);
  abrirModal('#modal-ranking');
}

async function abrirVentanaTickets() {
  const filtro = document.querySelector('#f-filtro-tickets').value;
  const tickets = filtro === 'todos'
    ? await db.listarTodosLosTickets()
    : await db.listarTicketsDeUsuario(estado?.nombre ?? '');

  pintarTickets(tickets, { mostrarAutor: filtro === 'todos' });
  abrirModal('#modal-tickets');
}

async function cambiarUsuario() {
  if (estado) await db.guardarUsuario(serializarEstado(estado));
  estado = null;
  await refrescarLogin();
  mensajeLogin('');
  mostrarLogin(true);
}

/* ---------- Utilidades de consola (para pruebas) ---------- */
window.ITL = {
  estado: () => estado,
  db,
  usuarios: () => db.listarUsuarios(),
  tickets: () => db.listarTodosLosTickets(),
  borrarUsuario: (nombre) => db.borrarUsuario(nombre)
};

iniciar();

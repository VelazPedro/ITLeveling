/* =========================================================
   ESTADO DEL JUGADOR
   Refleja el diagrama de clases: Usuario posee NivelExperiencia
   y seis Estadísticas; cada Ticket registra un ProgresoStatxTicket.
   La persistencia vive en la base local (js/db.js).
   ========================================================= */

import {
  ESTADISTICAS, NIVEL_MAXIMO,
  topeStatParaNivel, xpParaProximoNivel, rangoPorNivel
} from './config.js';
import { evaluarTicket } from './motor.js';
import { normalizarNombre } from './db.js';

/* ---------- Creación de un personaje nuevo ---------- */
export function crearEstado(nombre) {
  const estadisticas = {};
  for (const def of ESTADISTICAS) {
    estadisticas[def.id] = { actual: 0, maximo: def.sinTope ? null : topeStatParaNivel(1) };
  }

  const ahora = new Date().toISOString();

  return {
    clave: normalizarNombre(nombre),
    nombre: normalizarNombre(nombre),
    creado: ahora,
    nivel: {
      actual: 1,
      maximoPosible: NIVEL_MAXIMO,
      xp: 0,
      xpProximoNivel: xpParaProximoNivel(1)
    },
    /* Campos planos para poder ordenar la clasificación desde la base */
    nivelActual: 1,
    xpTotal: 0,
    ticketsTotales: 0,
    estadisticas,
    ultimoInforme: null
  };
}

/* ---------- Hidratación: registro de la base -> estado usable ---------- */
export function hidratarEstado(registro) {
  const base = crearEstado(registro.nombre ?? registro.clave);

  const estado = {
    ...base,
    ...registro,
    nivel: { ...base.nivel, ...(registro.nivel ?? {}) },
    estadisticas: { ...base.estadisticas }
  };

  for (const def of ESTADISTICAS) {
    const guardada = registro.estadisticas?.[def.id];
    if (!guardada) continue;
    estado.estadisticas[def.id] = {
      actual: Number(guardada.actual) || 0,
      maximo: def.sinTope ? null : topeStatParaNivel(estado.nivel.actual)
    };
  }

  /* Coherencia por si el registro viene de una versión anterior */
  estado.nivelActual = estado.nivel.actual;
  estado.xpTotal = Number(estado.xpTotal) || 0;
  estado.ticketsTotales = Number(estado.ticketsTotales) || 0;

  return estado;
}

/* ---------- Sólo los campos que se persisten ---------- */
export function serializarEstado(estado) {
  return {
    clave: estado.clave,
    nombre: estado.nombre,
    creado: estado.creado,
    nivel: estado.nivel,
    nivelActual: estado.nivel.actual,
    xpTotal: estado.xpTotal,
    ticketsTotales: estado.ticketsTotales,
    estadisticas: estado.estadisticas,
    ultimoInforme: estado.ultimoInforme
  };
}

/* ---------- Topes: se recalculan cada vez que cambia el nivel ---------- */
function actualizarTopes(estado) {
  const tope = topeStatParaNivel(estado.nivel.actual);
  for (const def of ESTADISTICAS) {
    const stat = estado.estadisticas[def.id];
    if (def.sinTope) { stat.maximo = null; continue; }
    stat.maximo = tope;
    if (stat.actual > tope) stat.actual = tope;
  }
}

/* =========================================================
   APLICAR TICKET
   Calcula con el motor y modifica el estado en memoria.
   Persistir es responsabilidad de app.js.
   ========================================================= */
export function aplicarTicket(estado, datosTicket) {
  const evaluacion = evaluarTicket(datosTicket);
  const fecha = new Date();

  /* --- Aplicar deltas respetando topes y el piso en 0 --- */
  const aplicados = {};
  for (const def of ESTADISTICAS) {
    const stat = estado.estadisticas[def.id];
    const delta = evaluacion.deltas[def.id] ?? 0;
    const antes = stat.actual;

    let nuevo = antes + delta;
    if (nuevo < 0) nuevo = 0;
    if (stat.maximo !== null && nuevo > stat.maximo) nuevo = stat.maximo;

    stat.actual = nuevo;
    aplicados[def.id] = {
      delta,
      real: nuevo - antes,
      antes,
      ahora: nuevo,
      topeAlcanzado: stat.maximo !== null && nuevo === stat.maximo
    };
  }

  /* --- Experiencia y subida de nivel --- */
  const nivelAnterior = estado.nivel.actual;
  let subidas = 0;

  if (estado.nivel.actual < NIVEL_MAXIMO) {
    estado.nivel.xp += evaluacion.xp;

    while (estado.nivel.actual < NIVEL_MAXIMO && estado.nivel.xp >= estado.nivel.xpProximoNivel) {
      estado.nivel.xp -= estado.nivel.xpProximoNivel;
      estado.nivel.actual += 1;
      estado.nivel.xpProximoNivel = xpParaProximoNivel(estado.nivel.actual);
      subidas += 1;
    }

    if (estado.nivel.actual >= NIVEL_MAXIMO) {
      estado.nivel.actual = NIVEL_MAXIMO;
      estado.nivel.xp = 0;
    }
  }

  if (subidas > 0) actualizarTopes(estado);

  estado.nivelActual = estado.nivel.actual;
  estado.xpTotal += evaluacion.xp;
  estado.ticketsTotales += 1;

  /* --- Registro que se guarda en la tabla de tickets --- */
  const registroTicket = {
    usuarioClave: estado.clave,
    usuarioNombre: estado.nombre,
    nombre: datosTicket.nombre,
    categoria: datosTicket.categoria,
    demora: Number(datosTicket.demora),
    tiempoEsperado: evaluacion.contexto.tiempoEsperado,
    urgencia: datosTicket.urgencia,
    rol: datosTicket.rol,
    recepcion: datosTicket.recepcion,
    fecha: fecha.toISOString(),
    deltas: evaluacion.deltas,   // ProgresoStatxTicket
    xp: evaluacion.xp,
    nivelResultante: estado.nivel.actual
  };

  const resultado = {
    ticket: registroTicket,
    evaluacion,
    aplicados,
    xpGanada: evaluacion.xp,
    subioNivel: subidas > 0,
    nivelAnterior,
    nivelNuevo: estado.nivel.actual,
    rangoNuevo: rangoPorNivel(estado.nivel.actual),
    topeNuevo: topeStatParaNivel(estado.nivel.actual)
  };

  estado.ultimoInforme = construirInforme(resultado);
  registroTicket.informe = estado.ultimoInforme;

  return resultado;
}

/* =========================================================
   INFORME AUTOMÁTICO
   Texto que se escribe solo debajo de las estadísticas según
   qué premió y qué falló el ticket recién cargado.
   ========================================================= */
export function construirInforme(resultado) {
  const { evaluacion, aplicados, ticket } = resultado;
  const ctx = evaluacion.contexto;

  const nombreDe = (id) => ESTADISTICAS.find(e => e.id === id).nombre;

  const positivos = Object.entries(aplicados)
    .filter(([, v]) => v.delta > 0)
    .sort((a, b) => b[1].delta - a[1].delta);

  const negativos = Object.entries(aplicados)
    .filter(([, v]) => v.delta < 0)
    .sort((a, b) => a[1].delta - b[1].delta);

  const partes = [];

  /* Encabezado: tiempo contra lo esperado */
  if (ctx.rendimiento > 0.35) {
    partes.push(`Cerraste <span class="hl">"${escapar(ticket.nombre)}"</span> en ${ctx.demora} min, muy por debajo de los ${ctx.tiempoEsperado} min esperados para un ticket de ${ctx.tipo.nombre.toLowerCase()}.`);
  } else if (ctx.rendimiento < -0.35) {
    partes.push(`<span class="hl">"${escapar(ticket.nombre)}"</span> te llevó ${ctx.demora} min contra los ${ctx.tiempoEsperado} min esperados. El sistema lo registra como demora.`);
  } else {
    partes.push(`<span class="hl">"${escapar(ticket.nombre)}"</span> se resolvió en ${ctx.demora} min, dentro de lo esperado (${ctx.tiempoEsperado} min).`);
  }

  /* Qué premió */
  if (positivos.length) {
    const lista = positivos.slice(0, 3)
      .map(([id, v]) => `<span class="up">${nombreDe(id)} +${v.delta}</span>`)
      .join(', ');
    partes.push(`El ticket premió ${lista}.`);
  }

  /* Qué falló */
  if (negativos.length) {
    const lista = negativos.slice(0, 3)
      .map(([id, v]) => `<span class="down">${nombreDe(id)} ${v.delta}</span>`)
      .join(', ');
    partes.push(`Falló en ${lista}.`);
  }

  /* Detalles de contexto que expliquen el resultado */
  if (ctx.recepcion.esVoluntario) {
    partes.push('Lo tomaste por voluntad propia: eso siempre suma y no tiene techo.');
  } else if (ctx.recepcion.id === 'derivado') {
    partes.push('Venía derivado de un compañero, así que pesó tu coordinación con el equipo.');
  } else if (ctx.recepcion.id === 'jarvis') {
    partes.push('Lo asignó Jarvis de forma automática: no hubo mérito de gestión propia.');
  }

  if (ctx.rol.importancia >= 4) {
    partes.push(`El pedido salió de ${ctx.rol.nombre.toLowerCase()}, así que la visibilidad fue alta.`);
  }

  /* Estadísticas que llegaron al tope */
  const enTope = Object.entries(aplicados).filter(([, v]) => v.topeAlcanzado && v.real > 0);
  if (enTope.length) {
    partes.push(`Llegaste al tope actual en ${enTope.map(([id]) => nombreDe(id)).join(', ')}: subí de nivel para ampliarlo.`);
  }

  partes.push(`Experiencia ganada: <span class="up">+${evaluacion.xp} XP</span>.`);

  return partes.join(' ');
}

export function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* =========================================================
   MOTOR DE CÁLCULO
   A partir de un ticket devuelve cuánto se ganó o perdió en
   cada estadística (ProgresoStatxTicket) y cuánta experiencia
   entregó el ticket. No toca el estado: sólo calcula.
   ========================================================= */

import { buscarTipo, buscarUrgencia, buscarRol, buscarRecepcion } from './config.js';

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor));

/* Límites de cuánto puede mover un solo ticket a una estadística */
const DELTA_MIN = -8;
const DELTA_MAX = 10;

/**
 * @param {{categoria:string, demora:number, urgencia:string, rol:string, recepcion:string}} ticket
 * @returns {{deltas:Object, xp:number, contexto:Object}}
 */
export function evaluarTicket(ticket) {
  const tipo      = buscarTipo(ticket.categoria);
  const urgencia  = buscarUrgencia(ticket.urgencia);
  const rol       = buscarRol(ticket.rol);
  const recepcion = buscarRecepcion(ticket.recepcion);

  const demora = Math.max(1, Number(ticket.demora) || 1);

  /* Tiempo que "debería" haber tardado: referencia del tipo ajustada por urgencia
     (a mayor urgencia, menos margen de tiempo aceptable). */
  const tiempoEsperado = Math.max(5, tipo.tiempoEsperado * urgencia.factorTiempo);

  /* ratio > 1 => se resolvió más rápido de lo esperado */
  const ratio = tiempoEsperado / demora;

  /* Rendimiento normalizado en el rango [-1, 1] aproximadamente */
  const rendimiento = limitar(Math.log2(ratio), -1.6, 1.6);

  const impRol = rol.importancia;
  const peso   = urgencia.peso;

  /* ---------- VELOCIDAD ----------
     Premia resolver por debajo del tiempo esperado; castiga colgarse.
     La urgencia amplifica tanto el premio como el castigo. */
  const velocidad = rendimiento * 4.2 * peso;

  /* ---------- INVESTIGACIÓN ----------
     Sube con la dificultad del tipo: los tickets complejos exigen indagar.
     Bonus extra si además llevó tiempo (se investigó de verdad).
     Baja si un ticket trivial se estiró de forma desproporcionada. */
  let investigacion = (tipo.dificultad - 2) * 1.6;
  if (tipo.dificultad >= 4 && rendimiento < 0) investigacion += 2.2;
  if (tipo.dificultad <= 2 && ratio < 0.5)     investigacion -= 3.0;

  /* ---------- COMUNICACIÓN ----------
     Interacción con el resto: derivaciones, roles altos, urgencias fuertes. */
  let comunicacion = recepcion.comunicacion + (impRol - 1) * 0.85;
  if (urgencia.id === 'critica') comunicacion += 1;

  /* ---------- CONFIANZA ----------
     Cuánto se puede contar con vos: importancia del pedido cumplido a tiempo.
     Fallar en algo importante duele más que fallar en algo menor. */
  const pesoImportancia = (tipo.importancia + impRol) / 2;   // 1 a 5
  let confianza = recepcion.confianza + rendimiento * 1.9 * (pesoImportancia / 2.5);
  confianza += (pesoImportancia - 2.5) * 0.7;

  /* ---------- EFECTIVIDAD ----------
     Resultado global del ticket: resolver, y resolverlo bien. */
  let efectividad = 1.4 + rendimiento * 2.6 + (tipo.dificultad - 2) * 0.7;
  efectividad *= (0.85 + peso * 0.2);

  /* ---------- VOLUNTARIO ----------
     Sólo suma cuando el ticket se tomó por decisión propia. Nunca resta. */
  const voluntario = recepcion.esVoluntario
    ? 3 + tipo.dificultad * 0.8 + (peso - 1) * 2
    : 0;

  const deltas = {
    velocidad:     redondearDelta(velocidad),
    confianza:     redondearDelta(confianza),
    investigacion: redondearDelta(investigacion),
    comunicacion:  redondearDelta(comunicacion),
    efectividad:   redondearDelta(efectividad),
    voluntario:    Math.max(0, redondearDelta(voluntario))
  };

  /* ---------- EXPERIENCIA ----------
     Todo ticket cerrado deja experiencia: nunca es negativa, pero
     resolver rápido, difícil y urgente rinde bastante más. */
  const xpBase  = 18 + tipo.dificultad * 7 + (peso - 0.8) * 14;
  const xpBonus = Math.max(0, rendimiento) * 12
                + (recepcion.esVoluntario ? 12 : 0)
                + (impRol - 1) * 2;
  const xpPenal = Math.max(0, -rendimiento) * 6;
  const xp = Math.max(5, Math.round(xpBase + xpBonus - xpPenal));

  return {
    deltas,
    xp,
    contexto: {
      tipo, urgencia, rol, recepcion,
      demora,
      tiempoEsperado: Math.round(tiempoEsperado),
      rendimiento
    }
  };
}

function redondearDelta(valor) {
  const redondeado = valor >= 0 ? Math.ceil(valor) : Math.floor(valor);
  return limitar(redondeado, DELTA_MIN, DELTA_MAX);
}

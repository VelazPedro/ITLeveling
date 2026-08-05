/* =========================================================
   CONFIGURACIÓN GENERAL DEL SISTEMA
   Todo lo que se pueda ajustar sin tocar la lógica vive acá.
   ========================================================= */

/* ---------- Nivel y experiencia ---------- */
export const NIVEL_MAXIMO = 100;

/* Tope de estadísticas: base al nivel 1 + crecimiento por cada nivel ganado */
export const TOPE_BASE = 20;
export const CRECIMIENTO_POR_NIVEL = 2;

/* Curva de experiencia: puntos necesarios para pasar del nivel N al N+1 */
export const XP_BASE = 80;
export const XP_POR_NIVEL = 20;

/* ---------- Estadísticas ---------- */
/* "sinTope: true" => la estadística crece sin límite (Voluntario) */
export const ESTADISTICAS = [
  { id: 'velocidad',     nombre: 'VELOCIDAD',     arte: 'rayo',      sinTope: false },
  { id: 'confianza',     nombre: 'CONFIANZA',     arte: 'escudo',    sinTope: false },
  { id: 'investigacion', nombre: 'INVESTIGACIÓN', arte: 'lupa',      sinTope: false },
  { id: 'comunicacion',  nombre: 'COMUNICACIÓN',  arte: 'burbuja',   sinTope: false },
  { id: 'efectividad',   nombre: 'EFECTIVIDAD',   arte: 'diana',     sinTope: false },
  { id: 'voluntario',    nombre: 'VOLUNTARIO',    arte: 'estrella',  sinTope: true  }
];

/* ---------- Tipos de ticket (TipoTicket del diagrama) ----------
   dificultad: 1 a 5   -> cuánto conocimiento/investigación exige
   importancia: 1 a 5  -> cuánto pesa para la operación del negocio
   tiempoEsperado: minutos de referencia para una resolución "normal"
------------------------------------------------------------------ */
export const TIPOS_TICKET = [
  { id: 'accesos',     nombre: 'Accesos y permisos',   dificultad: 1, importancia: 3, tiempoEsperado: 20 },
  { id: 'impresoras',  nombre: 'Impresoras',           dificultad: 2, importancia: 2, tiempoEsperado: 35 },
  { id: 'telefonia',   nombre: 'Telefonía',            dificultad: 2, importancia: 2, tiempoEsperado: 30 },
  { id: 'correo',      nombre: 'Correo y Office',      dificultad: 2, importancia: 3, tiempoEsperado: 30 },
  { id: 'software',    nombre: 'Software de escritorio', dificultad: 3, importancia: 3, tiempoEsperado: 50 },
  { id: 'hardware',    nombre: 'Hardware',             dificultad: 3, importancia: 4, tiempoEsperado: 60 },
  { id: 'redes',       nombre: 'Redes y conectividad', dificultad: 4, importancia: 4, tiempoEsperado: 75 },
  { id: 'servidores',  nombre: 'Servidores y servicios', dificultad: 5, importancia: 5, tiempoEsperado: 110 },
  { id: 'otro',        nombre: 'Otro / sin categoría', dificultad: 2, importancia: 2, tiempoEsperado: 40 }
];

/* ---------- Urgencia del ticket ---------- */
export const URGENCIAS = [
  { id: 'baja',    nombre: 'Baja',    peso: 0.8, factorTiempo: 1.30 },
  { id: 'media',   nombre: 'Media',   peso: 1.0, factorTiempo: 1.00 },
  { id: 'alta',    nombre: 'Alta',    peso: 1.3, factorTiempo: 0.75 },
  { id: 'critica', nombre: 'Crítica', peso: 1.6, factorTiempo: 0.55 }
];

/* ---------- Rol de quien crea el ticket ---------- */
export const ROLES = [
  { id: 'usuario',   nombre: 'Usuario final',       importancia: 1 },
  { id: 'referente', nombre: 'Referente de sector',  importancia: 2 },
  { id: 'jefatura',  nombre: 'Jefatura',             importancia: 3 },
  { id: 'gerencia',  nombre: 'Gerencia',             importancia: 4 },
  { id: 'direccion', nombre: 'Dirección',            importancia: 5 }
];

/* ---------- TDR: cómo llegó el ticket a tus manos ---------- */
export const RECEPCIONES = [
  { id: 'jarvis',     nombre: 'Tomado por Jarvis (automático)', comunicacion: 0, confianza:  0, esVoluntario: false },
  { id: 'manual',     nombre: 'Asignado manualmente',           comunicacion: 1, confianza:  1, esVoluntario: false },
  { id: 'derivado',   nombre: 'Derivado de un compañero',       comunicacion: 3, confianza:  2, esVoluntario: false },
  { id: 'voluntario', nombre: 'Tomado voluntariamente',         comunicacion: 2, confianza:  2, esVoluntario: true  }
];

/* ---------- Rangos por nivel ---------- */
export function rangoPorNivel(nivel) {
  if (nivel >= NIVEL_MAXIMO) return 'REGEN DE RAFA';
  if (nivel >= 81) return 'REFERENTE DE FACTO';
  if (nivel >= 66) return 'SOPORTE DE JERARQUÍA';
  if (nivel >= 51) return 'REY DE LOS WACHINES';
  if (nivel >= 36) return 'TIPO DE MEGATECH';
  if (nivel >= 21) return 'SOPORTE NIVEL -1';
  if (nivel >= 11) return 'TIPO QUE RESUELVE';
  return 'RANDOM';
}

/* ---------- Tope de estadística según el nivel ---------- */
export function topeStatParaNivel(nivel) {
  if (nivel <= 1) return TOPE_BASE;
  return TOPE_BASE + (nivel - 1) * CRECIMIENTO_POR_NIVEL;
}

/* ---------- Experiencia necesaria para el próximo nivel ---------- */
export function xpParaProximoNivel(nivel) {
  return XP_BASE + (nivel - 1) * XP_POR_NIVEL;
}

/* ---------- Buscadores utilitarios ---------- */
export const buscarTipo      = (id) => TIPOS_TICKET.find(t => t.id === id) ?? TIPOS_TICKET.at(-1);
export const buscarUrgencia  = (id) => URGENCIAS.find(u => u.id === id) ?? URGENCIAS[1];
export const buscarRol       = (id) => ROLES.find(r => r.id === id) ?? ROLES[0];
export const buscarRecepcion = (id) => RECEPCIONES.find(r => r.id === id) ?? RECEPCIONES[0];

/* =========================================================
   BASE DE DATOS LOCAL (IndexedDB)
   Corre entera dentro de la máquina del usuario: no hay
   servidor ni conexión. Guarda un registro por personaje y
   todos los tickets cargados, con su cálculo de stats.

   Tablas:
     usuarios -> clave: nombre normalizado
     tickets  -> id autoincremental, índice por usuario
   ========================================================= */

const DB_NOMBRE = 'itleveling';
const DB_VERSION = 1;

const TABLA_USUARIOS = 'usuarios';
const TABLA_TICKETS  = 'tickets';

let _db = null;

/* Normaliza el nombre para que "pablo", "Pablo " y "PABLO" sean el mismo personaje */
export function normalizarNombre(nombre) {
  return String(nombre ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/* ---------- Apertura y creación del esquema ---------- */
export function abrirDb() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(DB_NOMBRE, DB_VERSION);

    pedido.onupgradeneeded = (ev) => {
      const db = ev.target.result;

      if (!db.objectStoreNames.contains(TABLA_USUARIOS)) {
        const usuarios = db.createObjectStore(TABLA_USUARIOS, { keyPath: 'clave' });
        usuarios.createIndex('porNivel', 'nivelActual');
        usuarios.createIndex('porXpTotal', 'xpTotal');
      }

      if (!db.objectStoreNames.contains(TABLA_TICKETS)) {
        const tickets = db.createObjectStore(TABLA_TICKETS, { keyPath: 'id', autoIncrement: true });
        tickets.createIndex('porUsuario', 'usuarioClave');
        tickets.createIndex('porFecha', 'fecha');
      }
    };

    pedido.onsuccess = () => { _db = pedido.result; resolve(_db); };
    pedido.onerror   = () => reject(pedido.error);
  });
}

/* ---------- Helpers de transacción ---------- */
function transaccion(tablas, modo) {
  return _db.transaction(tablas, modo);
}

function comoPromesa(pedido) {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror   = () => reject(pedido.error);
  });
}

/* =========================== USUARIOS =========================== */

export async function obtenerUsuario(nombre) {
  await abrirDb();
  const clave = normalizarNombre(nombre);
  const tx = transaccion([TABLA_USUARIOS], 'readonly');
  return comoPromesa(tx.objectStore(TABLA_USUARIOS).get(clave));
}

export async function guardarUsuario(registro) {
  await abrirDb();
  const tx = transaccion([TABLA_USUARIOS], 'readwrite');
  const guardado = { ...registro, actualizado: new Date().toISOString() };
  await comoPromesa(tx.objectStore(TABLA_USUARIOS).put(guardado));
  return guardado;
}

export async function listarUsuarios() {
  await abrirDb();
  const tx = transaccion([TABLA_USUARIOS], 'readonly');
  const todos = await comoPromesa(tx.objectStore(TABLA_USUARIOS).getAll());

  /* Clasificación: primero por nivel, después por experiencia acumulada */
  return todos.sort((a, b) =>
    (b.nivelActual - a.nivelActual) ||
    (b.xpTotal - a.xpTotal) ||
    a.nombre.localeCompare(b.nombre)
  );
}

export async function borrarUsuario(nombre) {
  await abrirDb();
  const clave = normalizarNombre(nombre);
  const tx = transaccion([TABLA_USUARIOS, TABLA_TICKETS], 'readwrite');

  tx.objectStore(TABLA_USUARIOS).delete(clave);

  const indice = tx.objectStore(TABLA_TICKETS).index('porUsuario');
  const cursorPedido = indice.openCursor(IDBKeyRange.only(clave));
  cursorPedido.onsuccess = (ev) => {
    const cursor = ev.target.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror    = () => reject(tx.error);
  });
}

/* =========================== TICKETS =========================== */

export async function agregarTicket(registro) {
  await abrirDb();
  const tx = transaccion([TABLA_TICKETS], 'readwrite');
  const id = await comoPromesa(tx.objectStore(TABLA_TICKETS).add(registro));
  return { ...registro, id };
}

export async function listarTicketsDeUsuario(nombre) {
  await abrirDb();
  const clave = normalizarNombre(nombre);
  const tx = transaccion([TABLA_TICKETS], 'readonly');
  const indice = tx.objectStore(TABLA_TICKETS).index('porUsuario');
  const lista = await comoPromesa(indice.getAll(IDBKeyRange.only(clave)));
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function listarTodosLosTickets() {
  await abrirDb();
  const tx = transaccion([TABLA_TICKETS], 'readonly');
  const lista = await comoPromesa(tx.objectStore(TABLA_TICKETS).getAll());
  return lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function contarTickets(nombre) {
  await abrirDb();
  const clave = normalizarNombre(nombre);
  const tx = transaccion([TABLA_TICKETS], 'readonly');
  const indice = tx.objectStore(TABLA_TICKETS).index('porUsuario');
  return comoPromesa(indice.count(IDBKeyRange.only(clave)));
}

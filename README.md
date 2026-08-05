# IT Leveling

Dashboard de gamificación para soporte IT: cargás tickets y el sistema calcula
solo la experiencia, el nivel y las seis estadísticas del operador.

## Cómo ejecutarlo

### Como aplicación de escritorio (.exe)

`dist\IT Leveling.exe` es un único archivo portable: doble clic y abre en su propia
ventana, sin navegador ni URL que escribir. Pesa ~14 MB y no necesita Python instalado
en la máquina donde corre.

Para recompilarlo después de tocar el código:

```bash
python -m pip install pywebview pyinstaller
```

```bash
powershell -ExecutionPolicy Bypass -File build.ps1
```

Detalles del empaquetado ([main.py](main.py)):

- Usa **WebView2** (el motor de Edge, ya viene con Windows 10/11), por eso el .exe es chico.
- Adentro levanta un servidor local en `127.0.0.1:47820`, pero eso es transparente: la app
  lo arranca y lo cierra sola. El puerto es fijo a propósito, porque IndexedDB separa los
  datos por origen y un puerto al azar borraría el progreso en cada arranque.
- Los datos van a `%LOCALAPPDATA%\ITLeveling`, así que sobreviven a cerrar la app y a
  recompilar el .exe. Para empezar de cero, borrar esa carpeta.
- Si el puerto está ocupado (típicamente porque ya hay una ventana abierta), avisa con un
  cartel en vez de fallar en silencio.

### En el navegador (desarrollo)

Usa módulos ES, así que necesita servirse por HTTP (abrirlo con doble clic no alcanza).

```bash
python -m http.server 5173
```

Después entrar a `http://localhost:5173`.

## Estructura

| Archivo | Qué hace |
|---|---|
| `main.py` | Envoltorio de escritorio: ventana nativa + servidor interno en puerto fijo. |
| `build.ps1` | Compila el `.exe` de un solo archivo con PyInstaller. |
| `index.html` | Estructura del dashboard y los dos modales (carga de ticket / subida de nivel). |
| `css/styles.css` | Estética: degradé azul, bordes duros, sin radios, scanlines CRT. |
| `js/db.js` | Base de datos local (IndexedDB): tablas `usuarios` y `tickets`. Sin servidor ni conexión. |
| `js/config.js` | Todo lo parametrizable: stats, tipos de ticket, urgencias, roles, TDR, rangos, topes y curva de XP. |
| `js/pixelart.js` | Sprites dibujados como grillas de caracteres, convertidos a SVG. Sin imágenes externas. |
| `js/motor.js` | Cálculo puro: ticket → deltas de cada estadística + XP. |
| `js/estado.js` | Usuario, nivel, estadísticas, historial, persistencia y armado del informe automático. |
| `js/ui.js` | Pintado del dashboard. |
| `js/app.js` | Une todo y maneja los eventos. |

## Base de datos y sesiones

Toda la información vive en **IndexedDB**, la base que trae el navegador: es una base
real (tablas, índices, transacciones) que corre 100% en la máquina, sin servidor ni internet.

- Tabla `usuarios` — un registro por personaje, con clave el nombre normalizado
  (mayúsculas y sin espacios de más, así "pablo", "Pablo " y "PABLO" son el mismo).
  Guarda nivel, XP, XP total acumulada, las seis estadísticas, tickets totales y el último informe.
- Tabla `tickets` — id autoincremental, índices por usuario y por fecha. Guarda los datos
  cargados más el `ProgresoStatxTicket` (delta de cada estadística) y la XP que dio.

Antes de entrar, la pantalla de ingreso pide el nombre. Si ya existe, se recupera el
progreso tal cual quedó; si no, se crea el personaje en nivel 1. Debajo aparecen los
personajes guardados para entrar de un clic. Si venías de la versión anterior con partida
en localStorage, se importa automáticamente la primera vez.

## Ventanas del menú

El botón de menú (arriba a la izquierda) abre:

- **CLASIFICACIÓN** — tabla con todos los personajes creados, ordenados por nivel y después
  por XP total, con rango y cantidad de tickets. Tu fila queda resaltada.
- **TICKETS** — compilado de todos los tickets cargados, del más nuevo al más viejo, con el
  detalle completo: categoría y dificultad, demora real contra la esperada, urgencia, rol
  de quien lo creó, TDR, nivel resultante y cuánto movió cada estadística. Se puede filtrar
  entre los tuyos y los de todos los personajes.
- **CAMBIAR USUARIO** — guarda y vuelve a la pantalla de ingreso.

## Cómo se calculan las estadísticas

Cada ticket aporta: categoría (dificultad e importancia), demora real, urgencia,
rol de quien lo creó y TDR (cómo llegó: Jarvis, asignado, derivado o voluntario).

El motor compara la demora contra un tiempo esperado (referencia del tipo ajustada
por urgencia) y de ahí sale un rendimiento entre -1.6 y 1.6 que alimenta cada stat:

- **Velocidad** — rendimiento contra el tiempo esperado, amplificado por la urgencia.
- **Confianza** — importancia del pedido cumplido en término; fallar en algo importante resta más.
- **Investigación** — sube con la dificultad; extra si además llevó tiempo; resta si un ticket trivial se estiró.
- **Comunicación** — derivaciones, roles altos y urgencias críticas.
- **Efectividad** — resultado global del ticket.
- **Voluntario** — sólo suma cuando el ticket se tomó por decisión propia. Sin tope.

Ningún delta supera ±8/+10 por ticket, y ninguna stat baja de 0.

## Nivel y topes

- Nivel máximo: 100. XP para el próximo nivel: `80 + (nivel - 1) * 20`.
- Tope de stats: `20 + (nivel - 1) * 2` (nivel 1 = 20, nivel 100 = 218). Voluntario no tiene tope.
- Al subir de nivel aparece el panel dorado con nivel anterior, nuevo, rango y tope nuevo.

## Rangos

| Nivel | Rango |
|---|---|
| 100 | REGEN DE RAFA |
| 81-99 | REFERENTE DE FACTO |
| 66-80 | SOPORTE DE JERARQUÍA |
| 51-65 | REY DE LOS WACHINES |
| 36-50 | TIPO DE MEGATECH |
| 21-35 | SOPORTE NIVEL -1 |
| 11-20 | TIPO QUE RESUELVE |
| 1-10 | RANDOM |

## Utilidades de consola

```js
ITL.estado()               // personaje con la sesión abierta
ITL.usuarios()             // todos los personajes de la base
ITL.tickets()              // todos los tickets de la base
ITL.borrarUsuario('PABLO') // borra un personaje y sus tickets
```

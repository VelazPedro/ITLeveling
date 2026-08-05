/* =========================================================
   PIXEL ART POR CÓDIGO
   Cada dibujo es una grilla de caracteres + una paleta.
   Se convierte a SVG (un <rect> por pixel encendido), así
   no hacen falta imágenes externas y escala sin verse borroso.
   ========================================================= */

const PALETA = {
  '.': null,            // transparente
  'k': '#050a1c',       // contorno oscuro
  'w': '#ffffff',
  'a': '#ffe066',       // amarillo claro
  'b': '#f2a900',       // amarillo oscuro
  'c': '#7cc4ff',       // celeste claro
  'd': '#2f6fd0',       // azul medio
  'e': '#55e6ff',       // cyan
  'f': '#45e06a',       // verde
  'g': '#177a35',       // verde oscuro
  'h': '#ff5a5a',       // rojo
  'i': '#a11d1d',       // rojo oscuro
  'j': '#ffd54a',       // dorado
  'l': '#b8860b',       // dorado oscuro
  'm': '#dbe7ff',       // gris azulado claro
  'n': '#8ea6dd',       // gris azulado medio
  'p': '#f2c49b',       // piel
  'q': '#c98f63'        // piel sombra
};

/* --------------------- SPRITES 12x12 --------------------- */

const SPRITES = {
  /* VELOCIDAD — rayo */
  rayo: [
    '....kkkk....',
    '...kaaak....',
    '..kaaabk....',
    '.kaaabk.....',
    'kaaabkkkkk..',
    'kaaaaaaaabk.',
    'kbkkkaaabk..',
    '...kaaabk...',
    '..kaaabk....',
    '.kaaabk.....',
    '.kabk.......',
    '..kk........'
  ],

  /* CONFIANZA — escudo con tilde */
  escudo: [
    '.kkkkkkkkkk.',
    'kccccccccddk',
    'kcccccccccdk',
    'kccccccwccdk',
    'kcccccwwcddk',
    'kcwccwwcccdk',
    'kcwwwwcccddk',
    '.kcwwccccdk.',
    '.kcccccccdk.',
    '..kcccccdk..',
    '...kcdddk...',
    '....kkkk....'
  ],

  /* INVESTIGACIÓN — lupa */
  lupa: [
    '...kkkkk....',
    '..kmeeemk...',
    '.kmewwwemk..',
    '.kewwweeek..',
    '.kewwweeek..',
    '.kmeeeeemk..',
    '..kmeeemk...',
    '...kkkkkk...',
    '.....kmmk...',
    '......kmmk..',
    '.......kmk..',
    '........kk..'
  ],

  /* COMUNICACIÓN — burbuja de diálogo */
  burbuja: [
    'kkkkkkkkkkk.',
    'kfffffffffgk',
    'kfwwfwwfwwgk',
    'kfffffffffgk',
    'kfwwwfwwwfgk',
    'kfffffffffgk',
    'kfwwfwwwfggk',
    'kgggggggggdk',
    'kkkkkgggkkk.',
    '..kggggk....',
    '..kggk......',
    '..kk........'
  ],

  /* EFECTIVIDAD — diana */
  diana: [
    '...kkkkkk...',
    '..khhhhhhk..',
    '.khwwwwwwhk.',
    'khwwhhhhwwhk',
    'khwhhwwhhwhk',
    'khwhwwwwhwhk',
    'khwhwwwwhwhk',
    'khwhhwwhhwhk',
    'khwwhhhhwwhk',
    '.khwwwwwwhk.',
    '..kiiiiiik..',
    '...kkkkkk...'
  ],

  /* VOLUNTARIO — estrella */
  estrella: [
    '.....kk.....',
    '....kjjk....',
    '....kjjk....',
    'kkkkjjjjkkkk',
    'kjjjjjjjjjjk',
    'kljjjjjjjjlk',
    '.kljjjjjjlk.',
    '..kjjjjjjk..',
    '..kjjkkjjk..',
    '.kjjk..kjjk.',
    'kllk....kllk',
    'kk........kk'
  ]
};

/* --------------- AVATAR 16x16 (soporte con vincha) --------------- */
const AVATAR = [
  '.....kkkkkk.....',
  '....kddddddk....',
  '...kdddddddddk..',
  '..kkddddddddkk..',
  '..kdkppppppkdk..',
  '..kdkppppppkdk..',
  '..kdkpkppkpkdk..',
  '...kppppppppk...',
  '...kpkqqqqkpk...',
  '....kppppppk....',
  '.....kkppkk.....',
  '...kkddddddkk...',
  '..kdddewwedddk..',
  '..kddeewweeddk..',
  '..kddkkkkkkddk..',
  '..kkk......kkk..'
];

/* --------------------------------------------------------
   Convierte una grilla a una cadena SVG.
   -------------------------------------------------------- */
function grillaASvg(grilla, { escala = 1 } = {}) {
  const alto = grilla.length;
  const ancho = grilla[0].length;
  const rects = [];

  for (let y = 0; y < alto; y++) {
    const fila = grilla[y];
    let x = 0;
    while (x < ancho) {
      const ch = fila[x];
      const color = PALETA[ch];
      if (!color) { x++; continue; }

      /* Agrupa pixeles contiguos del mismo color en un solo rect */
      let largo = 1;
      while (x + largo < ancho && fila[x + largo] === ch) largo++;

      rects.push(`<rect x="${x}" y="${y}" width="${largo}" height="1" fill="${color}"/>`);
      x += largo;
    }
  }

  return `<svg viewBox="0 0 ${ancho} ${alto}" width="${ancho * escala}" height="${alto * escala}" `
       + `xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" aria-hidden="true">`
       + rects.join('')
       + `</svg>`;
}

/* API pública */
export function spriteEstadistica(nombreArte) {
  const grilla = SPRITES[nombreArte];
  if (!grilla) return '';
  return grillaASvg(grilla);
}

export function spriteAvatar() {
  return grillaASvg(AVATAR);
}

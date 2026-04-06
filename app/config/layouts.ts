// Layouts para el editor de fotolibros Zeika
// Todos los valores en porcentajes (0–100) relativos a una sola página.
// Sistema de márgenes: 3% en los bordes, 3% de gap entre frames.
//
// Columnas iguales:
//   2 cols → x1=3 w=45 | gap4 | x2=52 w=45          (total 97%)
//   3 cols → x1=3 w=29 | gap3 | x2=35 w=29 | gap3 | x3=67 w=30   (total 97%)
//   4 cols → x1=3 w=21 | x2=27 w=21 | x3=51 w=21 | x4=75 w=22   (total 97%)
//
// Filas iguales: misma lógica en el eje Y.

export type Frame = {
  x: number; // % desde el borde izquierdo
  y: number; // % desde el borde superior
  w: number; // % del ancho de la página
  h: number; // % del alto de la página
};

export type Layout = {
  id: string;
  nombre: string;
  cantidadFotos: number;
  frames: Frame[];
};

// ─── 1 FOTO ────────────────────────────────────────────────────────────────

const layout_full: Layout = {
  id: 'full',
  nombre: 'Página completa',
  cantidadFotos: 1,
  frames: [
    { x: 0, y: 0, w: 100, h: 100 },
  ],
};

const layout_centered: Layout = {
  id: 'centered',
  nombre: 'Centrada',
  cantidadFotos: 1,
  frames: [
    { x: 3, y: 3, w: 94, h: 94 },
  ],
};

const layout_top: Layout = {
  id: 'top',
  nombre: 'Foto arriba',
  cantidadFotos: 1,
  // Foto ocupa el 65% superior; espacio para texto/caption debajo.
  frames: [
    { x: 3, y: 3, w: 94, h: 65 },
  ],
};

const layout_panoramica: Layout = {
  id: 'panoramica',
  nombre: 'Panorámica',
  cantidadFotos: 1,
  // Franja horizontal centrada verticalmente (28%→72% = 44% alto).
  frames: [
    { x: 3, y: 28, w: 94, h: 44 },
  ],
};

// ─── 2 FOTOS ───────────────────────────────────────────────────────────────

const layout_2_vertical: Layout = {
  id: '2-vertical',
  nombre: 'Dos columnas',
  cantidadFotos: 2,
  frames: [
    { x: 3,  y: 3, w: 45, h: 94 },
    { x: 52, y: 3, w: 45, h: 94 },
  ],
};

const layout_2_horizontal: Layout = {
  id: '2-horizontal',
  nombre: 'Dos filas',
  cantidadFotos: 2,
  frames: [
    { x: 3, y: 3,  w: 94, h: 45 },
    { x: 3, y: 52, w: 94, h: 45 },
  ],
};

const layout_2_grande_chica: Layout = {
  id: '2-grande-chica',
  nombre: 'Grande arriba',
  cantidadFotos: 2,
  // Grande: 63% del alto. Chica: 28%.
  frames: [
    { x: 3, y: 3,  w: 94, h: 63 },
    { x: 3, y: 69, w: 94, h: 28 },
  ],
};

const layout_2_chica_grande: Layout = {
  id: '2-chica-grande',
  nombre: 'Grande abajo',
  cantidadFotos: 2,
  // Chica: 28% del alto. Grande: 63%.
  frames: [
    { x: 3, y: 3,  w: 94, h: 28 },
    { x: 3, y: 34, w: 94, h: 63 },
  ],
};

// ─── 3 FOTOS ───────────────────────────────────────────────────────────────

const layout_3_columnas: Layout = {
  id: '3-columnas',
  nombre: 'Tres columnas',
  cantidadFotos: 3,
  frames: [
    { x: 3,  y: 3, w: 29, h: 94 },
    { x: 35, y: 3, w: 29, h: 94 },
    { x: 67, y: 3, w: 30, h: 94 },
  ],
};

const layout_3_top_2bottom: Layout = {
  id: '3-top-2bottom',
  nombre: 'Grande arriba, dos abajo',
  cantidadFotos: 3,
  // Grande: 56% del alto. Dos abajo: 35%.
  frames: [
    { x: 3,  y: 3,  w: 94, h: 56 },
    { x: 3,  y: 62, w: 45, h: 35 },
    { x: 52, y: 62, w: 45, h: 35 },
  ],
};

const layout_3_2top_bottom: Layout = {
  id: '3-2top-bottom',
  nombre: 'Dos arriba, grande abajo',
  cantidadFotos: 3,
  // Dos arriba: 35%. Grande: 56%.
  frames: [
    { x: 3,  y: 3,  w: 45, h: 35 },
    { x: 52, y: 3,  w: 45, h: 35 },
    { x: 3,  y: 41, w: 94, h: 56 },
  ],
};

const layout_3_izq_2der: Layout = {
  id: '3-izq-2der',
  nombre: 'Grande izquierda, dos derecha',
  cantidadFotos: 3,
  // Grande izq: 55% del ancho. Derecha: 36%, dos filas iguales.
  frames: [
    { x: 3,  y: 3,  w: 55, h: 94 },
    { x: 61, y: 3,  w: 36, h: 45 },
    { x: 61, y: 52, w: 36, h: 45 },
  ],
};

// ─── 4 FOTOS ───────────────────────────────────────────────────────────────

const layout_4_grid: Layout = {
  id: '4-grid',
  nombre: 'Grilla 2×2',
  cantidadFotos: 4,
  frames: [
    { x: 3,  y: 3,  w: 45, h: 45 },   // top-left
    { x: 52, y: 3,  w: 45, h: 45 },   // top-right
    { x: 3,  y: 52, w: 45, h: 45 },   // bottom-left
    { x: 52, y: 52, w: 45, h: 45 },   // bottom-right
  ],
};

const layout_4_hero_3: Layout = {
  id: '4-hero-3',
  nombre: 'Grande arriba, tres abajo',
  cantidadFotos: 4,
  // Grande: 52% del alto. Tres abajo: 39%.
  frames: [
    { x: 3,  y: 3,  w: 94, h: 52 },
    { x: 3,  y: 58, w: 29, h: 39 },
    { x: 35, y: 58, w: 29, h: 39 },
    { x: 67, y: 58, w: 30, h: 39 },
  ],
};

const layout_4_3_hero: Layout = {
  id: '4-3-hero',
  nombre: 'Tres arriba, grande abajo',
  cantidadFotos: 4,
  // Tres arriba: 39%. Grande: 52%.
  frames: [
    { x: 3,  y: 3,  w: 29, h: 39 },
    { x: 35, y: 3,  w: 29, h: 39 },
    { x: 67, y: 3,  w: 30, h: 39 },
    { x: 3,  y: 45, w: 94, h: 52 },
  ],
};

const layout_4_col_grid: Layout = {
  id: '4-col-grid',
  nombre: 'Dos columnas de dos',
  cantidadFotos: 4,
  // Mismo grid 2×2 pero ordenado por columna (izq arriba→abajo, der arriba→abajo).
  frames: [
    { x: 3,  y: 3,  w: 45, h: 45 },   // col izq, arriba
    { x: 3,  y: 52, w: 45, h: 45 },   // col izq, abajo
    { x: 52, y: 3,  w: 45, h: 45 },   // col der, arriba
    { x: 52, y: 52, w: 45, h: 45 },   // col der, abajo
  ],
};

// ─── 5 FOTOS ───────────────────────────────────────────────────────────────

const layout_5_hero_4: Layout = {
  id: '5-hero-4',
  nombre: 'Grande arriba, cuatro abajo',
  cantidadFotos: 5,
  // Grande: 52% del alto. Cuatro abajo: 39%.
  // 4 cols: x=3,27,51,75 w=21,21,21,22
  frames: [
    { x: 3,  y: 3,  w: 94, h: 52 },
    { x: 3,  y: 58, w: 21, h: 39 },
    { x: 27, y: 58, w: 21, h: 39 },
    { x: 51, y: 58, w: 21, h: 39 },
    { x: 75, y: 58, w: 22, h: 39 },
  ],
};

const layout_5_mosaico: Layout = {
  id: '5-mosaico',
  nombre: 'Mosaico',
  cantidadFotos: 5,
  // Grande izq: 55% ancho. Cuadrícula 2×2 derecha: x=61, cols w=16/17, filas h=45.
  frames: [
    { x: 3,  y: 3,  w: 55, h: 94 },
    { x: 61, y: 3,  w: 16, h: 45 },
    { x: 80, y: 3,  w: 17, h: 45 },
    { x: 61, y: 52, w: 16, h: 45 },
    { x: 80, y: 52, w: 17, h: 45 },
  ],
};

const layout_5_2top_3bot: Layout = {
  id: '5-2top-3bot',
  nombre: 'Dos arriba, tres abajo',
  cantidadFotos: 5,
  frames: [
    { x: 3,  y: 3,  w: 45, h: 45 },
    { x: 52, y: 3,  w: 45, h: 45 },
    { x: 3,  y: 52, w: 29, h: 45 },
    { x: 35, y: 52, w: 29, h: 45 },
    { x: 67, y: 52, w: 30, h: 45 },
  ],
};

const layout_5_3top_2bot: Layout = {
  id: '5-3top-2bot',
  nombre: 'Tres arriba, dos abajo',
  cantidadFotos: 5,
  frames: [
    { x: 3,  y: 3,  w: 29, h: 45 },
    { x: 35, y: 3,  w: 29, h: 45 },
    { x: 67, y: 3,  w: 30, h: 45 },
    { x: 3,  y: 52, w: 45, h: 45 },
    { x: 52, y: 52, w: 45, h: 45 },
  ],
};

// ─── Array principal ────────────────────────────────────────────────────────

export const LAYOUTS: Layout[] = [
  // 1 foto
  layout_full,
  layout_centered,
  layout_top,
  layout_panoramica,
  // 2 fotos
  layout_2_vertical,
  layout_2_horizontal,
  layout_2_grande_chica,
  layout_2_chica_grande,
  // 3 fotos
  layout_3_columnas,
  layout_3_top_2bottom,
  layout_3_2top_bottom,
  layout_3_izq_2der,
  // 4 fotos
  layout_4_grid,
  layout_4_hero_3,
  layout_4_3_hero,
  layout_4_col_grid,
  // 5 fotos
  layout_5_hero_4,
  layout_5_mosaico,
  layout_5_2top_3bot,
  layout_5_3top_2bot,
];

export function getLayoutsByCantidad(cantidad: number): Layout[] {
  return LAYOUTS.filter((l) => l.cantidadFotos === cantidad);
}

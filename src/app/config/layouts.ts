// Layouts para el editor de fotolibros Zeika
// Todos los valores en porcentajes (0–100) para adaptarse a cualquier tamaño de libro.
// Margen mínimo: 3% con bordes y entre frames.
// Referencia: libro Vertical = 816 × 1058 px

export type Frame = {
  x: number; // % desde el borde izquierdo
  y: number; // % desde el borde superior
  w: number; // % del ancho total
  h: number; // % del alto total
};

export type Layout = {
  id: string;
  nombre: string;
  cantidadFotos: number;
  frames: Frame[];
};

// ─── 1 FOTO ────────────────────────────────────────────────────────────────

const layout_full: Layout = {
  id: "full",
  nombre: "Página completa",
  cantidadFotos: 1,
  frames: [
    { x: 0, y: 0, w: 100, h: 100 },
  ],
};

const layout_centered: Layout = {
  id: "centered",
  nombre: "Centrada",
  cantidadFotos: 1,
  frames: [
    { x: 5, y: 5, w: 90, h: 90 },
  ],
};

const layout_top: Layout = {
  id: "top",
  nombre: "Foto arriba",
  cantidadFotos: 1,
  // Foto: 3%→70% del alto. Espacio para texto: 73%→97%.
  frames: [
    { x: 3, y: 3, w: 94, h: 64 },
  ],
};

const layout_panoramica: Layout = {
  id: "panoramica",
  nombre: "Panorámica",
  cantidadFotos: 1,
  // Franja horizontal centrada verticalmente
  frames: [
    { x: 3, y: 30, w: 94, h: 40 },
  ],
};

// ─── 2 FOTOS ───────────────────────────────────────────────────────────────

const layout_2_vertical: Layout = {
  id: "2-vertical",
  nombre: "Dos columnas",
  cantidadFotos: 2,
  // Márgenes: 3% lados, 3% gap central → cada col = (100-9)/2 = 45.5 ≈ 46
  frames: [
    { x: 3,  y: 3, w: 46, h: 94 },
    { x: 51, y: 3, w: 46, h: 94 },
  ],
};

const layout_2_horizontal: Layout = {
  id: "2-horizontal",
  nombre: "Dos filas",
  cantidadFotos: 2,
  // Márgenes: 3% arriba/abajo, 3% gap → cada fila = (100-9)/2 = 45.5 ≈ 46
  frames: [
    { x: 3, y: 3,  w: 94, h: 46 },
    { x: 3, y: 51, w: 94, h: 46 },
  ],
};

const layout_2_grande_chica: Layout = {
  id: "2-grande-chica",
  nombre: "Grande arriba",
  cantidadFotos: 2,
  // Grande: 70% del alto. Chica: 27%.
  frames: [
    { x: 3, y: 3,  w: 94, h: 64 },
    { x: 3, y: 70, w: 94, h: 27 },
  ],
};

const layout_2_chica_grande: Layout = {
  id: "2-chica-grande",
  nombre: "Grande abajo",
  cantidadFotos: 2,
  // Chica: 24%. Grande: 67%.
  frames: [
    { x: 3, y: 3,  w: 94, h: 24 },
    { x: 3, y: 30, w: 94, h: 67 },
  ],
};

// ─── 3 FOTOS ───────────────────────────────────────────────────────────────

const layout_3_columnas: Layout = {
  id: "3-columnas",
  nombre: "Tres columnas",
  cantidadFotos: 3,
  // Márgenes: 3% lados, 2 gaps de 3% → cada col = (100-12)/3 ≈ 29
  frames: [
    { x: 3,  y: 3, w: 29, h: 94 },
    { x: 35, y: 3, w: 29, h: 94 },
    { x: 67, y: 3, w: 30, h: 94 },
  ],
};

const layout_3_top_2bottom: Layout = {
  id: "3-top-2bottom",
  nombre: "Grande arriba, dos abajo",
  cantidadFotos: 3,
  // Grande: y=3→60 (h=57). Dos abajo: y=63 (h=34).
  frames: [
    { x: 3,  y: 3,  w: 94, h: 57 },
    { x: 3,  y: 63, w: 46, h: 34 },
    { x: 51, y: 63, w: 46, h: 34 },
  ],
};

const layout_3_2top_bottom: Layout = {
  id: "3-2top-bottom",
  nombre: "Dos arriba, grande abajo",
  cantidadFotos: 3,
  // Dos arriba: y=3→36 (h=33). Grande: y=39→97 (h=58).
  frames: [
    { x: 3,  y: 3,  w: 46, h: 33 },
    { x: 51, y: 3,  w: 46, h: 33 },
    { x: 3,  y: 39, w: 94, h: 58 },
  ],
};

const layout_3_izq_2der: Layout = {
  id: "3-izq-2der",
  nombre: "Grande izquierda, dos derecha",
  cantidadFotos: 3,
  // Grande izq: w=55. Derecha: x=61, w=36. Dos filas: h=46 y 45.
  frames: [
    { x: 3,  y: 3,  w: 55, h: 94 },
    { x: 61, y: 3,  w: 36, h: 46 },
    { x: 61, y: 52, w: 36, h: 45 },
  ],
};

// ─── 4 FOTOS ───────────────────────────────────────────────────────────────

const layout_4_grid: Layout = {
  id: "4-grid",
  nombre: "Grilla 2×2",
  cantidadFotos: 4,
  frames: [
    { x: 3,  y: 3,  w: 46, h: 46 },
    { x: 51, y: 3,  w: 46, h: 46 },
    { x: 3,  y: 52, w: 46, h: 45 },
    { x: 51, y: 52, w: 46, h: 45 },
  ],
};

const layout_4_hero_3: Layout = {
  id: "4-hero-3",
  nombre: "Grande arriba, tres abajo",
  cantidadFotos: 4,
  // Grande: h=54. Tres abajo: y=60, cada col = (100-12)/3 ≈ 29.
  frames: [
    { x: 3,  y: 3,  w: 94, h: 54 },
    { x: 3,  y: 60, w: 29, h: 37 },
    { x: 35, y: 60, w: 29, h: 37 },
    { x: 67, y: 60, w: 30, h: 37 },
  ],
};

const layout_4_3_hero: Layout = {
  id: "4-3-hero",
  nombre: "Tres arriba, grande abajo",
  cantidadFotos: 4,
  // Tres arriba: h=34. Grande: y=40→97 (h=57).
  frames: [
    { x: 3,  y: 3,  w: 29, h: 34 },
    { x: 35, y: 3,  w: 29, h: 34 },
    { x: 67, y: 3,  w: 30, h: 34 },
    { x: 3,  y: 40, w: 94, h: 57 },
  ],
};

const layout_4_col_grid: Layout = {
  id: "4-col-grid",
  nombre: "Dos columnas de dos",
  cantidadFotos: 4,
  // Organización por columna: izq→abajo, luego der→abajo.
  frames: [
    { x: 3,  y: 3,  w: 46, h: 46 },
    { x: 3,  y: 52, w: 46, h: 45 },
    { x: 51, y: 3,  w: 46, h: 46 },
    { x: 51, y: 52, w: 46, h: 45 },
  ],
};

// ─── 5 FOTOS ───────────────────────────────────────────────────────────────

const layout_5_hero_4: Layout = {
  id: "5-hero-4",
  nombre: "Grande arriba, cuatro abajo",
  cantidadFotos: 5,
  // Grande: h=54. Cuatro abajo: cada w = (100-3-3-9)/4 = 21.25 → 21/21/21/22.
  frames: [
    { x: 3,  y: 3,  w: 94, h: 54 },
    { x: 3,  y: 60, w: 21, h: 37 },
    { x: 27, y: 60, w: 21, h: 37 },
    { x: 51, y: 60, w: 21, h: 37 },
    { x: 75, y: 60, w: 22, h: 37 },
  ],
};

const layout_5_mosaico: Layout = {
  id: "5-mosaico",
  nombre: "Mosaico",
  cantidadFotos: 5,
  // Grande izq: w=55. Grilla 2×2 derecha: x=61, cada col w=16/17, cada fila h=46/45.
  frames: [
    { x: 3,  y: 3,  w: 55, h: 94 },
    { x: 61, y: 3,  w: 16, h: 46 },
    { x: 80, y: 3,  w: 17, h: 46 },
    { x: 61, y: 52, w: 16, h: 45 },
    { x: 80, y: 52, w: 17, h: 45 },
  ],
};

const layout_5_2top_3bot: Layout = {
  id: "5-2top-3bot",
  nombre: "Dos arriba, tres abajo",
  cantidadFotos: 5,
  // Dos arriba: h=45. Tres abajo: y=51, h=46, cada col = (100-12)/3 ≈ 29.
  frames: [
    { x: 3,  y: 3,  w: 46, h: 45 },
    { x: 51, y: 3,  w: 46, h: 45 },
    { x: 3,  y: 51, w: 29, h: 46 },
    { x: 35, y: 51, w: 29, h: 46 },
    { x: 67, y: 51, w: 30, h: 46 },
  ],
};

const layout_5_3top_2bot: Layout = {
  id: "5-3top-2bot",
  nombre: "Tres arriba, dos abajo",
  cantidadFotos: 5,
  // Tres arriba: h=45. Dos abajo: y=51, h=46.
  frames: [
    { x: 3,  y: 3,  w: 29, h: 45 },
    { x: 35, y: 3,  w: 29, h: 45 },
    { x: 67, y: 3,  w: 30, h: 45 },
    { x: 3,  y: 51, w: 46, h: 46 },
    { x: 51, y: 51, w: 46, h: 46 },
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

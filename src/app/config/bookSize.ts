export type BookSize = {
  id: string;
  nombre: string;
  widthCm: number;
  heightCm: number;
  widthPx: number;
  heightPx: number;
  bleedPx: number;
};

export const BOOK_SIZE: BookSize = {
  id: "vertical",
  nombre: "Vertical",
  widthCm: 21.6,
  heightCm: 28,
  widthPx: 816,
  heightPx: 1058,
  bleedPx: 11,
};

import { newShape } from '../hooks/useCanvasObjects';
import type { ShapeType, CanvasObject } from '../hooks/useCanvasObjects';

export type CanvasAPI = {
  createShape: (type: ShapeType, initial?: Partial<CanvasObject>) => void;
  createText: (text: string, initial?: Partial<CanvasObject>) => void;
  moveSelected: (x: number, y: number) => void;
  resizeSelected: (width: number, height: number) => void;
  rotateSelected: (rotation: number) => void;
  setColorSelected: (color: string) => void;
};



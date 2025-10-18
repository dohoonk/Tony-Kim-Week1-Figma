export type AICommandType =
  | 'createShape'
  | 'createText'
  | 'moveSelected'
  | 'resizeSelected'
  | 'rotateSelected'
  | 'setColorSelected';

export type CreateShapePayload = {
  type: 'rectangle' | 'circle' | 'triangle';
  x?: number;
  y?: number;
  color?: string;
};

export type CreateTextPayload = {
  text: string;
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
};

export type MoveSelectedPayload = { x: number; y: number };
export type ResizeSelectedPayload = { width: number; height: number };
export type RotateSelectedPayload = { rotation: number };
export type SetColorSelectedPayload = { color: string };

export type AICommand =
  | { type: 'createShape'; payload: CreateShapePayload }
  | { type: 'createText'; payload: CreateTextPayload }
  | { type: 'moveSelected'; payload: MoveSelectedPayload }
  | { type: 'resizeSelected'; payload: ResizeSelectedPayload }
  | { type: 'rotateSelected'; payload: RotateSelectedPayload }
  | { type: 'setColorSelected'; payload: SetColorSelectedPayload };



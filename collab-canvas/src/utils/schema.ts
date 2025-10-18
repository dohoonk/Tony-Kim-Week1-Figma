export type AICommandType =
  | 'createShape'
  | 'createText'
  | 'moveSelected'
  | 'resizeSelected'
  | 'rotateSelected'
  | 'setColorSelected'
  | 'arrangeCenter'
  | 'alignSelected'
  | 'distributeObjects'
  | 'setTextKindSelected'
  | 'gridLayout'
  | 'rowLayout';

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
export type AlignSelectedPayload = { position: 'left' | 'right' | 'top' | 'bottom' };
export type DistributeObjectsPayload = { axis: 'horizontal' | 'vertical' };
export type SetTextKindSelectedPayload = { kind: 'heading' | 'subtitle' | 'body' };
export type GridLayoutPayload = { gap?: number; padding?: number };
export type RowLayoutPayload = { gap?: number; padding?: number };

export type AICommand =
  | { type: 'createShape'; payload: CreateShapePayload }
  | { type: 'createText'; payload: CreateTextPayload }
  | { type: 'moveSelected'; payload: MoveSelectedPayload }
  | { type: 'resizeSelected'; payload: ResizeSelectedPayload }
  | { type: 'rotateSelected'; payload: RotateSelectedPayload }
  | { type: 'setColorSelected'; payload: SetColorSelectedPayload }
  | { type: 'arrangeCenter' }
  | { type: 'alignSelected'; payload: AlignSelectedPayload }
  | { type: 'distributeObjects'; payload: DistributeObjectsPayload }
  | { type: 'setTextKindSelected'; payload: SetTextKindSelectedPayload }
  | { type: 'gridLayout'; payload: GridLayoutPayload }
  | { type: 'rowLayout'; payload: RowLayoutPayload };



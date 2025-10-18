import { useCallback } from 'react';
import { useCanvasObjects } from './useCanvasObjects';
import type { AICommand } from '../utils/schema';

export function useAIAgent() {
  const { addShape, updateShape, selectedId } = useCanvasObjects();

  const execute = useCallback((cmd: AICommand) => {
    switch (cmd.type) {
      case 'createShape':
        addShape(cmd.payload.type, {
          x: cmd.payload.x,
          y: cmd.payload.y,
          color: cmd.payload.color,
        });
        break;
      case 'createText':
        addShape('text', {
          text: cmd.payload.text,
          x: cmd.payload.x,
          y: cmd.payload.y,
          fontSize: cmd.payload.fontSize,
          color: cmd.payload.color,
        } as any);
        break;
      case 'moveSelected':
        if (selectedId) updateShape(selectedId, { x: cmd.payload.x, y: cmd.payload.y }, { immediate: true });
        break;
      case 'resizeSelected':
        if (selectedId)
          updateShape(selectedId, { width: cmd.payload.width, height: cmd.payload.height }, { immediate: true });
        break;
      case 'rotateSelected':
        if (selectedId) updateShape(selectedId, { rotation: cmd.payload.rotation }, { immediate: true });
        break;
      case 'setColorSelected':
        if (selectedId) updateShape(selectedId, { color: cmd.payload.color }, { immediate: true });
        break;
      default:
        break;
    }
  }, [addShape, updateShape, selectedId]);

  return { execute };
}



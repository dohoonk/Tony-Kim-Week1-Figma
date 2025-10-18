import { useCallback } from 'react';
import { useCanvasObjects } from './useCanvasObjects';
import { useCanvasView } from '../context/CanvasViewContext';
import type { AICommand } from '../utils/schema';
import { centerWithin, alignWithin, clampWithin } from '../utils/layoutEngine';

export function useAIAgent() {
  const { addShape, updateShape, selectedId, objects } = useCanvasObjects();
  const view = useCanvasView();

  const execute = useCallback((cmd: AICommand) => {
    const containerWidth = view.stageWidth || 800;
    const containerHeight = view.stageHeight || 600;
    const defaultX = Math.floor(containerWidth / 2);
    const defaultY = Math.floor(containerHeight / 2);
    switch (cmd.type) {
      case 'createShape': {
        const desiredX = cmd.payload.x ?? defaultX;
        const desiredY = cmd.payload.y ?? defaultY;
        const clamped = clampWithin(containerWidth, containerHeight, 160, 100, desiredX, desiredY);
        addShape(cmd.payload.type, {
          x: clamped.x,
          y: clamped.y,
          color: cmd.payload.color,
        });
        break;
      }
      case 'createText': {
        const desiredX = cmd.payload.x ?? defaultX;
        const desiredY = cmd.payload.y ?? defaultY;
        const clamped = clampWithin(containerWidth, containerHeight, 160, 100, desiredX, desiredY);
        addShape('text', {
          text: cmd.payload.text,
          x: clamped.x,
          y: clamped.y,
          fontSize: cmd.payload.fontSize,
          color: cmd.payload.color,
        } as any);
        break;
      }
      case 'moveSelected':
        if (selectedId) {
          const obj = objects.find((o) => o.id === selectedId);
          if (obj) {
            const clamped = clampWithin(containerWidth, containerHeight, obj.width, obj.height, cmd.payload.x, cmd.payload.y);
            updateShape(selectedId, { x: clamped.x, y: clamped.y }, { immediate: true });
          }
        }
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
      case 'arrangeCenter':
        if (selectedId) {
          const obj = objects.find((o) => o.id === selectedId);
          if (obj) {
            const pos = centerWithin(obj.x, obj.y, obj.width, obj.height, containerWidth, containerHeight);
            updateShape(selectedId, { x: pos.x, y: pos.y }, { immediate: true });
          }
        }
        break;
      case 'alignSelected':
        if (selectedId) {
          const obj = objects.find((o) => o.id === selectedId);
          if (obj) {
            const delta = alignWithin(obj.width, obj.height, containerWidth, containerHeight, cmd.payload.position);
            updateShape(selectedId, { x: delta.x ?? obj.x, y: delta.y ?? obj.y }, { immediate: true });
          }
        }
        break;
      case 'distributeObjects':
        if (objects.length >= 2) {
          if (cmd.payload.axis === 'horizontal') {
            const gap = Math.floor((containerWidth - objects.reduce((s, o) => s + o.width, 0)) / (objects.length + 1));
            let cursor = Math.max(0, gap);
            objects.forEach((o) => {
              const clamped = clampWithin(containerWidth, containerHeight, o.width, o.height, cursor, o.y);
              updateShape(o.id, { x: clamped.x }, { immediate: true });
              cursor += o.width + gap;
            });
          } else {
            const gap = Math.floor((containerHeight - objects.reduce((s, o) => s + o.height, 0)) / (objects.length + 1));
            let cursor = Math.max(0, gap);
            objects.forEach((o) => {
              const clamped = clampWithin(containerWidth, containerHeight, o.width, o.height, o.x, cursor);
              updateShape(o.id, { y: clamped.y }, { immediate: true });
              cursor += o.height + gap;
            });
          }
        }
        break;
      case 'gridLayout': {
        const gap = cmd.payload.gap ?? 16;
        const padding = cmd.payload.padding ?? 0;
        if (objects.length === 0) break;
        const itemW = Math.max(1, Math.round(objects[0].width));
        const itemH = Math.max(1, Math.round(objects[0].height));
        const insetW = Math.max(0, containerWidth - padding * 2);
        const cols = Math.max(1, Math.floor((insetW + gap) / (itemW + gap)));
        let x = padding, y = padding;
        let col = 0;
        objects.forEach((o) => {
          const clamped = clampWithin(containerWidth, containerHeight, o.width, o.height, x, y);
          updateShape(o.id, { x: clamped.x, y: clamped.y }, { immediate: true });
          col += 1;
          if (col >= cols) { col = 0; x = padding; y += itemH + gap; }
          else { x += itemW + gap; }
        });
        break;
      }
      case 'rowLayout': {
        const gap = cmd.payload.gap ?? 16;
        const padding = cmd.payload.padding ?? 0;
        let x = padding;
        const y = padding;
        objects.forEach((o) => {
          const clamped = clampWithin(containerWidth, containerHeight, o.width, o.height, x, y);
          updateShape(o.id, { x: clamped.x, y: clamped.y }, { immediate: true });
          x += o.width + gap;
        });
        break;
      }
      case 'generateLoginForm': {
        const width = Math.min(containerWidth - 32, Math.max(240, cmd.payload.width ?? 360));
        const gap = cmd.payload.gap ?? 12;
        const padding = cmd.payload.padding ?? 24;
        const color = cmd.payload.color ?? '#2563eb';
        const title = cmd.payload.title ?? 'Welcome back';
        const buttonText = cmd.payload.buttonText ?? 'Sign in';
        const formX = padding;
        const totalHeight = 32 + gap + 48 + gap + 48 + gap + 40 + padding; // rough estimate
        const formY = Math.max(padding, Math.floor((containerHeight - totalHeight) / 2));
        // title
        addShape('text', { text: title, x: formX, y: formY, fontSize: 24, color: '#111827' } as any);
        // email input (rectangle)
        addShape('rectangle', { x: formX, y: formY + 32 + gap, width, height: 48, color: '#e5e7eb' });
        // password input
        addShape('rectangle', { x: formX, y: formY + 32 + gap + 48 + gap, width, height: 48, color: '#e5e7eb' });
        // button
        addShape('rectangle', { x: formX, y: formY + 32 + gap + 48 + gap + 48 + gap, width, height: 40, color });
        addShape('text', { text: buttonText, x: formX + 12, y: formY + 32 + gap + 48 + gap + 48 + gap + 8, fontSize: 18, color: '#ffffff' } as any);
        break;
      }
      case 'setTextKindSelected':
        if (selectedId) updateShape(selectedId, { textKind: cmd.payload.kind }, { immediate: true });
        break;
      default:
        break;
    }
  }, [addShape, updateShape, selectedId, objects, view.stageWidth, view.stageHeight]);

  return { execute };
}



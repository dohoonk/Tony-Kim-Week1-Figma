import { useCallback } from 'react';
import { useCanvasObjects } from './useCanvasObjects';
import { useCanvasView } from '../context/CanvasViewContext';
import type { AICommand } from '../utils/schema';
import { centerWithin, alignWithin, clampWithin } from '../utils/layoutEngine';

export function useAIAgent() {
  const { addShape, updateShape, selectedId, objects, selectedIds } = useCanvasObjects();
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
      case 'createMany': {
        const type = cmd.payload.type;
        const count = Math.max(1, Math.min(500, Math.floor(cmd.payload.count)));
        const padding = Math.max(0, Math.floor(cmd.payload.padding ?? 16));
        const gap = Math.max(0, Math.floor(cmd.payload.gap ?? 12));
        const innerW = Math.max(0, containerWidth - padding * 2);
        const innerH = Math.max(0, containerHeight - padding * 2);
        // Choose near-square grid based on aspect ratio to fit all items without overlap
        const aspect = innerW > 0 && innerH > 0 ? innerW / innerH : 1;
        let cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
        let rows = Math.max(1, Math.ceil(count / cols));
        // Compute cell size to fit grid (accounting for gaps)
        const cellW = Math.max(16, Math.floor((innerW - gap * Math.max(0, cols - 1)) / cols));
        const cellH = Math.max(16, Math.floor((innerH - gap * Math.max(0, rows - 1)) / rows));
        // Use square cells for circles to keep shape
        const itemW = type === 'circle' ? Math.min(cellW, cellH) : cellW;
        const itemH = type === 'circle' ? Math.min(cellW, cellH) : cellH;
        for (let i = 0; i < count; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const x = padding + c * (itemW + gap);
          const y = padding + r * (itemH + gap);
          addShape(type as any, { x, y, width: itemW, height: itemH, color: cmd.payload.color });
        }
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
        const requestedGap = cmd.payload.gap ?? 16;
        const verticalGap = requestedGap;
        // Prefer operating on the current selection; fall back to all objects
        const target = (selectedIds && selectedIds.length > 0)
          ? objects.filter((o) => selectedIds.includes(o.id))
          : objects.slice();
        if (target.length === 0) break;
        // Preserve visual order by current x
        const sorted = [...target].sort((a, b) => a.x - b.x);
        // Effective (axis-aligned) width/height accounting for rotation
        const effW = (o: typeof sorted[number]) => {
          const rad = ((o.rotation ?? 0) % 360) * Math.PI / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          return Math.max(1, Math.abs(o.width * c) + Math.abs(o.height * s));
        };
        const effH = (o: typeof sorted[number]) => {
          const rad = ((o.rotation ?? 0) % 360) * Math.PI / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          return Math.max(1, Math.abs(o.width * s) + Math.abs(o.height * c));
        };
        // Build wrapped rows that fit within container width using requested gap
        const rows: Array<{ items: typeof sorted; totalW: number; maxH: number }> = [] as any;
        let current: typeof sorted = [] as any;
        let currentW = 0;
        let currentMaxH = 0;
        for (let i = 0; i < sorted.length; i++) {
          const o = sorted[i];
          const w = effW(o);
          const h = effH(o);
          const nextW = current.length === 0 ? w : currentW + requestedGap + w;
          if (nextW > containerWidth && current.length > 0) {
            rows.push({ items: current, totalW: currentW, maxH: currentMaxH } as any);
            current = [o] as any;
            currentW = w;
            currentMaxH = h;
          } else {
            current.push(o as any);
            currentW = nextW;
            if (h > currentMaxH) currentMaxH = h;
          }
        }
        if (current.length > 0) rows.push({ items: current, totalW: currentW, maxH: currentMaxH } as any);
        // Compute vertical positioning: center the whole block around current average center Y
        const groupCenterY = Math.floor(sorted.reduce((sum, o) => sum + (o.y + o.height / 2), 0) / sorted.length);
        const totalBlockH = rows.reduce((s, r) => s + r.maxH, 0) + verticalGap * Math.max(0, rows.length - 1);
        let topY = Math.max(0, Math.min(containerHeight - totalBlockH, Math.floor(groupCenterY - totalBlockH / 2)));
        // Place each row centered horizontally and with no overlap horizontally
        for (const row of rows) {
          const rowLeft = Math.max(0, Math.min(containerWidth - row.totalW, Math.floor((containerWidth - row.totalW) / 2)));
          // Place by centers across the row
          let cursor = rowLeft;
          for (let i = 0; i < row.items.length; i++) {
            const o = row.items[i];
            const w = effW(o);
            const centerX = Math.round(cursor + w / 2);
            const centerY = Math.round(topY + row.maxH / 2);
            const newX = Math.round(centerX - o.width / 2);
            const newY = Math.round(centerY - o.height / 2);
            const clamped = clampWithin(containerWidth, containerHeight, o.width, o.height, newX, newY);
            updateShape(o.id, { x: clamped.x, y: clamped.y }, { immediate: true });
            cursor += w + requestedGap;
          }
          topY += row.maxH + verticalGap;
        }
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
  }, [addShape, updateShape, selectedId, selectedIds, objects, view.stageWidth, view.stageHeight]);

  return { execute };
}



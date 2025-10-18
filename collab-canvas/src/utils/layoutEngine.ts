export function centerWithin(x: number, y: number, width: number, height: number, containerWidth: number, containerHeight: number) {
  const cx = Math.max(0, Math.floor((containerWidth - width) / 2));
  const cy = Math.max(0, Math.floor((containerHeight - height) / 2));
  return { x: cx, y: cy };
}

export function alignWithin(width: number, height: number, containerWidth: number, containerHeight: number, position: 'left' | 'right' | 'top' | 'bottom') {
  switch (position) {
    case 'left':
      return { x: 0 };
    case 'right':
      return { x: Math.max(0, containerWidth - width) };
    case 'top':
      return { y: 0 };
    case 'bottom':
      return { y: Math.max(0, containerHeight - height) };
  }
}

export function clampWithin(containerWidth: number, containerHeight: number, width: number, height: number, desiredX: number, desiredY: number) {
  const x = Math.min(Math.max(0, desiredX), Math.max(0, containerWidth - width));
  const y = Math.min(Math.max(0, desiredY), Math.max(0, containerHeight - height));
  return { x, y };
}

export function gridPositions(count: number, containerWidth: number, containerHeight: number, itemWidth: number, itemHeight: number, gap = 16) {
  const cols = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (itemWidth + gap);
    const y = row * (itemHeight + gap);
    positions.push({ x, y });
  }
  return positions;
}

export function rowPositions(count: number, startX: number, startY: number, itemWidth: number, gap = 16) {
  const positions: Array<{ x: number; y: number }> = [];
  let cursor = startX;
  for (let i = 0; i < count; i++) {
    positions.push({ x: cursor, y: startY });
    cursor += itemWidth + gap;
  }
  return positions;
}

// ===== Padding & Relative Positioning Helpers =====

export type Padding = number | { top?: number; right?: number; bottom?: number; left?: number };

function normalizePadding(padding: Padding): { top: number; right: number; bottom: number; left: number } {
  if (typeof padding === 'number') {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return {
    top: padding.top ?? 0,
    right: padding.right ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
  };
}

export function insetContainer(containerWidth: number, containerHeight: number, padding: Padding) {
  const p = normalizePadding(padding);
  const width = Math.max(0, containerWidth - (p.left + p.right));
  const height = Math.max(0, containerHeight - (p.top + p.bottom));
  const originX = p.left;
  const originY = p.top;
  return { originX, originY, width, height };
}

export function centerWithinWithPadding(width: number, height: number, containerWidth: number, containerHeight: number, padding: Padding) {
  const inset = insetContainer(containerWidth, containerHeight, padding);
  const cx = Math.max(0, Math.floor(inset.originX + (inset.width - width) / 2));
  const cy = Math.max(0, Math.floor(inset.originY + (inset.height - height) / 2));
  return { x: cx, y: cy };
}

export function alignWithinWithPadding(width: number, height: number, containerWidth: number, containerHeight: number, position: 'left' | 'right' | 'top' | 'bottom', padding: Padding) {
  const inset = insetContainer(containerWidth, containerHeight, padding);
  switch (position) {
    case 'left':
      return { x: inset.originX };
    case 'right':
      return { x: inset.originX + Math.max(0, inset.width - width) };
    case 'top':
      return { y: inset.originY };
    case 'bottom':
      return { y: inset.originY + Math.max(0, inset.height - height) };
  }
}

export function relativeTo(parent: { x: number; y: number; width: number; height: number }, childWidth: number, childHeight: number, options: { anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; offsetX?: number; offsetY?: number; padding?: Padding } = {}) {
  const { anchor = 'top-left', offsetX = 0, offsetY = 0, padding = 0 } = options;
  const inset = insetContainer(parent.width, parent.height, padding);
  const baseX = parent.x + inset.originX;
  const baseY = parent.y + inset.originY;
  let x = baseX;
  let y = baseY;
  switch (anchor) {
    case 'top-left':
      x = baseX; y = baseY; break;
    case 'top-right':
      x = baseX + Math.max(0, inset.width - childWidth); y = baseY; break;
    case 'bottom-left':
      x = baseX; y = baseY + Math.max(0, inset.height - childHeight); break;
    case 'bottom-right':
      x = baseX + Math.max(0, inset.width - childWidth); y = baseY + Math.max(0, inset.height - childHeight); break;
    case 'center':
      x = baseX + Math.max(0, Math.floor((inset.width - childWidth) / 2));
      y = baseY + Math.max(0, Math.floor((inset.height - childHeight) / 2));
      break;
  }
  return { x: x + offsetX, y: y + offsetY };
}




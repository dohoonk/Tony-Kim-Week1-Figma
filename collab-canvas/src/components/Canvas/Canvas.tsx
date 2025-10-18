import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect as KRect } from 'react-konva';
import type Konva from 'konva';
import '../../styles/Canvas.css';
import CanvasObjectsProvider from '../../context/CanvasObjectsProvider';
import { CanvasViewProvider } from '../../context/CanvasViewContext';
import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import CanvasToolbar from './CanvasToolbar';
import Shape from './Shape';
import CursorLayer from './CursorLayer';
import { useCursor } from '../../hooks/useCursor';
import { useUser } from '../../context/UserContext';
// (duplicate import removed)
import PresenceBox from './PresenceBox';
import LogoutButton from '../Auth/LogoutButton';
import CommandInput from '../AI/CommandInput';
import ConnectionStatus from '../UI/ConnectionStatus';
import ComponentPanel from './ComponentPanel';
import FpsOverlay from '../UI/FpsOverlay';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function InnerCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [, setIsPanning] = useState(false);
  const [selfPos, setSelfPos] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const { objects, selectedId, selectedIds, updateShape, deleteSelected, copySelected, undo, redo, selectMany } = useCanvasObjects();
  const { updateCursor } = useCursor(150);
  const { user } = useUser();

  useEffect(() => {
    const updateSize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if ((t as HTMLElement).isContentEditable) return true;
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return; // do not hijack keys while typing in inputs
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
        setIsPanning(true);
        stageRef.current?.draggable(true);
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        deleteSelected();
      }
      const isCopy = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c';
      if (isCopy) {
        e.preventDefault();
        copySelected();
      }
      const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
      if (isUndo) {
        e.preventDefault();
        undo();
      }
      const isRedo = (e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z';
      if (isRedo) {
        e.preventDefault();
        redo();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      if (e.code === 'Space') {
        setSpaceDown(false);
        setIsPanning(false);
        stageRef.current?.draggable(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [deleteSelected, copySelected, undo, redo]);

  const handleContextMenu = useCallback((e: { evt?: { preventDefault?: () => void } }) => {
    e.evt?.preventDefault?.();
  }, []);

  const handlePointerDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt?.button === 2) {
      setIsPanning(true);
      stageRef.current?.draggable(true);
    }
    // click outside — close text editing if clicking non-input
    setEditingTextId(null);
    // start marquee if left click on empty stage area (no shape) and not panning
    const s = stageRef.current;
    if (!s) return;
    const clickedOnEmpty = e.target === s;
    if (e.evt?.button === 0 && clickedOnEmpty && !spaceDown) {
      const pointer = s.getPointerPosition();
      if (!pointer) return;
      const worldX = (pointer.x - position.x) / scale;
      const worldY = (pointer.y - position.y) / scale;
      setMarqueeStart({ x: worldX, y: worldY });
      setMarqueeRect({ x: worldX, y: worldY, width: 0, height: 0 });
    }
  }, [position.x, position.y, scale, spaceDown]);

  const handlePointerUp = useCallback(() => {
    if (!spaceDown) {
      setIsPanning(false);
      stageRef.current?.draggable(false);
    }
    // finish marquee selection
    if (marqueeStart && marqueeRect) {
      const rx = marqueeRect.width >= 0 ? marqueeRect.x : marqueeRect.x + marqueeRect.width;
      const ry = marqueeRect.height >= 0 ? marqueeRect.y : marqueeRect.y + marqueeRect.height;
      const rw = Math.abs(marqueeRect.width);
      const rh = Math.abs(marqueeRect.height);
      const selected = objects
        .filter((o) => {
          const ox = o.x;
          const oy = o.y;
          const ow = o.width;
          const oh = o.height;
          // simple rect intersection
          return ox < rx + rw && ox + ow > rx && oy < ry + rh && oy + oh > ry;
        })
        .map((o) => o.id);
      selectMany(selected);
    }
    setMarqueeStart(null);
    setMarqueeRect(null);
  }, [spaceDown, marqueeStart, marqueeRect, objects, selectMany]);

  const handleDragMove = useCallback(() => {
    const s = stageRef.current;
    if (!s) return;
    const pos = s.position();
    setPosition({ x: pos.x, y: pos.y });
  }, []);

  const handleMouseMove = useCallback(() => {
    const s = stageRef.current;
    if (!s) return;
    const pointer = s.getPointerPosition();
    if (!pointer) return;
    // Convert screen to stage coordinates considering scale and position
    const x = (pointer.x - position.x) / scale;
    const y = (pointer.y - position.y) / scale;
    console.debug('[Canvas] mouseMove', { pointer, stagePos: position, scale, world: { x, y } });
    updateCursor(x, y);
    setSelfPos({ x, y });
    // update marquee shape
    if (marqueeStart) {
      setMarqueeRect({ x: marqueeStart.x, y: marqueeStart.y, width: x - marqueeStart.x, height: y - marqueeStart.y });
    }
  }, [position, scale, updateCursor, marqueeStart]);

  // Ensure cursor keeps updating even when dragging shapes (document-level pointermove)
  useEffect(() => {
    const onDocPointerMove = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      const x = (px - position.x) / scale;
      const y = (py - position.y) / scale;
      updateCursor(x, y);
      setSelfPos({ x, y });
    };
    window.addEventListener('pointermove', onDocPointerMove);
    return () => window.removeEventListener('pointermove', onDocPointerMove);
  }, [position, scale, updateCursor]);

  const handleWheel = useCallback((e: { evt: { preventDefault: () => void; deltaY: number } }) => {
    e.evt.preventDefault();
    const s = stageRef.current;
    if (!s) return;

    const oldScale = scale;
    const pointer = s.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = clamp(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy, MIN_SCALE, MAX_SCALE);

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setScale(newScale);
    setPosition(newPos);
    s.scale({ x: newScale, y: newScale });
    s.position(newPos);
    s.batchDraw();
  }, [position, scale]);

  const stageProps = useMemo(() => ({
    width: stageSize.width,
    height: stageSize.height,
    scaleX: scale,
    scaleY: scale,
    x: position.x,
    y: position.y,
  }), [stageSize, scale, position]);

  return (
    <div ref={containerRef} className="canvas-container" onContextMenu={(e) => e.preventDefault()}>
      <div className="canvas-logout-box"><LogoutButton /></div>
      <ConnectionStatus />
      <PresenceBox />
      <CanvasViewProvider value={{ stageWidth: stageSize.width, stageHeight: stageSize.height, scale, positionX: position.x, positionY: position.y, getStage: () => stageRef.current }}>
        <CanvasToolbar />
        <Stage
          ref={stageRef}
          {...stageProps}
          onWheel={handleWheel}
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onDragMove={handleDragMove}
          onMouseMove={handleMouseMove}
          onContextMenu={handleContextMenu}
          draggable={false}
          onStageMouseEnter={() => { (window as unknown as { konvaStage?: Konva.Stage | null }).konvaStage = stageRef.current; }}
        >
          <Layer>
            {objects.map((o) => (
              <Shape key={o.id} object={o} editingId={editingTextId} onEditText={(id) => setEditingTextId(id)} />
            ))}
          </Layer>
          {marqueeRect && (
            <Layer listening={false}>
              <KRect
                x={Math.min(marqueeRect.x, marqueeRect.x + marqueeRect.width)}
                y={Math.min(marqueeRect.y, marqueeRect.y + marqueeRect.height)}
                width={Math.abs(marqueeRect.width)}
                height={Math.abs(marqueeRect.height)}
                stroke="#4f46e5"
                dash={[6, 4]}
                strokeWidth={1}
                fill="rgba(79,70,229,0.08)"
              />
            </Layer>
          )}
          <CursorLayer
            scale={scale}
            selfCursor={selfPos && user ? { uid: user.uid, x: selfPos.x, y: selfPos.y, name: user.displayName ?? 'You', color: '#5b8def' } : undefined}
          />
        </Stage>
        <ComponentPanel />
        <FpsOverlay objectCount={objects.length} />
      </CanvasViewProvider>
      <CommandInput />
      {(() => {
        const ids = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        const selected = objects.filter((o) => ids.includes(o.id));
        if (selected.length === 0) return null;
        // place inspector to the right of the first selected
        const anchor = selected[0];
        const left = position.x + (anchor.x + anchor.width + 8) * scale;
        const top = position.y + anchor.y * scale;
        return (
          <div
            style={{ position: 'absolute', left, top, zIndex: 21, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6, display: 'flex', gap: 8, alignItems: 'center' }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <label style={{ fontSize: 12, color: '#475569' }}>Color</label>
            <input
              type="color"
              value={anchor.color}
              onChange={(e) => {
                const color = e.target.value;
                for (const o of selected) updateShape(o.id, { color }, { immediate: true });
              }}
              style={{ width: 28, height: 28, padding: 0, border: 'none', background: 'transparent' }}
            />
          </div>
        );
      })()}
      {(() => {
        const sel = objects.find((o) => o.id === editingTextId);
        if (!sel || sel.type !== 'text') return null;
        const left = position.x + sel.x * scale;
        const top = position.y + sel.y * scale;
        const width = sel.width * scale;
        const height = sel.height * scale;
        return (
          <div
            style={{
              position: 'absolute',
              left,
              top,
              width,
              height,
              zIndex: 20,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              background: 'transparent',
              pointerEvents: 'auto',
              padding: 2,
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              style={{
                flex: 1,
                height: '100%',
                border: '1px dashed #cbd5e1',
                outline: 'none',
                fontSize: `${sel.fontSize ?? 24}px`,
                color: sel.color,
                background: 'rgba(255,255,255,0.7)',
                padding: '2px 6px',
              }}
              autoFocus
              value={sel.text ?? ''}
              placeholder="Type..."
              onChange={(e) => updateShape(sel.id, { text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  (e.target as HTMLInputElement).blur();
                  setEditingTextId(null);
                }
              }}
              onBlur={() => setEditingTextId(null)}
            />
            <select
              value={sel.textKind ?? 'body'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateShape(sel.id, { textKind: e.target.value as 'heading' | 'subtitle' | 'body' })}
              style={{ height: 28, border: '1px solid #cbd5e1', background: '#fff' }}
            >
              <option value="heading">Heading</option>
              <option value="subtitle">Subtitle</option>
              <option value="body">Body</option>
            </select>
          </div>
        );
      })()}
    </div>
  );
}

export default function Canvas() {
  return (
    <CanvasObjectsProvider>
      <CanvasViewProvider value={{ stageWidth: 0, stageHeight: 0, scale: 1, positionX: 0, positionY: 0 }}>
        <InnerCanvas />
      </CanvasViewProvider>
    </CanvasObjectsProvider>
  );
}

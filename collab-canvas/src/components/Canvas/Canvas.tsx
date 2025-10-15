import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import '../../styles/Canvas.css';
import { CanvasObjectsProvider, useCanvasObjects } from '../../hooks/useCanvasObjects';
import CanvasToolbar from './CanvasToolbar';
import Shape from './Shape';
import CursorLayer from './CursorLayer';
import { useCursor } from '../../hooks/useCursor';
import { useUser } from '../../context/UserContext';
import PresenceBox from './PresenceBox';
import LogoutButton from '../Auth/LogoutButton';

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

  const { objects, deleteSelected } = useCanvasObjects();
  const { updateCursor } = useCursor(100);
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpaceDown(true);
        setIsPanning(true);
        stageRef.current?.draggable(true);
      }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        deleteSelected();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
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
  }, [deleteSelected]);

  const handleContextMenu = useCallback((e: any) => {
    e.evt?.preventDefault?.();
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    if (e.evt?.button === 2) {
      setIsPanning(true);
      stageRef.current?.draggable(true);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!spaceDown) {
      setIsPanning(false);
      stageRef.current?.draggable(false);
    }
  }, [spaceDown]);

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
    // eslint-disable-next-line no-console
    console.debug('[Canvas] mouseMove', { pointer, stagePos: position, scale, world: { x, y } });
    updateCursor(x, y);
    setSelfPos({ x, y });
  }, [position, scale, updateCursor]);

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

  const handleWheel = useCallback((e: any) => {
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
      <PresenceBox />
      <Stage
        ref={stageRef}
        {...stageProps}
        onWheel={handleWheel}
        onContentMousedown={handlePointerDown}
        onContentMouseup={handlePointerUp}
        onDragMove={handleDragMove}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
        draggable={false}
      >
        <Layer>
          {objects.map((o) => (
            <Shape key={o.id} object={o} />
          ))}
        </Layer>
        <CursorLayer
          scale={scale}
          selfCursor={selfPos && user ? { uid: user.uid, x: selfPos.x, y: selfPos.y, name: user.displayName ?? 'You', color: '#5b8def' } : undefined}
        />
      </Stage>
    </div>
  );
}

export default function Canvas() {
  return (
    <CanvasObjectsProvider>
      <CanvasToolbar />
      <InnerCanvas />
    </CanvasObjectsProvider>
  );
}

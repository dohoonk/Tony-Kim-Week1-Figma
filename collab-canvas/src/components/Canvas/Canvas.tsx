import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import '../../styles/Canvas.css';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function Canvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

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
  }, []);

  const handleContextMenu = useCallback((e: any) => {
    e.evt?.preventDefault?.();
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    // Right mouse button => pan
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

  const handleWheel = useCallback((e: any) => {
    e.evt.preventDefault();
    const s = stageRef.current;
    if (!s) return;

    const oldScale = scale;
    const pointer = s.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1; // normalize trackpads
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
      {/* Test readouts */}
      <div className="canvas-readouts">
        <span data-testid="scale">{scale.toFixed(2)}</span>
        <span data-testid="pos">{position.x},{position.y}</span>
        <span data-testid="panning">{isPanning ? '1' : '0'}</span>
      </div>
      <Stage
        ref={stageRef}
        {...stageProps}
        onWheel={handleWheel}
        onContentMousedown={handlePointerDown}
        onContentMouseup={handlePointerUp}
        onDragMove={handleDragMove}
        onContextMenu={handleContextMenu}
        draggable={false}
      >
        <Layer>
          {/* Demo shape to visualize transforms */}
          <Rect x={100} y={100} width={200} height={120} fill="#91c9f9" cornerRadius={8} />
        </Layer>
      </Stage>
    </div>
  );
}

import { Circle as KCircle, Group, Rect as KRect, RegularPolygon, Transformer, Text as KText, Arrow as KArrow } from 'react-konva';
import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import type { CanvasObject } from '../../hooks/useCanvasObjects';

export default function Shape({ object, editingId, onEditText }: { object: CanvasObject; editingId?: string | null; onEditText?: (id: string) => void }) {
  const { selectedId, selectedIds, select, updateShape, beginGroupDrag, updateGroupDrag, commitGroupDrag } = useCanvasObjects();
  const isSelected = selectedId === object.id;
  const isMultiSelected = selectedIds.includes(object.id);
  const nodeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isSelected && nodeRef.current && trRef.current) {
      trRef.current.nodes([nodeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, object.id]);

  const handleDragEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    const newX = node.x();
    const newY = node.y();
    // Group is positioned by top-left for all shapes
    const start = dragStartRef.current ?? { x: object.x, y: object.y };
    const dx = newX - start.x;
    const dy = newY - start.y;
    if (selectedIds.length > 1 && selectedIds.includes(object.id)) {
      commitGroupDrag(object.id, dx, dy);
    } else {
      updateShape(object.id, { x: newX, y: newY }, { immediate: true });
    }
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const width = Math.max(20, object.width * scaleX);
    const height = Math.max(20, object.height * scaleY);
    node.scaleX(1);
    node.scaleY(1);
    const newX = node.x();
    const newY = node.y();
    // Group is positioned by top-left for all shapes
    const newRotation = node.rotation();
    const patch: Partial<CanvasObject> = { x: newX, y: newY, width, height, rotation: newRotation };
    if (object.type === 'text') {
      const fontSize = Math.max(10, (object.fontSize ?? 24) * scaleY);
      Object.assign(patch, { fontSize });
    }
    updateShape(object.id, patch, { immediate: true });
  };

  const groupProps = {
    x: object.x,
    y: object.y,
    draggable: true,
    onDragEnd: handleDragEnd,
    onDragStart: () => {
      if (selectedIds.length > 1 && selectedIds.includes(object.id)) {
        beginGroupDrag(object.id);
      }
      // capture anchor start position to compute stable deltas
      dragStartRef.current = { x: object.x, y: object.y };
    },
    onDragMove: () => {
      const node = nodeRef.current;
      if (!node) return;
      const start = dragStartRef.current ?? { x: object.x, y: object.y };
      const dx = node.x() - start.x;
      const dy = node.y() - start.y;
      if (selectedIds.length > 1 && selectedIds.includes(object.id)) {
        updateGroupDrag(object.id, dx, dy);
      }
    },
    onClick: (e: { evt?: { shiftKey?: boolean } }) => select(object.id, !!e?.evt?.shiftKey),
    onTap: () => select(object.id),
    onDblClick: () => { if (object.type === 'text') onEditText?.(object.id); },
    onDblTap: () => { if (object.type === 'text') onEditText?.(object.id); },
    onTransformEnd: handleTransformEnd,
    rotation: object.rotation,
  };

  return (
    <>
      <Group ref={nodeRef} {...groupProps}>
        {object.type === 'rectangle' && (
          <KRect
            x={0}
            y={0}
            width={object.width}
            height={object.height}
            fill={object.color}
            stroke={undefined}
            strokeWidth={undefined as unknown as number}
            dash={undefined}
            opacity={object.opacity ?? 1}
            cornerRadius={8}
          />
        )}
        {object.type === 'circle' && (
          <KCircle
            x={object.width / 2}
            y={object.height / 2}
            radius={Math.min(object.width, object.height) / 2}
            fill={object.color}
            stroke={undefined}
            strokeWidth={undefined as unknown as number}
            dash={undefined}
            opacity={object.opacity ?? 1}
          />
        )}
        {object.type === 'triangle' && (
          <RegularPolygon
            x={object.width / 2}
            y={object.height / 2}
            sides={3}
            radius={Math.min(object.width, object.height) / 2}
            fill={object.color}
            stroke={undefined}
            strokeWidth={undefined as unknown as number}
            dash={undefined}
            opacity={object.opacity ?? 1}
          />
        )}
        {object.type === 'arrow' && (
          <KArrow
            points={[0, object.height / 2, object.width - 20, object.height / 2]}
            pointerLength={12}
            pointerWidth={12}
            fill={object.color}
            stroke={object.color}
            strokeWidth={4}
            opacity={object.opacity ?? 1}
          />
        )}
        {object.type === 'text' && (
          <KText
            x={0}
            y={0}
            width={object.width}
            height={object.height}
            text={(object.textKind === 'heading' ? (object.text || 'Heading') : object.text) ?? 'Text'}
            fontSize={
              object.fontSize ?? (object.textKind === 'heading' ? 32 : object.textKind === 'subtitle' ? 20 : 16)
            }
            fontFamily={object.fontFamily ?? 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'}
            fontStyle={object.isBold ? 'bold' : 'normal'}
            fill={object.color}
            opacity={object.opacity ?? 1}
          />
        )}
        {isMultiSelected && (
          <KRect
            x={0}
            y={0}
            width={object.width}
            height={object.height}
            stroke={'#6366f1'}
            dash={[4, 3]}
            strokeWidth={1}
            listening={false}
          />
        )}
        {/* Flash halo overlay for recent external edits (render on top) */}
        {(((object as unknown) as { flashUntil?: number }).flashUntil ?? 0) > Date.now() && (
          <KRect
            x={-6}
            y={-6}
            width={object.width + 12}
            height={object.height + 12}
            stroke={(((object as unknown) as { flashColor?: string }).flashColor) || '#7c3aed'}
            strokeWidth={4}
            dash={[4, 4]}
            opacity={0.9}
            listening={false}
          />
        )}
      </Group>
      {isSelected && editingId !== object.id && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          rotationSnaps={[0, 90, 180, 270]}
          rotateAnchorOffset={20}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  );
}

import { Circle as KCircle, Group, Rect as KRect, RegularPolygon, Transformer, Text as KText } from 'react-konva';
import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import type { CanvasObject } from '../../hooks/useCanvasObjects';

export default function Shape({ object, editingId, onEditText }: { object: CanvasObject; editingId?: string | null; onEditText?: (id: string) => void }) {
  const { selectedId, select, updateShape } = useCanvasObjects();
  const isSelected = selectedId === object.id;
  const nodeRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && nodeRef.current && trRef.current) {
      trRef.current.nodes([nodeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, object.id]);

  const handleDragEnd = () => {
    const node = nodeRef.current;
    if (!node) return;
    let newX = node.x();
    let newY = node.y();
    // Group is positioned by top-left for all shapes
    updateShape(object.id, { x: newX, y: newY }, { immediate: true });
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
    let newX = node.x();
    let newY = node.y();
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
    onClick: () => select(object.id),
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
            cornerRadius={8}
          />
        )}
        {object.type === 'circle' && (
          <KCircle
            x={object.width / 2}
            y={object.height / 2}
            radius={Math.min(object.width, object.height) / 2}
            fill={object.color}
          />
        )}
        {object.type === 'triangle' && (
          <RegularPolygon
            x={object.width / 2}
            y={object.height / 2}
            sides={3}
            radius={Math.min(object.width, object.height) / 2}
            fill={object.color}
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
            fill={object.color}
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

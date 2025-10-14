import { Circle as KCircle, Group, Rect as KRect, RegularPolygon, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import type { CanvasObject } from '../../hooks/useCanvasObjects';

export default function Shape({ object }: { object: CanvasObject }) {
  const { selectedId, select, updateShape } = useCanvasObjects();
  const isSelected = selectedId === object.id;
  const nodeRef = useRef<Konva.Node>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && nodeRef.current && trRef.current) {
      trRef.current?.nodes([nodeRef.current]);
      trRef.current?.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragEnd = (e: any) => {
    const node = e.target as Konva.Node & { x: () => number; y: () => number };
    let newX = node.x();
    let newY = node.y();
    // Center-based nodes need converting back to top-left
    if (object.type !== 'rectangle') {
      newX = newX - object.width / 2;
      newY = newY - object.height / 2;
    }
    updateShape(object.id, { x: newX, y: newY });
  };

  const handleTransformEnd = () => {
    const node = nodeRef.current as any;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const width = Math.max(20, object.width * scaleX);
    const height = Math.max(20, object.height * scaleY);

    node.scaleX(1);
    node.scaleY(1);

    let newX = node.x();
    let newY = node.y();
    if (object.type !== 'rectangle') {
      newX = newX - width / 2;
      newY = newY - height / 2;
    }

    updateShape(object.id, { x: newX, y: newY, width, height });
  };

  const commonProps = {
    draggable: true,
    onDragEnd: handleDragEnd,
    onClick: () => select(object.id),
    ref: nodeRef as any,
    rotation: object.rotation,
    onTransformEnd: handleTransformEnd,
  };

  return (
    <Group>
      {object.type === 'rectangle' && (
        <KRect
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          fill={object.color}
          cornerRadius={8}
          {...commonProps}
        />
      )}
      {object.type === 'circle' && (
        <KCircle
          x={object.x + object.width / 2}
          y={object.y + object.height / 2}
          radius={Math.min(object.width, object.height) / 2}
          fill={object.color}
          {...commonProps}
        />
      )}
      {object.type === 'triangle' && (
        <RegularPolygon
          x={object.x + object.width / 2}
          y={object.y + object.height / 2}
          sides={3}
          radius={Math.min(object.width, object.height) / 2}
          fill={object.color}
          {...commonProps}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef as any}
          rotateEnabled={false}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </Group>
  );
}

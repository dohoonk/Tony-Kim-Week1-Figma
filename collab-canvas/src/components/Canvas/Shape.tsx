import { Circle as KCircle, Group, Rect as KRect, RegularPolygon, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { CanvasObject, useCanvasObjects } from '../../hooks/useCanvasObjects';

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

  const commonProps = {
    draggable: true,
    onDragEnd: (e: any) => {
      updateShape(object.id, { x: e.target.x(), y: e.target.y() });
    },
    onClick: () => select(object.id),
    ref: nodeRef as any,
    rotation: object.rotation,
  };

  const handleTransformEnd = (e: any) => {
    const node = nodeRef.current as any;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    const width = Math.max(20, object.width * scaleX);
    const height = Math.max(20, object.height * scaleY);

    node.scaleX(1);
    node.scaleY(1);

    updateShape(object.id, { x: node.x(), y: node.y(), width, height });
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
          onTransformEnd={handleTransformEnd}
        />
      )}
      {object.type === 'circle' && (
        <KCircle
          x={object.x + object.width / 2}
          y={object.y + object.height / 2}
          radius={Math.min(object.width, object.height) / 2}
          fill={object.color}
          {...commonProps}
          onTransformEnd={handleTransformEnd}
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
          onTransformEnd={handleTransformEnd}
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

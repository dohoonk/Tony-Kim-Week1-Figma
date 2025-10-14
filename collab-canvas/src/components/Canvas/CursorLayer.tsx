import { Layer, Group, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCursor } from '../../hooks/useCursor';

export default function CursorLayer({ onMouseMove }: { onMouseMove: (evt: KonvaEventObject<MouseEvent>) => void }) {
  const { cursors } = useCursor(100);

  return (
    <Layer listening={false} onMouseMove={onMouseMove}>
      {cursors.map((c) => (
        <Group key={c.uid} x={c.x} y={c.y} listening={false}>
          <Circle radius={4} fill={c.color || '#5b8def'} />
          <Text text={c.name || ''} x={8} y={-4} fontSize={12} fill={c.color || '#5b8def'} />
        </Group>
      ))}
    </Layer>
  );
}



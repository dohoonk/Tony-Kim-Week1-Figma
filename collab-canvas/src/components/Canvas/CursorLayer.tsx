import { Layer, Group, Circle, Text } from 'react-konva';
import { useCursor } from '../../hooks/useCursor';

type Self = { uid: string; x: number; y: number; name?: string; color?: string } | undefined;

export default function CursorLayer({ scale, selfCursor }: { scale: number; selfCursor?: Self }) {
  const { cursors } = useCursor(100);

  const r = 6 / Math.max(scale, 0.001); // ~6px on screen
  const fs = 12 / Math.max(scale, 0.001); // ~12px on screen

  const filtered = selfCursor ? cursors.filter((c) => c.uid !== selfCursor.uid) : cursors;

  return (
    <Layer listening={false}>
      {selfCursor && (
        <Group key={selfCursor.uid} x={selfCursor.x} y={selfCursor.y} listening={false}>
          <Circle radius={r} fill={selfCursor.color || '#5b8def'} />
          <Text text={selfCursor.name || 'You'} x={r + 4 / Math.max(scale, 0.001)} y={-fs / 2} fontSize={fs} fill={selfCursor.color || '#5b8def'} />
        </Group>
      )}
      {filtered.map((c) => (
        <Group key={c.uid} x={c.x} y={c.y} listening={false}>
          <Circle radius={r} fill={c.color || '#5b8def'} />
          <Text text={c.name || 'Anon'} x={r + 4 / Math.max(scale, 0.001)} y={-fs / 2} fontSize={fs} fill={c.color || '#5b8def'} />
        </Group>
      ))}
    </Layer>
  );
}



import { Layer, Group, Path, Text } from 'react-konva';
import { useCursor } from '../../hooks/useCursor';
import { colorForId } from '../../utils/color';

type Self = { uid: string; x: number; y: number; name?: string; color?: string } | undefined;

export default function CursorLayer({ scale, selfCursor }: { scale: number; selfCursor?: Self }) {
  const { cursors } = useCursor(100);

  const fs = 12 / Math.max(scale, 0.001); // ~12px on screen
  const size = 12 / Math.max(scale, 0.001); // pointer base size

  const filtered = selfCursor ? cursors.filter((c) => c.uid !== selfCursor.uid) : cursors;

  return (
    <Layer listening={false}>
      {selfCursor && (
        <Group key={selfCursor.uid} x={selfCursor.x} y={selfCursor.y} listening={false}>
          {(() => { const c = colorForId(selfCursor.uid); return (
            <>
              <Path
                data={`M0,0 L${size},${size*0.4} L${size*0.6},${size*0.6} L${size*0.4},${size} Z`}
                fill={c}
              />
              <Text text={selfCursor.name || 'You'} x={size + 4 / Math.max(scale, 0.001)} y={-fs / 2} fontSize={fs} fill={c} />
            </>
          ); })()}
        </Group>
      )}
      {filtered.map((c) => (
        <Group key={c.uid} x={c.x} y={c.y} listening={false}>
          {(() => { const col = colorForId(c.uid); return (
            <>
              <Path
                data={`M0,0 L${size},${size*0.4} L${size*0.6},${size*0.6} L${size*0.4},${size} Z`}
                fill={col}
              />
              <Text text={c.name || 'Anon'} x={size + 4 / Math.max(scale, 0.001)} y={-fs / 2} fontSize={fs} fill={col} />
            </>
          ); })()}
        </Group>
      ))}
    </Layer>
  );
}



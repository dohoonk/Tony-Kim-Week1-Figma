import { useCanvasObjects } from '../../hooks/useCanvasObjects';

export default function CanvasToolbar() {
  const { addShape } = useCanvasObjects();
  return (
    <div className="canvas-toolbar-box">
      <button onClick={() => addShape('rectangle')}>Add Rectangle</button>
      <button onClick={() => addShape('circle')}>Add Circle</button>
      <button onClick={() => addShape('triangle')}>Add Triangle</button>
      <button onClick={() => addShape('text', { text: '', textKind: 'body' })}>Add Text</button>
      <span style={{ marginLeft: 8, color: '#64748b' }}>
        Pan: Right-drag or Space+drag. Zoom: Wheel. Select: Click. Resize: handles.
      </span>
    </div>
  );
}

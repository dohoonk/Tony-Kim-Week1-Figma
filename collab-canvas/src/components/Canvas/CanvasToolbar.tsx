import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import { downloadDataUrl } from '../../utils/export';
import { useCanvasView } from '../../context/CanvasViewContext';

export default function CanvasToolbar() {
  const { addShape, undo, redo } = useCanvasObjects();
  const view = useCanvasView();
  const exportPng = () => {
    const stage = view.getStage?.();
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    downloadDataUrl('canvas.png', dataUrl);
  };
  const exportSvg = () => {
    const stage = view.getStage?.();
    if (!stage) return;
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stage.toSVG?.({ pixelRatio: 2 }) || '');
    downloadDataUrl('canvas.svg', dataUrl);
  };
  return (
    <div className="canvas-toolbar-box">
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={() => addShape('rectangle')}>Add Rectangle</button>
      <button onClick={() => addShape('circle')}>Add Circle</button>
      <button onClick={() => addShape('triangle')}>Add Triangle</button>
      <button onClick={() => addShape('text', { text: '', textKind: 'body' })}>Add Text</button>
      <button onClick={exportPng}>Export PNG</button>
      <button onClick={exportSvg}>Export SVG</button>
      <span style={{ marginLeft: 8, color: '#64748b' }}>
        Pan: Right-drag or Space+drag. Zoom: Wheel. Select: Click. Resize: handles.
      </span>
    </div>
  );
}

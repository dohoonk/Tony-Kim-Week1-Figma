import { useCanvasObjects } from '../../hooks/useCanvasObjects';
import { downloadDataUrl } from '../../utils/export';
import { useCanvasView } from '../../context/CanvasViewContext';
import { useAIAgent } from '../../hooks/useAIAgent';

export default function CanvasToolbar() {
  const { addShape, undo, redo } = useCanvasObjects();
  const view = useCanvasView();
  const { execute } = useAIAgent();
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
  // using text labels temporarily to verify render

  return (
    <div className="canvas-toolbar-box">
      <button className="toolbar-btn" title="Undo" onClick={undo}>Undo</button>
      <button className="toolbar-btn" title="Redo" onClick={redo}>Redo</button>
      <div className="toolbar-sep" />
      <button className="toolbar-btn" title="Rectangle" onClick={() => addShape('rectangle')}>Rect</button>
      <button className="toolbar-btn" title="Circle" onClick={() => addShape('circle')}>Circle</button>
      <button className="toolbar-btn" title="Triangle" onClick={() => addShape('triangle')}>Tri</button>
      <button className="toolbar-btn" title="Text" onClick={() => addShape('text', { text: '', textKind: 'body' })}>Text</button>
      <div className="toolbar-sep" />
      <button className="toolbar-btn" title="Center" onClick={() => execute({ type: 'arrangeCenter' })}>Center</button>
      <button className="toolbar-btn" title="Align Left" onClick={() => execute({ type: 'alignSelected', payload: { position: 'left' } })}>Left</button>
      <button className="toolbar-btn" title="Align Right" onClick={() => execute({ type: 'alignSelected', payload: { position: 'right' } })}>Right</button>
      <button className="toolbar-btn" title="Align Top" onClick={() => execute({ type: 'alignSelected', payload: { position: 'top' } })}>Top</button>
      <button className="toolbar-btn" title="Align Bottom" onClick={() => execute({ type: 'alignSelected', payload: { position: 'bottom' } })}>Bottom</button>
      <div className="toolbar-sep" />
      <button className="toolbar-btn" title="Row" onClick={() => execute({ type: 'rowLayout', payload: { gap: 16, padding: 24 } })}>Row</button>
      <button className="toolbar-btn" title="Grid" onClick={() => execute({ type: 'gridLayout', payload: { gap: 16, padding: 24 } })}>Grid</button>
      <div className="toolbar-sep" />
      <button className="toolbar-btn" title="Export PNG" onClick={exportPng}>PNG</button>
      <button className="toolbar-btn" title="Export SVG" onClick={exportSvg}>SVG</button>
    </div>
  );
}

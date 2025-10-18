import { useFpsMeter } from '../../hooks/usePerformance';

export default function FpsOverlay({ objectCount }: { objectCount: number }) {
  if (import.meta.env.PROD) return null;
  const { fps, avgFrameMs, updates } = useFpsMeter();
  return (
    <div style={{ position: 'absolute', bottom: 8, right: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 8, padding: '6px 8px', fontSize: 12, zIndex: 40, minWidth: 160 }}>
      <div>FPS: <strong>{fps}</strong> ({avgFrameMs} ms)</div>
      <div>Updates: {updates}</div>
      <div>Objects: {objectCount}</div>
    </div>
  );
}

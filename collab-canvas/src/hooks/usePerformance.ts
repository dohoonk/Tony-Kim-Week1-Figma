import { useEffect, useRef, useState } from 'react';

export type FpsStats = {
  fps: number;
  avgFrameMs: number;
  renderCount: number;
};

export function useFpsMeter(): FpsStats {
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);
  const [fps, setFps] = useState(0);
  const [avgFrameMs, setAvgFrameMs] = useState(0);
  const renderCountRef = useRef(0);
  const [, force] = useState(0);

  // track render count
  renderCountRef.current += 1;

  useEffect(() => {
    let mounted = true;
    const loop = (t: number) => {
      if (!mounted) return;
      const last = lastTimeRef.current ?? t;
      const dt = t - last;
      lastTimeRef.current = t;
      if (dt > 0 && dt < 1000) {
        const fpsNow = 1000 / dt;
        const samples = samplesRef.current;
        samples.push(fpsNow);
        if (samples.length > 30) samples.shift();
        const avgFps = samples.reduce((a, b) => a + b, 0) / samples.length;
        setFps(Math.round(avgFps));
        setAvgFrameMs(Math.round((1000 / avgFps) * 10) / 10);
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // nudge state to ensure hook updates when component re-renders (for render count visibility)
  useEffect(() => {
    const id = setTimeout(() => force((x) => x + 1), 0);
    return () => clearTimeout(id);
  });

  return { fps, avgFrameMs, renderCount: renderCountRef.current };
}



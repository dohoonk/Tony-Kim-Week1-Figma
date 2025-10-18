import { useEffect, useRef, useState } from 'react';

export type FpsStats = {
  fps: number;
  avgFrameMs: number;
  updates: number;
};

export function useFpsMeter(): FpsStats {
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const publishAtRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const [fps, setFps] = useState(0);
  const [avgFrameMs, setAvgFrameMs] = useState(0);
  const updatesRef = useRef(0);

  // track overlay update count (how often we publish stats)

  useEffect(() => {
    let mounted = true;
    const loop = (t: number) => {
      if (!mounted) return;
      const last = lastTimeRef.current ?? t;
      const dt = t - last;
      lastTimeRef.current = t;
      if (dt > 0 && dt < 1000) frameCountRef.current += 1;

      const now = t;
      const publishEveryMs = 500; // 2 Hz updates to avoid excessive renders
      if (publishAtRef.current === 0) publishAtRef.current = now + publishEveryMs;
      if (now >= publishAtRef.current) {
        const elapsed = publishEveryMs;
        const frames = frameCountRef.current;
        const fpsComputed = Math.round((frames * 1000) / elapsed);
        const avgMs = frames > 0 ? Math.round(((elapsed / frames) * 10)) / 10 : 0;
        updatesRef.current += 1;
        setFps(fpsComputed);
        setAvgFrameMs(avgMs);
        frameCountRef.current = 0;
        publishAtRef.current = now + publishEveryMs;
      }
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { fps, avgFrameMs, updates: updatesRef.current };
}



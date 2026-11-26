import { useCallback, useEffect, useRef, useState } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useChartMotion() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finish = useCallback(() => {
    if (ref.current) ref.current.dataset.chartAnimating = 'false';
    clearTimeout(timer.current);
  }, []);
  const start = useCallback(() => {
    if (ref.current) ref.current.dataset.chartAnimating = 'true';
    clearTimeout(timer.current);
    // Removing a series can cancel its end callback. Never leave the chart busy.
    timer.current = setTimeout(finish, 500);
  }, [finish]);
  useEffect(() => {
    if (reducedMotion) finish();
    return () => clearTimeout(timer.current);
  }, [finish, reducedMotion]);
  return {
    ref,
    reducedMotion,
    animationProps: {
      isAnimationActive: !reducedMotion,
      animationBegin: 0,
      animationDuration: 380,
      animationEasing: 'ease-out' as const,
      onAnimationStart: start,
      onAnimationEnd: finish,
    },
  };
}

'use client';

import { useEffect, useRef, useState } from 'react';

interface UseScoreAnimationOptions {
  animateOnMount?: boolean;
}

export function useScoreAnimation(
  target: number,
  duration = 1500,
  options: UseScoreAnimationOptions = {},
) {
  const { animateOnMount = true } = options;
  const [value, setValue] = useState(() => (animateOnMount ? 0 : target));
  const frameRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    cancelAnimationFrame(frameRef.current);
    const startValue = initializedRef.current
      ? valueRef.current
      : animateOnMount
        ? 0
        : target;
    initializedRef.current = true;

    if (startValue === target || duration <= 0) {
      valueRef.current = target;
      setValue(target);
      return;
    }

    const startTime = performance.now();
    const delta = target - startValue;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + delta * eased);
      if (nextValue !== valueRef.current) {
        valueRef.current = nextValue;
        setValue(nextValue);
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [animateOnMount, duration, target]);

  return value;
}

import { useEffect, useRef } from 'react';

const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** Calls `onIdle` once after `ms` without pointer or keyboard activity. */
export function useIdleTimeout(ms: number, onIdle: () => void) {
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    let last = Date.now();
    const touch = () => {
      last = Date.now();
    };
    EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    // Poll instead of resetting a timer on every mouse event.
    const id = window.setInterval(() => {
      if (Date.now() - last >= ms) {
        window.clearInterval(id);
        cb.current();
      }
    }, 5000);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, touch));
      window.clearInterval(id);
    };
  }, [ms]);
}

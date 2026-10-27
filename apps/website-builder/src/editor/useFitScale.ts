import { useEffect, useRef, useState } from "react";

/** Scale (<= 1) that makes a design of `designWidth` px fit the width of the observed element. */
export function useFitScale(designWidth: number, padding = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - padding;
      setScale(available > 0 ? Math.min(1, available / designWidth) : 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [designWidth, padding]);

  return { ref, scale };
}

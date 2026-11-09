import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./motion";

// Faz um número "contar" até o valor novo (ex.: 0 → 12) em vez de aparecer de uma vez.
// Quando o valor muda depois, conta a partir do valor anterior.
export function useCountUp(value: number, duration = 900): number {
  const reduced = prefersReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const origin = from.current;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // começa rápido e freia no fim
      const current = Math.round(origin + (value - origin) * eased);
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  // Quem pediu menos movimento vê o número final direto
  return reduced ? value : shown;
}

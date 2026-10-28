import { useEffect, useRef, useState } from "react";

// Cursor "JOÃO ROCK": uma bolinha girassol + uma etiqueta que segue o mouse.
// Só liga em mouse de verdade (no celular não existe cursor).
export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled] = useState(() => window.matchMedia("(pointer: fine)").matches);

  useEffect(() => {
    const cursor = ref.current;
    if (!enabled || !cursor) return;

    document.documentElement.classList.add("has-custom-cursor");

    function handleMove(event: PointerEvent) {
      // transform em vez de top/left: o navegador move sem recalcular o layout (mais suave)
      cursor!.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      cursor!.classList.remove("cursor--hidden");

      // Em cima de algo clicável, a bolinha cresce
      const target = event.target as Element | null;
      cursor!.classList.toggle("cursor--active", Boolean(target?.closest("button, a")));
    }

    function handleLeave() {
      cursor!.classList.add("cursor--hidden");
    }

    window.addEventListener("pointermove", handleMove);
    document.documentElement.addEventListener("pointerleave", handleLeave);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={ref} className="cursor cursor--hidden" aria-hidden="true">
      <span className="cursor__dot" />
      <span className="cursor__label">JOÃO ROCK</span>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../../motion";

// As cores pelas quais o pincel passa, uma depois da outra, sem parar
const COLORS = ["#e9a08a", "#edb94e", "#86c4d2", "#3f8ea5", "#93ab68", "#e07b45", "#c0603c", "#f3c7a8"];
const STEP = 700; // ms para ir de uma cor à próxima
const LIFE = 900; // ms que cada pincelada fica na tela antes de sumir por completo

type Stroke = { x1: number; y1: number; x2: number; y2: number; width: number; color: string; born: number };

function mix(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((ca >> shift) & 255) + ((((cb >> shift) & 255) - ((ca >> shift) & 255)) * t));
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

function colorAt(time: number): string {
  const step = (time / STEP) % COLORS.length;
  const i = Math.floor(step);
  return mix(COLORS[i], COLORS[(i + 1) % COLORS.length], step - i);
}

// O cursor vira a ponta de um pincel e deixa um rastro de tinta que vai secando (some aos poucos).
// Só em computador com mouse: no toque não existe cursor, e quem pediu menos movimento fica com o normal.
export function PaintCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tip = tipRef.current;
    if (!canvas || !tip) return;
    if (prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const ctx = canvas.getContext("2d")!;
    const root = canvas.closest(".atelier") as HTMLElement | null;
    root?.classList.add("has-paint-cursor");

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resize();
    window.addEventListener("resize", resize);

    // Cada pedaço de pincelada guarda quando nasceu; a cada quadro só redesenhamos os que ainda estão vivos
    const strokes: Stroke[] = [];
    let last: { x: number; y: number } | null = null;
    let target = { x: -100, y: -100 };
    let width = 8;
    let hovering = false;

    const onMove = (event: PointerEvent) => {
      target = { x: event.clientX, y: event.clientY };
      hovering = !!(event.target as Element | null)?.closest("button, a, [role='tab'], input, textarea, select");
    };
    const onLeave = () => {
      last = null;
      target = { x: -100, y: -100 };
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);

    let frame = 0;
    const draw = (time: number) => {
      const color = colorAt(time);

      if (target.x > -50 && last) {
        const dx = target.x - last.x;
        const dy = target.y - last.y;
        const speed = Math.hypot(dx, dy);
        // Rápido = traço fino; devagar = traço mais cheio, como um pincel de verdade
        const goal = Math.max(2, 10 - speed * 0.25);
        width += (goal - width) * 0.25;
        if (speed > 0.5) {
          strokes.push({ x1: last.x, y1: last.y, x2: target.x, y2: target.y, width, color, born: time });
        }
      }
      last = target.x > -50 ? { ...target } : null;

      // Joga fora o que já passou do tempo de vida (sempre os mais antigos, no começo da lista)
      while (strokes.length && time - strokes[0].born > LIFE) strokes.shift();

      // Limpa tudo e redesenha só o que está vivo: o mais velho mais fino e mais transparente
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const stroke of strokes) {
        const life = 1 - (time - stroke.born) / LIFE; // 1 = acabou de nascer, 0 = vai sumir
        ctx.globalAlpha = 0.55 * life;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width * (0.4 + 0.6 * life);
        ctx.beginPath();
        ctx.moveTo(stroke.x1, stroke.y1);
        ctx.lineTo(stroke.x2, stroke.y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      tip.style.transform = `translate(${target.x}px, ${target.y}px) scale(${hovering ? 1.8 : 1})`;
      tip.style.setProperty("--paint", color);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      root?.classList.remove("has-paint-cursor");
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="paint-trail" aria-hidden="true" />
      <div ref={tipRef} className="paint-tip" aria-hidden="true" />
    </>
  );
}

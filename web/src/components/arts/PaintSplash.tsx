import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import { PAINT, splatPath } from "./splat";

type PaintSplashProps = {
  x: number;
  y: number;
  // Chamado quando a tinta cobre a tela inteira: hora de trocar a página por baixo
  onCovered: () => void;
  // A camada começa a sumir: a página nova já pode animar a abertura
  onReveal: () => void;
  onDone: () => void;
};

const DROPS = 26;

// Transição para a página de Artes: a tinta explode de onde a pessoa clicou,
// os respingos voam, a cor de fundo inunda a tela e, já com a página nova por baixo, some.
export function PaintSplash({ x, y, onCovered, onReveal, onDone }: PaintSplashProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const callbacks = useRef({ onCovered, onReveal, onDone });
  callbacks.current = { onCovered, onReveal, onDone };

  const width = window.innerWidth;
  const height = window.innerHeight;
  // Raio para a mancha final alcançar o canto mais distante do clique
  const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));

  const shapes = useMemo(
    () => ({
      blobs: [0, 1, 2, 3].map((index) => ({
        d: splatPath(70, 24, 0.7),
        color: PAINT[index],
        rotate: Math.random() * 360,
      })),
      drops: Array.from({ length: DROPS }, (_, index) => {
        const angle = (index / DROPS) * Math.PI * 2 + Math.random() * 0.4;
        const distance = 140 + Math.random() * Math.min(420, reach * 0.55);
        const size = 4 + Math.random() * 13;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size,
          stretch: 1.6 + Math.random() * 1.4,
          angle: (angle * 180) / Math.PI,
          color: PAINT[index % PAINT.length],
        };
      }),
      cover: splatPath(100, 30, 0.5),
    }),
    [reach],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: () => callbacks.current.onDone() });
      // Em SVG, o GSAP escala a partir do canto da forma. As manchas já estão dentro de um
      // translate(x y), então o centro delas é o 0 0 local: é dali que crescem
      gsap.set(".splash__blob, .splash__cover", { svgOrigin: "0 0" });
      gsap.set(".splash__drop", { transformOrigin: "50% 50%" });

      // 1. As manchas estouram uma depois da outra, com mola
      timeline.fromTo(
        ".splash__blob",
        { scale: 0 },
        { scale: (index: number) => 1.5 - index * 0.22, duration: 0.55, ease: "elastic.out(1, 0.5)", stagger: 0.06 },
        0,
      );

      // 2. Respingos voam esticados na direção do movimento e encolhem ao parar
      timeline.fromTo(
        ".splash__drop",
        { x: 0, y: 0, scale: 0.2 },
        {
          x: (index: number) => shapes.drops[index].dx,
          y: (index: number) => shapes.drops[index].dy,
          scale: 1,
          duration: 0.7,
          ease: "expo.out",
          stagger: { each: 0.008, from: "random" },
        },
        0.04,
      );
      timeline.to(".splash__drop-shape", { attr: { rx: (i: number) => shapes.drops[i].size }, duration: 0.5, ease: "power2.out" }, 0.4);

      // 3. A cor de fundo da página inunda tudo, a partir do clique
      timeline.fromTo(
        ".splash__cover",
        { scale: 0 },
        { scale: reach / 82, duration: 0.75, ease: "power3.in" },
        0.32,
      );
      timeline.fromTo(".splash__label", { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.85);
      timeline.call(() => callbacks.current.onCovered(), undefined, 1.07);

      // 4. Página nova montada por baixo: a camada some
      timeline.to(".splash__label", { autoAlpha: 0, duration: 0.2 }, 1.35);
      timeline.call(() => callbacks.current.onReveal(), undefined, 1.4);
      timeline.to(root, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, 1.4);
    }, root);

    return () => ctx.revert();
  }, [shapes, reach]);

  return (
    <svg
      ref={rootRef}
      className="splash"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <g transform={`translate(${x} ${y})`}>
        {shapes.blobs.map((blob, index) => (
          <g key={index} transform={`rotate(${blob.rotate})`}>
            <path className="splash__blob" d={blob.d} fill={blob.color} />
          </g>
        ))}
        {shapes.drops.map((drop, index) => (
          <g key={index} className="splash__drop">
            <ellipse
              className="splash__drop-shape"
              rx={drop.size * drop.stretch}
              ry={drop.size}
              fill={drop.color}
              transform={`rotate(${drop.angle})`}
            />
          </g>
        ))}
        <path className="splash__cover" d={shapes.cover} />
      </g>
      <text className="splash__label" x={width / 2} y={height / 2} textAnchor="middle">
        Misturando as tintas…
      </text>
    </svg>
  );
}

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const INK = "#3b2a26";
const SKIN = "#a8603c";
const HAIR = "#2a1a17";
const LINE = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

// Braço ou perna: o traço escuro mais grosso por baixo vira o contorno da pele
function Limb({ d, width = 18, color = SKIN }: { d: string; width?: number; color?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={width + 6} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

// ---------- Quem pinta ----------
function Painter() {
  return (
    <svg className="figure figure--painter" viewBox="0 0 460 520" aria-hidden="true">
      {/* cavalete e tela */}
      <g>
        <Limb d="M336 74 L 296 500" width={8} color="#8a5a2e" />
        <Limb d="M336 74 L 384 500" width={8} color="#8a5a2e" />
        <rect x={262} y={104} width={156} height={196} rx={4} fill="#f7f0e6" {...LINE} />
        <rect x={252} y={298} width={176} height={14} rx={3} fill="#8a5a2e" {...LINE} />
        <g fill="none" strokeLinecap="round" strokeWidth={11}>
          <circle className="painter__stroke" pathLength={1} cx={366} cy={150} r={20} stroke="#edb94e" />
          <path className="painter__stroke" pathLength={1} d="M282 196 C 312 176, 344 214, 398 188" stroke="#3f8ea5" />
          <path className="painter__stroke" pathLength={1} d="M284 236 C 318 256, 352 220, 398 244" stroke="#6e8748" />
          <path className="painter__stroke" pathLength={1} d="M286 274 C 320 264, 356 288, 396 270" stroke="#e07b45" />
        </g>
      </g>

      {/* pernas e sapatos */}
      <path d="M116 330 L 106 488 L 140 488 L 152 370 L 164 488 L 198 488 L 190 330 Z" fill="#6b2737" {...LINE} />
      <ellipse cx={120} cy={494} rx={24} ry={9} fill={HAIR} />
      <ellipse cx={184} cy={494} rx={24} ry={9} fill={HAIR} />

      {/* braço de trás com a paleta */}
      <Limb d="M120 184 C 98 222, 90 250, 96 268" />
      <path d="M28 268 C 28 242, 76 236, 106 248 C 128 256, 122 284, 102 290 C 90 293, 94 304, 80 306 C 48 310, 28 296, 28 268 Z" fill="#c99a4e" {...LINE} />
      {[
        [52, 262, "#e07b45"],
        [74, 254, "#edb94e"],
        [96, 262, "#3f8ea5"],
        [58, 286, "#6e8748"],
      ].map(([x, y, c]) => (
        <circle key={`${x}-${y}`} cx={x as number} cy={y as number} r={8} fill={c as string} {...LINE} strokeWidth={2} />
      ))}

      {/* avental */}
      <path d="M110 170 C 98 232, 96 292, 104 338 L 202 338 C 208 292, 202 232, 190 170 C 172 156, 128 156, 110 170 Z" fill="#e9a08a" {...LINE} />
      <path d="M128 268 L 176 268 L 172 300 L 132 300 Z" fill="none" {...LINE} strokeWidth={2.5} />

      {/* cabeça com boina */}
      <Limb d="M150 140 L 150 162" width={16} />
      <circle cx={150} cy={112} r={32} fill={SKIN} {...LINE} />
      <path d="M112 96 C 110 66, 172 58, 194 84 C 200 94, 188 98, 178 92 C 160 84, 130 92, 112 96 Z" fill="#c0603c" {...LINE} />
      <path d="M150 66 L 152 56" {...LINE} strokeWidth={4} />
      <path d="M160 112 C 165 109, 170 109, 174 113" fill="none" {...LINE} strokeWidth={2.5} />
      <path d="M156 128 C 162 132, 168 132, 172 128" fill="none" {...LINE} strokeWidth={2.5} />

      {/* braço que pinta: gira no ombro (animação no CSS) */}
      <g className="painter__arm">
        <Limb d="M186 178 C 212 198, 228 206, 242 200" />
        <Limb d="M242 200 C 254 188, 262 172, 268 156" />
        <path d="M262 168 L 304 108" stroke="#8a5a2e" strokeWidth={6} strokeLinecap="round" />
        <path d="M298 116 L 306 104" stroke="#b9b4ae" strokeWidth={9} strokeLinecap="round" />
        <ellipse className="painter__tip" cx={309} cy={99} rx={6} ry={10} transform="rotate(35 309 99)" {...LINE} strokeWidth={2} />
        <circle cx={268} cy={156} r={10} fill={SKIN} {...LINE} />
      </g>
    </svg>
  );
}

// ---------- Quem dança ----------
function Dancer() {
  return (
    <svg className="figure figure--dancer" viewBox="0 0 420 520" aria-hidden="true">
      <path className="dancer__ribbon" d="M236 102 C 274 86, 300 124, 332 100 C 354 84, 374 96, 392 112" fill="none" stroke="#edb94e" strokeWidth={7} strokeLinecap="round" />
      <g className="dancer__body">
        {/* pernas: uma apoiada, outra no ar */}
        <Limb d="M198 396 L 188 490" />
        <Limb d="M226 396 C 250 436, 272 448, 304 438" />
        <ellipse cx={186} cy={496} rx={18} ry={7} fill={HAIR} />

        {/* saia em camadas: abre e fecha no giro */}
        <g className="dancer__skirt">
          <path d="M182 250 C 140 300, 100 360, 78 410 C 130 432, 290 432, 342 410 C 320 360, 280 300, 238 250 Z" fill="#c0603c" {...LINE} />
          <path d="M188 250 C 162 300, 138 350, 126 392 C 172 408, 248 408, 294 392 C 282 350, 258 300, 232 250 Z" fill="#e07b45" {...LINE} />
          <path d="M100 404 C 120 396, 140 412, 160 404 C 180 396, 200 412, 220 404 C 240 396, 260 412, 280 404 C 300 396, 316 408, 326 404" fill="none" stroke="#f3c7a8" strokeWidth={4} strokeLinecap="round" />
        </g>

        {/* corpo e braços para cima */}
        <path d="M184 160 C 178 200, 180 230, 186 256 L 234 256 C 240 230, 242 200, 236 160 C 222 150, 198 150, 184 160 Z" fill="#6b2737" {...LINE} />
        <Limb d="M188 170 C 160 140, 150 100, 168 64" />
        <Limb d="M232 170 C 262 140, 276 104, 262 66" />
        <circle cx={169} cy={58} r={10} fill={SKIN} {...LINE} />
        <circle cx={261} cy={60} r={10} fill={SKIN} {...LINE} />

        <Limb d="M210 140 L 210 158" width={14} />
        <circle cx={210} cy={118} r={27} fill={SKIN} {...LINE} />
        <path d="M184 112 C 182 84, 238 82, 238 112 C 230 98, 194 98, 184 112 Z" fill={HAIR} {...LINE} />
        <circle cx={232} cy={96} r={8} fill="#e9a08a" {...LINE} strokeWidth={2} />
        <path d="M200 120 C 204 123, 208 123, 212 120" fill="none" {...LINE} strokeWidth={2.5} />
        <path d="M214 120 C 218 123, 222 123, 226 120" fill="none" {...LINE} strokeWidth={2.5} />
        <path d="M206 132 C 210 136, 216 136, 220 132" fill="none" {...LINE} strokeWidth={2.5} />
      </g>
    </svg>
  );
}

// ---------- Quem canta ----------
function Singer() {
  return (
    <svg className="figure figure--singer" viewBox="0 0 420 520" aria-hidden="true">
      {/* notas subindo */}
      {[
        [276, 128, 0],
        [312, 96, 0.8],
        [262, 74, 1.6],
      ].map(([x, y, delay]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g className="singer__note" style={{ animationDelay: `${delay}s` }}>
            <path d="M0 0 L 0 -28 L 18 -32 L 18 -6" fill="none" {...LINE} />
            <circle cx={-5} cy={0} r={7} fill="#edb94e" {...LINE} strokeWidth={2} />
            <circle cx={13} cy={-6} r={7} fill="#edb94e" {...LINE} strokeWidth={2} />
          </g>
        </g>
      ))}

      <path d="M146 396 L 140 490 L 176 490 L 194 424 L 210 490 L 246 490 L 248 396 Z" fill="#2f4a54" {...LINE} />
      <ellipse cx={156} cy={496} rx={22} ry={8} fill={HAIR} />
      <ellipse cx={230} cy={496} rx={22} ry={8} fill={HAIR} />

      {/* braço aberto, como quem chama o público */}
      <g className="singer__arm">
        <Limb d="M234 216 C 270 232, 300 236, 336 222" />
        <circle cx={342} cy={220} r={11} fill={SKIN} {...LINE} />
      </g>

      <path d="M150 202 C 136 262, 132 332, 140 400 L 252 400 C 258 332, 254 262, 238 202 C 214 188, 174 188, 150 202 Z" fill="#3f8ea5" {...LINE} />
      <path d="M180 196 L 194 236 L 208 196" fill="#f7f0e6" {...LINE} strokeWidth={2.5} />

      {/* braço com o microfone */}
      <Limb d="M162 216 C 150 252, 178 266, 210 238" />
      <path d="M212 232 L 230 182" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <circle cx={232} cy={174} r={12} fill={INK} />
      <circle cx={210} cy={238} r={10} fill={SKIN} {...LINE} />

      {/* cabeça inclinada para cima */}
      <g transform="rotate(-14 196 150)">
        <Limb d="M196 166 L 196 190" width={16} />
        <circle cx={196} cy={140} r={30} fill={SKIN} {...LINE} />
        <path d="M166 134 C 164 106, 222 100, 226 128 C 214 116, 182 116, 166 134 Z" fill={HAIR} {...LINE} />
        <path d="M204 136 C 208 140, 214 140, 218 136" fill="none" {...LINE} strokeWidth={2.5} />
        <ellipse className="singer__mouth" cx={214} cy={156} rx={6} ry={8} fill={HAIR} />
      </g>
    </svg>
  );
}

const SCENES = [
  { verb: "pinta", Figure: Painter },
  { verb: "dança", Figure: Dancer },
  { verb: "canta", Figure: Singer },
];

// Intervalo entre o topo e as artes: a seção fica presa na tela e, a cada rolagem,
// a faixa anda na diagonal e traz uma pessoa grande sentindo a arte.
export function Interlude() {
  const rootRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      // Só no computador e para quem não pediu menos movimento. No celular, as cenas ficam empilhadas
      mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
        const track = root.querySelector<HTMLElement>(".interlude__track")!;
        const distance = () => track.scrollWidth - window.innerWidth * 0.55;

        const move = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            pin: root.querySelector(".interlude__pin"),
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });

        // Cada pessoa cresce e ganha cor quando chega ao meio da tela
        gsap.utils.toArray<HTMLElement>(".scene").forEach((scene) => {
          gsap.fromTo(
            scene.querySelector(".scene__art"),
            { scale: 0.62, autoAlpha: 0.25, rotate: 6 },
            {
              scale: 1,
              autoAlpha: 1,
              rotate: 0,
              ease: "power2.out",
              scrollTrigger: { trigger: scene, containerAnimation: move, start: "left 95%", end: "center 55%", scrub: true },
            },
          );
          gsap.fromTo(
            scene.querySelector(".scene__verb"),
            { xPercent: 30, autoAlpha: 0 },
            {
              xPercent: 0,
              autoAlpha: 1,
              ease: "power2.out",
              scrollTrigger: { trigger: scene, containerAnimation: move, start: "left 85%", end: "center 60%", scrub: true },
            },
          );
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="interlude" ref={rootRef} aria-label="Quem sente a arte">
      <div className="interlude__pin">
        <div className="interlude__tilt">
          <div className="interlude__track">
            <p className="interlude__open">
              Toda arte
              <br />
              começa em alguém.
            </p>
            {SCENES.map(({ verb, Figure }) => (
              <figure key={verb} className="scene">
                <span className="scene__verb" aria-hidden="true">
                  {verb}
                </span>
                <div className="scene__art">
                  <Figure />
                </div>
                <figcaption className="scene__caption">Alguém {verb}.</figcaption>
              </figure>
            ))}
            <p className="interlude__close">
              E até mesmo
              <br />
              no design do João Rock.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

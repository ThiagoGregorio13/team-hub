import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../../motion";

// A fita lilás, em três passadas de pincel; a última termina onde o pincel descansa
const RIBBONS = [
  { d: "M238 132 C 205 112, 140 116, 116 146 C 104 162, 108 176, 112 184", from: "#d6caf2", to: "#bfaeea", tip: "#cbbdf0", width: 24 },
  { d: "M224 150 C 178 150, 132 170, 128 200 C 124 228, 160 246, 206 246 C 248 246, 268 238, 284 230", from: "#ddd3f5", to: "#c3b3ec", tip: "#d4c8f2", width: 30 },
  { d: "M196 250 C 238 254, 292 246, 320 226 C 332 218, 341 212, 349 206", from: "#a993de", to: "#8a70cf", tip: "#9a82d8", width: 15 },
];

// Folha com a base em 0,0 e a ponta para cima: cresce a partir da base
const LEAF = "M0 0 C 8 -7 9 -21 0 -33 C -9 -21 -8 -7 0 0 Z";
const PETAL = "M0 0 C 9 -6 11 -20 0 -28 C -11 -20 -9 -6 0 0 Z";

type Leaf = { x: number; y: number; rotate: number; size: number; fill: string };

const SAGE_STEM = "M200 260 C 186 222, 166 178, 150 134";
const SAGE_LEAVES: Leaf[] = [
  { x: 192, y: 236, rotate: -78, size: 0.9, fill: "leaf-sage" },
  { x: 184, y: 214, rotate: 28, size: 1, fill: "leaf-sage-2" },
  { x: 175, y: 192, rotate: -70, size: 1, fill: "leaf-sage" },
  { x: 167, y: 172, rotate: 30, size: 0.95, fill: "leaf-sage-2" },
  { x: 159, y: 154, rotate: -60, size: 0.85, fill: "leaf-sage" },
  { x: 151, y: 137, rotate: -12, size: 0.8, fill: "leaf-sage-2" },
];

const TEAL_STEM = "M274 240 C 288 212, 300 182, 309 150";
const TEAL_LEAVES: Leaf[] = [
  { x: 281, y: 226, rotate: -66, size: 0.95, fill: "leaf-teal" },
  { x: 289, y: 206, rotate: 52, size: 1, fill: "leaf-teal-2" },
  { x: 296, y: 186, rotate: -58, size: 1, fill: "leaf-teal" },
  { x: 303, y: 168, rotate: 48, size: 0.9, fill: "leaf-teal-2" },
  { x: 309, y: 152, rotate: 8, size: 0.8, fill: "leaf-teal" },
];

const FLOWER_STEM = "M238 222 C 236 206, 234 194, 236 180";
const FLOWER = { x: 236, y: 180 };
const PETALS = [
  { rotate: -64, fill: "petal-deep" },
  { rotate: -30, fill: "petal-soft" },
  { rotate: 0, fill: "petal-deep" },
  { rotate: 30, fill: "petal-soft" },
  { rotate: 64, fill: "petal-deep" },
];

const LOOSE = [
  { x: 340, y: 128, rotate: 28, size: 0.45, fill: "petal-soft" },
  { x: 214, y: 270, rotate: -72, size: 0.5, fill: "petal-deep" },
  { x: 120, y: 226, rotate: 120, size: 0.35, fill: "leaf-sage" },
];

const REST = { x: 349, y: 206 };

export function PaintBrush() {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const q = <T extends Element>(selector: string) => [...svg.querySelectorAll<T>(selector)];
    const brush = svg.querySelector<SVGGElement>(".brush")!;
    const load = svg.querySelector<SVGPathElement>(".brush__load")!;
    const melt = svg.querySelector<SVGFEDisplacementMapElement>("#art-melt-map")!;
    const art = svg.querySelector<SVGGElement>(".art-piece")!;
    const masks = q<SVGPathElement>(".ribbon-mask");
    const stems = q<SVGPathElement>(".stem");
    const leaves = q<SVGGElement>(".leaf");
    const petals = q<SVGGElement>(".petal");
    const loose = q<SVGGElement>(".loose");
    const sun = svg.querySelector<SVGGElement>(".sun")!;
    const maskLengths = masks.map((path) => path.getTotalLength());
    const stemLengths = stems.map((path) => path.getTotalLength());

    const state = { x: REST.x, y: REST.y, tilt: 0, lift: 0, bob: 0 };
    const render = () => {
      brush.setAttribute(
        "transform",
        `translate(${state.x} ${state.y - state.lift + state.bob}) rotate(${32 + state.tilt}) scale(1.3)`,
      );
    };

    // Tela em branco. A fita é revelada por uma MÁSCARA que se desenha: assim a textura
    // de pincel seco e o brilho acompanham o traço sem precisar animar cada camada.
    const hideAll = () => {
      // opacity 0: com ponta redonda, um traço "vazio" ainda mostraria uma bolinha no início
      [...masks, ...stems].forEach((path) => (path.style.opacity = "0"));
      masks.forEach((path, i) => {
        path.style.strokeDasharray = `${maskLengths[i]}`;
        path.style.strokeDashoffset = `${maskLengths[i]}`;
      });
      stems.forEach((path, i) => {
        path.style.strokeDasharray = `${stemLengths[i]}`;
        path.style.strokeDashoffset = `${stemLengths[i]}`;
      });
      gsap.set([...leaves, ...petals, ...loose], { scale: 0, transformOrigin: "50% 100%" });
      gsap.set(sun, { scale: 0, transformOrigin: "50% 50%" });
      gsap.set(art, { opacity: 1, y: 0 });
      melt.setAttribute("scale", "0");
    };

    if (prefersReducedMotion()) {
      render();
      return;
    }

    const ctx = gsap.context(() => {
      hideAll();
      render();

      const levitate = gsap.to(state, {
        bob: -6,
        duration: 1.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        onUpdate: render,
      });
      const floats = loose.map((petal, i) =>
        gsap.to(petal, {
          y: i % 2 ? 7 : -7,
          rotation: i % 2 ? 12 : -12,
          duration: 2 + i * 0.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        }),
      );

      const tl = gsap.timeline({ repeat: -1, delay: 0.4 });

      // O pincel surge (o contrário do desmanche)
      tl.set(state, { x: 238, y: 132, lift: 30, tilt: 0 })
        .call(render)
        .fromTo(brush, { opacity: 0 }, { opacity: 1, duration: 0.5 });

      RIBBONS.forEach((ribbon, i) => {
        const path = masks[i];
        const length = maskLengths[i];
        const start = path.getPointAtLength(0);
        const progress = { value: 0 };

        tl.to(state, { x: start.x, y: start.y, lift: 22, tilt: 0, duration: 0.55, ease: "power2.inOut", onUpdate: render })
          .set(load, { attr: { fill: ribbon.tip } })
          .set(path, { opacity: 1 })
          .to(state, { lift: 0, duration: 0.16, ease: "power2.in", onUpdate: render })
          .to(progress, {
            value: 1,
            duration: 0.9 + length / 420,
            ease: "power1.inOut",
            onUpdate: () => {
              const at = length * progress.value;
              const point = path.getPointAtLength(at);
              const ahead = path.getPointAtLength(Math.min(length, at + 2));
              const slope = (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI;
              state.x = point.x;
              state.y = point.y;
              state.tilt = gsap.utils.clamp(-12, 12, slope * 0.2);
              path.style.strokeDashoffset = `${length - at}`;
              render();
            },
          });
      });

      // A tinta vira jardim: hastes se desenham, folhas brotam, a flor abre e o sol nasce
      tl.to(state, { lift: 12, tilt: -6, duration: 0.4, ease: "power2.out", onUpdate: render })
        .set(stems, { opacity: 1 }, "<")
        .to(stems, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out", stagger: 0.15 }, "<")
        .to(leaves, { scale: 1, duration: 0.55, ease: "back.out(2.4)", stagger: 0.06 }, "<0.3")
        .to(petals, { scale: 1, duration: 0.6, ease: "back.out(2)", stagger: 0.07 }, "<0.25")
        .fromTo(sun, { scale: 0, y: 20 }, { scale: 1, y: 0, duration: 0.9, ease: "elastic.out(1, 0.6)" }, "<0.2")
        .to(loose, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.1 }, "<0.2")
        .to(state, { x: REST.x, y: REST.y, lift: 0, tilt: 0, duration: 0.8, ease: "power2.inOut", onUpdate: render }, "<")
        .to({}, { duration: 2.4 })
        // Desmancha tudo, o pincel junto: a tinta se distorce, sobe um pouco e evapora
        .to(melt, { attr: { scale: 90 }, duration: 1.3, ease: "power2.in" })
        .to(art, { opacity: 0, y: -14, duration: 1.3, ease: "power2.in" }, "<")
        .to(brush, { opacity: 0, duration: 1, ease: "power2.in" }, "<0.2")
        .call(hideAll);

      ScrollTrigger.create({
        trigger: svg,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => [tl, levitate, ...floats].forEach((t) => (self.isActive ? t.play() : t.pause())),
      });
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={svgRef}
      className="paint"
      viewBox="78 -24 400 320"
      shapeRendering="geometricPrecision"
      role="img"
      aria-label="Um pincel pinta uma fita lilás que vira flores"
    >
      <defs>
        <filter id="art-melt" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.06" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap id="art-melt-map" in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Sombra macia: a pintura parece apoiada sobre o papel */}
        <filter id="art-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#2a2023" floodOpacity="0.13" />
        </filter>
        <filter id="sun-halo" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="9" />
        </filter>

        {RIBBONS.map((ribbon, i) => (
          <linearGradient key={i} id={`ribbon-${i}`} gradientUnits="userSpaceOnUse" x1="100" y1="120" x2="350" y2="250">
            <stop offset="0" stopColor={ribbon.from} />
            <stop offset="1" stopColor={ribbon.to} />
          </linearGradient>
        ))}
        {RIBBONS.map((ribbon, i) => (
          <mask key={i} id={`ribbon-mask-${i}`} maskUnits="userSpaceOnUse" x="0" y="-40" width="520" height="380">
            <path className="ribbon-mask" d={ribbon.d} stroke="#fff" strokeWidth={ribbon.width + 6} />
          </mask>
        ))}

        <linearGradient id="leaf-sage" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#8fa289" />
          <stop offset="1" stopColor="#c3cfbc" />
        </linearGradient>
        <linearGradient id="leaf-sage-2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7c9076" />
          <stop offset="1" stopColor="#b0bfa8" />
        </linearGradient>
        <linearGradient id="leaf-teal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#3f8a7c" />
          <stop offset="1" stopColor="#7cbcaf" />
        </linearGradient>
        <linearGradient id="leaf-teal-2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2f7468" />
          <stop offset="1" stopColor="#62a99b" />
        </linearGradient>
        <linearGradient id="petal-deep" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#d9725f" />
          <stop offset="1" stopColor="#f3ab98" />
        </linearGradient>
        <linearGradient id="petal-soft" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e5897a" />
          <stop offset="1" stopColor="#f8c6b6" />
        </linearGradient>
        <radialGradient id="sun-fill" cx="0.36" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#fbdcc2" />
          <stop offset="0.6" stopColor="#f4bf96" />
          <stop offset="1" stopColor="#eaa679" />
        </radialGradient>

        <linearGradient id="brush-wood" x1="0" x2="1">
          <stop offset="0" stopColor="#a8763a" />
          <stop offset="0.35" stopColor="#e4b877" />
          <stop offset="0.6" stopColor="#d3a160" />
          <stop offset="1" stopColor="#94642c" />
        </linearGradient>
        <linearGradient id="brush-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#7e7b79" />
          <stop offset="0.38" stopColor="#f7f5f2" />
          <stop offset="0.62" stopColor="#c9c6c2" />
          <stop offset="1" stopColor="#6f6c6a" />
        </linearGradient>
        <linearGradient id="brush-hair" x1="0" x2="1">
          <stop offset="0" stopColor="#1e1a1c" />
          <stop offset="0.5" stopColor="#4a4245" />
          <stop offset="1" stopColor="#1e1a1c" />
        </linearGradient>
      </defs>

      <g className="art-piece" filter="url(#art-melt)">
        <g filter="url(#art-shadow)">
          <g className="sun">
            <circle cx="280" cy="108" r="40" fill="#f4bf96" opacity="0.35" filter="url(#sun-halo)" />
            <circle cx="280" cy="108" r="30" fill="url(#sun-fill)" />
            <ellipse cx="270" cy="96" rx="9" ry="5" fill="#fff" opacity="0.28" transform="rotate(-30 270 96)" />
          </g>

          {RIBBONS.map((ribbon, i) => (
            <g key={ribbon.d} mask={`url(#ribbon-mask-${i})`}>
              <path className="ribbon" d={ribbon.d} stroke={`url(#ribbon-${i})`} strokeWidth={ribbon.width} />
              {/* Textura de pincel seco: fios claros e escuros correndo ao longo do traço */}
              <path className="ribbon__bristle" d={ribbon.d} strokeWidth={1.3} strokeDasharray="18 5 4 9 26 6" transform="translate(0 -5)" stroke="rgba(255,255,255,0.22)" />
              <path className="ribbon__bristle" d={ribbon.d} strokeWidth={1} strokeDasharray="10 7 22 4" transform="translate(1 4)" stroke="rgba(92,70,150,0.1)" />
              <path className="ribbon__bristle" d={ribbon.d} strokeWidth={0.8} strokeDasharray="30 8 6 6" transform="translate(-1 1)" stroke="rgba(255,255,255,0.12)" />
              <path className="ribbon__sheen" d={ribbon.d} strokeWidth={ribbon.width * 0.14} />
            </g>
          ))}

          <path className="stem stem--sage" d={SAGE_STEM} />
          <path className="stem stem--flower" d={FLOWER_STEM} />
          <path className="stem stem--teal" d={TEAL_STEM} />

          {[...SAGE_LEAVES, ...TEAL_LEAVES].map((leaf, i) => (
            <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.size})`}>
              <g className="leaf">
                <path d={LEAF} fill={`url(#${leaf.fill})`} />
                <path d="M0 -2 L0 -28 M0 -10 L4 -15 M0 -10 L-4 -15 M0 -18 L3.4 -22 M0 -18 L-3.4 -22" className="leaf__vein" />
              </g>
            </g>
          ))}

          <g transform={`translate(${FLOWER.x} ${FLOWER.y})`}>
            {PETALS.map((petal, i) => (
              <g key={i} transform={`rotate(${petal.rotate})`}>
                <g className="petal">
                  <path d={PETAL} fill={`url(#${petal.fill})`} />
                  <path d="M0 -3 L0 -20" className="leaf__vein" />
                </g>
              </g>
            ))}
          </g>

          {LOOSE.map((petal, i) => (
            <g key={i} transform={`translate(${petal.x} ${petal.y}) rotate(${petal.rotate}) scale(${petal.size})`}>
              <g className="loose">
                <path d={PETAL} fill={`url(#${petal.fill})`} />
              </g>
            </g>
          ))}
        </g>

        {/* Pincel fino, ponta em 0,0: encosta exatamente no caminho que pinta */}
        <g className="brush">
          <path d="M-4.4 -40 C -3.8 -82 -2.8 -132 -1.8 -178 Q 0 -184 1.8 -178 C 2.8 -132 3.8 -82 4.4 -40 Z" fill="url(#brush-wood)" />
          {/* Veios da madeira */}
          <path d="M-2.4 -52 C -2.1 -90 -1.6 -128 -1 -168 M1.6 -60 C 1.5 -100 1.2 -136 0.8 -160" className="brush__grain" />
          <path d="M-1.4 -48 C -1.2 -90 -0.9 -135 -0.5 -172" className="brush__gloss" />
          <path d="M-1.8 -178 Q 0 -184 1.8 -178 L 1.6 -170 Q 0 -173 -1.6 -170 Z" fill="#6b2737" />
          <rect x="-4.8" y="-42" width="9.6" height="18" rx="1.6" fill="url(#brush-steel)" />
          <path d="M-4.8 -37 H4.8 M-4.8 -34.5 H4.8" className="brush__crimp" />
          <path d="M0 0 C -3.4 -6 -5.2 -15 -4.8 -24 L 4.8 -24 C 5.2 -15 3.4 -6 0 0 Z" fill="url(#brush-hair)" />
          <path className="brush__load" d="M0 0 C -3 -5 -4.6 -10 -4.6 -14 C -1.6 -12 1.6 -15 4.6 -12 C 4.2 -8 2.8 -4 0 0 Z" fill={RIBBONS[0].tip} />
          <path d="M-1.6 -20 C -1.8 -14 -1.2 -8 -0.4 -4" className="brush__gloss" />
        </g>
      </g>
    </svg>
  );
}

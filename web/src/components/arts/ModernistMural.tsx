import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../../motion";
import "./mural.css";

gsap.registerPlugin(ScrollTrigger);

// O mural vive num espaço de 720x400. O SVG escala sozinho para qualquer tela.
const W = 720;
const H = 400;
const INK = "#3b2a26";
const SKIN = "#a8603c";
const HAIR = "#3a2420";
const OUTLINE = { stroke: INK, strokeWidth: 2.2, strokeLinejoin: "round" as const };

// ---------------------------------------------------------------------------
// O "caminho do pincel": vai e volta cobrindo uma área, como um pintor de verdade.
// Esse caminho vira uma MÁSCARA que se desenha aos poucos e revela a camada por baixo.
// ---------------------------------------------------------------------------
type Area = { x: number; y: number; w: number; h: number; size: number; vertical?: boolean };

const round = (n: number) => Math.round(n * 10) / 10;

function sweep(area: Area): string {
  const x0 = Math.max(area.x, 0);
  const y0 = Math.max(area.y, 0);
  const x1 = Math.min(area.x + area.w, W);
  const y1 = Math.min(area.y + area.h, H);
  const { size, vertical } = area;
  // a = direção da pincelada; b = direção em que as passadas avançam
  const [a0, a1, b0, b1] = vertical ? [y0, y1, x0, x1] : [x0, x1, y0, y1];
  const pad = Math.min(size * 0.35, (b1 - b0) / 2);
  const span = b1 - b0 - pad * 2;
  const rows = Math.max(1, Math.round(span / (size * 0.72)) + 1);
  const gap = rows > 1 ? span / (rows - 1) : 0;
  const pt = (a: number, b: number) => (vertical ? `${round(b)} ${round(a)}` : `${round(a)} ${round(b)}`);

  let d = "";
  for (let i = 0; i < rows; i++) {
    const b = b0 + pad + gap * i;
    const forward = i % 2 === 0;
    const from = forward ? a0 : a1;
    const to = forward ? a1 : a0;
    if (i === 0) {
      d += `M${pt(from, b)}`;
    } else {
      // A curva da volta: o pincel passa um pouco da borda antes de voltar
      const out = (forward ? -1 : 1) * size * 0.5;
      d += ` C${pt(from + out, b - gap)} ${pt(from + out, b)} ${pt(from, b)}`;
    }
    // Uma leve ondulação: mão humana não pinta em linha reta
    const wobble = ((i % 3) - 1) * size * 0.14;
    const third = (to - from) / 3;
    d += ` C${pt(from + third, b + wobble)} ${pt(from + third * 2, b - wobble)} ${pt(to, b)}`;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Peças de desenho reaproveitáveis
// ---------------------------------------------------------------------------
function Limb({ d, width = 12 }: { d: string; width?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={width + 4.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={SKIN} strokeWidth={width} strokeLinecap="round" />
    </>
  );
}

// Detalhe a nanquim: aparece no fim, como os últimos retoques do artista
function Ink({ d, width = 1.6 }: { d: string; width?: number }) {
  return <path className="mm-ink" pathLength={1} d={d} fill="none" stroke={INK} strokeWidth={width} strokeLinecap="round" />;
}

type Frond = { angle: number; fill: string };

function Fan({ x, y, shape, rib, fronds, scale = 1 }: { x: number; y: number; shape: string; rib: string; fronds: Frond[]; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {fronds.map((frond, i) => (
        <g key={i} transform={`rotate(${frond.angle})`}>
          <path d={shape} fill={frond.fill} {...OUTLINE} strokeWidth={2.2 / scale} />
          <Ink d={rib} width={1.4 / scale} />
        </g>
      ))}
    </g>
  );
}

function Streaks({ color, paths, width = 4 }: { color: string; paths: string[]; width?: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" opacity={0.6}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

const BANANA_LEAF = "M0 0 C 18 -16, 64 -22, 108 -6 C 66 8, 20 10, 0 0 Z";
const BANANA_RIB = "M6 -1 C 40 -7, 72 -9, 102 -6";
const PALM_LEAF = "M0 0 C 26 -18, 82 -18, 124 6 C 80 -2, 28 6, 0 0 Z";
const PALM_RIB = "M6 0 C 40 -8, 84 -8, 118 4";
const SPIKE = "M0 0 C -14 -40, -8 -96, 0 -126 C 8 -96, 14 -40, 0 0 Z";
const SPIKE_RIB = "M0 -6 C -2 -50, -1 -90, 0 -118";

const alternate = (angles: number[], a: string, b: string): Frond[] =>
  angles.map((angle, i) => ({ angle, fill: i % 2 ? b : a }));

// Anéis do tronco da palmeira, acompanhando a curva do tronco
const PALM_RINGS = [110, 140, 170, 200, 230, 260, 290, 320].map((y) => {
  const cx = 535.5 + ((y - 80) / 256) * 26;
  return `M${round(cx - 6)} ${y} C ${round(cx - 2)} ${y + 3}, ${round(cx + 2)} ${y + 3}, ${round(cx + 6)} ${y}`;
});

// ---------------------------------------------------------------------------
// As camadas, NA ORDEM EM QUE SÃO PINTADAS (de trás para a frente)
// ---------------------------------------------------------------------------
type Layer = { name: string; color: string; area: Area; time: number; art: ReactNode };

const LAYERS: Layer[] = [
  {
    name: "céu",
    color: "#e9a08a",
    area: { x: 0, y: 0, w: W, h: 205, size: 62 },
    time: 0.7,
    art: (
      <>
        <rect x={-10} y={-10} width={W + 20} height={240} fill="url(#mm-sky)" />
        <Streaks
          color="#fbd2c0"
          paths={[
            "M40 46 C 90 38, 150 40, 205 48",
            "M330 30 C 390 22, 450 24, 500 32",
            "M520 72 C 570 64, 630 66, 690 74",
            "M300 98 C 340 92, 380 94, 410 100",
          ]}
        />
      </>
    ),
  },
  {
    name: "sol",
    color: "#edb94e",
    area: { x: 160, y: 24, w: 130, h: 130, size: 34 },
    time: 1.1,
    art: (
      <>
        <circle cx={225} cy={88} r={60} fill="#edb94e" {...OUTLINE} />
        <path d="M188 72 A 42 42 0 0 1 238 46" fill="none" stroke="#f7d785" strokeWidth={6} strokeLinecap="round" opacity={0.8} />
      </>
    ),
  },
  {
    name: "rio",
    color: "#3f8ea5",
    area: { x: 0, y: 118, w: W, h: 112, size: 48 },
    time: 1.0,
    art: (
      <>
        <path d="M-10 178 C 90 140, 170 150, 250 172 C 330 194, 400 122, 482 128 C 562 134, 622 172, 730 150 L730 280 L-10 280 Z" fill="#3f8ea5" {...OUTLINE} />
        <Streaks color="#86c4d2" paths={["M60 172 C 100 162, 140 162, 170 169", "M430 148 C 470 138, 520 140, 560 150", "M600 172 C 630 167, 660 165, 690 162"]} />
      </>
    ),
  },
  {
    name: "morros",
    color: "#6e8748",
    area: { x: 0, y: 186, w: W, h: 92, size: 48 },
    time: 0.9,
    art: (
      <>
        <path d="M-10 222 C 80 192, 160 202, 240 222 C 320 242, 400 188, 490 192 C 570 196, 640 226, 730 206 L730 320 L-10 320 Z" fill="#6e8748" {...OUTLINE} />
        <Streaks color="#93ab68" paths={["M40 222 C 80 210, 120 210, 150 216", "M420 205 C 460 196, 500 196, 540 202", "M250 240 C 280 236, 300 236, 320 240"]} />
      </>
    ),
  },
  {
    name: "terra",
    color: "#c0603c",
    area: { x: 0, y: 234, w: W, h: 110, size: 52 },
    time: 1.0,
    art: (
      <>
        <path d="M-10 262 C 100 236, 200 250, 300 264 C 400 278, 500 242, 600 246 C 650 248, 690 258, 730 252 L730 410 L-10 410 Z" fill="#c0603c" {...OUTLINE} />
        <Streaks color="#da8461" paths={["M30 280 C 80 270, 130 270, 170 276", "M440 268 C 490 258, 540 258, 580 262", "M200 300 C 240 294, 270 294, 300 298"]} />
      </>
    ),
  },
  {
    name: "areia",
    color: "#e2b263",
    area: { x: 0, y: 300, w: W, h: 100, size: 52 },
    time: 1.1,
    art: (
      <>
        <path d="M-10 336 C 120 306, 240 318, 360 324 C 480 330, 600 300, 730 314 L730 410 L-10 410 Z" fill="#e2b263" {...OUTLINE} />
        <Streaks color="#f0cf90" paths={["M80 352 C 130 344, 170 344, 210 350", "M480 346 C 530 337, 580 337, 620 341", "M240 380 C 280 374, 320 374, 350 378"]} />
      </>
    ),
  },
  {
    name: "caminho",
    color: "#eaa28a",
    area: { x: 294, y: 264, w: 124, h: 136, size: 34, vertical: true },
    time: 0.7,
    art: (
      <path
        d="M300 410 C 310 362, 380 346, 360 316 C 345 296, 360 280, 370 270 L 392 270 C 384 284, 372 298, 390 318 C 412 346, 352 370, 372 410 Z"
        fill="#eaa28a"
        {...OUTLINE}
      />
    ),
  },
  {
    name: "bananeira",
    color: "#6f8f4c",
    area: { x: 0, y: 16, w: 212, h: 322, size: 40 },
    time: 0.8,
    art: (
      <>
        <path d="M90 336 C 86 270, 90 200, 86 132 L 98 132 C 102 200, 100 270, 104 336 Z" fill="#b5893f" {...OUTLINE} />
        <Ink d="M95 300 C 94 260, 95 220, 93 180" />
        <Fan x={92} y={130} shape={BANANA_LEAF} rib={BANANA_RIB} fronds={alternate([-168, -140, -112, -70, -38, -8, 8], "#5d7e43", "#7c9c56")} />
        <path d="M100 138 C 102 146, 102 150, 101 156" fill="none" stroke={INK} strokeWidth={2.4} />
        {[
          [96, 160, -20],
          [105, 162, -4],
          [100, 175, -14],
          [109, 175, 6],
        ].map(([x, y, r]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={4.5} ry={11} transform={`rotate(${r} ${x} ${y})`} fill="#e8c04a" {...OUTLINE} strokeWidth={1.8} />
        ))}
      </>
    ),
  },
  {
    name: "palmeira",
    color: "#5d7c45",
    area: { x: 410, y: 0, w: 256, h: 340, size: 40 },
    time: 0.6,
    art: (
      <>
        <path d="M555 336 C 550 260, 540 180, 530 80 L 541 80 C 551 180, 562 260, 568 336 Z" fill="#b7793c" {...OUTLINE} />
        {PALM_RINGS.map((d) => (
          <Ink key={d} d={d} width={1.4} />
        ))}
        <Fan x={536} y={78} shape={PALM_LEAF} rib={PALM_RIB} fronds={alternate([-175, -148, -118, -64, -34, -4, 168], "#4e6f3d", "#6c8a4c")} />
      </>
    ),
  },
  {
    name: "cactos",
    color: "#5f8a55",
    area: { x: 548, y: 150, w: 148, h: 220, size: 32, vertical: true },
    time: 1.1,
    art: (
      <>
        <g fill="#79995f" {...OUTLINE}>
          <path d="M662 245 L662 175 C662 163 678 163 678 175 L678 245 Z" />
          <path d="M662 215 L654 215 C648 215 646 210 646 204 L646 192 C646 184 656 184 656 192 L656 206 L662 206 Z" />
          <path d="M678 205 L686 205 C692 205 694 200 694 194 L694 184 C694 176 684 176 684 184 L684 196 L678 196 Z" />
        </g>
        <Ink d="M670 172 L 670 243" width={1.3} />
        <g fill="#5f8a55" {...OUTLINE}>
          <path d="M585 368 L585 250 C585 228 615 228 615 250 L615 368 Z" />
          <path d="M585 300 L568 300 C558 300 555 292 555 282 L555 262 C555 250 571 250 571 262 L571 286 L585 286 Z" />
          <path d="M615 290 L630 290 C638 290 640 282 640 274 L640 258 C640 246 626 246 626 258 L626 276 L615 276 Z" />
        </g>
        <Ink d="M595 246 L 595 364" width={1.3} />
        <Ink d="M605 246 L 605 364" width={1.3} />
        {[-40, 0, 40].map((r) => (
          <ellipse key={r} cx={600} cy={222} rx={5} ry={10} transform={`rotate(${r} 600 232)`} fill="#ea7d4f" {...OUTLINE} strokeWidth={1.6} />
        ))}
      </>
    ),
  },
  {
    name: "homem sentado",
    color: "#f0c35a",
    area: { x: 163, y: 155, w: 165, h: 205, size: 30 },
    time: 1.0,
    art: (
      <>
        <path
          d="M186 292 C 178 318, 186 344, 214 348 L 300 356 C 314 357, 316 338, 302 336 L 244 326 C 248 314, 248 302, 246 292 Z"
          fill="#3b86b0"
          {...OUTLINE}
        />
        <ellipse cx={316} cy={347} rx={12} ry={7} fill={SKIN} {...OUTLINE} />
        <Limb d="M207 194 L 207 206" width={10} />
        <Limb d="M190 216 C 182 246, 188 270, 206 284" />
        <circle cx={208} cy={287} r={6} fill={SKIN} {...OUTLINE} />
        <path d="M184 206 C 174 240, 176 272, 184 300 L 248 300 C 252 270, 248 236, 234 206 C 220 198, 198 198, 184 206 Z" fill="#f0c35a" {...OUTLINE} />
        <Ink d="M214 232 C 216 256, 216 276, 214 296" />
        <Ink d="M200 330 C 230 336, 262 340, 292 344" width={1.3} />
        <Limb d="M228 214 C 248 206, 262 194, 272 178" />
        <circle cx={274} cy={173} r={7} fill={SKIN} {...OUTLINE} />
        <circle cx={207} cy={182} r={17} fill={SKIN} {...OUTLINE} />
        <path d="M190 180 C 188 162, 206 156, 222 166 C 222 172, 214 170, 206 172 C 198 174, 194 178, 190 180 Z" fill={HAIR} {...OUTLINE} strokeWidth={1.6} />
        <Ink d="M212 188 C 215 190, 218 189, 220 186" width={1.4} />
      </>
    ),
  },
  {
    name: "mulher com cesto",
    color: "#e07b45",
    area: { x: 326, y: 58, w: 104, h: 320, size: 28, vertical: true },
    time: 1.0,
    art: (
      <>
        <Limb d="M362 288 L 356 362" width={11} />
        <Limb d="M390 288 L 398 360" width={11} />
        <ellipse cx={352} cy={366} rx={10} ry={5} fill={SKIN} {...OUTLINE} />
        <ellipse cx={403} cy={364} rx={10} ry={5} fill={SKIN} {...OUTLINE} />
        <Limb d="M375 140 L 375 152" width={10} />
        <path d="M356 152 C 346 200, 336 248, 330 292 L 420 292 C 414 248, 404 200, 394 152 C 382 146, 368 146, 356 152 Z" fill="#e07b45" {...OUTLINE} />
        <path d="M372 160 C 368 200, 364 245, 362 290 L 380 290 C 380 245, 380 200, 378 160 Z" fill="#f29d63" />
        <Ink d="M352 200 C 348 230, 344 260, 342 288" width={1.3} />
        <Ink d="M398 200 C 402 230, 406 260, 408 288" width={1.3} />
        <Limb d="M358 160 C 344 142, 344 122, 354 110" />
        <Limb d="M392 160 C 406 142, 406 122, 396 110" />
        <circle cx={375} cy={132} r={15} fill={SKIN} {...OUTLINE} />
        <path d="M360 130 C 358 114, 392 112, 390 130 C 384 122, 366 122, 360 130 Z" fill={HAIR} {...OUTLINE} strokeWidth={1.6} />
        <circle cx={356} cy={84} r={10} fill="#7a9a55" {...OUTLINE} />
        <circle cx={376} cy={80} r={11} fill="#e08a3c" {...OUTLINE} />
        <circle cx={395} cy={85} r={9} fill="#d9b74a" {...OUTLINE} />
        <path d="M380 70 C 388 58, 400 58, 404 62 C 396 68, 388 70, 380 70 Z" fill="#5d7e43" {...OUTLINE} strokeWidth={1.6} />
        <path d="M338 92 L 412 92 L 400 114 L 350 114 Z" fill="#c99a4e" {...OUTLINE} />
        <path d="M344 100 L 406 100 M347 107 L 403 107 M362 92 L 364 114 M376 92 L 376 114 M390 92 L 388 114" fill="none" stroke="#8c6430" strokeWidth={1.4} />
        <circle cx={354} cy={108} r={6} fill={SKIN} {...OUTLINE} />
        <circle cx={396} cy={108} r={6} fill={SKIN} {...OUTLINE} />
      </>
    ),
  },
  {
    name: "pedras",
    color: "#b8604a",
    area: { x: 450, y: 348, w: 90, h: 32, size: 22 },
    time: 0.45,
    art: (
      <g {...OUTLINE}>
        <path d="M455 374 C 455 352, 485 352, 485 374 Z" fill="#b8604a" />
        <path d="M490 378 C 490 362, 512 362, 512 378 Z" fill="#d98a73" />
        <path d="M515 370 C 515 356, 532 356, 532 370 Z" fill="#a85440" />
      </g>
    ),
  },
  {
    name: "agave",
    color: "#4f7a45",
    area: { x: 0, y: 276, w: 172, h: 124, size: 34 },
    time: 0.9,
    art: <Fan x={60} y={410} shape={SPIKE} rib={SPIKE_RIB} fronds={alternate([-62, -38, -16, 6, 28, 50], "#4f7a45", "#6f9a58")} />,
  },
  {
    name: "folhagem",
    color: "#6f9a58",
    area: { x: 584, y: 282, w: 136, h: 118, size: 34 },
    time: 0.8,
    art: <Fan x={694} y={412} shape={SPIKE} rib={SPIKE_RIB} fronds={alternate([-58, -32, -8, 16], "#5b8a4c", "#7fa863")} scale={0.95} />,
  },
];

const SWEEPS = LAYERS.map((layer) => sweep(layer.area));

// Por onde o pincel passa dando os retoques finais a nanquim
const INK_TOUR = [
  { x: 92, y: 140 },
  { x: 205, y: 250 },
  { x: 375, y: 230 },
  { x: 536, y: 110 },
  { x: 600, y: 300 },
];

// Onde o pincel descansa, admirando a obra (como na arte de referência)
const REST = { x: 562, y: 304 };

// Textura de parede rebocada. É uma imagem estática: o navegador desenha uma vez só.
const GRAIN =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='720' height='400'>` +
      `<filter id='b'><feTurbulence type='fractalNoise' baseFrequency='0.012 0.03' numOctaves='3' seed='8'/>` +
      `<feColorMatrix values='0 0 0 0 0.3  0 0 0 0 0.18  0 0 0 0 0.12  1 0 0 0 -0.42'/></filter>` +
      `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3'/>` +
      `<feColorMatrix values='0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0 0.12  1.2 0 0 0 -0.45'/></filter>` +
      `<rect width='100%' height='100%' filter='url(#b)'/><rect width='100%' height='100%' filter='url(#g)'/></svg>`,
  );

export function ModernistMural() {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) return;

    const brush = svg.querySelector<SVGGElement>(".mm-brush")!;
    const load = svg.querySelector<SVGPathElement>(".mm-brush__load")!;
    const art = svg.querySelector<SVGGElement>(".mm-art")!;
    const melt = svg.querySelector<SVGFEDisplacementMapElement>(".mm-melt-map")!;
    const masks = [...svg.querySelectorAll<SVGPathElement>(".mm-mask")];
    const inks = [...svg.querySelectorAll<SVGPathElement>(".mm-ink")];
    const lengths = masks.map((path) => path.getTotalLength());

    // O pincel é movido por este objeto; render() traduz o estado em transform
    const state = { x: REST.x, y: REST.y, lift: 0, tilt: 0, bob: 0 };
    const render = () => {
      brush.setAttribute("transform", `translate(${state.x} ${state.y - state.lift + state.bob}) rotate(${38 + state.tilt}) scale(1.2)`);
    };
    render();

    // Sem animação para quem pediu "reduzir movimento": o mural já aparece pronto
    if (prefersReducedMotion()) return;

    // Parede em branco: máscaras vazias, retoques escondidos, sem distorção
    const hideAll = () => {
      masks.forEach((path, i) => {
        path.style.opacity = "0";
        path.style.strokeDasharray = `${lengths[i]}`;
        path.style.strokeDashoffset = `${lengths[i]}`;
      });
      inks.forEach((path) => {
        path.style.opacity = "0";
        path.style.strokeDasharray = "1";
        path.style.strokeDashoffset = "1";
      });
      art.removeAttribute("filter");
      melt.setAttribute("scale", "0");
      gsap.set(art, { opacity: 1, y: 0 });
    };

    const ctx = gsap.context(() => {
      hideAll();

      // O pincel "respira" no ar o tempo todo
      const bob = gsap.to(state, { bob: -5, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: render });

      const tl = gsap.timeline({ repeat: -1, delay: 0.3 });

      // O pincel entra pela direita
      tl.set(state, { x: W + 80, y: 30, lift: 30, tilt: 0 })
        .call(render)
        .fromTo(brush, { opacity: 0 }, { opacity: 1, duration: 0.4 });

      LAYERS.forEach((layer, i) => {
        const path = masks[i];
        const length = lengths[i];
        const start = path.getPointAtLength(0);
        const progress = { value: 0 };
        let lastX = start.x;

        tl
          // voa até o começo da camada, com o pincel erguido
          .to(state, { x: start.x, y: start.y, lift: 24, duration: 0.42, ease: "power2.inOut", onUpdate: render })
          // "molha" o pincel na cor da camada
          .set(load, { attr: { fill: layer.color } })
          .set(path, { opacity: 1 })
          // encosta na parede
          .to(state, { lift: 0, duration: 0.12, ease: "power2.in", onUpdate: render })
          // e pinta: a ponta segue o caminho enquanto a máscara se desenha atrás dela
          .to(progress, {
            value: 1,
            duration: layer.time,
            ease: "power1.inOut",
            onUpdate: () => {
              const at = length * progress.value;
              const point = path.getPointAtLength(at);
              // inclina o cabo para o lado contrário do movimento, como quem arrasta tinta
              const target = gsap.utils.clamp(-14, 14, -(point.x - lastX) * 2.2);
              lastX = point.x;
              state.tilt += (target - state.tilt) * 0.25;
              state.x = point.x;
              state.y = point.y;
              path.style.strokeDashoffset = `${length - at}`;
              render();
            },
          });
      });

      // Retoques finais a nanquim: o pincel passeia e os contornos se desenham
      tl.to(state, { lift: 14, tilt: 0, duration: 0.3, ease: "power2.out", onUpdate: render })
        .set(load, { attr: { fill: INK } })
        .set(inks, { opacity: 1 })
        .to(inks, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out", stagger: { each: 0.03, from: "random" } })
        .to(
          state,
          {
            keyframes: INK_TOUR.map((point) => ({ ...point, duration: 0.34, ease: "sine.inOut" })),
            onUpdate: render,
          },
          "<",
        )
        // descansa e deixa o admin admirar
        .to(state, { ...REST, lift: 0, tilt: 0, duration: 0.8, ease: "power2.inOut", onUpdate: render })
        .to({}, { duration: 3.2 })
        // desfaz: a tinta derrete, sobe um pouco e evapora; o pincel sai junto
        .call(() => art.setAttribute("filter", "url(#mm-melt)"))
        .to(melt, { attr: { scale: 80 }, duration: 1.4, ease: "power2.in" })
        .to(art, { opacity: 0, y: -12, duration: 1.4, ease: "power2.in" }, "<")
        .to(state, { lift: 40, duration: 1, ease: "power2.in", onUpdate: render }, "<")
        .to(brush, { opacity: 0, duration: 0.8, ease: "power2.in" }, "<0.4")
        .call(hideAll);

      // Fora da tela, pausa (economiza CPU)
      ScrollTrigger.create({
        trigger: frame,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => [tl, bob].forEach((t) => (self.isActive ? t.play() : t.pause())),
      });

      // Com o mouse em cima, a pintura desacelera para o admin acompanhar os detalhes
      if (window.matchMedia("(hover: hover)").matches) {
        const onEnter = () => gsap.to(tl, { timeScale: 0.4, duration: 0.6, ease: "power2.out" });
        const onLeave = () => gsap.to(tl, { timeScale: 1, duration: 0.6, ease: "power2.out" });
        frame.addEventListener("pointerenter", onEnter);
        frame.addEventListener("pointerleave", onLeave);
        return () => {
          frame.removeEventListener("pointerenter", onEnter);
          frame.removeEventListener("pointerleave", onLeave);
        };
      }
    }, frame);

    return () => ctx.revert();
  }, []);

  return (
    <div className="mural">
      <div className="mural__frame" ref={frameRef}>
        <svg
          ref={svgRef}
          className="mural__svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid slice"
          role="img"
          aria-label="Um pincel pinta, camada por camada, um mural modernista com sol, rio, bananeira, palmeira, cactos, um homem sentado e uma mulher com um cesto de frutas"
        >
          <defs>
            <clipPath id="mm-clip">
              <rect width={W} height={H} />
            </clipPath>
            <linearGradient id="mm-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e48f78" />
              <stop offset="1" stopColor="#f1b49b" />
            </linearGradient>
            <filter id="mm-melt" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="2" seed="4" result="noise" />
              <feDisplacementMap className="mm-melt-map" in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            <filter id="mm-brush-shadow" x="-60%" y="-20%" width="220%" height="140%">
              <feDropShadow dx="6" dy="8" stdDeviation="5" floodColor="#2a2023" floodOpacity="0.28" />
            </filter>
            <linearGradient id="mm-wood" x1="0" x2="1">
              <stop offset="0" stopColor="#8a4f22" />
              <stop offset="0.35" stopColor="#c98a4b" />
              <stop offset="0.6" stopColor="#b5733a" />
              <stop offset="1" stopColor="#7a431b" />
            </linearGradient>
            <linearGradient id="mm-steel" x1="0" x2="1">
              <stop offset="0" stopColor="#7e7b79" />
              <stop offset="0.38" stopColor="#f7f5f2" />
              <stop offset="0.62" stopColor="#c9c6c2" />
              <stop offset="1" stopColor="#6f6c6a" />
            </linearGradient>
            <linearGradient id="mm-hair" x1="0" x2="1">
              <stop offset="0" stopColor="#2a2019" />
              <stop offset="0.5" stopColor="#5a4636" />
              <stop offset="1" stopColor="#2a2019" />
            </linearGradient>
            {LAYERS.map((layer, i) => (
              <mask key={layer.name} id={`mm-mask-${i}`} maskUnits="userSpaceOnUse" x={-60} y={-60} width={W + 120} height={H + 120}>
                <path
                  className="mm-mask"
                  d={SWEEPS[i]}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={layer.area.size * 1.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </mask>
            ))}
          </defs>

          <g clipPath="url(#mm-clip)">
            {/* A parede crua, antes da tinta */}
            <rect width={W} height={H} fill="#f1e7da" />
            <g className="mm-art">
              {LAYERS.map((layer, i) => (
                <g key={layer.name} mask={`url(#mm-mask-${i})`}>
                  {layer.art}
                </g>
              ))}
            </g>
            <image href={GRAIN} width={W} height={H} preserveAspectRatio="none" opacity={0.55} pointerEvents="none" />
          </g>

          {/* O pincel grande e chato. A ponta fica em 0,0 e encosta exatamente no caminho */}
          <g className="mm-brush" filter="url(#mm-brush-shadow)">
            <path d="M-10 -78 C -8 -112 -5.5 -150 -4.5 -192 Q 0 -200 4.5 -192 C 5.5 -150 8 -112 10 -78 Z" fill="url(#mm-wood)" />
            <path d="M-4.5 -192 Q 0 -200 4.5 -192 L 4.8 -176 Q 0 -179 -4.8 -176 Z" fill="#6b2737" />
            <path d="M-3.5 -90 C -2.6 -120 -1.8 -150 -1.4 -180" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.6} strokeLinecap="round" />
            <path d="M-13 -40 L -10.5 -80 L 10.5 -80 L 13 -40 Z" fill="url(#mm-steel)" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
            <path d="M-12.4 -50 H 12.4 M -12 -56 H 12" stroke="rgba(60,55,52,0.45)" strokeWidth={1.2} />
            <path d="M-13 -40 C -15 -28 -15.5 -12 -13 0 C -6 3.5 6 3.5 13 0 C 15.5 -12 15 -28 13 -40 Z" fill="url(#mm-hair)" />
            <path
              className="mm-brush__load"
              d="M-13 0 C -14.6 -8 -15 -16 -14.2 -24 C -8 -20 -2 -26 4 -22 C 8 -19.5 11 -23 14.4 -22 C 15 -14 14.4 -6 13 0 C 6 3.5 -6 3.5 -13 0 Z"
              fill={LAYERS[0].color}
            />
            <path d="M-6 -36 C -6.5 -24 -6 -12 -5 -4 M1 -36 C 1 -24 1.2 -12 1.6 -3 M7 -36 C 7.4 -24 7.4 -12 6.6 -4" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={0.8} />
            <path d="M-8 -16 C -7 -10 -6 -6 -4 -2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.6} strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}

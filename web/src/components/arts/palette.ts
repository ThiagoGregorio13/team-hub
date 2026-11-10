import { useEffect, useState } from "react";

export type Swatch = { hex: string; share: number };

// Cada URL é analisada uma vez só: o card e o detalhe reaproveitam o resultado
const cache = new Map<string, Promise<Swatch[] | null>>();

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

// Extrai as cores principais da arte:
// 1. desenha a imagem num canvas de 72px (rápido e já "mistura" pixels vizinhos);
// 2. agrupa cada pixel numa caixa de cor (4 bits por canal = 4096 caixas);
// 3. pega as caixas mais cheias, pulando cores parecidas demais com as já escolhidas.
// Se o site da imagem não liberar CORS, o canvas fica "contaminado" e devolvemos null.
function extract(url: string, count: number): Promise<Swatch[] | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => resolve(null);
    img.onload = () => {
      try {
        const size = 72;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.n += 1;
          buckets.set(key, bucket);
          total += 1;
        }

        const ranked = [...buckets.values()]
          .map((bucket) => ({ r: bucket.r / bucket.n, g: bucket.g / bucket.n, b: bucket.b / bucket.n, n: bucket.n }))
          .sort((a, b) => b.n - a.n);

        const picked: typeof ranked = [];
        for (const color of ranked) {
          const far = picked.every(
            (other) => Math.hypot(color.r - other.r, color.g - other.g, color.b - other.b) > 48,
          );
          if (far) picked.push(color);
          if (picked.length === count) break;
        }

        resolve(picked.map((c) => ({ hex: toHex(c.r, c.g, c.b), share: c.n / Math.max(total, 1) })));
      } catch {
        resolve(null);
      }
    };
    img.src = url;
  });
}

// undefined = ainda lendo; null = o site não deixou ler as cores; array = a paleta
export function usePalette(url: string | undefined, count = 5): Swatch[] | null | undefined {
  const key = url ? `${url}|${count}` : "";
  const [result, setResult] = useState<{ key: string; value: Swatch[] | null } | null>(null);

  useEffect(() => {
    if (!key || !url) return;
    let alive = true;
    if (!cache.has(key)) cache.set(key, extract(url, count));
    cache.get(key)!.then((value) => alive && setResult({ key, value }));
    return () => {
      alive = false;
    };
  }, [key, url, count]);

  if (!url) return null;
  return result?.key === key ? result.value : undefined;
}

// Texto legível em cima da cor (claro em cor escura, escuro em cor clara)
export function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luminance > 0.6 ? "#2a2023" : "#fbf8f3";
}

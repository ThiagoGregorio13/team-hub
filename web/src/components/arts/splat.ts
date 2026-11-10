// Gera o contorno de uma mancha de tinta (SVG path) centrada em 0,0.
// Pontos em volta de um círculo com raios irregulares; alguns viram "respingos" compridos.
// As curvas passam pelos pontos médios entre vizinhos, então a borda fica orgânica, sem quinas.
export function splatPath(radius: number, points = 22, spikiness = 0.55, seed = Math.random()): string {
  let state = Math.floor(seed * 2 ** 31) || 1;
  const random = () => {
    // Gerador simples e determinístico: a mesma semente desenha a mesma mancha
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };

  const coords: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2 + (random() - 0.5) * 0.18;
    const spike = random() < spikiness * 0.35 ? 1.35 + random() * 0.6 : 1;
    const r = radius * (0.78 + random() * 0.3) * spike;
    coords.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }

  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(coords[points - 1], coords[0]);
  let d = `M${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const current = coords[i];
    const next = mid(current, coords[(i + 1) % points]);
    d += ` Q${current[0].toFixed(1)} ${current[1].toFixed(1)} ${next[0].toFixed(1)} ${next[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

// As mesmas cores da página, para a transição e o pincel conversarem com o conteúdo
export const PAINT = ["#6b2737", "#b5533c", "#b89b7a", "#8e9b8a", "#a15c6b", "#56634f"];

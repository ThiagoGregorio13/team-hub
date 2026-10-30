// Quem pediu "reduzir movimento" no sistema não recebe animações
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

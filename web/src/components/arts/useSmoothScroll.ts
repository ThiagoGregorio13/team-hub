import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "../../motion";

// Rolagem suave ("smooth"): a página desliza e desacelera em vez de pular de 100 em 100 px.
// O Lenis continua usando a rolagem nativa (o header sticky e os diálogos seguem funcionando)
// e roda no mesmo relógio do GSAP, então o ScrollTrigger enxerga cada quadro da rolagem.
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      // Rolar dentro de um diálogo ou menu continua normal
      prevent: (node) => node.closest("dialog, .art-menu__list") !== null,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
}

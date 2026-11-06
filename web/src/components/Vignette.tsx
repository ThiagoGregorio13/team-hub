import { useEffect, useRef } from "react";

type VignetteProps = {
  onDone: () => void;
};

const BRAND = "team hub";
// Margem de segurança: se a animação não terminar por algum motivo, o dashboard abre igual
const MAX_DURATION_MS = 3600;

// Roda por cima do dashboard, que já vai carregando os dados por baixo
export function Vignette({ onDone }: VignetteProps) {
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const finish = () => doneRef.current();
    const fallback = setTimeout(finish, MAX_DURATION_MS);
    window.addEventListener("keydown", finish);

    return () => {
      clearTimeout(fallback);
      window.removeEventListener("keydown", finish);
    };
  }, []);

  return (
    <div className="vignette" role="status" aria-label="Abrindo o team hub" onClick={onDone}>
      <span className="vignette__curtain vignette__curtain--left" aria-hidden="true" />
      <span
        className="vignette__curtain vignette__curtain--right"
        aria-hidden="true"
        onAnimationEnd={onDone}
      />

      <div className="vignette__stage" aria-hidden="true">
        <span className="vignette__beam vignette__beam--left" />
        <span className="vignette__beam vignette__beam--right" />
        <p className="vignette__logo">
          {[...BRAND].map((letter, index) => (
            <span key={index} style={{ animationDelay: `${350 + index * 55}ms` }}>
              {letter === " " ? " " : letter}
            </span>
          ))}
        </p>
        <span className="vignette__line" />
        <p className="vignette__tagline">Tudo pronto. Vamos ao show.</p>
      </div>

      <button type="button" className="vignette__skip" onClick={onDone}>
        Pular
      </button>
    </div>
  );
}

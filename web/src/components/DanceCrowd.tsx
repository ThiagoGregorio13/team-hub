import { memo, type CSSProperties, type RefObject } from "react";

type DanceCrowdProps = {
  crowdRef: RefObject<HTMLDivElement | null>;
};

const DANCERS = Array.from({ length: 14 }, (_, index) => index);

// Cada braço e perna tem duas partes: a de fora gira dentro da de cima, como uma articulação.
// O passo de dança vem do data-move da galera (ver .crowd no App.css).
function Dancer() {
  return (
    <svg className="dancer" viewBox="0 0 60 100" fill="none" stroke="currentColor" strokeLinecap="round">
      <g className="dancer__body">
        <circle className="dancer__head" cx="30" cy="20" r="8" fill="currentColor" stroke="none" />
        <path d="M30 31V58" strokeWidth="8" />

        <g className="dancer__part dancer__part--left-arm">
          <path d="M30 34V47" strokeWidth="5" />
          <g className="dancer__part dancer__part--left-fore">
            <path d="M30 47V59" strokeWidth="4.5" />
          </g>
        </g>
        <g className="dancer__part dancer__part--right-arm">
          <path d="M30 34V47" strokeWidth="5" />
          <g className="dancer__part dancer__part--right-fore">
            <path d="M30 47V59" strokeWidth="4.5" />
          </g>
        </g>

        <g className="dancer__part dancer__part--left-leg">
          <path d="M30 58V73" strokeWidth="6" />
          <g className="dancer__part dancer__part--left-shin">
            <path d="M30 73V89" strokeWidth="5" />
          </g>
        </g>
        <g className="dancer__part dancer__part--right-leg">
          <path d="M30 58V73" strokeWidth="6" />
          <g className="dancer__part dancer__part--right-shin">
            <path d="M30 73V89" strokeWidth="5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

// memo: digitar atualiza o formulário, mas não precisa redesenhar a galera
export const DanceCrowd = memo(function DanceCrowd({ crowdRef }: DanceCrowdProps) {
  return (
    <div ref={crowdRef} className="crowd" data-move="0" aria-hidden="true">
      {DANCERS.map((dancer) => (
        <div
          key={dancer}
          className="crowd__dancer"
          // Cada boneco balança num tempo diferente
          style={{ "--wave": `${dancer * 11}ms` } as CSSProperties}
        >
          <Dancer />
        </div>
      ))}
    </div>
  );
});

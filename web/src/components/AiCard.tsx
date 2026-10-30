import { ArrowRight, Sparkles } from "lucide-react";

type AiCardProps = {
  onAsk: () => void;
};

export function AiCard({ onAsk }: AiCardProps) {
  return (
    <section className="card ai-card" aria-labelledby="ai-title">
      {/* Formas decorativas no fundo do card */}
      <svg className="ai-card__shapes" viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="170" cy="30" r="60" />
        <circle cx="190" cy="150" r="34" />
      </svg>

      <span className="ai-card__icon" aria-hidden="true">
        <Sparkles size={20} />
      </span>
      <h2 id="ai-title">Resumo com IA</h2>
      <p>Receba prioridades, gargalos e sugestões para o time a partir das tarefas de hoje.</p>
      <button className="ai-card__button" onClick={onAsk}>
        Gerar análise
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  );
}

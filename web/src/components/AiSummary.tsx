import { Sparkles } from "lucide-react";

export type AiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; summary: string; date: string }
  | { kind: "error"; message: string };

const CHIP_LABEL: Record<AiState["kind"], string> = {
  idle: "Aguardando análise",
  loading: "Analisando...",
  done: "Análise pronta",
  error: "Falhou",
};

export function AiSummary({ state }: { state: AiState }) {
  return (
    <section id="ai-summary" className="card ai-card" aria-live="polite">
      <span className="ai-card__icon" aria-hidden="true">
        <Sparkles size={18} className={state.kind === "loading" ? "spin" : undefined} />
      </span>

      <div className="ai-card__body">
        <header className="card__header card__header--row">
          <h2>Resumo da IA</h2>
          <span className={`chip chip--${state.kind}`}>{CHIP_LABEL[state.kind]}</span>
        </header>

        {state.kind === "idle" && (
          <p className="ai-card__text">
            Seu resumo aparecerá aqui após a análise. Clique em "Analisar com IA" para identificar
            prioridades, entender a distribuição de tarefas e receber sugestões para melhorar o
            ritmo do time.
          </p>
        )}
        {state.kind === "loading" && <p className="ai-card__text">A IA está lendo as tarefas do time...</p>}
        {state.kind === "done" && (
          <>
            <p className="ai-card__text ai-card__text--result">{state.summary}</p>
            <span className="ai-card__date">Gerado em {state.date}</span>
          </>
        )}
        {state.kind === "error" && <p className="ai-card__text ai-card__text--error">{state.message}</p>}
      </div>
    </section>
  );
}

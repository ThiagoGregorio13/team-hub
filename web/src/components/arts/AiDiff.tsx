import { ArrowRight, GitCompare, LoaderCircle, RotateCcw } from "lucide-react";
import type { ArtDiff } from "../../api";
import "./ai-analysis.css";

type AiDiffProps = {
  diff: ArtDiff | null;
  loading: boolean;
  error: string | null;
  previousVersion: number;
  onCompare: () => void;
};

// Só MOSTRA a comparação. Quem guarda o estado e chama a API é o ArtDetail.
export function AiDiff({ diff, loading, error, previousVersion, onCompare }: AiDiffProps) {
  return (
    <section className="review-block ai" aria-labelledby="diff-title" aria-busy={loading}>
      <div className="review-block__row">
        <h3 id="diff-title" className="review-block__title ai__title">
          <GitCompare size={14} aria-hidden="true" />
          O que mudou desde a v{previousVersion}
        </h3>
        {diff && !loading && (
          <button type="button" className="art-link" onClick={onCompare}>
            <RotateCcw size={13} aria-hidden="true" />
            Comparar de novo
          </button>
        )}
      </div>

      {/* 1. Ainda não comparou (ou deu erro) */}
      {!diff && !loading && (
        <>
          <p className="review-block__muted">
            A IA olha esta versão e a anterior lado a lado e lista o que mudou: tamanho,
            posição, cores, textos e elementos. Ela não diz se ficou melhor ou pior.
          </p>
          {error && (
            <p className="art-dialog__error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="art-button ai__button" onClick={onCompare}>
            <GitCompare size={16} aria-hidden="true" />
            {error ? "Tentar de novo" : `Comparar com a v${previousVersion}`}
          </button>
        </>
      )}

      {/* 2. Esperando a IA */}
      {loading && (
        <>
          <button type="button" className="art-button ai__button" disabled>
            <LoaderCircle className="art-spin" size={16} aria-hidden="true" />
            Comparando as versões…
          </button>
          <div className="ai__skeleton" aria-hidden="true">
            <span />
            <span />
          </div>
        </>
      )}

      {/* 3. Chegou o resultado */}
      {diff && !loading && (
        <div className="ai__result">
          {diff.changes.length === 0 ? (
            <p className="review-block__muted">Nenhuma mudança visível entre as duas versões.</p>
          ) : (
            <ul className="ai__checks">
              {diff.changes.map((change, i) => (
                <li key={i}>
                  <strong>{change.area}</strong>
                  <span>
                    {change.before} <ArrowRight size={12} aria-label="mudou para" /> {change.after}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

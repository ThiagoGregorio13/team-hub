import { LoaderCircle, RotateCcw, Sparkles } from "lucide-react";
import type { ArtAnalysis } from "../../api";
import "./ai-analysis.css";

type AiAnalysisProps = {
  analysis: ArtAnalysis | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
};

// Só desenha a bolinha se o hex vier num formato válido (a IA pode errar)
const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());

// O componente só MOSTRA. Quem guarda o estado e chama a API é o ArtDetail.
export function AiAnalysis({ analysis, loading, error, onAnalyze }: AiAnalysisProps) {
  return (
    <section className="review-block ai" aria-labelledby="ai-title" aria-busy={loading}>
      <div className="review-block__row">
        <h3 id="ai-title" className="review-block__title ai__title">
          <Sparkles size={14} aria-hidden="true" />
          Análise da IA
        </h3>
        {analysis && !loading && (
          <button type="button" className="art-link" onClick={onAnalyze}>
            <RotateCcw size={13} aria-hidden="true" />
            Analisar de novo
          </button>
        )}
      </div>

      {/* 1. Ainda não analisou (ou deu erro): explica e oferece o botão */}
      {!analysis && !loading && (
        <>
          <p className="review-block__muted">
            A IA descreve o que está na imagem (elementos, cores, textos) e o que mudou em relação aos pedidos
            anteriores. Ela não aprova nem reprova.
          </p>
          {error && (
            <p className="art-dialog__error" role="alert">
              {error}
            </p>
          )}
          <button type="button" className="art-button ai__button" onClick={onAnalyze}>
            <Sparkles size={16} aria-hidden="true" />
            {error ? "Tentar de novo" : "Analisar com IA"}
          </button>
        </>
      )}

      {/* 2. Esperando a IA: botão travado + "esqueleto" do conteúdo que vai chegar */}
      {loading && (
        <>
          <button type="button" className="art-button ai__button" disabled>
            <LoaderCircle className="art-spin" size={16} aria-hidden="true" />
            Analisando a imagem…
          </button>
          <div className="ai__skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </>
      )}

      {/* 3. Chegou o resultado */}
      {analysis && !loading && (
        <div className="ai__result">
          <p className="ai__summary">{analysis.summary}</p>

          {analysis.request_check.length > 0 && (
            <div className="ai__group">
              <h4 className="ai__label">Em relação aos pedidos anteriores</h4>
              <ul className="ai__checks">
                {analysis.request_check.map((check, i) => (
                  <li key={i}>
                    <strong>{check.request}</strong>
                    <span>{check.observation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.elements.length > 0 && (
            <div className="ai__group">
              <h4 className="ai__label">Elementos</h4>
              <ul className="ai__chips">
                {analysis.elements.map((element, i) => (
                  <li key={i}>{element}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.colors.length > 0 && (
            <div className="ai__group">
              <h4 className="ai__label">Cores descritas</h4>
              <ul className="ai__colors">
                {analysis.colors.map((color, i) => (
                  <li key={i}>
                    <span className="ai__dot" style={isHex(color.hex) ? { background: color.hex } : undefined} aria-hidden="true" />
                    <strong>{color.name}</strong>
                    <span>{color.where}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ai__group">
            <h4 className="ai__label">Textos na arte</h4>
            {analysis.texts.length > 0 ? (
              <ul className="ai__texts">
                {analysis.texts.map((text, i) => (
                  <li key={i}>“{text}”</li>
                ))}
              </ul>
            ) : (
              <p className="review-block__muted">Nenhum texto legível.</p>
            )}
          </div>

          <div className="ai__group">
            <h4 className="ai__label">Estilo e composição</h4>
            <p className="ai__text">{analysis.style}</p>
          </div>

          <p className="ai__disclaimer">Gerado por IA. Confira os detalhes na imagem antes de decidir.</p>
        </div>
      )}
    </section>
  );
}

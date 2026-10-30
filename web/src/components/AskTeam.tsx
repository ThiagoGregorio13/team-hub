import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Search } from "lucide-react";
import { askTeam, getAiSummary } from "../api";
import { prefersReducedMotion } from "../motion";

type AskTeamProps = {
  open: boolean;
  // true quando aberto pelo botão "Gerar análise": já começa pedindo o resumo
  startWithSummary: boolean;
  onClose: () => void;
};

type AskState =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "done"; question: string; answer: string }
  | { kind: "error"; question: string };

const SUMMARY = "Resumo do time agora";
const SUGGESTIONS = [SUMMARY, "Quem tem tarefas atrasadas?", "O que o Pedro está fazendo?"];

// Barra de comando com IA: "Resumo" usa a rota /ai/summary; o resto vai para /ai/chat (com tool calling)
export function AskTeam({ open, startWithSummary, onClose }: AskTeamProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AskState>({ kind: "idle" });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      if (startWithSummary) ask(SUMMARY);
    }
    if (!open && dialog.open) dialog.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a abrir/fechar
  }, [open]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || state.kind === "loading") return;
    setQuestion("");
    setState({ kind: "loading", question: q });
    try {
      const answer = q === SUMMARY ? (await getAiSummary()).summary : (await askTeam(q)).text;
      setState({ kind: "done", question: q, answer });
    } catch (err) {
      console.error(err);
      setState({ kind: "error", question: q });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <dialog
      ref={ref}
      className="ask"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-label="Pergunte ao TEAM"
    >
      <form className="ask__form" onSubmit={handleSubmit}>
        <Search size={18} className="ask__icon" aria-hidden="true" />
        <input
          className="ask__input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pergunte qualquer coisa sobre o time…"
          aria-label="Sua pergunta"
          autoFocus
        />
        <button className="ask__send" type="submit" aria-label="Perguntar" disabled={!question.trim()}>
          <ArrowUp size={16} />
        </button>
      </form>

      <div className="ask__body" aria-live="polite">
        {state.kind === "idle" && (
          <div className="ask__suggestions">
            <p className="ask__hint">Experimente:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {state.kind !== "idle" && <p className="ask__question">{state.question}</p>}
        {state.kind === "loading" && (
          <p className="ask__thinking">
            <span /> <span /> <span /> Lendo as tarefas do time
          </p>
        )}
        {/* key: cada resposta nova recomeça a "digitação" do zero */}
        {state.kind === "done" && <Typewriter key={state.answer} text={state.answer} />}
        {state.kind === "error" && (
          <p className="ask__error">A IA não respondeu agora (pode estar sobrecarregada ou sem cota). Tente de novo em instantes.</p>
        )}
      </div>

      <footer className="ask__foot">
        <span>
          <kbd>Enter</kbd> pergunta
        </span>
        <span>
          <kbd>Esc</kbd> fecha
        </span>
      </footer>
    </dialog>
  );
}

// A resposta aparece "sendo escrita", algumas letras por quadro
function Typewriter({ text }: { text: string }) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));

  useEffect(() => {
    if (count >= text.length) return;
    const frame = requestAnimationFrame(() => setCount((c) => Math.min(c + 3, text.length)));
    return () => cancelAnimationFrame(frame);
  }, [count, text]);

  return <p className="ask__answer">{text.slice(0, count)}</p>;
}

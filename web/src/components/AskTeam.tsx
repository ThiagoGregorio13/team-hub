import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, RotateCcw, Search } from "lucide-react";
import { askTeam, getAiSummary, type ChatTurn } from "../api";
import { prefersReducedMotion } from "../motion";

type AskTeamProps = {
  open: boolean;
  // true quando aberto pelo botão "Resumo do dia": já começa pedindo o resumo
  startWithSummary: boolean;
  onClose: () => void;
};

// failed: a pergunta que ficou sem resposta (não vai para o histórico)
type Message = ChatTurn & { failed?: boolean };

const SUMMARY = "Resumo do time agora";
const SUGGESTIONS = [SUMMARY, "Quem tem tarefas atrasadas?", "O que vence nesta semana?"];

// Conversa com a IA. "Resumo" usa a rota /ai/summary; o resto vai para /ai/chat com o histórico,
// para a IA entender perguntas como "e as da Alice?" depois de "quem tem tarefa atrasada?".
export function AskTeam({ open, startWithSummary, onClose }: AskTeamProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Mensagem nova: rola até o fim da conversa
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [messages, loading]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    // O histórico é a conversa até agora, sem as perguntas que falharam
    const history: ChatTurn[] = messages.filter((m) => !m.failed).map(({ role, text }) => ({ role, text }));

    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: q }]);
    setLoading(true);
    try {
      const answer = q === SUMMARY ? (await getAiSummary()).summary : (await askTeam(q, history)).text;
      setMessages((current) => [...current, { role: "model", text: answer }]);
    } catch (err) {
      console.error(err);
      // Marca a pergunta como falha: ela some do histórico e a tela mostra o aviso
      setMessages((current) => current.map((m, i) => (i === current.length - 1 ? { ...m, failed: true } : m)));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  const lastAnswer = messages.length - 1;

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
          placeholder={messages.length ? "Continue a conversa…" : "Pergunte qualquer coisa sobre o time…"}
          aria-label="Sua pergunta"
          autoFocus
        />
        <button className="ask__send" type="submit" aria-label="Perguntar" disabled={!question.trim() || loading}>
          <ArrowUp size={16} />
        </button>
      </form>

      <div className="ask__body" ref={bodyRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="ask__suggestions">
            <p className="ask__hint">Experimente:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} className="suggestion" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, i) =>
          message.role === "user" ? (
            <div key={i} className="ask__turn">
              <p className="ask__question">{message.text}</p>
              {message.failed && (
                <p className="ask__error">A IA não respondeu agora (pode estar sobrecarregada ou sem cota). Tente de novo em instantes.</p>
              )}
            </div>
          ) : i === lastAnswer ? (
            // Só a resposta mais nova aparece "sendo escrita"; as antigas já ficam prontas
            <Typewriter key={i} text={message.text} />
          ) : (
            <p key={i} className="ask__answer">
              {message.text}
            </p>
          ),
        )}

        {loading && (
          <p className="ask__thinking">
            <span /> <span /> <span /> Lendo as tarefas do time
          </p>
        )}
      </div>

      <footer className="ask__foot">
        <span>
          <kbd>Enter</kbd> pergunta
        </span>
        <span>
          <kbd>Esc</kbd> fecha
        </span>
        {messages.length > 0 && (
          <button className="ask__reset" onClick={() => setMessages([])} disabled={loading}>
            <RotateCcw size={13} aria-hidden="true" />
            Nova conversa
          </button>
        )}
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

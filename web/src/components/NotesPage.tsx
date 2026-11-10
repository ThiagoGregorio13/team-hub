import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Search, Trash2 } from "lucide-react";
import { ApiError, createNote, deleteNote, getNotes, searchNotesPreview, type Note, type NoteMatch } from "../api";
import { whenLabel } from "./arts/artUtils";
import { DialogCancel } from "./ConfirmDialog";

const MIN = 8;
const MAX = 1000;

type NotesPageProps = {
  admin: boolean;
};

// A base de conhecimento: o que o time escreve aqui vira embedding e a IA consulta no chat (RAG).
export function NotesPage({ admin }: NotesPageProps) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [toDelete, setToDelete] = useState<Note | null>(null);

  useEffect(() => {
    getNotes()
      .then(setNotes)
      .catch(() => setLoadError("Não foi possível carregar as notas. Confira se a API está rodando."));
  }, []);

  const content = draft.trim();
  const valid = content.length >= MIN && content.length <= MAX;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const note = await createNote(content);
      setNotes((current) => [note, ...(current ?? [])]);
      setDraft("");
    } catch (err) {
      let message = "Não foi possível salvar a nota.";
      if (err instanceof ApiError) {
        if (err.status === 409) message = "Já existe uma nota com esse texto.";
        else if (err.status === 403) message = "Só a direção pode adicionar notas.";
        else if (err.status === 503) message = "A IA não conseguiu processar a nota agora. Tente de novo em instantes.";
        else if (err.status === 400) message = `A nota precisa ter entre ${MIN} e ${MAX} caracteres.`;
      }
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const note = toDelete;
    setToDelete(null);
    if (!note) return;
    // Some da tela na hora; se a API falhar, volta para a lista
    setNotes((current) => current?.filter((n) => n.id !== note.id) ?? null);
    try {
      await deleteNote(note.id);
    } catch {
      setNotes((current) => [note, ...(current ?? [])].sort((a, b) => b.id - a.id));
    }
  }

  return (
    <div className="grid grid--wide-left notes">
      <div className="notes__main">
        {admin && (
          <form className="card composer" onSubmit={save}>
            <div className="card__header">
              <div>
                <h2>Nova nota</h2>
                <p className="card__subtitle">Prazos fixos, padrões de arte, combinados do time. A IA usa isso para responder no chat.</p>
              </div>
            </div>
            <textarea
              className="composer__field"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ex.: A revisão de artes acontece toda quinta às 15h, com a direção."
              rows={3}
              maxLength={MAX}
              aria-label="Texto da nota"
            />
            <div className="composer__foot">
              <span className={`composer__count${draft.length > 0 && !valid ? " is-off" : ""}`}>
                {content.length < MIN ? `Mínimo de ${MIN} caracteres` : `${content.length}/${MAX}`}
              </span>
              <button className="button button--primary" type="submit" disabled={!valid || saving}>
                {saving && <LoaderCircle className="spin" size={16} aria-hidden="true" />}
                {saving ? "Salvando" : "Salvar nota"}
              </button>
            </div>
            {saveError && (
              <p className="composer__error" role="alert">
                {saveError}
              </p>
            )}
          </form>
        )}

        <section className="card" aria-labelledby="notes-title">
          <div className="card__header">
            <div>
              <h2 id="notes-title">O que o time já registrou</h2>
              <p className="card__subtitle">
                {notes ? `${notes.length} ${notes.length === 1 ? "nota" : "notas"}` : loadError ? "Indisponível" : "Carregando"}
              </p>
            </div>
          </div>

          {loadError && <p className="notice">{loadError}</p>}
          {!loadError && !notes && <p className="empty">Carregando notas…</p>}
          {notes && notes.length === 0 && (
            <p className="empty">Nenhuma nota ainda. Escreva a primeira para a IA começar a usar.</p>
          )}
          {notes && notes.length > 0 && (
            <ul className="note-list">
              {notes.map((note) => (
                <li key={note.id} className="note">
                  <p className="note__text">{note.content}</p>
                  <div className="note__meta">
                    <span>#{note.id}</span>
                    {note.created_at && <span>{whenLabel(note.created_at)}</span>}
                    {admin && (
                      <button className="note__delete" onClick={() => setToDelete(note)} aria-label={`Apagar a nota ${note.id}`}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <SearchPreview />

      <DialogCancel
        open={toDelete !== null}
        message="Apagar esta nota? A IA deixa de usá-la nas respostas."
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// Teste da busca: mostra o que a IA encontraria para uma pergunta, com o score de cada nota.
// Serve para calibrar o MIN_SCORE sem rodar script.
function SearchPreview() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NoteMatch[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await searchNotesPreview(q));
    } catch (err) {
      setResults(null);
      setError(
        err instanceof ApiError && err.status === 404
          ? "A rota GET /notes/search ainda não existe no backend."
          : "Não foi possível testar a busca agora.",
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <aside className="card probe" aria-labelledby="probe-title">
      <div className="card__header">
        <div>
          <h2 id="probe-title">Teste a busca</h2>
          <p className="card__subtitle">Escreva uma pergunta e veja quais notas a IA usaria para responder.</p>
        </div>
      </div>
      <form className="probe__form" onSubmit={run}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Quando é a revisão de artes?"
          aria-label="Pergunta de teste"
        />
        <button className="icon-button" type="submit" disabled={!query.trim() || searching} aria-label="Testar busca">
          {searching ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
        </button>
      </form>

      {error && <p className="composer__error">{error}</p>}
      {results && results.length === 0 && <p className="empty">Nenhuma nota cadastrada para comparar.</p>}
      {results && results.length > 0 && (
        <ol className="matches">
          {results.map((match, i) => (
            <li key={i} className={`match${match.relevant ? " is-relevant" : ""}`}>
              <div className="match__head">
                <strong>{Math.round(match.score * 100)}%</strong>
                <span>{match.relevant ? "A IA usa esta nota" : "Fica de fora"}</span>
              </div>
              <span className="match__bar" aria-hidden="true">
                <span style={{ width: `${Math.max(0, Math.min(1, match.score)) * 100}%` }} />
              </span>
              <p>{match.content}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addChecklistItem,
  deleteChecklistItem,
  getChecklist,
  toggleChecklistItem,
  type ChecklistItem,
} from "../api";

type TaskChecklistProps = {
  taskId: number;
};

// A linha embaixo do campo fica cheia com 40 letras
const INK_FULL_AT = 40;

export function TaskChecklist({ taskId }: TaskChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ignore = false;

    getChecklist(taskId)
      .then((rows) => {
        if (!ignore) setItems(rows);
      })
      .catch(() => {
        if (!ignore) setError("Não foi possível carregar o checklist");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [taskId]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || sending) return;

    setSending(true);
    try {
      const item = await addChecklistItem(taskId, title);
      setItems((current) => [...current, item]);
      setNewTitle("");
      setError(null);
    } catch {
      setError("Não foi possível adicionar o item");
    } finally {
      setSending(false);
      // Mantém o foco no campo para digitar o próximo item sem usar o mouse
      inputRef.current?.focus();
    }
  }

  async function handleToggle(item: ChecklistItem) {
    try {
      const updated = await toggleChecklistItem(taskId, item.id, !item.done);
      setItems((current) =>
        current.map((other) => (other.id === updated.id ? updated : other)),
      );
      setError(null);
    } catch {
      setError("Não foi possível atualizar o item");
    }
  }

  async function handleDelete(itemId: number) {
    try {
      await deleteChecklistItem(taskId, itemId);
      setItems((current) => current.filter((item) => itemId !== item.id));
      setError(null);
    } catch {
      setError("Não foi possível apagar o item");
    }
  }

  const doneCount = items.filter((item) => item.done).length;
  const canAdd = newTitle.trim().length > 0 && !sending;
  const inkFill = Math.min(newTitle.length / INK_FULL_AT, 1);

  return (
    <section className="checklist" aria-labelledby="checklist-title">
      <header className="checklist__head">
        <h3 id="checklist-title">Checklist</h3>
        <p className="checklist__count">
          <strong>{doneCount}</strong> de {items.length}
        </p>
      </header>

      {items.length > 0 && (
        <div className="checklist__ticks" aria-hidden="true">
          {items.map((item) => (
            <span key={item.id} className={item.done ? "is-done" : undefined} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <p className="checklist__empty">Nada por aqui ainda. O que precisa ficar pronto?</p>
      )}

      <ol className="checklist__list">
        {items.map((item) => (
          <li key={item.id} className={`checklist__item${item.done ? " is-done" : ""}`}>
            <label className="checklist__label">
              <input
                className="checklist__box"
                type="checkbox"
                checked={item.done}
                onChange={() => handleToggle(item)}
              />
              {/* O risco fica no span de dentro: em linha, ele acompanha cada linha do texto */}
              <span>
                <span className="checklist__text">{item.title}</span>
              </span>
            </label>
            <button
              type="button"
              className="checklist__remove"
              onClick={() => handleDelete(item.id)}
              aria-label={`Apagar ${item.title}`}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>

      <form
        className="checklist__composer"
        onSubmit={handleAdd}
        style={{ "--fill": inkFill } as CSSProperties}
      >
        <input
          ref={inputRef}
          className="checklist__input"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Adicionar um item"
          aria-label="Novo item do checklist"
          autoComplete="off"
        />
        <button
          type="submit"
          className="checklist__add"
          disabled={!canAdd}
          aria-label="Adicionar item"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
        <span className="checklist__ink" aria-hidden="true">
          {/* key muda a cada letra: o React recria o ponto e a animação roda de novo */}
          {newTitle && <span key={newTitle.length} className="checklist__tip" />}
        </span>
      </form>

      <p className={`checklist__hint${canAdd ? " is-visible" : ""}`} aria-hidden="true">
        Enter para adicionar
      </p>

      {error && (
        <p className="checklist__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

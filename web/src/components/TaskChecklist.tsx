import { useEffect, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
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

export function TaskChecklist({ taskId }: TaskChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getChecklist(taskId)
      .then((rows) => {
        if (!ignore) setItems(rows);
      })
      .catch(() => {
        if (!ignore) setError("Não foi possível carregar o checklist");
      });

    return () => {
      ignore = true;
    };
  }, [taskId]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    try {
      const item = await addChecklistItem(taskId, title);
      setItems((current) => [...current, item]);
      setNewTitle("");
      setError(null);
    } catch {
      setError("Não foi possível adicionar o item");
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

  return (
    <section className="checklist">
      <h3>
        Checklist ({doneCount}/{items.length})
      </h3>

      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => handleToggle(item)}
              />
              <span>{item.title}</span>
            </label>
            <button
              type="button"
              className="icon-button"
              onClick={() => handleDelete(item.id)}
              aria-label={`Apagar ${item.title}`}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd}>
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Novo item"
          aria-label="Novo item do checklist"
        />
        <button type="submit" className="button">
          Adicionar
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
    </section>
  );
}

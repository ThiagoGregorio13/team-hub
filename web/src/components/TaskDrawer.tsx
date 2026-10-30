import { useEffect, useRef } from "react";
import { CalendarDays, X } from "lucide-react";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  describeDue,
  displayName,
  formatDate,
  isOverdue,
  type Status,
  type TaskRow,
} from "../api";

type TaskDrawerProps = {
  task: TaskRow | null;
  today: string;
  onClose: () => void;
  onStatusChange: (id: number, status: Status) => void;
};

// <dialog> nativo: showModal() já cuida do fundo escuro, da tecla Esc e de prender o foco aqui dentro
export function TaskDrawer({ task, today, onClose, onStatusChange }: TaskDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (task && !dialog.open) dialog.showModal();
    if (!task && dialog.open) dialog.close();
  }, [task]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      onClose={onClose}
      // Clique fora do painel (no fundo) fecha
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="drawer-title"
    >
      {task && (
        <div className="drawer__body">
          <button className="icon-button drawer__close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>

          <p className="drawer__id">Tarefa #{task.id}</p>
          <h2 id="drawer-title" className="drawer__title">
            {task.title}
          </h2>

          <dl className="drawer__facts">
            <div>
              <dt>Responsável</dt>
              <dd>
                <span className="avatar avatar--sm" aria-hidden="true">
                  {task.member_name[0]}
                </span>
                {displayName(task.member_name)}
              </dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd className={isOverdue(task, today) ? "is-late" : undefined}>
                <CalendarDays size={15} aria-hidden="true" />
                {formatDate(task.due_date)} · {describeDue(task, today)}
              </dd>
            </div>
          </dl>

          <fieldset className="segmented">
            <legend>Status</legend>
            {STATUS_ORDER.map((status) => (
              <label key={status} className={`segmented__option segmented__option--${status}`}>
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={task.status === status}
                  onChange={() => onStatusChange(task.id, status)}
                />
                <span>{STATUS_LABEL[status]}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </dialog>
  );
}

import { FileText } from "lucide-react";
import {
  STATUS_ORDER,
  type TaskRow,
  formatDate,
  type Status,
  STATUS_LABEL,
} from "../api";
export function TaskList({
  tasks,
  onTaskChange,
}: {
  tasks: TaskRow[];
  onTaskChange: (id: number, status: Status) => void;
}) {
  return (
    <section className="card">
      <header className="card__header card__header--row">
        <h2>Lista de Tarefas</h2>
        <div className="card__title-group">
          <span className="badge-count">
            {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {tasks.length === 0 ? (
        <p className="empty">Nenhuma tarefa cadastrada.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Responsável</th>
                <th>Vencimento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <span className="table__title">
                      <FileText size={14} aria-hidden="true" />
                      {task.title}
                    </span>
                  </td>
                  <td>
                    <span className="table__member">
                      <span className="avatar avatar--small" aria-hidden="true">
                        {task.member_name[0]}
                      </span>
                      {task.member_name}
                    </span>
                  </td>
                  <td className="table__date">{formatDate(task.due_date)}</td>
                  <td>
                    <select
                      className={`pill pill--${task.status}`}
                      value={task.status}
                      onChange={(e) => onTaskChange(task.id, e.target.value as Status)}
                    >
                      {STATUS_ORDER.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABEL[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

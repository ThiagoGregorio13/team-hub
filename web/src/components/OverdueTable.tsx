import { AlertTriangle, FileText } from "lucide-react";
import { STATUS_LABEL, daysUntil, formatDate, plural, type TaskRow } from "../api";

type OverdueTableProps = {
  tasks: TaskRow[];
  today: string;
};

export function OverdueTable({ tasks, today }: OverdueTableProps) {
  return (
    <section className="card">
      <header className="card__header card__header--row">
        <div className="card__title-group">
          <h2>Tarefas atrasadas</h2>
          <span className="badge-count">
            {tasks.length} tarefa{tasks.length === 1 ? "" : "s"}
          </span>
        </div>
        {tasks.length > 0 && (
          <span className="overdue-hint">
            <AlertTriangle size={14} aria-hidden="true" />
            Priorize {tasks.length === 1 ? "esta entrega" : "estas entregas"}
          </span>
        )}
      </header>

      {tasks.length === 0 ? (
        <p className="empty">Nenhuma tarefa atrasada. Bom trabalho, time!</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Responsável</th>
                <th>Vencimento</th>
                <th>Atraso</th>
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
                  <td className="table__date">{plural(-daysUntil(task.due_date, today), "dia")}</td>
                  <td>
                    <span className={`pill pill--${task.status}`}>{STATUS_LABEL[task.status]}</span>
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

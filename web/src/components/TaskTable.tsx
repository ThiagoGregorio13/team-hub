import { Plus, Trash2 } from "lucide-react";
import { StatusSelect } from "./StatusSelect";
import {
  describeDue,
  displayName,
  formatDate,
  isOverdue,
  type MemberCount,
  type Status,
  type TaskRow,
} from "../api";
import { Avatar } from "./Avatar";

export type TaskFilter = "all" | Status | "late";

type TaskTableProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
  query: string;
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onStatusChange: (id: number, status: Status) => void;
  onOpenTask: (id: number) => void;
  onNewTask: () => void;
  onDeleteTask: (id: number) => void;
};

const TABS: { key: TaskFilter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "in_progress", label: "Em andamento" },
  { key: "done", label: "Concluídas" },
  { key: "late", label: "Atrasadas" },
];

function matches(task: TaskRow, filter: TaskFilter, today: string): boolean {
  if (filter === "all") return true;
  if (filter === "late") return isOverdue(task, today);
  return task.status === filter;
}

export function TaskTable({
  tasks,
  members,
  today,
  query,
  filter,
  onFilterChange,
  onStatusChange,
  onOpenTask,
  onDeleteTask,
  onNewTask,
}: TaskTableProps) {
  const search = query.trim().toLowerCase();
  const visible = tasks
    .filter((t) => matches(t, filter, today))
    .filter(
      (t) =>
        !search ||
        t.title.toLowerCase().includes(search) ||
        t.member_name.toLowerCase().includes(search),
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <section
      className="card table-card"
      aria-labelledby="tasks-title"
    >
      <header className="card__header">
        <div>
          <h2 id="tasks-title">Tarefas</h2>
          <p className="card__subtitle">
            Clique numa linha para ver detalhes ou troque o status direto
          </p>
        </div>
        <button
          className="button button--primary button--sm"
          onClick={onNewTask}
        >
          <Plus size={16} aria-hidden="true" />
          Nova tarefa
        </button>
      </header>

      <div className="tabs" role="tablist" aria-label="Filtrar tarefas">
        {TABS.map((tab) => {
          const count = tasks.filter((t) => matches(t, tab.key, today)).length;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={filter === tab.key}
              className="tabs__item"
              onClick={() => onFilterChange(tab.key)}
            >
              {tab.label}
              <span className="tabs__count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Tarefa</th>
              <th>Responsável</th>
              <th>Prazo</th>
              <th>Status</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="table__empty">
                  Nenhuma tarefa encontrada{search ? ` para "${query}"` : ""}.
                </td>
              </tr>
            )}
            {visible.map((task) => {
              const late = isOverdue(task, today);
              return (
                <tr key={task.id} className={late ? "is-late" : undefined} onClick={() => onOpenTask(task.id)}>
                  <td>
                    <span className="table__task">
                      <span className="table__id">#{task.id}</span>
                      {task.title}
                    </span>
                  </td>
                  <td>
                    <span className="table__person">
                      <Avatar
                        name={task.member_name}
                        members={members}
                        size="sm"
                      />
                      {displayName(task.member_name)}
                    </span>
                  </td>
                  <td>
                    <span className="table__due">
                      {formatDate(task.due_date)}
                      <span
                        className={`table__relative${late ? " is-late" : ""}`}
                      >
                        {describeDue(task, today)}
                      </span>
                    </span>
                  </td>
                  {/* stopPropagation: mexer no select não deve abrir a gaveta da linha */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <StatusSelect
                      value={task.status}
                      label={`Status de ${task.title}`}
                      onChange={(status) => onStatusChange(task.id, status)}
                    />
                  </td>
                  <td
                    className="table__actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button 
                    className = "trash-button"
                    aria-label={`Excluir ${task.title}`}
                    onClick ={() => onDeleteTask(task.id)}
                    title="Excluir tarefa">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

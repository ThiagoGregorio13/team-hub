import { CalendarClock } from "lucide-react";
import { daysUntil, describeDue, formatDate, type TaskRow } from "../api";

type UpcomingDeadlinesProps = {
  tasks: TaskRow[];
  today: string;
};

// Até quantos dias o prazo conta como "urgente" (fica amarelo)
const URGENT_DAYS = 3;
const MAX_ITEMS = 5;

export function UpcomingDeadlines({ tasks, today }: UpcomingDeadlinesProps) {
  // Só o que ainda está aberto e não venceu, do prazo mais próximo para o mais distante
  const upcoming = tasks
    .filter((task) => task.status !== "done" && daysUntil(task.due_date, today) >= 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, MAX_ITEMS);

  return (
    <section className="card">
      <header className="card__header card__header--row">
        <div>
          <h2>Próximas entregas</h2>
          <p className="card__subtitle">Prazos das tarefas em aberto</p>
        </div>
        <CalendarClock size={18} className="card__header-icon" aria-hidden="true" />
      </header>

      {upcoming.length === 0 ? (
        <p className="empty">Nenhuma entrega em aberto pela frente.</p>
      ) : (
        <ol className="timeline">
          {upcoming.map((task) => {
            const urgent = daysUntil(task.due_date, today) <= URGENT_DAYS;
            return (
              <li key={task.id} className="timeline__item">
                <span className={`timeline__node${urgent ? " timeline__node--urgent" : ""}`} aria-hidden="true" />
                <div className="timeline__content">
                  <div className="timeline__top">
                    <strong>{task.title}</strong>
                    <span className={`chip${urgent ? " chip--urgent" : ""}`}>{describeDue(task, today)}</span>
                  </div>
                  <span className="timeline__meta">
                    {task.member_name} · {formatDate(task.due_date)}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

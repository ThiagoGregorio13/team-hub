import { daysUntil, describeDue, displayName, type MemberCount, type TaskRow } from "../api";
import { Avatar } from "./Avatar";

type UpcomingProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
  onOpenTask: (id: number) => void;
};

const MAX_ITEMS = 4;
// Até quantos dias o prazo conta como "urgente"
const URGENT_DAYS = 3;

export function Upcoming({ tasks, members, today, onOpenTask }: UpcomingProps) {
  const upcoming = tasks
    .filter((t) => t.status !== "done" && daysUntil(t.due_date, today) >= 0)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, MAX_ITEMS);

  return (
    <section className="card" aria-labelledby="upcoming-title">
      <header className="card__header">
        <div>
          <h2 id="upcoming-title">Próximas entregas</h2>
          <p className="card__subtitle">Prazos das tarefas em aberto</p>
        </div>
      </header>

      {upcoming.length === 0 ? (
        <p className="empty">Nenhuma entrega pela frente.</p>
      ) : (
        <ul className="upcoming">
          {upcoming.map((task) => {
            const [, month, day] = task.due_date.split("-");
            const monthLabel = new Date(Date.UTC(2000, Number(month) - 1, 1))
              .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
              .replace(".", "");
            const urgent = daysUntil(task.due_date, today) <= URGENT_DAYS;

            return (
              <li key={task.id}>
                <button className="upcoming__item" onClick={() => onOpenTask(task.id)}>
                  {/* Bloquinho de calendário com dia e mês */}
                  <span className={`date-chip${urgent ? " is-urgent" : ""}`}>
                    <strong>{day}</strong>
                    {monthLabel}
                  </span>
                  <span className="upcoming__text">
                    <strong>{task.title}</strong>
                    <span>
                      {displayName(task.member_name)} · {describeDue(task, today)}
                    </span>
                  </span>
                  <Avatar name={task.member_name} members={members} size="sm" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

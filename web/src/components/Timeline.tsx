import {
  STATUS_LABEL,
  describeDue,
  displayName,
  formatDate,
  isOverdue,
  plural,
  toDayNumber,
  type MemberCount,
  type TaskRow,
} from "../api";
import { Avatar } from "./Avatar";

type TimelineProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
  onOpenTask: (id: number) => void;
};

// Folga antes da primeira e depois da última data, para nada ficar colado na borda
const PADDING_DAYS = 10;
// Duas tarefas mais perto que isso (em % da largura) vão para linhas diferentes da faixa
const MIN_GAP = 13;

export function Timeline({ tasks, members, today, onOpenTask }: TimelineProps) {
  const todayDay = toDayNumber(today);
  const days = [todayDay, ...tasks.map((t) => toDayNumber(t.due_date))];
  const start = Math.min(...days) - PADDING_DAYS;
  const end = Math.max(...days) + PADDING_DAYS;
  const toX = (day: number) => ((day - start) / (end - start)) * 100;

  return (
    <section className="card" id="schedule" aria-labelledby="timeline-title">
      <header className="card__header">
        <div>
          <h2 id="timeline-title">Cronograma</h2>
          <p className="card__subtitle">Cada tarefa na data de entrega, por pessoa</p>
        </div>
        <ul className="legend" aria-label="Legenda">
          <li><span className="legend__dot legend__dot--pending" />Pendente</li>
          <li><span className="legend__dot legend__dot--in_progress" />Em andamento</li>
          <li><span className="legend__dot legend__dot--done" />Concluída</li>
          <li><span className="legend__dot legend__dot--late" />Atrasada</li>
        </ul>
      </header>

      {/* No celular a linha do tempo rola para o lado, em vez de espremer as datas */}
      <div className="timeline-scroll">
        <div className="timeline">
          <div className="timeline__axis" aria-hidden="true">
            {monthTicks(start, end).map((tick) => (
              <span key={tick.day} className="timeline__month" style={{ left: `${toX(tick.day)}%` }}>
                {tick.label}
              </span>
            ))}
          </div>

          <div className="timeline__lanes">
            <div className="timeline__overlay" aria-hidden="true">
              {/* Tudo antes de hoje fica levemente sombreado: é o "passado" */}
              <div className="timeline__past" style={{ width: `${toX(todayDay)}%` }} />
              <div className="timeline__today" style={{ left: `${toX(todayDay)}%` }}>
                <span>Hoje</span>
              </div>
            </div>

            {members.map((member) => {
              const own = tasks
                .filter((t) => t.member_name === member.name)
                .sort((a, b) => a.due_date.localeCompare(b.due_date));
              const rows = stackInRows(own, (t) => toX(toDayNumber(t.due_date)));

              return (
                <div
                  key={member.name}
                  className="lane"
                  style={{ height: Math.max(rows.length, 1) * 44 + 20 }}
                >
                  <div className="lane__who">
                    <Avatar name={member.name} members={members} size="sm" />
                    <span className="lane__name">{displayName(member.name)}</span>
                  </div>

                  <div className="lane__track">
                    {own.length === 0 && <span className="lane__free">Livre — sem tarefas</span>}
                    {rows.map((row, rowIndex) =>
                      row.map((task) => {
                        const late = isOverdue(task, today);
                        return (
                          <button
                            key={task.id}
                            className={`tl-task tl-task--${task.status}${late ? " is-late" : ""}`}
                            style={{ left: `${toX(toDayNumber(task.due_date))}%`, top: rowIndex * 44 + 10 }}
                            onClick={() => onOpenTask(task.id)}
                            aria-label={`${task.title}, ${displayName(task.member_name)}, ${STATUS_LABEL[task.status]}, ${describeDue(task, today)}`}
                          >
                            <span className="tl-task__dot" aria-hidden="true" />
                            <span className="tl-task__title">{task.title}</span>
                            <span className="tl-task__tip" aria-hidden="true">
                              {formatDate(task.due_date)} · {describeDue(task, today)}
                            </span>
                          </button>
                        );
                      }),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="card__foot">
        {plural(tasks.length, "tarefa")} entre {formatDate(dayToIso(start + PADDING_DAYS))} e{" "}
        {formatDate(dayToIso(end - PADDING_DAYS))}. Clique em uma tarefa para mudar o status.
      </p>
    </section>
  );
}

// Coloca cada tarefa na primeira linha onde ela não encosta na anterior
function stackInRows(tasks: TaskRow[], xOf: (task: TaskRow) => number): TaskRow[][] {
  const rows: TaskRow[][] = [];
  for (const task of tasks) {
    const x = xOf(task);
    const row = rows.find((r) => x - xOf(r[r.length - 1]) >= MIN_GAP);
    if (row) row.push(task);
    else rows.push([task]);
  }
  return rows;
}

function dayToIso(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

// Um rótulo no dia 1 de cada mês dentro do intervalo ("out", "nov"...)
function monthTicks(start: number, end: number) {
  const ticks: { day: number; label: string }[] = [];
  const first = new Date(start * 86_400_000);
  const year = first.getUTCFullYear();
  // Date.UTC aceita mês 12, 13... e vira o ano sozinho
  for (let month = first.getUTCMonth() + 1; ; month++) {
    const day = Date.UTC(year, month, 1) / 86_400_000;
    if (day > end) break;
    const label = new Date(day * 86_400_000).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
    const short = label.replace(".", "");
    ticks.push({ day, label: short.charAt(0).toUpperCase() + short.slice(1) });
  }
  return ticks;
}

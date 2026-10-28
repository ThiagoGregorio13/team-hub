import type { MemberCount, TaskRow } from "../api";

type TeamPerformanceProps = {
  members: MemberCount[];
  tasks: TaskRow[];
};

function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

export function TeamPerformance({ members, tasks }: TeamPerformanceProps) {
  const totalDone = tasks.filter((task) => task.status === "done").length;

  return (
    <section className="card">
      <header className="card__header card__header--row">
        <h2>Desempenho do time</h2>
        <span className="card__subtitle">Conclusão por responsável</span>
      </header>

      <div className="performance">
        <ul className="performance__members">
          {members.map((member) => {
            const done = tasks.filter(
              (task) => task.member_name === member.name && task.status === "done",
            ).length;
            const value = percent(done, member.total);

            return (
              <li key={member.name} className="progress-item">
                <div className="progress-item__top">
                  <span className="avatar" aria-hidden="true">
                    {member.name[0]}
                  </span>
                  <span className="progress-item__name">{member.name}</span>
                  <strong className="progress-item__value">{value}%</strong>
                </div>
                <ProgressBar value={value} label={`Conclusão de ${member.name}`} />
                <span className="progress-item__hint">
                  {done} de {member.total} concluída{member.total === 1 ? "" : "s"}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="performance__overall progress-item">
          <div className="progress-item__top">
            <span className="progress-item__name">Conclusão geral</span>
            <strong className="progress-item__value progress-item__value--big">
              {percent(totalDone, tasks.length)}%
            </strong>
          </div>
          <ProgressBar value={percent(totalDone, tasks.length)} label="Conclusão geral do time" />
          <span className="progress-item__hint">
            {totalDone} de {tasks.length} tarefas concluídas
          </span>
        </div>
      </div>
    </section>
  );
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress__fill" style={{ width: `${value}%` }} />
    </div>
  );
}

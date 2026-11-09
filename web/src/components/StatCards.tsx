import { isOverdue, percent, plural, type MemberCount, type TaskRow } from "../api";
import { useCountUp } from "../useCountUp";

type StatCardsProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
};

// Uma faixa só, dividida em quatro: os números são o destaque, sem ícone nem card para cada um
export function StatCards({ tasks, members, today }: StatCardsProps) {
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => isOverdue(t, today)).length;

  return (
    <section className="strip" aria-label="Indicadores">
      <Stat label="Tarefas" value={total} foot={`entre ${plural(members.length, "pessoa")}`} />
      <Stat label="Em andamento" value={inProgress} share={percent(inProgress, total)} tone="sage" />
      <Stat label="Concluídas" value={done} share={percent(done, total)} tone="brand" />
      <Stat
        label="Atrasadas"
        value={late}
        share={percent(late, total)}
        tone="alert"
        foot={late === 0 ? "tudo dentro do prazo" : undefined}
        alert={late > 0}
      />
    </section>
  );
}

type StatProps = {
  label: string;
  value: number;
  // parte do total, em %: vira a barrinha e o texto de baixo
  share?: number;
  foot?: string;
  tone?: "sage" | "brand" | "alert";
  alert?: boolean;
};

function Stat({ label, value, share, foot, tone, alert }: StatProps) {
  const shown = useCountUp(value);
  return (
    <div className={`strip__cell${alert ? " is-alert" : ""}`}>
      <span className="strip__label">{label}</span>
      <strong className="strip__value">{shown}</strong>
      {share !== undefined && (
        <span className="strip__meter" aria-hidden="true">
          <span className={`strip__fill strip__fill--${tone}`} style={{ width: `${share}%` }} />
        </span>
      )}
      <span className="strip__foot">{foot ?? `${share}% do total`}</span>
    </div>
  );
}

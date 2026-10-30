import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Layers, Timer } from "lucide-react";
import { isOverdue, percent, plural, type MemberCount, type TaskRow } from "../api";

type StatCardsProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
};

export function StatCards({ tasks, members, today }: StatCardsProps) {
  const total = tasks.length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => isOverdue(t, today)).length;

  return (
    <section className="stats" aria-label="Indicadores">
      <StatCard
        tone="olive"
        icon={<Layers size={20} />}
        label="Total de tarefas"
        value={total}
        foot={`Distribuídas entre ${plural(members.length, "membro")}`}
      />
      <StatCard
        tone="sunflower"
        icon={<Timer size={20} />}
        label="Em andamento"
        value={inProgress}
        progress={percent(inProgress, total)}
        foot={`${percent(inProgress, total)}% do total`}
      />
      <StatCard
        tone="olive"
        icon={<CheckCircle2 size={20} />}
        label="Concluídas"
        value={done}
        progress={percent(done, total)}
        foot={`${percent(done, total)}% do total`}
      />
      <StatCard
        tone="wine"
        icon={<AlertTriangle size={20} />}
        label="Atrasadas"
        value={late}
        foot={late === 0 ? "Tudo dentro do prazo" : "Precisam de atenção"}
        badge={late === 0 ? { text: "Em dia", tone: "olive" } : { text: "Atenção", tone: "wine" }}
      />
    </section>
  );
}

type StatCardProps = {
  tone: "olive" | "sunflower" | "wine";
  icon: ReactNode;
  label: string;
  value: number;
  foot: string;
  progress?: number;
  badge?: { text: string; tone: "olive" | "wine" };
};

function StatCard({ tone, icon, label, value, foot, progress, badge }: StatCardProps) {
  return (
    <article className="card stat">
      <div className="stat__top">
        <span className={`stat__icon stat__icon--${tone}`} aria-hidden="true">
          {icon}
        </span>
        {badge && <span className={`badge badge--${badge.tone}`}>{badge.text}</span>}
      </div>
      <p className="stat__label">{label}</p>
      <strong className="stat__value">{value}</strong>
      {progress !== undefined && (
        <div className="meter" role="presentation">
          <span className={`meter__fill meter__fill--${tone}`} style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="stat__foot">{foot}</p>
    </article>
  );
}

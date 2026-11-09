import type { PointerEvent } from "react";
import { Plus, Sparkles } from "lucide-react";
import { daysUntil, describeDue, displayName, isOverdue, plural, type MemberCount, type TaskRow } from "../api";
import { Avatar } from "./Avatar";

type StageProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
  onSummary: () => void;
  onNewTask: () => void;
  onOpenTask: (id: number) => void;
};

// Até quantos dias à frente uma entrega conta como "desta semana"
const WEEK = 7;

// O "palco" da visão geral: uma frase que resume o dia, escrita a partir dos dados,
// e o ingresso da próxima entrega (o mesmo desenho da credencial do login)
export function Stage({ tasks, members, today, onSummary, onNewTask, onOpenTask }: StageProps) {
  const open = tasks.filter((t) => t.status !== "done");
  const late = open.filter((t) => isOverdue(t, today)).length;
  const soon = open.filter((t) => {
    const days = daysUntil(t.due_date, today);
    return days >= 0 && days <= WEEK;
  }).length;

  // A mais urgente: as atrasadas vêm primeiro, porque a data delas é menor
  const next = [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  // Quem tem mais tarefas em aberto
  const load = members
    .map((m) => ({ name: m.name, open: open.filter((t) => t.member_name === m.name).length }))
    .sort((a, b) => b.open - a.open)[0];

  let headline: string;
  if (tasks.length === 0) headline = "Nenhuma tarefa ainda. Crie a primeira para o time.";
  else if (late > 0)
    headline = `${plural(late, "tarefa")} fora do prazo${soon > 0 ? ` e ${plural(soon, "entrega")} nos próximos ${WEEK} dias.` : "."}`;
  else if (soon > 0) headline = `Tudo no prazo. ${plural(soon, "entrega")} nos próximos ${WEEK} dias.`;
  else headline = "Tudo no prazo e nada vencendo nos próximos dias.";

  const detail =
    load && load.open > 0
      ? `${displayName(load.name)} está com mais tarefas em aberto (${load.open}).`
      : open.length === 0 && tasks.length > 0
        ? "Todas as tarefas foram concluídas."
        : null;

  // O holofote segue o mouse: só atualiza duas variáveis CSS, sem re-renderizar o React
  function follow(event: PointerEvent<HTMLElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
  }

  return (
    <section className="stage" aria-labelledby="stage-title" onPointerMove={follow}>
      <span className="stage__beams" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>

      <div className="stage__copy">
        <h2 id="stage-title" className="stage__headline">
          {headline}
        </h2>
        {detail && <p className="stage__detail">{detail}</p>}
        <div className="stage__actions">
          <button className="button stage__button stage__button--light" onClick={onSummary}>
            <Sparkles size={16} aria-hidden="true" />
            Resumo do dia com IA
          </button>
          <button className="button stage__button" onClick={onNewTask}>
            <Plus size={16} aria-hidden="true" />
            Nova tarefa
          </button>
        </div>
      </div>

      {next ? (
        <button className={`ticket${isOverdue(next, today) ? " is-late" : ""}`} onClick={() => onOpenTask(next.id)}>
          <span className="ticket__label">{isOverdue(next, today) ? "Mais atrasada" : "Próxima entrega"}</span>
          <span className="ticket__date">
            <strong>{next.due_date.slice(8, 10)}</strong>
            <span>{monthName(next.due_date)}</span>
          </span>
          <span className="ticket__title">{next.title}</span>
          <span className="ticket__cut" aria-hidden="true" />
          <span className="ticket__who">
            <Avatar name={next.member_name} members={members} size="sm" />
            {displayName(next.member_name)}
            <span className="ticket__due">{describeDue(next, today)}</span>
          </span>
        </button>
      ) : (
        <div className="ticket ticket--empty">
          <span className="ticket__label">Próxima entrega</span>
          <span className="ticket__title">Nenhuma tarefa em aberto.</span>
        </div>
      )}
    </section>
  );
}

// "2026-11-12" → "nov"
function monthName(iso: string): string {
  const month = Number(iso.slice(5, 7)) - 1;
  return new Date(Date.UTC(2000, month, 1))
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "");
}

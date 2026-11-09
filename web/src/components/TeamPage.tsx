import { ArrowUpRight } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, describeDue, displayName, isOverdue, plural, type MemberCount, type TaskRow } from "../api";
import { STATUS_COLOR } from "../theme";
import { Avatar } from "./Avatar";

type TeamPageProps = {
  tasks: TaskRow[];
  members: MemberCount[];
  today: string;
  onOpenTask: (id: number) => void;
  // leva para a página de tarefas já filtrada por essa pessoa
  onShowPerson: (name: string) => void;
};

// O elenco: um cartão por pessoa, com o que ela tem em aberto, o que atrasou e a próxima entrega.
// Quem está com mais tarefas em aberto fica "em cena" (cartão escuro, como o palco).
export function TeamPage({ tasks, members, today, onOpenTask, onShowPerson }: TeamPageProps) {
  const cast = members.map((member) => {
    const own = tasks.filter((t) => t.member_name === member.name);
    const open = own.filter((t) => t.status !== "done");
    return {
      name: member.name,
      own,
      open: open.length,
      late: open.filter((t) => isOverdue(t, today)).length,
      counts: STATUS_ORDER.map((status) => ({ status, value: own.filter((t) => t.status === status).length })),
      next: [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0],
    };
  });

  const busiest = Math.max(0, ...cast.map((c) => c.open));

  return (
    <section className="cast" aria-label="Pessoas do time">
      {cast.map((person) => {
        const spotlight = busiest > 0 && person.open === busiest;
        return (
          <article key={person.name} className={`cast__card${spotlight ? " is-spotlight" : ""}`}>
            <header className="cast__head">
              <Avatar name={person.name} members={members} size="lg" />
              <div className="cast__who">
                <h2>{displayName(person.name)}</h2>
                <p>{spotlight ? "Mais tarefas em aberto" : plural(person.own.length, "tarefa")}</p>
              </div>
              {person.late > 0 && <span className="cast__late">{plural(person.late, "atrasada")}</span>}
            </header>

            <div className="cast__number">
              <strong>{person.open}</strong>
              <span>em aberto</span>
            </div>

            {/* Barra dividida por status; vazia quando a pessoa ainda não tem tarefas */}
            <div
              className="cast__bar"
              role="img"
              aria-label={person.counts.map((c) => `${c.value} ${STATUS_LABEL[c.status].toLowerCase()}`).join(", ")}
            >
              {person.counts.map((c) =>
                c.value > 0 ? <span key={c.status} style={{ flexGrow: c.value, background: STATUS_COLOR[c.status] }} /> : null,
              )}
            </div>
            <ul className="cast__legend">
              {person.counts.map((c) => (
                <li key={c.status}>
                  <i style={{ background: STATUS_COLOR[c.status] }} aria-hidden="true" />
                  {STATUS_LABEL[c.status]}
                  <b>{c.value}</b>
                </li>
              ))}
            </ul>

            {person.next ? (
              <button className="cast__next" onClick={() => onOpenTask(person.next!.id)}>
                <span>Próxima</span>
                <strong>{person.next.title}</strong>
                <em className={isOverdue(person.next, today) ? "is-late" : undefined}>{describeDue(person.next, today)}</em>
              </button>
            ) : (
              <p className="cast__free">Livre: nenhuma tarefa em aberto.</p>
            )}

            <button className="cast__more" onClick={() => onShowPerson(person.name)}>
              Ver tarefas de {displayName(person.name)}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </article>
        );
      })}
    </section>
  );
}

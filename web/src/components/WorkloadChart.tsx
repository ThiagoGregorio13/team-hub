import { useState } from "react";
import { STATUS_LABEL, STATUS_ORDER, displayName, type MemberCount, type Status, type TaskRow } from "../api";
import { STATUS_COLOR } from "../theme";
import { Avatar } from "./Avatar";

type WorkloadChartProps = {
  members: MemberCount[];
  tasks: TaskRow[];
};

const CHART_HEIGHT = 330;

// Barras verticais empilhadas: uma por membro, cada pedaço é um status
export function WorkloadChart({ members, tasks }: WorkloadChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = members.map((member) => {
    const own = tasks.filter((t) => t.member_name === member.name);
    const counts = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, own.filter((t) => t.status === s).length]),
    ) as Record<Status, number>;
    return { name: member.name, total: own.length, counts };
  });

  // Escala do eixo: arredonda o maior valor para cima (mínimo 4) para sobrar espaço em cima
  const max = Math.max(4, Math.ceil(Math.max(...rows.map((r) => r.total), 0) / 2) * 2);
  const ticks = [max, (max * 3) / 4, max / 2, max / 4, 0];

  return (
    <section className="card chart-card" id="team" aria-labelledby="workload-title">
      <header className="card__header">
        <div>
          <h2 id="workload-title">Carga por membro</h2>
          <p className="card__subtitle">Tarefas de cada pessoa, por status</p>
        </div>
        <ul className="legend">
          {STATUS_ORDER.map((s) => (
            <li key={s}>
              <span className="legend__dot" style={{ background: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ul>
      </header>

      <div className="bars">
        <div className="bars__axis" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{Number.isInteger(t) ? t : ""}</span>
          ))}
        </div>

        <div className="bars__plot" style={{ height: CHART_HEIGHT }}>
          {/* Linhas de grade atrás das barras */}
          {ticks.map((t) => (
            <span key={t} className="bars__grid" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden="true" />
          ))}

          {rows.map((row) => (
            <div
              key={row.name}
              className={`bars__col${hovered && hovered !== row.name ? " is-faded" : ""}`}
              onPointerEnter={() => setHovered(row.name)}
              onPointerLeave={() => setHovered(null)}
            >
              <div
                className="bars__stack"
                style={{ height: `${(row.total / max) * 100}%` }}
                role="img"
                aria-label={`${displayName(row.name)}: ${STATUS_ORDER.map((s) => `${row.counts[s]} ${STATUS_LABEL[s].toLowerCase()}`).join(", ")}`}
              >
                {/* Ordem invertida: concluídas embaixo, pendentes em cima */}
                {[...STATUS_ORDER].reverse().map((s) =>
                  row.counts[s] > 0 ? (
                    <span
                      key={s}
                      className="bars__seg"
                      style={{ flexGrow: row.counts[s], background: STATUS_COLOR[s] }}
                    />
                  ) : null,
                )}
              </div>

              {hovered === row.name && (
                <div className="tooltip" role="presentation">
                  <strong>{displayName(row.name)}</strong>
                  {STATUS_ORDER.map((s) => (
                    <span key={s}>
                      <i style={{ background: STATUS_COLOR[s] }} />
                      {STATUS_LABEL[s]}
                      <b>{row.counts[s]}</b>
                    </span>
                  ))}
                </div>
              )}
              {row.total === 0 && <span className="bars__empty">livre</span>}
            </div>
          ))}
        </div>

        <div className="bars__labels">
          {rows.map((row) => (
            <span key={row.name}>
              <Avatar name={row.name} members={members} size="sm" />
              {displayName(row.name)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

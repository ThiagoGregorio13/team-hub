import { Clock } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, formatDuration, percent, type DeliveryTime, type TaskRow } from "../api";
import { STATUS_COLOR } from "../theme";

type StatusDonutProps = {
  tasks: TaskRow[];
  delivery: DeliveryTime;
};

const R = 70;
const C = 2 * Math.PI * R;
// Espaço entre as fatias (em unidades do traço), para separar uma cor da outra
const GAP = 6;

export function StatusDonut({ tasks, delivery }: StatusDonutProps) {
  const total = tasks.length;
  const slices = STATUS_ORDER.map((status) => ({
    status,
    value: tasks.filter((t) => t.status === status).length,
  }));
  const visible = slices.filter((s) => s.value > 0);

  // Cada fatia é um círculo com traço tracejado; o offset acumulado empurra a fatia para depois da anterior
  let offset = 0;
  const arcs = visible.map((slice) => {
    const length = (slice.value / total) * C;
    const arc = { ...slice, dash: Math.max(length - (visible.length > 1 ? GAP : 0), 0), offset };
    offset += length;
    return arc;
  });

  return (
    <section className="card chart-card" aria-labelledby="status-title">
      <header className="card__header">
        <div>
          <h2 id="status-title">Status das tarefas</h2>
          <p className="card__subtitle">Como o trabalho está distribuído</p>
        </div>
      </header>

      <div className="donut">
        <svg viewBox="0 0 180 180" role="img" aria-label={slices.map((s) => `${s.value} ${STATUS_LABEL[s.status]}`).join(", ")}>
          <circle cx="90" cy="90" r={R} className="donut__track" />
          {arcs.map((arc) => (
            <circle
              key={arc.status}
              cx="90"
              cy="90"
              r={R}
              className="donut__arc"
              stroke={STATUS_COLOR[arc.status]}
              strokeDasharray={`${arc.dash} ${C - arc.dash}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </svg>
        <div className="donut__center">
          <strong>{total}</strong>
          <span>tarefas</span>
        </div>
      </div>

      <ul className="donut__legend">
        {slices.map((s) => (
          <li key={s.status}>
            <span className="legend__dot" style={{ background: STATUS_COLOR[s.status] }} />
            <span className="donut__name">{STATUS_LABEL[s.status]}</span>
            <span className="donut__pct">{percent(s.value, total)}%</span>
            <strong>{s.value}</strong>
          </li>
        ))}
      </ul>

      <div className="donut__foot">
        <span className="donut__foot-icon" aria-hidden="true">
          <Clock size={16} />
        </span>
        <div>
          <p>Tempo médio de entrega</p>
          <strong>{delivery.avg_hours === null ? "Sem dados" : formatDuration(delivery.avg_hours)}</strong>
        </div>
      </div>
    </section>
  );
}

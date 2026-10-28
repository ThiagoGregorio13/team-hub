import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { STATUS_LABEL, STATUS_ORDER, type StatusCount } from "../api";
import { STATUS_COLOR } from "../theme";

type StatusChartProps = {
  stats: StatusCount[];
};

export function StatusChart({ stats }: StatusChartProps) {
  // Garante os 3 status na ordem certa, mesmo que algum venha com 0 (ou nem venha) da API
  const data = STATUS_ORDER.map((status) => ({
    status,
    name: STATUS_LABEL[status],
    value: stats.find((s) => s.status === status)?.total ?? 0,
    fill: STATUS_COLOR[status],
  }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="card chart-card">
      <header className="card__header">
        <h2>Tarefas por status</h2>
        <p className="card__subtitle">Uma visão do fluxo de trabalho</p>
      </header>

      <div className="donut-layout">
        <div className="donut">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={total > 0 ? data : [{ name: "Sem tarefas", value: 1, fill: "#e4e6d2" }]}
                dataKey="value"
                nameKey="name"
                innerRadius="70%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              />
              {total > 0 && <Tooltip />}
            </PieChart>
          </ResponsiveContainer>
          <div className="donut__center">
            <strong>{total}</strong>
            <span>tarefas no total</span>
          </div>
        </div>

        <ul className="legend legend--column">
          {data.map((item) => (
            <li key={item.status}>
              <span className="legend__dot" style={{ background: item.fill }} />
              <span className="legend__label">{item.name}</span>
              <strong className="legend__value">{item.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

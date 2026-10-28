import { useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  describeDue,
  formatDate,
  isOverdue,
  plural,
  type MemberCount,
  type Status,
  type TaskRow,
} from "../api";
import { STATUS_COLOR, STATUS_TEXT_COLOR } from "../theme";

type MemberChartProps = {
  members: MemberCount[];
  tasks: TaskRow[];
  today: string;
};

type MemberRow = { name: string } & Record<Status, number>;

export function MemberChart({ members, tasks, today }: MemberChartProps) {
  // Começa mostrando o primeiro membro; passar o mouse (ou clicar) na barra troca
  const [selected, setSelected] = useState(members[0]?.name ?? "");

  // Uma linha por membro (inclusive quem tem 0), contando as tasks de cada status
  const data: MemberRow[] = members.map((member) => {
    const own = tasks.filter((task) => task.member_name === member.name);
    return {
      name: member.name,
      pending: own.filter((t) => t.status === "pending").length,
      in_progress: own.filter((t) => t.status === "in_progress").length,
      done: own.filter((t) => t.status === "done").length,
    };
  });

  function selectFromChart(label: unknown) {
    if (typeof label === "string") setSelected(label);
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2>Tarefas por membro</h2>
        <p className="card__subtitle">Passe o mouse em uma barra para ver os detalhes</p>
      </header>

      <div className="member-layout">
        <div className="member-layout__chart">
          <div style={{ width: "100%", height: data.length * 52 + 40 }}>
            <ResponsiveContainer>
              <BarChart
                data={data}
                layout="vertical"
                barCategoryGap={14}
                margin={{ left: 8, right: 8 }}
                onMouseMove={(state) => selectFromChart(state.activeLabel)}
                onClick={(state) => selectFromChart(state.activeLabel)}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#5b6150" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "#1a1a1a" }}
                />
                {STATUS_ORDER.map((status) => (
                  <Bar
                    key={status}
                    dataKey={status}
                    name={STATUS_LABEL[status]}
                    stackId="tasks"
                    fill={STATUS_COLOR[status]}
                    isAnimationActive={false}
                  >
                    {/* Em vez de zoom/tooltip: o membro selecionado fica forte e os outros mais apagados */}
                    {data.map((row) => (
                      <Cell
                        key={row.name}
                        fillOpacity={row.name === selected ? 1 : 0.35}
                        style={{ transition: "fill-opacity 0.2s ease" }}
                      />
                    ))}
                    <LabelList
                      dataKey={status}
                      position="center"
                      fill={STATUS_TEXT_COLOR[status]}
                      fontSize={12}
                      formatter={(value) => (value === 0 ? "" : value)}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ul className="legend legend--row">
            {STATUS_ORDER.map((status) => (
              <li key={status}>
                <span className="legend__dot" style={{ background: STATUS_COLOR[status] }} />
                {STATUS_LABEL[status]}
              </li>
            ))}
          </ul>
        </div>

        <MemberDetail
          members={members}
          tasks={tasks}
          today={today}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </section>
  );
}

type MemberDetailProps = {
  members: MemberCount[];
  tasks: TaskRow[];
  today: string;
  selected: string;
  onSelect: (name: string) => void;
};

function MemberDetail({ members, tasks, today, selected, onSelect }: MemberDetailProps) {
  const own = tasks
    .filter((task) => task.member_name === selected)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const done = own.filter((task) => task.status === "done").length;

  return (
    <aside className="member-detail" aria-live="polite">
      {/* Botões para quem usa toque ou teclado (no celular não existe "passar o mouse") */}
      <div className="member-detail__tabs" role="group" aria-label="Escolher membro">
        {members.map((member) => (
          <button
            key={member.name}
            className="member-tab"
            aria-pressed={member.name === selected}
            onClick={() => onSelect(member.name)}
          >
            {member.name}
          </button>
        ))}
      </div>

      <div className="member-detail__head">
        <span className="avatar avatar--large" aria-hidden="true">
          {selected[0]}
        </span>
        <div>
          <strong className="member-detail__name">{selected}</strong>
          <span className="member-detail__meta">
            {own.length === 0 ? "Sem tarefas atribuídas" : `${plural(own.length, "tarefa")} · ${done} concluída${done === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      {own.length === 0 ? (
        <p className="empty">Nenhuma tarefa para este membro ainda.</p>
      ) : (
        <ul className="member-detail__list">
          {own.map((task) => (
            <li key={task.id} className="member-task">
              <div className="member-task__top">
                <span className="member-task__title">{task.title}</span>
                <span className={`pill pill--${task.status}`}>{STATUS_LABEL[task.status]}</span>
              </div>
              <span className={`member-task__due${isOverdue(task, today) ? " member-task__due--late" : ""}`}>
                {formatDate(task.due_date)} · {describeDue(task, today)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

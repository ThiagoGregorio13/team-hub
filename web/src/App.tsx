import { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CircleDashed, Layers, Timer } from "lucide-react";
import {
  getAiSummary,
  getStatsByMember,
  getStatsByStatus,
  getTasks,
  isOverdue,
  todayLocal,
  type MemberCount,
  type StatusCount,
  type TaskRow,
} from "./api";
import { Header } from "./components/Header";
import { KpiCard } from "./components/KpiCard";
import { MemberChart } from "./components/MemberChart";
import { StatusChart } from "./components/StatusChart";
import { TeamPerformance } from "./components/TeamPerformance";
import { OverdueTable } from "./components/OverdueTable";
import { AiSummary, type AiState } from "./components/AiSummary";
import { UpcomingDeadlines } from "./components/UpcomingDeadlines";
import { CustomCursor } from "./components/CustomCursor";
import "./App.css";

type DashboardData = {
  tasks: TaskRow[];
  byStatus: StatusCount[];
  byMember: MemberCount[];
};

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<AiState>({ kind: "idle" });

  useEffect(() => {
    // As 3 rotas em paralelo: só mostra a tela quando todas responderem
    Promise.all([getTasks(), getStatsByStatus(), getStatsByMember()])
      .then(([tasks, byStatus, byMember]) => setData({ tasks, byStatus, byMember }))
      .catch((err) => {
        console.error(err);
        setError("Não foi possível carregar os dados. A API está rodando na porta 3000?");
      });
  }, []);

  async function handleAnalyze() {
    setAi({ kind: "loading" });
    // Leva a tela até o card, para ver o ícone girando e o resultado
    document.getElementById("ai-summary")?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      const result = await getAiSummary();
      setAi({ kind: "done", summary: result.summary, date: result.date });
    } catch (err) {
      console.error(err);
      setAi({
        kind: "error",
        message: "Não foi possível gerar o resumo agora. A IA pode estar sobrecarregada ou sem cota; tente de novo mais tarde.",
      });
    }
  }

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <CustomCursor />
      <Header onAnalyze={handleAnalyze} analyzing={ai.kind === "loading"} />

      <main className="page">
        <div className="page__intro">
          <div>
            <h1>Visão geral do time</h1>
            <p className="page__subtitle">Acompanhe as entregas, o ritmo e as prioridades da equipe.</p>
          </div>
          <span className="page__date">
            <CalendarDays size={16} aria-hidden="true" />
            {todayLabel}
          </span>
        </div>

        {error && <p className="card status-message status-message--error">{error}</p>}
        {!error && !data && <p className="card status-message">Carregando dados do time...</p>}
        {data && <Dashboard data={data} ai={ai} />}
      </main>
    </>
  );
}

function Dashboard({ data, ai }: { data: DashboardData; ai: AiState }) {
  const { tasks, byStatus, byMember } = data;

  const countOf = (status: StatusCount["status"]) =>
    byStatus.find((s) => s.status === status)?.total ?? 0;
  const total = byStatus.reduce((sum, s) => sum + s.total, 0);

  const today = todayLocal();
  const overdue = tasks.filter((task) => isOverdue(task, today));

  return (
    <>
      <section className="kpis" aria-label="Indicadores">
        <KpiCard
          label="Total de tarefas"
          value={total}
          hint={`Distribuídas entre ${byMember.length} membros`}
          icon={<Layers size={16} />}
        />
        <KpiCard
          label="Pendentes"
          value={countOf("pending")}
          hint="Aguardando início"
          icon={<CircleDashed size={16} />}
        />
        <KpiCard
          label="Em andamento"
          value={countOf("in_progress")}
          hint="Trabalho em movimento"
          icon={<Timer size={16} />}
        />
        <KpiCard
          label="Atrasadas"
          value={overdue.length}
          hint={overdue.length > 0 ? "Precisa de atenção" : "Tudo em dia"}
          icon={<AlertTriangle size={16} />}
          variant="alert"
        />
      </section>

      <MemberChart members={byMember} tasks={tasks} today={today} />

      <div className="split">
        <StatusChart stats={byStatus} />
        <UpcomingDeadlines tasks={tasks} today={today} />
      </div>

      <TeamPerformance members={byMember} tasks={tasks} />
      <OverdueTable tasks={overdue} today={today} />
      <AiSummary state={ai} />
    </>
  );
}

export default App;

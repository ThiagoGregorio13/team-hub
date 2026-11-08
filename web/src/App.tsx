import { useEffect, useState, type MouseEvent } from "react";
import {
  deleteTask,
  getDeliveryTime,
  getStatsByMember,
  getTasks,
  isAdminSession,
  isOverdue,
  patchStatus,
  todayLocal,
  type DeliveryTime,
  type MemberCount,
  type Status,
  type TaskRow,
} from "./api";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StatCards } from "./components/StatCards";
import { WorkloadChart } from "./components/WorkloadChart";
import { StatusDonut } from "./components/StatusDonut";
import { TaskTable, type TaskFilter } from "./components/TaskTable";
import { Upcoming } from "./components/Upcoming";
import { AiCard } from "./components/AiCard";
import { Timeline } from "./components/Timeline";
import { ArtsPage } from "./components/arts/ArtsPage";
import { PaintSplash } from "./components/arts/PaintSplash";
import { prefersReducedMotion } from "./motion";
import { TaskDrawer } from "./components/TaskDrawer";
import { AskTeam } from "./components/AskTeam";
import "./App.css";
import { NewTaskForm } from "./components/NewTaskForm";
import { RegisterDialog } from "./components/RegisterDialog";
import {DialogCancel } from "./components/ConfirmDialog"

type DashboardData = {
  tasks: TaskRow[];
  members: MemberCount[];
  delivery: DeliveryTime;
};

type View = "dashboard" | "arts";

// "#artes" abre a página de artes; qualquer outra âncora é uma seção do dashboard
function viewFromHash(): View {
  return window.location.hash === "#artes" ? "arts" : "dashboard";
}

// "closed" = fechado; "chat" = aberto para perguntar; "summary" = já abre gerando o resumo
type AskMode = "closed" | "chat" | "summary";

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [ask, setAsk] = useState<AskMode>("closed");
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [view, setView] = useState<View>(viewFromHash);
  const [splash, setSplash] = useState<{ x: number; y: number } | null>(null);
  const [covered, setCovered] = useState(false);

  // Clique em "Artes": a tinta explode de onde foi o clique e a página troca por baixo dela
  function openArts(event: MouseEvent<HTMLAnchorElement>) {
    if (view === "arts" || splash || prefersReducedMotion()) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    // Pelo teclado (Enter) não há posição do mouse: usa o centro do item do menu
    const fromKeyboard = event.clientX === 0 && event.clientY === 0;
    setCovered(true);
    setSplash({
      x: fromKeyboard ? rect.left + rect.width / 2 : event.clientX,
      y: fromKeyboard ? rect.top + rect.height / 2 : event.clientY,
    });
  }

  // O botão voltar do navegador também troca de página, porque a página mora no hash
  useEffect(() => {
    function handleHash() {
      const next = viewFromHash();
      setView(next);
      // Vindo de Artes para uma seção do dashboard: espera a seção existir e rola até ela
      requestAnimationFrame(() => {
        if (next === "arts") window.scrollTo({ top: 0 });
        else document.querySelector(window.location.hash || "#overview")?.scrollIntoView({ block: "start" });
      });
    }
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Ctrl+K (ou ⌘K no Mac) abre e fecha o assistente
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAsk((mode) => (mode === "closed" ? "chat" : "closed"));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function loadData() {
    Promise.all([getTasks(), getStatsByMember(), getDeliveryTime()])
      .then(([tasks, members, delivery]) =>
        setData({ tasks, members, delivery }),
      )
      .catch((err) => {
        console.error(err);
        setError(
          "Não foi possível carregar os dados. A API está rodando na porta 3000?",
        );
      });
  }

  async function handleStatusChange(id: number, status: Status) {
    // Otimista: a tela muda na hora e o PATCH confirma depois
    setData(
      (current) =>
        current && {
          ...current,
          tasks: current.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        },
    );
    try {
      await patchStatus(id, status);
    } catch (err) {
      console.error(err);
    }
    // Recarrega de qualquer jeito: se o PATCH falhou, a tela volta ao que está no banco
    loadData();
  }


   function handleDeleteTask(id: number) {
setTaskToDelete(id);
  }

  async function confirmDelete() {
    if(taskToDelete === null) return
    setOpenTaskId(null);
    setTaskToDelete(null);
    setData((current) => current && { ...current, tasks: current.tasks.filter((t) => t.id !== taskToDelete)});

     try {
      await deleteTask(taskToDelete);
    } catch (err) {
      console.error(err);
    }
    // Recarrega de qualquer jeito: se o PATCH falhou, a tela volta ao que está no banco
    loadData();
   }

  // O sino do header leva direto para a aba "Atrasadas" da tabela
  function showLate() {
    setFilter("late");
    if (view === "arts") {
      window.location.hash = "#tasks";
      return;
    }
    document
      .getElementById("tasks")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const today = todayLocal();
  const openTask = data?.tasks.find((t) => t.id === openTaskId) ?? null;
    const deletingTask  = data?.tasks.find((t) => t.id === taskToDelete) ?? null;

  const lateCount = data?.tasks.filter((t) => isOverdue(t, today)).length ?? 0;

  return (
    <div className="layout">
      <Sidebar onAsk={() => setAsk("chat")} view={view} onOpenArts={openArts} />

      <div className="main">
        <Header
          query={query}
          onQueryChange={setQuery}
          lateCount={lateCount}
          onShowLate={showLate}
          onAsk={() => setAsk("chat")}
          onCreateUser={isAdminSession() ? () => setRegisterOpen(true) : undefined}
          title={view === "arts" ? null : "Dashboard"}
          searchLabel={view === "arts" ? "Buscar arte ou pessoa..." : undefined}
        />

        {registerOpen && <RegisterDialog onClose={() => setRegisterOpen(false)} />}

        {view === "arts" ? (
          <main className="content content--arts">
            {error && <p className="notice">{error}</p>}
            {!error && !data && <Skeleton />}
            {data && <ArtsPage tasks={data.tasks} query={query} ready={!covered} />}
          </main>
        ) : (
          <main className="content" id="overview">
            {error && <p className="notice">{error}</p>}
            {!error && !data && <Skeleton />}
            {data && (
              <>
                <StatCards
                  tasks={data.tasks}
                  members={data.members}
                  today={today}
                />

                <div className="grid grid--wide-left">
                  <WorkloadChart members={data.members} tasks={data.tasks} />
                  <StatusDonut tasks={data.tasks} delivery={data.delivery} />
                </div>

                <div className="grid grid--wide-left">
                  <TaskTable
                    tasks={data.tasks}
                    members={data.members}
                    today={today}
                    query={query}
                    filter={filter}
                    onFilterChange={setFilter}
                    onStatusChange={handleStatusChange}
                    onOpenTask={setOpenTaskId}
                    onNewTask={() => setNewTaskOpen(true)}
                    onDeleteTask={handleDeleteTask}
                  />
                  <div className="stack">
                    <Upcoming
                      tasks={data.tasks}
                      members={data.members}
                      today={today}
                      onOpenTask={setOpenTaskId}
                    />
                    <AiCard onAsk={() => setAsk("summary")} />
                  </div>
                </div>

                <Timeline
                  tasks={data.tasks}
                  members={data.members}
                  today={today}
                  onOpenTask={setOpenTaskId}
                  onNewTask={() => setNewTaskOpen(true)}
                />
              </>
            )}
          </main>
        )}
      </div>

      <TaskDrawer
        task={openTask}
        today={today}
        onClose={() => setOpenTaskId(null)}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTask}
      />

   <DialogCancel
       open ={taskToDelete  !== null}
        message = {`Deseja realmente excluir a tarefa "${deletingTask?.title}"?`}
        onConfirm = {() => confirmDelete()}
        onCancel = {() => setTaskToDelete(null)}
        />

      <NewTaskForm
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={() => {
          setNewTaskOpen(false);
          loadData();
        }}
      />
      {splash && (
        <PaintSplash
          x={splash.x}
          y={splash.y}
          onCovered={() => {
            window.location.hash = "#artes";
          }}
          onReveal={() => setCovered(false)}
          onDone={() => setSplash(null)}
        />
      )}

      <AskTeam
        open={ask !== "closed"}
        startWithSummary={ask === "summary"}
        onClose={() => setAsk("closed")}
      />
    </div>
  );
}

// Enquanto carrega: blocos cinza no formato dos cards
function Skeleton() {
  return (
    <div
      className="skeleton"
      role="status"
      aria-label="Carregando dados do time"
    >
      <div className="skeleton__row">
        <span />
        <span />
        <span />
        <span />
      </div>
      <span className="skeleton__big" />
    </div>
  );
}

export default App;

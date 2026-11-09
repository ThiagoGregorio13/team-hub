import { useEffect, useState, type MouseEvent } from "react";
import {
  deleteTask,
  displayName,
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
import { Sidebar, type View } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StatCards } from "./components/StatCards";
import { Stage } from "./components/Stage";
import { TeamPage } from "./components/TeamPage";
import { WorkloadChart } from "./components/WorkloadChart";
import { StatusDonut } from "./components/StatusDonut";
import { TaskTable, type TaskFilter } from "./components/TaskTable";
import { Upcoming } from "./components/Upcoming";
import { Timeline } from "./components/Timeline";
import { ArtsPage } from "./components/arts/ArtsPage";
import { PaintSplash } from "./components/arts/PaintSplash";
import { prefersReducedMotion } from "./motion";
import { TaskDrawer } from "./components/TaskDrawer";
import { AskTeam } from "./components/AskTeam";
import "./App.css";
import "./backstage.css";
import { NewTaskForm } from "./components/NewTaskForm";
import { RegisterDialog } from "./components/RegisterDialog";
import {DialogCancel } from "./components/ConfirmDialog"

type DashboardData = {
  tasks: TaskRow[];
  members: MemberCount[];
  delivery: DeliveryTime;
};

// Cada página mora no hash da URL: assim o botão voltar e o F5 funcionam
const VIEWS: Record<string, View> = {
  "#overview": "overview",
  "#tasks": "tasks",
  "#team": "team",
  "#schedule": "schedule",
  "#artes": "arts",
};

const TITLES: Record<View, string | null> = {
  overview: "Visão geral",
  tasks: "Tarefas",
  team: "Equipe",
  schedule: "Cronograma",
  arts: null, // Artes tem o próprio título grande
};

function viewFromHash(): View {
  return VIEWS[window.location.hash] ?? "overview";
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
      setView(viewFromHash());
      window.scrollTo({ top: 0 }); // página nova começa do topo
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

  // O sino do header leva direto para a aba "Atrasadas" da página de tarefas
  function showLate() {
    setFilter("late");
    window.location.hash = "#tasks";
  }

  // Da página Equipe: abre Tarefas já buscando pelo nome da pessoa
  function showPerson(name: string) {
    setQuery(displayName(name));
    setFilter("all");
    window.location.hash = "#tasks";
  }
  const today = todayLocal();
  const openTask = data?.tasks.find((t) => t.id === openTaskId) ?? null;
    const deletingTask  = data?.tasks.find((t) => t.id === taskToDelete) ?? null;

  const lateCount = data?.tasks.filter((t) => isOverdue(t, today)).length ?? 0;

  return (
    <div className="layout">
      <Sidebar view={view} onOpenArts={openArts} />

      <div className="main">
        <Header
          query={query}
          onQueryChange={setQuery}
          lateCount={lateCount}
          onShowLate={showLate}
          onAsk={() => setAsk("chat")}
          onCreateUser={isAdminSession() ? () => setRegisterOpen(true) : undefined}
          title={TITLES[view]}
          search={view === "tasks" || view === "arts"}
          searchLabel={view === "arts" ? "Buscar arte ou pessoa..." : undefined}
        />

        {registerOpen && <RegisterDialog onClose={() => setRegisterOpen(false)} />}

        {/* key={view}: cada página nova monta do zero e ganha a entrada suave do CSS */}
        <main className={`content content--${view}`} key={view}>
          {error && <p className="notice">{error}</p>}
          {!error && !data && <Skeleton />}

          {data && view === "overview" && (
            <>
              <Stage
                tasks={data.tasks}
                members={data.members}
                today={today}
                onSummary={() => setAsk("summary")}
                onNewTask={() => setNewTaskOpen(true)}
                onOpenTask={setOpenTaskId}
              />
              <StatCards tasks={data.tasks} members={data.members} today={today} />
              <div className="grid grid--wide-left">
                <Upcoming tasks={data.tasks} members={data.members} today={today} onOpenTask={setOpenTaskId} />
                <StatusDonut tasks={data.tasks} delivery={data.delivery} />
              </div>
              <WorkloadChart members={data.members} tasks={data.tasks} height={200} />
            </>
          )}

          {data && view === "tasks" && (
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
          )}

          {data && view === "team" && (
            <>
              <TeamPage
                tasks={data.tasks}
                members={data.members}
                today={today}
                onOpenTask={setOpenTaskId}
                onShowPerson={showPerson}
              />
              <WorkloadChart members={data.members} tasks={data.tasks} height={240} />
            </>
          )}

          {data && view === "schedule" && (
            <Timeline
              tasks={data.tasks}
              members={data.members}
              today={today}
              onOpenTask={setOpenTaskId}
              onNewTask={() => setNewTaskOpen(true)}
            />
          )}

          {data && view === "arts" && <ArtsPage tasks={data.tasks} query={query} ready={!covered} />}
        </main>
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

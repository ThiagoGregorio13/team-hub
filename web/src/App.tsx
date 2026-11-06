import { useEffect, useState } from "react";
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
      <Sidebar onAsk={() => setAsk("chat")} />

      <div className="main">
        <Header
          query={query}
          onQueryChange={setQuery}
          lateCount={lateCount}
          onShowLate={showLate}
          onAsk={() => setAsk("chat")}
          onCreateUser={isAdminSession() ? () => setRegisterOpen(true) : undefined}
        />

        {registerOpen && <RegisterDialog onClose={() => setRegisterOpen(false)} />}

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

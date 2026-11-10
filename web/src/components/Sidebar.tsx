import type { MouseEvent } from "react";
import { BookOpen, CalendarRange, LayoutGrid, ListChecks, LogOut, Palette, Users } from "lucide-react";
import { clearToken } from "../api";

export type View = "overview" | "tasks" | "team" | "schedule" | "notes" | "arts";

type SidebarProps = {
  view: View;
  // Artes abre com a transição de tinta; quem decide é o App
  onOpenArts?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

// Cada item é uma página de verdade: o hash da URL diz qual está aberta
const NAV: { view: View; href: string; label: string; icon: typeof LayoutGrid }[] = [
  { view: "overview", href: "#overview", label: "Visão geral", icon: LayoutGrid },
  { view: "tasks", href: "#tasks", label: "Tarefas", icon: ListChecks },
  { view: "team", href: "#team", label: "Equipe", icon: Users },
  { view: "schedule", href: "#schedule", label: "Cronograma", icon: CalendarRange },
  { view: "notes", href: "#notes", label: "Notas", icon: BookOpen },
  { view: "arts", href: "#artes", label: "Artes", icon: Palette },
];

function logout() {
  clearToken();
  window.location.hash = "";
  window.location.reload();
}

// A coxia: escura como o palco do login, com um holofote no item aberto
export function Sidebar({ view, onOpenArts }: SidebarProps) {
  return (
    <aside className="sidebar">
      <a className="sidebar__brand" href="#overview" aria-label="team hub, ir para a visão geral">
        <span className="logo" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        team hub
      </a>

      <nav aria-label="Principal">
        <ul className="nav">
          {NAV.map(({ view: target, href, label, icon: Icon }) => {
            const active = view === target;
            return (
              <li key={href}>
                <a
                  className={`nav__item${active ? " is-active" : ""}`}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={target === "arts" ? onOpenArts : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar__foot">
        <button className="sidebar__logout" onClick={logout}>
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  );
}

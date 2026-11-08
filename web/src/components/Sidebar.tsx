import type { MouseEvent } from "react";
import { CalendarRange, LayoutGrid, ListChecks, Palette, Sparkles, Users } from "lucide-react";

type SidebarProps = {
  onAsk: () => void;
  view: "dashboard" | "arts";
  // Artes abre com a transição de tinta; quem decide é o App
  onOpenArts?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

// Cada item leva até uma seção da página (âncora pelo id)
const NAV = [
  { href: "#overview", label: "Visão geral", icon: LayoutGrid },
  { href: "#tasks", label: "Tarefas", icon: ListChecks },
  { href: "#team", label: "Equipe", icon: Users },
  { href: "#schedule", label: "Cronograma", icon: CalendarRange },
  { href: "#artes", label: "Artes", icon: Palette },
];

export function Sidebar({ onAsk, view, onOpenArts }: SidebarProps) {
  // Artes é uma página à parte; no dashboard, "Visão geral" fica marcada
  const active = (href: string, index: number) =>
    view === "arts" ? href === "#artes" : index === 0;

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="logo" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </span>
        TEAM
      </div>

      <p className="sidebar__label">Menu</p>
      <nav>
        <ul className="nav">
          {NAV.map(({ href, label, icon: Icon }, index) => (
            <li key={href}>
              <a
                className={`nav__item${active(href, index) ? " is-active" : ""}`}
                href={href}
                aria-current={active(href, index) ? "page" : undefined}
                onClick={href === "#artes" ? onOpenArts : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="promo">
        <span className="promo__icon" aria-hidden="true">
          <Sparkles size={18} />
        </span>
        <strong>Assistente TEAM</strong>
        <p>Pergunte sobre prazos, carga de trabalho e atrasos do time.</p>
        <button className="promo__button" onClick={onAsk}>
          Abrir assistente
        </button>
      </div>
    </aside>
  );
}

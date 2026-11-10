import { Bell, Search, UserPlus } from "lucide-react";

type HeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  lateCount: number;
  onShowLate: () => void;
  onAsk: () => void;
  onCreateUser?: () => void;
  // null: a página tem o próprio título grande (ex.: Artes)
  title?: string | null;
  searchLabel?: string;
  // false: a página não tem lista para filtrar (ex.: visão geral)
  search?: boolean;
};

// Mostra "⌘K" no Mac e "Ctrl K" no resto
const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

export function Header({
  query,
  onQueryChange,
  lateCount,
  onShowLate,
  onAsk,
  onCreateUser,
  title = "Dashboard",
  searchLabel = "Buscar tarefa ou pessoa...",
  search = true,
}: HeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="header">
      <div className="header__title">
        {title && <h1>{title}</h1>}
        <p className="header__date">{today}</p>
      </div>

      {/* A busca filtra a lista da página (tarefas ou artes) */}
      {search && (
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchLabel}
          aria-label={searchLabel.replace("...", "")}
        />
      </label>
      )}

      <div className="header__actions">
        {onCreateUser && (
          <button className="icon-button" onClick={onCreateUser} aria-label="Criar credencial">
            <UserPlus size={18} aria-hidden="true" />
          </button>
        )}
        <button className="icon-button" onClick={onShowLate} aria-label={`${lateCount} tarefas atrasadas`}>
          <Bell size={18} />
          {lateCount > 0 && <span className="icon-button__badge">{lateCount}</span>}
        </button>
        <button className="button button--primary" onClick={onAsk}>
          Perguntar à IA
          <kbd>{SHORTCUT}</kbd>
        </button>
      </div>
    </header>
  );
}

import { Bell, Search } from "lucide-react";

type HeaderProps = {
  query: string;
  onQueryChange: (value: string) => void;
  lateCount: number;
  onShowLate: () => void;
  onAsk: () => void;
};

// Mostra "⌘K" no Mac e "Ctrl K" no resto
const SHORTCUT = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

export function Header({ query, onQueryChange, lateCount, onShowLate, onAsk }: HeaderProps) {
  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="header">
      <div className="header__title">
        <h1>Dashboard</h1>
        <p className="header__date">{today}</p>
      </div>

      {/* A busca filtra a tabela de tarefas */}
      <label className="search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar tarefa ou pessoa..."
          aria-label="Buscar tarefa ou pessoa"
        />
      </label>

      <div className="header__actions">
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

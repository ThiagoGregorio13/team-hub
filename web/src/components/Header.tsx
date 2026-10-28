import { LayoutDashboard, Sparkles } from "lucide-react";

type HeaderProps = {
  onAnalyze: () => void;
  analyzing: boolean;
};

export function Header({ onAnalyze, analyzing }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__logo" aria-hidden="true">
          <LayoutDashboard size={18} />
        </span>
        <span className="header__name">JOÃO ROCK</span>
        <span className="header__divider" aria-hidden="true" />
        <span className="header__tagline">Seu time, em sintonia.</span>
      </div>

      <button className="btn-ai" onClick={onAnalyze} disabled={analyzing}>
        <Sparkles size={16} aria-hidden="true" className={analyzing ? "spin" : undefined} />
        {analyzing ? "Analisando..." : "Analisar com IA"}
      </button>
    </header>
  );
}

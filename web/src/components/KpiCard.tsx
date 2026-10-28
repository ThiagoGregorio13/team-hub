import type { ReactNode } from "react";

type KpiCardProps = {
  label: string;
  value: number;
  hint: string;
  icon: ReactNode;
  variant?: "default" | "alert";
};

export function KpiCard({ label, value, hint, icon, variant = "default" }: KpiCardProps) {
  return (
    <article className={`card kpi kpi--${variant}`}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="kpi__value">{value}</strong>
      <span className="kpi__hint">{hint}</span>
    </article>
  );
}

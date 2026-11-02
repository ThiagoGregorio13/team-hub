import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { CalendarDays } from "lucide-react";

// Altura de cada item da roleta: o CSS (.wheel) usa o mesmo valor
const ITEM_HEIGHT = 36;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const pad = (n: number) => String(n).padStart(2, "0");

type WheelDatePickerProps = {
  value: string; // "AAAA-MM-DD", o mesmo formato do <input type="date">
  onChange: (value: string) => void;
};

type Part = "day" | "month" | "year";

// Seletor de data em roleta (estilo iPhone): mostra a data e, ao clicar no dia, no mês
// ou no ano, abre uma roleta só daquela parte. O item que para na faixa do meio é o escolhido
export function WheelDatePicker({ value, onChange }: WheelDatePickerProps) {
  const [openPart, setOpenPart] = useState<Part | null>(null);
  const [year, month, day] = value.split("-").map(Number);

  // Dia 0 do mês seguinte = último dia deste mês (28, 29, 30 ou 31)
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  // Do ano atual até 5 anos para frente (e o ano escolhido, se estiver fora disso)
  const thisYear = new Date().getFullYear();
  const firstYear = Math.min(thisYear, year);
  const lastYear = Math.max(thisYear + 5, year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => firstYear + i);

  function update(y: number, m: number, d: number) {
    // Trocou de 31/jan para fev? O dia vira 28 (ou 29) em vez de uma data que não existe
    const safeDay = Math.min(d, new Date(y, m, 0).getDate());
    onChange(`${y}-${pad(m)}-${pad(safeDay)}`);
  }

  const columns = {
    day: { label: "Dia", items: days, index: day - 1, onSelect: (i: number) => update(year, month, i + 1) },
    month: { label: "Mês", items: MONTHS, index: month - 1, onSelect: (i: number) => update(year, i + 1, day) },
    year: {
      label: "Ano",
      items: years.map(String),
      index: years.indexOf(year),
      onSelect: (i: number) => update(years[i], month, day),
    },
  };

  // Clicou na parte que já está aberta? Fecha. Em outra? Troca a roleta
  function toggle(part: Part) {
    setOpenPart((current) => (current === part ? null : part));
  }

  // Fecha quando o foco sai do componente (clicou fora). relatedTarget = quem ganhou o foco
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpenPart(null);
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key !== "Escape" || !openPart) return;
    // Sem isso, o Esc também fecharia a gaveta inteira
    event.preventDefault();
    event.stopPropagation();
    setOpenPart(null);
  }

  // type="button": sem ele, um botão dentro de <form> envia o formulário
  const partButton = (part: Part, text: string) => (
    <button
      type="button"
      className={`wheel-picker__part${openPart === part ? " is-open" : ""}`}
      onClick={() => toggle(part)}
      aria-expanded={openPart === part}
      aria-label={`${columns[part].label}: ${text}`}
    >
      {text}
    </button>
  );

  return (
    <div className="wheel-picker" onBlur={handleBlur} onKeyDown={handleKey}>
      <div className="wheel-picker__display">
        <CalendarDays size={16} aria-hidden="true" />
        {partButton("day", pad(day))}
        <span aria-hidden="true">/</span>
        {partButton("month", MONTHS[month - 1])}
        <span aria-hidden="true">/</span>
        {partButton("year", String(year))}
      </div>

      {/* key: trocar de parte monta uma coluna nova, que já nasce na posição certa */}
      {openPart && (
        <div className="wheel">
          <WheelColumn key={openPart} {...columns[openPart]} />
        </div>
      )}
    </div>
  );
}

type WheelColumnProps = {
  label: string;
  items: string[];
  index: number;
  onSelect: (index: number) => void;
};

function WheelColumn({ label, items, index, onSelect }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  // Abriu a roleta: o foco vai para ela, para as setas do teclado já funcionarem
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  // Leva a coluna até o item escolhido. requestAnimationFrame espera o <dialog> abrir:
  // enquanto ele está escondido, o navegador ignora o scroll
  useEffect(() => {
    const frame = requestAnimationFrame(() => ref.current?.scrollTo({ top: index * ITEM_HEIGHT }));
    return () => cancelAnimationFrame(frame);
  }, [index]);

  // O onScroll dispara várias vezes por segundo: só escolhe quando a roleta para de girar
  function handleScroll() {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const next = Math.round(el.scrollTop / ITEM_HEIGHT);
      if (next !== index && next >= 0 && next < items.length) onSelect(next);
    }, 120);
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" && index < items.length - 1) onSelect(index + 1);
    else if (event.key === "ArrowUp" && index > 0) onSelect(index - 1);
    else return;
    event.preventDefault(); // não deixa a seta rolar a gaveta inteira
  }

  return (
    <div
      ref={ref}
      className="wheel__column"
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={handleScroll}
      onKeyDown={handleKey}
    >
      {items.map((item, i) => (
        <div
          key={item}
          role="option"
          aria-selected={i === index}
          className={`wheel__item${i === index ? " is-selected" : ""}`}
          // Clicar num item gira a roleta até ele; o handleScroll escolhe quando parar
          onClick={() => ref.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: "smooth" })}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

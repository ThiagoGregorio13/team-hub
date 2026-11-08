import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowDownAZ, CalendarClock, Check, ChevronDown, History, Sparkles } from "lucide-react";

export type Sort = "recent" | "oldest" | "due" | "name";

const OPTIONS: { value: Sort; label: string; hint: string; icon: typeof Sparkles }[] = [
  { value: "recent", label: "Mais recentes", hint: "As últimas versões enviadas", icon: Sparkles },
  { value: "oldest", label: "Mais antigas", hint: "O que está esperando há mais tempo", icon: History },
  { value: "due", label: "Prazo mais próximo", hint: "Entregas que vencem primeiro", icon: CalendarClock },
  { value: "name", label: "Nome da tarefa", hint: "Em ordem alfabética", icon: ArrowDownAZ },
];

type SortMenuProps = {
  value: Sort;
  onChange: (value: Sort) => void;
};

// Menu de ordenação feito à mão: o <select> nativo não aceita estilo na lista
export function SortMenu({ value, onChange }: SortMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  function openMenu() {
    setActive(OPTIONS.findIndex((option) => option.value === value));
    setOpen(true);
  }

  function choose(next: Sort) {
    setOpen(false);
    buttonRef.current?.focus();
    if (next !== value) onChange(next);
  }

  function handleKey(event: KeyboardEvent) {
    const last = OPTIONS.length - 1;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index === last ? 0 : index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index === 0 ? last : index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(OPTIONS[active].value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const Icon = current.icon;

  return (
    <div className={`sort${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="sort__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Ordenar: ${current.label}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span className="sort__label">Ordenar</span>
        <Icon size={15} aria-hidden="true" />
        {current.label}
        <ChevronDown className="sort__chevron" size={15} aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          className="sort__menu"
          role="listbox"
          tabIndex={-1}
          aria-label="Ordenar provas"
          aria-activedescendant={`${id}-${OPTIONS[active].value}`}
          onKeyDown={handleKey}
        >
          {OPTIONS.map((option, index) => {
            const OptionIcon = option.icon;
            return (
              <li
                key={option.value}
                id={`${id}-${option.value}`}
                role="option"
                aria-selected={option.value === value}
                className={`sort__option${index === active ? " is-active" : ""}`}
                style={{ animationDelay: `${index * 35}ms` }}
                onPointerEnter={() => setActive(index)}
                onClick={() => choose(option.value)}
              >
                <span className="sort__icon" aria-hidden="true">
                  <OptionIcon size={16} />
                </span>
                <span className="sort__text">
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </span>
                {option.value === value && <Check className="sort__check" size={16} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

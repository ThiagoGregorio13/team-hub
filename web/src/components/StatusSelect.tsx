import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, type Status } from "../api";

type StatusSelectProps = {
  value: Status;
  label: string;
  onChange: (status: Status) => void;
};

const MENU_GAP = 6;
const MENU_HEIGHT = 144;

// A lista nativa do <select> não aceita estilo, então este menu é feito à mão.
// Fica num portal no <body> para não ser cortado pelo overflow da tabela.
export function StatusSelect({ value, label, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Sem espaço embaixo, o menu abre para cima
    const fitsBelow = rect.bottom + MENU_GAP + MENU_HEIGHT <= window.innerHeight;
    setPosition({
      top: fitsBelow ? rect.bottom + MENU_GAP : rect.top - MENU_GAP - MENU_HEIGHT,
      left: rect.left,
      width: rect.width,
    });
    setActiveIndex(STATUS_ORDER.indexOf(value));
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function choose(status: Status) {
    closeMenu();
    if (status !== value) onChange(status);
  }

  useEffect(() => {
    if (!open) return;

    menuRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    // Com o menu em posição fixa, rolar a página o deixaria longe do botão
    function handleViewportChange() {
      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [open]);

  function handleButtonKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent) {
    const last = STATUS_ORDER.length - 1;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index === last ? 0 : index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index === 0 ? last : index - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(last);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(STATUS_ORDER[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div className={`status-select status-select--${value}`}>
      <button
        ref={buttonRef}
        type="button"
        className="status-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${STATUS_LABEL[value]}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleButtonKeyDown}
      >
        <span className={`status-ring status-ring--${value}`} aria-hidden="true" />
        <span className="status-select__text">{STATUS_LABEL[value]}</span>
        <ChevronDown className="status-select__chevron" size={14} aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="status-menu"
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${baseId}-${STATUS_ORDER[activeIndex]}`}
            tabIndex={-1}
            style={position}
            onKeyDown={handleMenuKeyDown}
          >
            {STATUS_ORDER.map((status, index) => (
              <li
                key={status}
                id={`${baseId}-${status}`}
                role="option"
                aria-selected={status === value}
                className={`status-menu__option${index === activeIndex ? " is-active" : ""}`}
                onPointerEnter={() => setActiveIndex(index)}
                onClick={() => choose(status)}
              >
                <span className={`status-ring status-ring--${status}`} aria-hidden="true" />
                <span>{STATUS_LABEL[status]}</span>
                {status === value && (
                  <Check className="status-menu__check" size={15} aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

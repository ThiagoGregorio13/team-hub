import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { Check, ChevronDown, Search } from "lucide-react";
import type { TaskRow } from "../../api";
import { prefersReducedMotion } from "../../motion";
import { avatarOf, dueLabel, initialsOf, niceName, plural } from "./artUtils";

type TaskPickerProps = {
  tasks: TaskRow[];
  versions: Record<number, number>;
  value: number | "";
  onChange: (taskId: number) => void;
  labelId: string;
};

// Seletor de tarefa: abre como uma gaveta dentro do diálogo, com busca,
// rolagem suave (inércia) e efeito de roda: as linhas perto das bordas encolhem e esmaecem.
export function TaskPicker({ tasks, versions, value, onChange, labelId }: TaskPickerProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const baseId = useId();

  const selected = tasks.find((task) => task.id === value) ?? null;
  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter(
      (task) => task.title.toLowerCase().includes(query) || task.member_name.toLowerCase().includes(query),
    );
  }, [tasks, term]);

  // Efeito de roda + trilho: recalcula a cada quadro da rolagem
  function paintScroll() {
    const viewport = viewportRef.current;
    const thumb = thumbRef.current;
    if (!viewport) return;
    const center = viewport.scrollTop + viewport.clientHeight / 2;
    const half = viewport.clientHeight / 2;
    viewport.querySelectorAll<HTMLElement>(".picker__option").forEach((option) => {
      const middle = option.offsetTop + option.offsetHeight / 2;
      const distance = Math.min(Math.abs(middle - center) / half, 1.2);
      option.style.setProperty("--depth", distance.toFixed(3));
    });
    if (thumb) {
      const max = viewport.scrollHeight - viewport.clientHeight;
      const ratio = viewport.clientHeight / viewport.scrollHeight;
      thumb.style.height = `${Math.max(ratio * 100, 14)}%`;
      thumb.style.transform = `translateY(${max > 0 ? (viewport.scrollTop / max) * (100 / Math.max(ratio, 0.14) - 100) : 0}%)`;
      thumb.parentElement!.style.opacity = max > 4 ? "1" : "0";
    }
    viewport.dataset.top = String(viewport.scrollTop < 4);
    viewport.dataset.bottom = String(viewport.scrollTop > viewport.scrollHeight - viewport.clientHeight - 4);
  }

  // Abrir: a gaveta cresce, as linhas entram em cascata e a rolagem ganha inércia
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const viewport = viewportRef.current;
    const list = listRef.current;
    if (!open || !panel || !viewport || !list) return;

    const reduce = prefersReducedMotion();
    const ctx = gsap.context(() => {
      if (!reduce) {
        gsap.from(panel, { height: 0, autoAlpha: 0, duration: 0.45, ease: "power3.out", clearProps: "height,opacity,visibility" });
        gsap.from(".picker__option", {
          y: 14,
          autoAlpha: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.035,
          delay: 0.08,
          clearProps: "transform,opacity,visibility",
        });
      }
    }, panel);

    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;
    if (!reduce) {
      lenis = new Lenis({ wrapper: viewport, content: list, duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
      lenis.on("scroll", paintScroll);
      tick = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(tick);
      lenisRef.current = lenis;
    }
    viewport.addEventListener("scroll", paintScroll, { passive: true });
    paintScroll();
    searchRef.current?.focus();

    return () => {
      ctx.revert();
      viewport.removeEventListener("scroll", paintScroll);
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [open]);

  // A lista mudou com a busca: refaz o efeito de roda e volta ao topo
  useEffect(() => {
    if (!open) return;
    lenisRef.current?.scrollTo(0, { immediate: true });
    requestAnimationFrame(paintScroll);
  }, [filtered, open]);

  function openPanel() {
    const index = filtered.findIndex((task) => task.id === value);
    setActive(Math.max(index, 0));
    setTerm("");
    setOpen(true);
  }

  function close(focusTrigger = true) {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }

  function choose(task: TaskRow) {
    onChange(task.id);
    close();
  }

  function reveal(index: number) {
    const option = viewportRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!option) return;
    if (lenisRef.current) lenisRef.current.scrollTo(option, { offset: -60, duration: 0.6 });
    else option.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent) {
    const last = filtered.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        event.key === "ArrowDown" ? (active >= last ? 0 : active + 1) : active <= 0 ? last : active - 1;
      setActive(next);
      reveal(next);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[active]) choose(filtered[active]);
    } else if (event.key === "Escape") {
      // Não deixa o Esc fechar o diálogo inteiro: fecha só a gaveta
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }

  const listboxId = `${baseId}-list`;

  return (
    <div className={`picker${open ? " is-open" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${baseId}-value`}
        onClick={() => (open ? close() : openPanel())}
      >
        {selected ? (
          <>
            <TaskAvatar name={selected.member_name} />
            <span className="picker__text" id={`${baseId}-value`}>
              <strong>{selected.title}</strong>
              <span>
                {niceName(selected.member_name)} · entrega {dueLabel(selected.due_date)}
              </span>
            </span>
          </>
        ) : (
          <span className="picker__placeholder" id={`${baseId}-value`}>
            Escolha a tarefa desta arte
          </span>
        )}
        <ChevronDown className="picker__chevron" size={18} aria-hidden="true" />
      </button>

      {open && (
        <div ref={panelRef} className="picker__panel">
          <label className="picker__search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={filtered[active] ? `${baseId}-${filtered[active].id}` : undefined}
              aria-label="Buscar tarefa"
              placeholder="Buscar por tarefa ou pessoa"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setActive(0);
              }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <kbd>esc</kbd>
          </label>

          <div className="picker__frame">
            <div ref={viewportRef} className="picker__viewport" data-top="true" data-bottom="false">
              <ul ref={listRef} id={listboxId} className="picker__list" role="listbox" aria-labelledby={labelId}>
                {filtered.map((task, index) => {
                  const count = versions[task.id] ?? 0;
                  const isSelected = task.id === value;
                  return (
                    <li
                      key={task.id}
                      id={`${baseId}-${task.id}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      className={`picker__option${index === active ? " is-active" : ""}`}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => choose(task)}
                    >
                      <TaskAvatar name={task.member_name} />
                      <span className="picker__text">
                        <strong>{task.title}</strong>
                        <span>
                          {niceName(task.member_name)} · entrega {dueLabel(task.due_date)}
                        </span>
                      </span>
                      <span className={`picker__count${count ? "" : " is-empty"}`}>
                        {count ? plural(count, "versão", "versões") : "sem arte"}
                      </span>
                      {isSelected && <Check className="picker__check" size={16} aria-hidden="true" />}
                    </li>
                  );
                })}
              </ul>
              {filtered.length === 0 && <p className="picker__empty">Nenhuma tarefa com “{term}”.</p>}
            </div>
            <span className="picker__rail" aria-hidden="true">
              <span ref={thumbRef} className="picker__thumb" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskAvatar({ name }: { name: string }) {
  const color = avatarOf(name);
  return (
    <span className="art-avatar picker__avatar" style={{ background: color.bg, color: color.fg }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

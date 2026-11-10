import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ExternalLink,
  History,
  ImagePlus,
  Layers,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Upload,
} from "lucide-react";
import type { GalleryArt } from "../../api";
import {
  STATE_LABEL,
  accentOf,
  avatarOf,
  dueLabel,
  hostOf,
  initialsOf,
  niceName,
  plural,
  stateOf,
  whenLabel,
  type MuralItem,
} from "./artUtils";

type ArtPreviewProps = {
  art: GalleryArt;
  accent: string;
  label?: string;
};

// Link que não é imagem (Figma, Drive...) vira uma capa com a cor da tarefa
export function ArtPreview({ art, accent, label }: ArtPreviewProps) {
  const [broken, setBroken] = useState(false);

  return (
    <div className="art-preview" style={{ "--accent": accent } as CSSProperties}>
      {broken ? (
        <div className="art-preview__fallback">
          <span className="art-preview__shape art-preview__shape--a" />
          <span className="art-preview__shape art-preview__shape--b" />
          <span className="art-preview__host">
            <ExternalLink size={14} aria-hidden="true" />
            {hostOf(art.art_url)}
          </span>
        </div>
      ) : (
        <img
          src={art.art_url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      )}
      {label && <span className="art-preview__chip">{label}</span>}
    </div>
  );
}

type ArtCardProps = {
  item: MuralItem;
  layout: "grid" | "list";
  onOpen: () => void;
  onSend: () => void;
};

export function ArtCard({ item, layout, onOpen, onSend }: ArtCardProps) {
  const { task, latest, versions, comments } = item;
  const state = stateOf(item);
  const accent = accentOf(task.id);
  const avatar = avatarOf(task.member_name);
  const person = niceName(task.member_name);

  const footer = (
    <footer className="art-card__footer">
      <span
        className="art-avatar"
        style={{ background: avatar.bg, color: avatar.fg }}
        aria-hidden="true"
      >
        {initialsOf(task.member_name)}
      </span>
      <span className="art-card__who">
        <strong>{person}</strong>
        <span>{latest ? whenLabel(latest.created_at) : `Entrega: ${dueLabel(task.due_date)}`}</span>
      </span>
      <span className="art-card__files">
        {versions.length ? plural(versions.length, "versão", "versões") : "Nenhuma versão"}
      </span>
    </footer>
  );

  return (
    <li
      className={`mural-item art-card art-card--${layout} art-card--${state}`}
      data-flip-id={`task-${task.id}`}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className="art-card__head">
        <p className="art-card__eyebrow">
          <span className="art-card__dot" aria-hidden="true" />
          Tarefa #{task.id}
        </p>
        <CardMenu item={item} onOpen={onOpen} onSend={onSend} />
      </div>

      <h3 className="art-card__title">
        {latest ? (
          // O título é o botão: o card inteiro fica clicável pelo ::after, sem botão dentro de botão
          <button type="button" className="art-card__open" onClick={onOpen}>
            {task.title}
          </button>
        ) : (
          task.title
        )}
      </h3>

      {latest ? (
        <ArtPreview
          art={latest}
          accent={accent}
          label={`v${latest.version} · ${latest.status === "approved" ? "Versão final" : "Prévia da arte"}`}
        />
      ) : (
        <div className="art-empty">
          <span className="art-empty__icon" aria-hidden="true">
            <ImagePlus size={20} />
          </span>
          <p className="art-empty__title">Um espaço para sua ideia</p>
          <p className="art-empty__text">Envie a primeira arte desta tarefa</p>
          <button type="button" className="art-empty__button" onClick={onSend}>
            <Plus size={15} aria-hidden="true" />
            Adicionar arte
          </button>
        </div>
      )}

      <div className="art-card__meta">
        <span className={`art-pill art-pill--${state}`}>{STATE_LABEL[state]}</span>
        <span className="art-card__comments" aria-label={plural(comments, "comentário", "comentários")}>
          <MessageCircle size={15} aria-hidden="true" />
          {comments}
        </span>
      </div>

      {footer}
    </li>
  );
}

type CardMenuProps = {
  item: MuralItem;
  onOpen: () => void;
  onSend: () => void;
};

export function CardMenu({ item, onOpen, onSend }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="art-menu" ref={rootRef}>
      <button
        type="button"
        className="art-menu__trigger"
        aria-label={`Ações de ${item.task.title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="art-menu__list" role="menu">
          {item.latest && (
            <button type="button" role="menuitem" onClick={() => run(onOpen)}>
              <History size={15} aria-hidden="true" />
              Ver histórico
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => run(onSend)}>
            {item.latest ? <Layers size={15} aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
            {item.latest ? "Enviar nova versão" : "Enviar arte"}
          </button>
          {item.latest && (
            <a
              role="menuitem"
              href={item.latest.art_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <ExternalLink size={15} aria-hidden="true" />
              Abrir original
            </a>
          )}
        </div>
      )}
    </div>
  );
}

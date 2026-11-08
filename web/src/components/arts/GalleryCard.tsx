import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { GalleryArt } from "../../api";
import { STATE_LABEL, avatarOf, hostOf, initialsOf, niceName, stateOf, whenLabel, type MuralItem } from "./artUtils";
import { usePalette } from "./palette";

type GalleryCardProps = {
  item: MuralItem;
  onOpen: () => void;
};

function Cover({ art, title }: { art: GalleryArt; title: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className="g-card__fallback">{hostOf(art.art_url)}</span>;
  }
  return (
    <img
      src={art.art_url}
      alt={`${title}, versão ${art.version}`}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export function GalleryCard({ item, onOpen }: GalleryCardProps) {
  const { task, latest, comments } = item;
  const palette = usePalette(latest?.art_url);
  if (!latest) return null;

  const state = stateOf(item);
  const avatar = avatarOf(task.member_name);

  return (
    <li className="mural-item g-card" data-flip-id={`task-${task.id}`}>
      <button type="button" className="g-card__hit" onClick={onOpen} aria-label={`Abrir revisão de ${task.title}`} />

      <div className="g-card__media">
        <Cover art={latest} title={task.title} />
        <span className={`g-badge g-badge--${state}`}>{STATE_LABEL[state]}</span>
        <span className="g-card__version">V{latest.version}</span>
      </div>

      <div className="g-card__body">
        <h3 className="g-card__title">{task.title}</h3>
        <div className="g-card__meta">
          <span className="g-avatar" style={{ background: avatar.bg, color: avatar.fg }} aria-hidden="true">
            {initialsOf(task.member_name)}
          </span>
          <span className="g-card__who">{niceName(task.member_name)}</span>
          <span className="g-card__dot" aria-hidden="true" />
          <span className="g-card__when">{whenLabel(latest.created_at)}</span>
        </div>
        <div className="g-card__foot">
          <span className="g-palette" aria-label="Cores da arte">
            {(palette ?? []).map((swatch) => (
              <i key={swatch.hex} style={{ background: swatch.hex }} title={swatch.hex.toUpperCase()} />
            ))}
          </span>
          <span className="g-card__comments" aria-label={`${comments} comentários`}>
            <MessageCircle size={15} aria-hidden="true" />
            {comments}
          </span>
        </div>
      </div>
    </li>
  );
}

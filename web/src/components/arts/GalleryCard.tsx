import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { GalleryArt } from "../../api";
import { hostOf, niceName, whenLabel, type MuralItem } from "./artUtils";
import { usePalette } from "./palette";

type GalleryCardProps = {
  item: MuralItem;
  onOpen: () => void;
};

function Cover({ art, title }: { art: GalleryArt; title: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return <span className="piece__fallback">{hostOf(art.art_url)}</span>;
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

// A obra em destaque numa margem clara (passe-partout), como numa galeria.
// O status não aparece no card: quem diz isso são os filtros (Em revisão, Ajustes, Aprovadas).
export function GalleryCard({ item, onOpen }: GalleryCardProps) {
  const { task, latest, comments } = item;
  const palette = usePalette(latest?.art_url);
  if (!latest) return null;

  return (
    <li className="mural-item piece" data-flip-id={`task-${task.id}`}>
      <button type="button" className="piece__hit" onClick={onOpen} aria-label={`Abrir revisão de ${task.title}`} />

      <div className="piece__mat">
        <div className="piece__canvas">
          <Cover art={latest} title={task.title} />
        </div>
        {/* As cores da arte numa faixa fina, cada uma do tamanho que ocupa na imagem */}
        {palette && palette.length > 0 && (
          <span className="piece__swatches" aria-hidden="true">
            {palette.map((swatch) => (
              <i key={swatch.hex} style={{ background: swatch.hex, flexGrow: Math.max(swatch.share, 0.05) }} />
            ))}
          </span>
        )}
      </div>

      <div className="piece__caption">
        <h3>{task.title}</h3>
        <p>
          {niceName(task.member_name)}, versão {latest.version}
        </p>
        <p className="piece__meta">
          <span>{whenLabel(latest.created_at)}</span>
          <span className="piece__comments" aria-label={`${comments} comentários`}>
            <MessageCircle size={13} aria-hidden="true" />
            {comments}
          </span>
        </p>
      </div>
    </li>
  );
}

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Copy, Layers, LoaderCircle, MessageSquareDiff, X } from "lucide-react";
import { ApiError, decideReview, type GalleryArt } from "../../api";
import { ArtViewer } from "./ArtViewer";
import { STATE_LABEL, accentOf, avatarOf, initialsOf, niceName, whenLabel, type MuralItem } from "./artUtils";
import { inkOn, usePalette } from "./palette";

type ArtDetailProps = {
  item: MuralItem;
  admin: boolean;
  onClose: () => void;
  onDecided: (art: GalleryArt) => void;
  onSendNew: () => void;
};

export function ArtDetail({ item, admin, onClose, onDecided, onSendNew }: ArtDetailProps) {
  const [selectedId, setSelectedId] = useState(item.latest?.id ?? 0);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const selected = item.versions.find((art) => art.id === selectedId) ?? item.latest;
  const palette = usePalette(selected?.art_url);
  if (!selected) return null;

  const accent = accentOf(item.task.id);
  const avatar = avatarOf(item.task.member_name);
  // Só a versão mais nova, ainda pendente, pode ser decidida
  const canDecide = admin && selected.id === item.latest?.id && selected.status === "pending";

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopied(hex);
      setTimeout(() => setCopied((value) => (value === hex ? null : value)), 1400);
    } catch {
      setCopied(null);
    }
  }

  async function decide(status: "approved" | "changes_requested") {
    if (!selected || sending) return;
    const comment = note.trim();
    if (status === "changes_requested" && !comment) {
      setError("Escreva a sugestão para quem fez a arte.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const updated = await decideReview(item.task.id, selected.id, status, comment || undefined);
      onDecided({ ...selected, ...updated });
      setAsking(false);
      setNote("");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "Essa versão já foi revisada por outra pessoa."
          : "Não foi possível registrar a decisão.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="art-dialog art-dialog--detail"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="art-detail-title"
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className="art-detail">
        <div className="art-detail__stage">
          <ArtViewer key={selected.id} art={selected} title={item.task.title} accent={accent} />
        </div>

        <div className="art-detail__side">
          <header className="review-head">
            <div>
              <span className={`g-badge g-badge--${selected.status} g-badge--inline`}>{STATE_LABEL[selected.status]}</span>
              <h2 id="art-detail-title">{item.task.title}</h2>
              <p className="review-head__by">
                <span className="g-avatar" style={{ background: avatar.bg, color: avatar.fg }} aria-hidden="true">
                  {initialsOf(item.task.member_name)}
                </span>
                <span>
                  <strong>{niceName(item.task.member_name)}</strong> enviou {whenLabel(selected.created_at).toLowerCase()}
                </span>
              </p>
            </div>
            <button type="button" className="art-icon-button" onClick={onClose} aria-label="Fechar">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <section className="review-block" aria-labelledby="palette-title">
            <h3 id="palette-title" className="review-block__title">
              Paleta da arte
            </h3>
            {palette ? (
              <ul className="swatches">
                {palette.map((swatch) => (
                  <li key={swatch.hex}>
                    <button
                      type="button"
                      className="swatch"
                      style={{ background: swatch.hex, color: inkOn(swatch.hex) }}
                      onClick={() => copy(swatch.hex)}
                      aria-label={`Copiar cor ${swatch.hex.toUpperCase()}`}
                    >
                      <span className="swatch__icon" aria-hidden="true">
                        {copied === swatch.hex ? <Check size={13} /> : <Copy size={13} />}
                      </span>
                    </button>
                    <span className="swatch__hex">{copied === swatch.hex ? "copiado" : swatch.hex.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="review-block__muted">
                {palette === undefined ? "Lendo as cores da arte…" : "O site da arte não permite ler as cores."}
              </p>
            )}
          </section>

          {selected.comment && (
            <blockquote className="review-note">
              <span className="review-note__label">Comentário da direção</span>
              <p>{selected.comment}</p>
              {selected.reviewed_at && <footer>{whenLabel(selected.reviewed_at)}</footer>}
            </blockquote>
          )}

          {canDecide && (
            <div className="art-detail__decide">
              {asking && (
                <label className="art-field">
                  <span>O que você sugere mudar?</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Ex.: aumentar o logo e testar o fundo em amarelo"
                    rows={3}
                    autoFocus
                  />
                </label>
              )}
              {error && (
                <p className="art-dialog__error" role="alert">
                  {error}
                </p>
              )}
              <div className="art-detail__buttons">
                {asking ? (
                  <>
                    <button type="button" className="art-button art-button--ghost" onClick={() => setAsking(false)}>
                      Voltar
                    </button>
                    <button
                      type="button"
                      className="art-button art-button--warn"
                      disabled={sending || !note.trim()}
                      onClick={() => decide("changes_requested")}
                    >
                      {sending && <LoaderCircle className="art-spin" size={16} aria-hidden="true" />}
                      Enviar sugestão
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="art-button art-button--suggest" onClick={() => setAsking(true)}>
                      <MessageSquareDiff size={16} aria-hidden="true" />
                      Sugerir mudanças
                    </button>
                    <button
                      type="button"
                      className="art-button art-button--success"
                      disabled={sending}
                      onClick={() => decide("approved")}
                    >
                      {sending ? (
                        <LoaderCircle className="art-spin" size={16} aria-hidden="true" />
                      ) : (
                        <Check size={16} aria-hidden="true" />
                      )}
                      Aprovar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <section className="review-block review-block--versions" aria-labelledby="versions-title">
            <div className="review-block__row">
              <h3 id="versions-title" className="review-block__title">
                Versões
              </h3>
              <button type="button" className="art-link" onClick={onSendNew}>
                <Layers size={14} aria-hidden="true" />
                Enviar nova versão
              </button>
            </div>
            <ol className="versions">
              {item.versions.map((art) => (
                <li key={art.id}>
                  <button
                    type="button"
                    className={`version version--${art.status}`}
                    aria-current={art.id === selected.id}
                    onClick={() => {
                      setSelectedId(art.id);
                      setAsking(false);
                      setError(null);
                    }}
                  >
                    <span className="version__thumb">
                      <img src={art.art_url} alt="" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    </span>
                    <span className="version__text">
                      <strong>Versão {art.version}</strong>
                      <span>{whenLabel(art.created_at)}</span>
                    </span>
                    <span className={`g-badge g-badge--${art.status} g-badge--inline g-badge--sm`}>{STATE_LABEL[art.status]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </dialog>
  );
}

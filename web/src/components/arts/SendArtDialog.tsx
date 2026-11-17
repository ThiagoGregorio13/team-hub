import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link2, LoaderCircle, Upload, X } from "lucide-react";
import { ApiError, submitReview, uploadArt, type GalleryArt, type TaskRow } from "../../api";
import { hostOf } from "./artUtils";
import { TaskPicker } from "./TaskPicker";

type SendArtDialogProps = {
  tasks: TaskRow[];
  initialTaskId: number | null;
  initialUrl: string;
  existing: GalleryArt[];
  onClose: () => void;
  onSent: (art: GalleryArt) => void;
};

function looksLikeLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const ACCEPTED_IMAGES = "image/png,image/jpeg,image/webp,image/gif";

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 413) return "A imagem passa de 8 MB. Escolha um arquivo menor.";
  if (err instanceof ApiError && err.status === 415) return "Formato não suportado. Use PNG, JPG, WEBP ou GIF.";
  return "Não foi possível enviar a imagem. Tente de novo.";
}

// Montado só quando aberto: cada abertura começa com o formulário limpo
export function SendArtDialog({
  tasks,
  initialTaskId,
  initialUrl,
  existing,
  onClose,
  onSent,
}: SendArtDialogProps) {
  const [taskId, setTaskId] = useState<number | "">(initialTaskId ?? "");
  const [url, setUrl] = useState(initialUrl);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Nome do arquivo escolhido; volta a null se a pessoa editar o link à mão
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const versionsByTask = useMemo(() => {
    const result: Record<number, number> = {};
    for (const art of existing) result[art.task_id] = (result[art.task_id] ?? 0) + 1;
    return result;
  }, [existing]);

  const trimmed = url.trim();
  const valid = looksLikeLink(trimmed);
  const nextVersion = taskId === "" ? 1 : existing.filter((art) => art.task_id === taskId).length + 1;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpa o input para que escolher o mesmo arquivo de novo também dispare o onChange
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      setUrl(await uploadArt(file));
      setUploadedName(file.name);
    } catch (err) {
      setError(uploadErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (taskId === "" || !valid || sending || uploading) return;

    setSending(true);
    setError(null);
    try {
      const created = await submitReview(taskId, trimmed);
      const task = tasks.find((item) => item.id === taskId);
      onSent({
        ...created,
        task_id: taskId,
        task_title: task?.title ?? `Tarefa #${taskId}`,
        version: nextVersion,
      });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 400
          ? "A API recusou o link. Use um endereço que comece com https://"
          : "Não foi possível enviar. Tente de novo.",
      );
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="art-dialog"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="send-art-title"
    >
      <form className="art-dialog__body" onSubmit={handleSubmit}>
        <header className="art-dialog__head">
          <div>
            <h2 id="send-art-title">Enviar arte</h2>
            <p>A arte entra no mural como uma nova versão, aguardando revisão.</p>
          </div>
          <button type="button" className="art-icon-button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="art-field">
          <span id="send-art-task">Tarefa</span>
          <TaskPicker
            tasks={tasks}
            versions={versionsByTask}
            value={taskId}
            onChange={setTaskId}
            labelId="send-art-task"
          />
        </div>

        <label className="art-field">
          <span>Link da arte</span>
          <div className="art-field__control">
            <Link2 size={16} aria-hidden="true" />
            <input
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setUploadedName(null);
              }}
              placeholder="https://www.figma.com/... ou link da imagem"
              autoComplete="off"
              autoFocus={initialTaskId !== null}
              required
            />
          </div>
          <small>Cole um link (imagem, Figma, Drive ou Behance) ou escolha uma imagem do computador.</small>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGES}
          onChange={handleFile}
          hidden
        />
        <button
          type="button"
          className="art-button art-button--ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
        >
          {uploading ? (
            <LoaderCircle className="art-spin" size={16} aria-hidden="true" />
          ) : (
            <Upload size={16} aria-hidden="true" />
          )}
          {uploading ? "Enviando imagem" : "Escolher do computador"}
        </button>

        {valid && (
          <p className="art-dialog__summary">
            Vai entrar como <strong>v{nextVersion}</strong>, vindo de{" "}
            <strong>{uploadedName ?? hostOf(trimmed)}</strong>.
          </p>
        )}

        {error && (
          <p className="art-dialog__error" role="alert">
            {error}
          </p>
        )}

        <footer className="art-dialog__actions">
          <button type="button" className="art-button art-button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="art-button art-button--primary"
            disabled={taskId === "" || !valid || sending || uploading}
          >
            {sending && <LoaderCircle className="art-spin" size={16} aria-hidden="true" />}
            {sending ? "Enviando" : "Enviar para revisão"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

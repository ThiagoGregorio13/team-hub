import { useState } from "react";
import { Download, ExternalLink, LoaderCircle } from "lucide-react";
import type { GalleryArt } from "../../api";
import { ArtPreview } from "./ArtCard";

type ArtViewerProps = {
  art: GalleryArt;
  title: string;
  accent: string;
};

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

// A arte grande sobre um fundo neutro, com os botões de abrir o original e baixar
export function ArtViewer({ art, title, accent }: ArtViewerProps) {
  const [broken, setBroken] = useState(false);
  const [download, setDownload] = useState<"idle" | "busy" | "opened" | "done">("idle");

  async function handleDownload() {
    if (download === "busy") return;
    setDownload("busy");
    try {
      // Só funciona se o site da arte liberar CORS; senão cai no catch e abre em outra aba
      const response = await fetch(art.art_url, { mode: "cors", referrerPolicy: "no-referrer" });
      const blob = await response.blob();
      if (!response.ok || !blob.type.startsWith("image/")) throw new Error("não é imagem");
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `${slug(title) || "arte"}-v${art.version}.${EXTENSIONS[blob.type] ?? "png"}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 2000);
      setDownload("done");
    } catch {
      window.open(art.art_url, "_blank", "noopener,noreferrer");
      setDownload("opened");
    }
  }

  return (
    <div className="viewer">
      <div className="viewer__mat">
        <div className="viewer__frame">
          {broken ? (
            <ArtPreview art={art} accent={accent} />
          ) : (
            <img
              src={art.art_url}
              alt={`${title}, versão ${art.version}`}
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
          )}
        </div>
      </div>

      <div className="viewer__bar">
        <p className="viewer__hint" aria-live="polite">
          {download === "opened"
            ? "O site da arte não libera download direto: abrimos em outra aba para você salvar."
            : download === "done"
              ? "Download iniciado."
              : broken
                ? "Este link não é uma imagem: abra o original para ver."
                : `Versão ${art.version}`}
        </p>
        <a className="viewer__original" href={art.art_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={15} aria-hidden="true" />
          Original
        </a>
        <button type="button" className="viewer__download" onClick={handleDownload}>
          {download === "busy" ? (
            <LoaderCircle className="art-spin" size={16} aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          Baixar arte
        </button>
      </div>
    </div>
  );
}

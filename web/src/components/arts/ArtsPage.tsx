import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckCircle2, Clock3, ImagePlus, Plus, RotateCcw } from "lucide-react";
import { getGallery, isAdminSession, type GalleryArt, type TaskRow } from "../../api";
import { prefersReducedMotion } from "../../motion";
import { PaintBrush } from "./PaintBrush";
import { GalleryCard } from "./GalleryCard";
import { ArtDetail } from "./ArtDetail";
import { SendArtDialog } from "./SendArtDialog";
import { SortMenu, type Sort } from "./SortMenu";
import { useSmoothScroll } from "./useSmoothScroll";
import { avatarOf, buildMural, dueLabel, initialsOf, niceName, sinceLabel, stateOf, type MuralItem, type MuralState } from "./artUtils";
import "./arts.css";
import "./gallery.css";

gsap.registerPlugin(Flip, ScrollTrigger);

type ArtsPageProps = {
  tasks: TaskRow[];
  query: string;
  // false enquanto a transição de tinta cobre a tela: a abertura espera para ser vista
  ready: boolean;
};

type Filter = "all" | Exclude<MuralState, "empty">;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Em revisão" },
  { value: "changes_requested", label: "Ajustes" },
  { value: "approved", label: "Aprovadas" },
];

function sortMural(items: MuralItem[], sort: Sort): MuralItem[] {
  const time = (item: MuralItem) => (item.latest ? Date.parse(item.latest.created_at) : 0);
  const copy = [...items];
  if (sort === "recent") copy.sort((a, b) => time(b) - time(a));
  if (sort === "oldest") copy.sort((a, b) => time(a) - time(b));
  if (sort === "due") copy.sort((a, b) => a.task.due_date.localeCompare(b.task.due_date));
  if (sort === "name") copy.sort((a, b) => a.task.title.localeCompare(b.task.title, "pt-BR"));
  return copy;
}

export function ArtsPage({ tasks, query, ready }: ArtsPageProps) {
  const [arts, setArts] = useState<GalleryArt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [send, setSend] = useState<{ taskId: number | null; url: string } | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const admin = isAdminSession();
  useSmoothScroll();

  useEffect(() => {
    let ignore = false;
    getGallery()
      .then((rows) => !ignore && setArts(rows))
      .catch(() => !ignore && setError("Não foi possível carregar as artes. A API está rodando?"))
      .finally(() => !ignore && setLoaded(true));
    return () => {
      ignore = true;
    };
  }, []);

  const term = query.trim().toLowerCase();
  const matches = (item: MuralItem) =>
    !term || item.task.title.toLowerCase().includes(term) || item.task.member_name.toLowerCase().includes(term);

  const mural = useMemo(() => buildMural(tasks, arts), [tasks, arts]);
  const withArt = mural.filter((item) => item.latest);
  const withoutArt = mural.filter((item) => !item.latest && matches(item));
  const count = (state: MuralState) => withArt.filter((item) => stateOf(item) === state).length;
  const counts: Record<Filter, number> = {
    all: withArt.length,
    pending: count("pending"),
    changes_requested: count("changes_requested"),
    approved: count("approved"),
  };

  // O que espera revisão, do envio mais antigo para o mais novo
  const queue = withArt
    .filter((item) => stateOf(item) === "pending")
    .sort((a, b) => Date.parse(a.latest!.created_at) - Date.parse(b.latest!.created_at));

  const visible = sortMural(
    withArt.filter((item) => (filter === "all" || stateOf(item) === filter) && matches(item)),
    sort,
  );
  const detail = mural.find((item) => item.task.id === detailId) ?? null;

  const stats = [
    { key: "pending", label: "Em revisão", value: counts.pending, note: admin ? "esperando o seu OK" : "com a direção", icon: Clock3 },
    { key: "changes_requested", label: "Com ajustes", value: counts.changes_requested, note: "voltaram para o estúdio", icon: RotateCcw },
    { key: "approved", label: "Aprovadas", value: counts.approved, note: "prontas para produção", icon: CheckCircle2 },
    { key: "empty", label: "Sem arte", value: mural.length - withArt.length, note: "tarefas sem envio", icon: ImagePlus },
  ];

  function withFlip(change: () => void) {
    if (gridRef.current && !prefersReducedMotion()) {
      flipState.current = Flip.getState(gridRef.current.querySelectorAll(".mural-item"));
    }
    change();
  }

  // Entrada discreta: tudo sobe um pouco e aparece, em sequência
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !loaded || !ready) return;
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const done = "transform,opacity,visibility";
        gsap
          .timeline({ defaults: { ease: "power3.out", duration: 0.8, clearProps: done } })
          .from(".g-hero__copy > *", { y: 18, autoAlpha: 0, stagger: 0.07 })
          .from(".g-hero__art", { autoAlpha: 0, duration: 1.2 }, 0.1)
          .from(".g-stat", { y: 18, autoAlpha: 0, stagger: 0.06 }, 0.25);

        const cards = gsap.utils.toArray<HTMLElement>(".g-card, .g-row");
        gsap.set(cards, { autoAlpha: 0 });
        ScrollTrigger.batch(cards, {
          start: "top 94%",
          once: true,
          onEnter: (batch) =>
            gsap.fromTo(batch, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out", stagger: 0.06, clearProps: done }),
        });
      });
    }, root);
    return () => ctx.revert();
  }, [loaded, ready]);

  useLayoutEffect(() => {
    const state = flipState.current;
    const grid = gridRef.current;
    if (!state || !grid) return;
    flipState.current = null;
    const done = "transform,opacity,visibility,width,height";
    Flip.from(state, {
      targets: grid.querySelectorAll(".mural-item"),
      duration: 0.55,
      ease: "power3.inOut",
      stagger: 0.02,
      onEnter: (elements) =>
        gsap.fromTo(elements, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power3.out", clearProps: done }),
      onComplete: () => {
        gsap.set(grid.querySelectorAll(".mural-item"), { clearProps: done });
        ScrollTrigger.refresh();
      },
    });
  }, [filter, sort]);

  function openSend(taskId: number | null = null) {
    setSend({ taskId, url: "" });
  }

  return (
    <div className="arts g-page" ref={rootRef}>
      <section className="g-hero" aria-labelledby="arts-title">
        <div className="g-hero__copy">
          <span className="g-eyebrow">Ateliê da equipe</span>
          <h1 id="arts-title">Onde as ideias ganham cor</h1>
          <p>Envie as versões, receba o retorno da direção e acompanhe cada arte até a aprovação.</p>
          <div className="g-hero__actions">
            <button type="button" className="g-button g-button--primary" onClick={() => openSend()}>
              <Plus size={17} aria-hidden="true" />
              Enviar arte
            </button>
            {queue.length > 0 && (
              <a className="g-button g-button--quiet" href="#revisao">
                Ver fila de revisão
              </a>
            )}
          </div>
        </div>
        <div className="g-hero__art">
          <PaintBrush />
        </div>
      </section>

      <ul className="g-stats" aria-label="Resumo">
        {stats.map(({ key, label, value, note, icon: Icon }) => (
          <li key={key} className={`g-stat g-stat--${key}`}>
            <span className="g-stat__icon" aria-hidden="true">
              <Icon size={18} />
            </span>
            <span className="g-stat__label">{label}</span>
            <strong className="g-stat__value">{value}</strong>
            <span className="g-stat__note">{note}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="arts-notice arts-notice--error" role="alert">
          {error}
        </p>
      )}

      {queue.length > 0 && (
        <section className="g-panel" id="revisao" aria-labelledby="queue-title">
          <header className="g-panel__head">
            <div>
              <h2 id="queue-title">Aguardando revisão</h2>
              <p>{admin ? "Da mais antiga para a mais nova." : "A direção ainda vai revisar estas artes."}</p>
            </div>
            <span className="g-chip g-chip--pending">{queue.length}</span>
          </header>
          <ul className="g-rows">
            {queue.map((item) => {
              const art = item.latest!;
              const avatar = avatarOf(item.task.member_name);
              return (
                <li key={item.task.id} className="g-row">
                  <span className="g-row__thumb">
                    <img src={art.art_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(event) => (event.currentTarget.style.visibility = "hidden")} />
                  </span>
                  <span className="g-row__main">
                    <strong>{item.task.title}</strong>
                    <span>Versão {art.version}</span>
                  </span>
                  <span className="g-row__person">
                    <span className="g-avatar" style={{ background: avatar.bg, color: avatar.fg }} aria-hidden="true">
                      {initialsOf(item.task.member_name)}
                    </span>
                    {niceName(item.task.member_name)}
                  </span>
                  <span className="g-row__wait">{sinceLabel(art.created_at)}</span>
                  <button type="button" className="g-button g-button--small" onClick={() => setDetailId(item.task.id)}>
                    {admin ? "Revisar" : "Ver"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="g-gallery" aria-labelledby="gallery-title">
        <header className="g-gallery__head">
          <h2 id="gallery-title">Mural</h2>
          <div className="g-toolbar">
            <div className="g-segmented" role="tablist" aria-label="Filtrar">
              {FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => filter !== value && withFlip(() => setFilter(value))}
                >
                  {label}
                  <span>{counts[value]}</span>
                </button>
              ))}
            </div>
            <SortMenu value={sort} onChange={(next) => withFlip(() => setSort(next))} />
          </div>
        </header>

        {!loaded && <div className="arts-loading" role="status" aria-label="Carregando artes" />}
        {loaded && !error && visible.length === 0 && (
          <div className="g-empty">
            <ImagePlus size={22} aria-hidden="true" />
            <p>{withArt.length === 0 ? "Nenhuma arte enviada ainda." : "Nenhuma arte com esse filtro."}</p>
          </div>
        )}

        <ul ref={gridRef} className="g-grid">
          {visible.map((item) => (
            <GalleryCard key={item.task.id} item={item} onOpen={() => setDetailId(item.task.id)} />
          ))}
        </ul>
      </section>

      {withoutArt.length > 0 && (
        <section className="g-panel" aria-labelledby="blank-title">
          <header className="g-panel__head">
            <div>
              <h2 id="blank-title">Sem arte ainda</h2>
              <p>Tarefas que ainda não receberam nenhuma versão.</p>
            </div>
            <span className="g-chip">{withoutArt.length}</span>
          </header>
          <ul className="g-rows">
            {withoutArt.map((item) => {
              const avatar = avatarOf(item.task.member_name);
              return (
                <li key={item.task.id} className="g-row g-row--blank">
                  <span className="g-row__thumb g-row__thumb--empty" aria-hidden="true">
                    <ImagePlus size={16} />
                  </span>
                  <span className="g-row__main">
                    <strong>{item.task.title}</strong>
                    <span>Entrega {dueLabel(item.task.due_date)}</span>
                  </span>
                  <span className="g-row__person">
                    <span className="g-avatar" style={{ background: avatar.bg, color: avatar.fg }} aria-hidden="true">
                      {initialsOf(item.task.member_name)}
                    </span>
                    {niceName(item.task.member_name)}
                  </span>
                  <span className="g-row__wait" />
                  <button type="button" className="g-button g-button--small g-button--outline" onClick={() => openSend(item.task.id)}>
                    Enviar arte
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {send && (
        <SendArtDialog
          tasks={tasks}
          initialTaskId={send.taskId}
          initialUrl={send.url}
          existing={arts}
          onClose={() => setSend(null)}
          onSent={(art) => {
            setSend(null);
            setArts((current) => [art, ...current]);
          }}
        />
      )}

      {detail && detail.latest && (
        <ArtDetail
          key={detail.task.id}
          item={detail}
          admin={admin}
          onClose={() => setDetailId(null)}
          onDecided={(updated) => setArts((current) => current.map((art) => (art.id === updated.id ? updated : art)))}
          onSendNew={() => {
            setDetailId(null);
            openSend(detail.task.id);
          }}
        />
      )}
    </div>
  );
}

// Título que se monta como um mosaico: o mesmo texto é desenhado várias vezes, e cada cópia
// mostra só um "azulejo" (clip-path). Na entrada, os azulejos chegam de lugares e cores
// diferentes e se encaixam. Quem anima é o ArtsPage (classe .mosaic__tile).

const COLS = 9;
const ROWS = 4;

// As cores do mural: cada azulejo nasce com uma delas e termina na cor do texto
const MOSAIC_COLORS = ["#e9a08a", "#edb94e", "#3f8ea5", "#6e8748", "#c0603c", "#e07b45", "#f3c7a8", "#86c4d2"];

type MosaicTitleProps = {
  id: string;
  lines: string[];
};

export function MosaicTitle({ id, lines }: MosaicTitleProps) {
  const text = lines.map((line, i) => (
    <span key={i} className="mosaic__line">
      {line}
    </span>
  ));

  const tiles = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // 0.3% de sobra em cada lado: sem isso aparecem fiapos entre os azulejos
      const top = Math.max(0, (row / ROWS) * 100 - 0.3);
      const bottom = Math.max(0, 100 - ((row + 1) / ROWS) * 100 - 0.3);
      const left = Math.max(0, (col / COLS) * 100 - 0.3);
      const right = Math.max(0, 100 - ((col + 1) / COLS) * 100 - 0.3);
      tiles.push(
        <span
          key={`${row}-${col}`}
          className="mosaic__tile"
          data-color={MOSAIC_COLORS[(row * COLS + col * 3) % MOSAIC_COLORS.length]}
          style={{ clipPath: `inset(${top}% ${right}% ${bottom}% ${left}%)` }}
          aria-hidden="true"
        >
          {text}
        </span>,
      );
    }
  }

  return (
    // aria-label: o leitor de tela lê o título uma vez só, não as 36 cópias
    <h1 id={id} className="mosaic" aria-label={lines.join(" ")}>
      {/* A cópia invisível dá o tamanho ao título; os azulejos ficam por cima dela */}
      <span className="mosaic__base" aria-hidden="true">
        {text}
      </span>
      {tiles}
    </h1>
  );
}

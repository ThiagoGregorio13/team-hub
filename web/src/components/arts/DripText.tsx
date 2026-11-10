// Texto quebrado em letras (.drip__char) para cada uma cair como um pingo de tinta na entrada.
// As palavras ficam inteiras numa caixa que não quebra, para a linha só quebrar nos espaços.

type DripTextProps = {
  text: string;
  className?: string;
};

export function DripText({ text, className }: DripTextProps) {
  const words = text.split(" ");
  return (
    <p className={`drip${className ? ` ${className}` : ""}`} aria-label={text}>
      {words.map((word, w) => (
        // O espaço fica FORA da caixa da palavra: dentro de um inline-block, um espaço no fim some
        <span key={w}>
          <span className="drip__word" aria-hidden="true">
            {[...word].map((char, c) => (
              <span key={c} className="drip__char">
                {char}
              </span>
            ))}
          </span>
          {w < words.length - 1 && " "}
        </span>
      ))}
    </p>
  );
}

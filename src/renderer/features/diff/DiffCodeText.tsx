interface Token { from: number; to: number; className: string }

/** Intersect syntax spans and changed words without injecting HTML. */
export function DiffCodeText({ text, tokens = [], changed = [] }: {
  text: string; tokens?: Token[]; changed?: Array<[number, number]>;
}) {
  const cuts = [...new Set([0, text.length, ...tokens.flatMap((token) => [token.from, token.to]), ...changed.flat()])]
    .filter((offset) => offset >= 0 && offset <= text.length).sort((a, b) => a - b);
  return (
    <code>
      {cuts.slice(0, -1).map((from, i) => {
        const to = cuts[i + 1];
        const className = tokens.find((token) => token.from <= from && token.to >= to)?.className ?? "";
        const marked = changed.some(([start, end]) => start <= from && end >= to);
        return <span key={from} className={`${className}${marked ? " git-word-change" : ""}`}>{text.slice(from, to)}</span>;
      })}
      {!text ? " " : null}
    </code>
  );
}

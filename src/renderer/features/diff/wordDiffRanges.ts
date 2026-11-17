type Range = [number, number];

/** Match unchanged words rather than painting an entire replacement line. Bound quadratic work. */
export function wordDiffRanges(before: string, after: string): { before: Range[]; after: Range[] } {
  const tokenize = (text: string) => [...text.matchAll(/[\p{L}\p{N}_]+|\s+|[^\p{L}\p{N}_\s]/gu)]
    .map((match) => ({ text: match[0], from: match.index, to: match.index + match[0].length }));
  const a = tokenize(before);
  const b = tokenize(after);
  if (a.length * b.length > 40_000) {
    let start = 0;
    let end = 0;
    while (start < Math.min(before.length, after.length) && before[start] === after[start]) start++;
    while (end < Math.min(before.length, after.length) - start && before.at(-1 - end) === after.at(-1 - end)) end++;
    return { before: [[start, before.length - end]], after: [[start, after.length - end]] };
  }
  const width = b.length + 1;
  const lengths = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i * width + j] = a[i].text === b[j].text ? lengths[(i + 1) * width + j + 1] + 1
        : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
  }
  const result: { before: Range[]; after: Range[] } = { before: [], after: [] };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].text === b[j].text) { i++; j++; }
    else if (i < a.length && (j === b.length || lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])) {
      result.before.push([a[i].from, a[i++].to]);
    } else result.after.push([b[j].from, b[j++].to]);
  }
  return result;
}

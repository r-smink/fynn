/** Split text into ~chunkSize chunks with overlap, on paragraph/sentence boundaries. */
export function chunkText(text: string, chunkSize = 3200, overlap = 300): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      // prefer break at paragraph, then newline, then sentence end
      const window = clean.slice(start, end);
      const para = window.lastIndexOf("\n\n");
      const nl = window.lastIndexOf("\n");
      const sent = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? ")
      );
      const cut = Math.max(
        para > chunkSize * 0.4 ? para : -1,
        nl > chunkSize * 0.4 ? nl : -1,
        sent > chunkSize * 0.4 ? sent + 1 : -1
      );
      if (cut > 0) end = start + cut;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    start = end - overlap < start + 1 ? end : end - overlap;
  }
  return chunks;
}

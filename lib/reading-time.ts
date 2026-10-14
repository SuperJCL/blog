// About 400 Chinese characters or 230 English words a minute. Code blocks and JSX tags don't count.
export function readingMinutes(markdown: string): number {
  const text = markdown.replace(/^(`{3,}|~{3,})[\s\S]*?^\1/gm, " ").replace(/<[^>]+>/g, " ");
  const chinese = (text.match(/[㐀-鿿]/g) ?? []).length;
  const words = (text.replace(/[㐀-鿿]/g, " ").match(/[A-Za-z0-9][\w'’-]*/g) ?? []).length;
  return Math.max(1, Math.round(chinese / 400 + words / 230));
}

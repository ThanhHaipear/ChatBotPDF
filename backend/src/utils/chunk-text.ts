export function chunkText(
  text: string,
  chunkSize = 700,
  overlap = 100,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  if (words.length === 0) {
    return chunks;
  }

  const step = Math.max(1, chunkSize - overlap);

  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + chunkSize).join(' ');

    if (chunk.trim().length > 100) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

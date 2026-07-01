export interface Heading {
  level: number;
  text: string;
  line: number;
}

export function parseHeadings(markdown: string): Heading[] {
  return markdown
    .split(/\r?\n/)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^#{1,6}\s+/.test(line))
    .map(({ line, index }) => {
      const marker = line.match(/^#{1,6}/)?.[0] ?? "#";
      return {
        level: marker.length,
        text: line.slice(marker.length).trim(),
        line: index + 1
      };
    });
}

import { CodeBlock, Pre } from '@fumadocs/base-ui/components/codeblock';
import { MermaidZoom } from './mermaid-zoom.js';

export async function Mermaid({ chart }: { chart: string }) {
  const { renderMermaidSVG } = await import('beautiful-mermaid');
  try {
    const svg = renderMermaidSVG(chart, {
      bg: 'var(--color-fd-background)',
      fg: 'var(--color-fd-foreground)',
      interactive: true,
      transparent: true,
    });
    return <MermaidZoom svg={svg} />;
  } catch {
    return (
      <CodeBlock title="Mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}

import { remark } from 'remark';
import { describe, expect, it } from 'vitest';
import { remarkGithubAlert } from './remark-github-alert.js';

const processor = remark().use(remarkGithubAlert);

async function transform(md: string) {
  const tree = await processor.run(processor.parse(md));
  // mdxJsxFlowElement is not part of base mdast types
  return tree.children as any[];
}

describe('remarkGithubAlert', () => {
  it.each([
    ['NOTE', 'info'],
    ['TIP', 'success'],
    ['IMPORTANT', 'info'],
    ['WARNING', 'warn'],
    ['CAUTION', 'error'],
  ])('converts [!%s] to a Callout of type %s', async (keyword, type) => {
    const [node] = await transform(`> [!${keyword}]\n> Hello`);
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.name).toBe('Callout');
    expect(node.attributes).toEqual([
      { type: 'mdxJsxAttribute', name: 'type', value: type },
      { type: 'mdxJsxAttribute', name: 'title', value: keyword },
    ]);
  });

  it('keeps the blockquote content as Callout children', async () => {
    const [node] = await transform('> [!NOTE]\n> line1\n>\n> line2');
    expect(node.children).toHaveLength(2);
    expect(node.children[0].type).toBe('paragraph');
    expect(node.children[0].children[0].value).toBe('line1');
    expect(node.children[1].children[0].value).toBe('line2');
  });

  it('keeps text following the marker on the same line', async () => {
    const [node] = await transform('> [!NOTE] Hello there');
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.children[0].children[0].value).toBe('Hello there');
  });

  it('produces an empty Callout for a marker-only blockquote', async () => {
    const [node] = await transform('> [!TIP]');
    expect(node.type).toBe('mdxJsxFlowElement');
    expect(node.children).toEqual([]);
  });

  it('uppercases lowercase markers', async () => {
    const [node] = await transform('> [!note] x');
    expect(node.attributes).toContainEqual({
      type: 'mdxJsxAttribute',
      name: 'title',
      value: 'NOTE',
    });
  });

  it('leaves unknown keywords untouched', async () => {
    const [node] = await transform('> [!FOOBAR] x');
    expect(node.type).toBe('blockquote');
  });

  it('leaves plain blockquotes untouched', async () => {
    const [node] = await transform('> just a quote');
    expect(node.type).toBe('blockquote');
  });

  it('ignores markers not at the start of the blockquote text', async () => {
    const [node] = await transform('> **bold** [!NOTE] x');
    expect(node.type).toBe('blockquote');
  });
});

import type { Blockquote, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

import type { CalloutType } from '@fumadocs/base-ui/components/callout';

// Map GitHub alert keywords to fumadocs Callout types.
const ALERT_TYPE_MAP: Record<string, CalloutType> = {
  NOTE: 'info',
  TIP: 'success',
  IMPORTANT: 'info',
  WARNING: 'warn',
  CAUTION: 'error',
};

const ALERT_MARKER = /^\[!(\w+)\]\s*/;

/**
 * Remark plugin that converts GitHub-style alerts
 * (`> [!NOTE]`, `> [!WARNING]`, ...) into fumadocs `<Callout>` elements.
 */
export const remarkGithubAlert: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
    if (!parent || index === undefined) return;

    const firstParagraph = node.children[0];
    if (firstParagraph?.type !== 'paragraph') return;

    const lead = firstParagraph.children[0];
    if (lead?.type !== 'text') return;

    const match = lead.value.match(ALERT_MARKER);
    if (!match) return;

    const keyword = match[1]!.toUpperCase();
    const type = ALERT_TYPE_MAP[keyword];
    if (!type) return;

    // Strip the `[!TYPE]` marker (and trailing newline) from the lead text,
    // dropping the lead node if nothing remains.
    lead.value = lead.value.slice(match[0].length).replace(/^\n/, '');
    if (lead.value === '') firstParagraph.children.shift();
    if (firstParagraph.children.length === 0) node.children.shift();

    // Emit an mdxJsxFlowElement so the existing `Callout` component handles it,
    // consistent with how fumadocs' own admonition plugin works.
    const callout = {
      type: 'mdxJsxFlowElement',
      name: 'Callout',
      attributes: [
        { type: 'mdxJsxAttribute', name: 'type', value: type },
        { type: 'mdxJsxAttribute', name: 'title', value: keyword },
      ],
      children: node.children,
    } as unknown as RootContent;

    parent.children[index] = callout;
  });
};

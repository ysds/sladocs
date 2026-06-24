import type { ReactNode } from 'react';
import type { FrontmatterField } from '@/config/schema.js';

function formatScalar(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function badge(content: ReactNode, key?: number): ReactNode {
  return (
    <span
      key={key}
      className="inline-block rounded-md bg-fd-accent px-1.5 py-0.5 text-xs text-fd-accent-foreground"
    >
      {content}
    </span>
  );
}

function renderValue(value: unknown, style: FrontmatterField['style']): ReactNode {
  if (value == null || value === '') return null;

  if (Array.isArray(value)) {
    const items = value.filter((v) => v != null && v !== '');
    if (items.length === 0) return null;
    if (style === 'badge') {
      return <span className="flex flex-wrap gap-1">{items.map((v, i) => badge(formatScalar(v), i))}</span>;
    }
    return items.map(formatScalar).join(', ');
  }

  if (style === 'badge') {
    return badge(formatScalar(value));
  }

  return formatScalar(value);
}

export function FrontmatterTable({ fields, data }: { fields: FrontmatterField[]; data: Record<string, unknown> }) {
  const rows = fields
    .map((field) => ({ field, rendered: renderValue(data[field.key], field.style) }))
    .filter((row) => row.rendered != null);

  if (rows.length === 0) return null;

  return (
    <div className="not-prose mb-6 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(({ field, rendered }) => (
            <tr key={field.key} className="border-b border-fd-border last:border-b-0">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium text-fd-muted-foreground">
                {field.label ?? field.key}
              </td>
              <td className="px-3 py-1.5">{rendered}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

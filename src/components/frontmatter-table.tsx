import type { ReactNode } from 'react';
import type { FrontmatterField } from '@/config/schema.js';

function renderValue(value: unknown, badge?: boolean): ReactNode {
  if (value == null || value === '') return null;

  if (Array.isArray(value)) {
    const items = value.filter((v) => v != null && v !== '');
    if (items.length === 0) return null;
    if (badge) {
      return (
        <span className="flex flex-wrap gap-1">
          {items.map((v, i) => (
            <span
              key={i}
              className="inline-block rounded-md bg-fd-accent px-1.5 py-0.5 text-xs text-fd-accent-foreground"
            >
              {String(v)}
            </span>
          ))}
        </span>
      );
    }
    return items.join(', ');
  }

  if (badge) {
    return (
      <span className="inline-block rounded-md bg-fd-accent px-1.5 py-0.5 text-xs text-fd-accent-foreground">
        {String(value)}
      </span>
    );
  }

  return String(value);
}

export function FrontmatterTable({ fields, data }: { fields: FrontmatterField[]; data: Record<string, unknown> }) {
  const rows = fields
    .map((field) => ({ field, rendered: renderValue(data[field.key], field.badge) }))
    .filter((row) => row.rendered != null);

  if (rows.length === 0) return null;

  return (
    <div className="not-prose mb-6 overflow-x-auto rounded-lg border border-fd-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(({ field, rendered }) => (
            <tr key={field.key} className="border-b border-fd-border last:border-b-0">
              <td className="whitespace-nowrap px-3 py-1.5 font-medium text-fd-muted-foreground">
                {field.label}
              </td>
              <td className="px-3 py-1.5">{rendered}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

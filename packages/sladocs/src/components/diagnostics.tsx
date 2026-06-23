import { Callout } from '@fumadocs/base-ui/components/callout';
import type { SourceDiagnostic } from '@/lib/source/storage.js';

// Site-wide banner listing files that failed to load or validate. Rendered
// inside the layout so it shows on every page, including 404 pages.
export function Diagnostics({ diagnostics }: { diagnostics: SourceDiagnostic[] }) {
  if (diagnostics.length === 0) return null;
  return (
    <div className="px-4 pt-4">
      <Callout type="error" title={`${diagnostics.length} file(s) failed to load`}>
        <ul className="my-0 list-none ps-0">
          {diagnostics.map((d) => (
            <li key={`${d.absolutePath}\n${d.message}`}>
              <code>{d.file}</code>
              <div className="text-sm whitespace-pre-wrap">{d.message}</div>
            </li>
          ))}
        </ul>
      </Callout>
    </div>
  );
}

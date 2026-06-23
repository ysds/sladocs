'use client';
import { useZoomTrigger } from './use-zoom-trigger.js';
import { ZoomModal } from './zoom-modal.js';

export function MermaidZoom({ svg }: { svg: string }) {
  const { open, triggerProps, close } = useZoomTrigger<HTMLDivElement>();

  return (
    <>
      <div
        {...triggerProps}
        aria-label="Zoom diagram"
        dangerouslySetInnerHTML={{ __html: svg }}
        className="cursor-zoom-in *:max-w-full"
      />
      {open && (
        <ZoomModal label="Diagram" onClose={close}>
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        </ZoomModal>
      )}
    </>
  );
}

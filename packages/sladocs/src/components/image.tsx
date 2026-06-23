'use client';
import { type ComponentProps } from 'react';
import { useZoomTrigger } from './use-zoom-trigger.js';
import { ZoomModal } from './zoom-modal.js';

export function Image({ className, ...props }: ComponentProps<'img'>) {
  const { open, triggerProps, close } = useZoomTrigger<HTMLImageElement>();

  return (
    <>
      <img
        {...props}
        {...triggerProps}
        aria-label={props.alt ? `Zoom image: ${props.alt}` : 'Zoom image'}
        className={['cursor-zoom-in rounded-xl border', className].filter(Boolean).join(' ')}
      />
      {open && props.src && (
        <ZoomModal label={props.alt} onClose={close}>
          <img src={String(props.src)} alt={props.alt} draggable={false} />
        </ZoomModal>
      )}
    </>
  );
}

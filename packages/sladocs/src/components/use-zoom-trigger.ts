'use client';
import { useRef, useState, type KeyboardEvent } from 'react';

// Shared open/close + a11y wiring for a clickable element that opens ZoomModal.
// The trigger acts as a button (Enter/Space), and focus returns to it on close.
export function useZoomTrigger<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);

  const triggerProps = {
    ref: triggerRef,
    role: 'button',
    tabIndex: 0,
    onClick: () => setOpen(true),
    onKeyDown: (e: KeyboardEvent<T>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
    },
  } as const;

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return { open, triggerProps, close };
}

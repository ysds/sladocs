'use client';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MIN_SCALE = 1;
const MAX_SCALE = 8;
// Extra pan room past the edge so it's clear there's nothing more to see.
const PAN_MARGIN = 16;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

type DragState = { x: number; y: number; tx: number; ty: number; moved: boolean };
type PinchState = { dist: number; scale: number };

function touchDist(a: React.Touch, b: React.Touch): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function ZoomModal({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<DragState | null>(null);
  const pinch = useRef<PinchState | null>(null);

  // Max |translate| (in screen pixels) that keeps the content covering the
  // viewport. Returns 0 on an axis that doesn't overflow, so fitted content
  // stays centered. offsetWidth/Height is the unscaled box and scale() grows it
  // about its center, so the limit is half the scaled overflow (no /scale), plus
  // a margin on overflowing axes only.
  function panLimit(s: number): { x: number; y: number } {
    const el = contentRef.current;
    if (!el) return { x: 0, y: 0 };
    const overflowX = Math.max(0, (el.offsetWidth * s - window.innerWidth) / 2);
    const overflowY = Math.max(0, (el.offsetHeight * s - window.innerHeight) / 2);
    return {
      x: overflowX > 0 ? overflowX + PAN_MARGIN : 0,
      y: overflowY > 0 ? overflowY + PAN_MARGIN : 0,
    };
  }

  useEffect(() => setMounted(true), []);

  // Re-clamp pan whenever the scale changes (e.g. zooming out must not leave
  // the content off-center / out of view).
  useEffect(() => {
    const { x, y } = panLimit(scale);
    setTx((t) => clamp(t, -x, x));
    setTy((t) => clamp(t, -y, y));
  }, [scale]);

  // Scroll lock, Escape to close, focus the close button on open.
  useEffect(() => {
    // Compensate for the removed scrollbar so the page behind doesn't shift.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Focus the close button once the portal is in the DOM.
  useEffect(() => {
    if (mounted) closeRef.current?.focus();
  }, [mounted]);

  // Native non-passive wheel listener: React's onWheel is passive, so
  // preventDefault would be ignored and the page would scroll behind the modal.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => clamp(s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), MIN_SCALE, MAX_SCALE));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [mounted]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    if (pinch.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    const d = dragging.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    const { x, y } = panLimit(scale);
    setTx(clamp(d.tx + dx, -x, x));
    setTy(clamp(d.ty + dy, -y, y));
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragging.current = null;
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>): void {
    const a = e.touches[0];
    const b = e.touches[1];
    if (a && b) {
      dragging.current = null;
      pinch.current = { dist: touchDist(a, b), scale };
    }
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>): void {
    const a = e.touches[0];
    const b = e.touches[1];
    if (pinch.current && a && b) {
      const ratio = touchDist(a, b) / pinch.current.dist;
      setScale(clamp(pinch.current.scale * ratio, MIN_SCALE, MAX_SCALE));
    }
  }
  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>): void {
    if (e.touches.length < 2) pinch.current = null;
  }

  // Close on backdrop click, but not when a drag ends over the backdrop.
  function onOverlayClick(e: React.MouseEvent<HTMLDivElement>): void {
    if (e.target === e.currentTarget) onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={label || 'Zoomed content'}
      onClick={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/80 p-4"
    >
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          touchAction: 'none',
          cursor: scale > 1 ? 'grab' : 'auto',
        }}
        // The fit-to-viewport cap lives on the media itself (img/svg, however
        // deeply wrapped) so it never overflows. The wrapper then shrinks to the
        // fitted media, keeping offsetWidth/Height (used by panLimit) accurate.
        className="block w-fit max-w-[calc(100dvw-2rem)] select-none [&_img]:max-h-[calc(100dvh-2rem)] [&_img]:max-w-[calc(100dvw-2rem)] [&_img]:object-contain [&_svg]:max-h-[calc(100dvh-2rem)] [&_svg]:max-w-[calc(100dvw-2rem)] [&_svg]:bg-fd-background"
      >
        {children}
      </div>
      {/* After content in the DOM so it paints on top regardless of the
          transformed wrapper's stacking context. */}
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-50 rounded-full bg-neutral-700/50 p-2 text-white transition-colors hover:bg-neutral-700/60"
      >
        <X className="size-6" />
      </button>
    </div>,
    document.body,
  );
}

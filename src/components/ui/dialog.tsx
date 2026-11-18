'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import {useRef, type ReactNode} from 'react';
import {cn} from '../../lib/utils';

export function Dialog({children, title, onClose, className}: {children: ReactNode; title: string; onClose: () => void; className?: string}) {
  const trigger = useRef<HTMLElement | null>(null);
  return <DialogPrimitive.Root open onOpenChange={open => {if (!open) onClose();}}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-40 bg-overlay backdrop-blur-sm print:hidden"/>
      <DialogPrimitive.Content
        data-slot="dialog-content"
        aria-describedby={undefined}
        className={cn('fixed z-40 overflow-auto border border-border bg-card text-foreground shadow-dialog', className)}
        onOpenAutoFocus={() => {
          trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (trigger.current?.isConnected) trigger.current.focus();
        }}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}

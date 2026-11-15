"use client";
/** Feuille plein écran en verre (iPhone) : en-tête avec titre et bouton Fermer, contenu défilant. */
import { X } from "lucide-react";

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-sheet flex-col bg-[#05060a]/90 backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pt-safe flex items-center gap-2 border-b border-line px-3 py-2">
        <p className="h-display flex-1 text-lg">{title}</p>
        <button className="btn-ghost min-h-11 min-w-11 px-0" onClick={onClose} aria-label="Fermer">
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
      {footer && <div className="pb-safe border-t border-line p-3">{footer}</div>}
    </div>
  );
}

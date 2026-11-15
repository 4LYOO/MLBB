"use client";
/**
 * Annotations d'une partie : étiquettes rapides (un tap) + note libre.
 * Les étiquettes se règlent dans data/config.json → annotations.
 */
import clsx from "clsx";
import { TAGS } from "@/lib/engine/rush";

const TONE: Record<string, string> = {
  bon: "border-good/50 bg-good/20 text-good",
  mauvais: "border-bad/50 bg-bad/20 text-bad",
  neutre: "border-white/30 bg-white/15 text-ink",
};

export function TagPicker({ tags, onToggle, note, onNote }: { tags: string[]; onToggle: (id: string) => void; note?: string; onNote?: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onToggle(t.id)}
              aria-pressed={on}
              className={clsx("min-h-9 rounded-full border px-3 text-[13px] font-medium transition-colors duration-150", on ? TONE[t.ton] ?? TONE.neutre : "border-white/10 bg-white/[0.04] text-ink-2")}
            >
              {t.texte}
            </button>
          );
        })}
      </div>
      {onNote && (
        <textarea
          className="input min-h-16 resize-none py-2"
          placeholder="Note libre (ex. « on a perdu mais j'ai largement gagné ma lane »)"
          value={note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          maxLength={280}
        />
      )}
    </div>
  );
}

/** Pastilles d'étiquettes en lecture seule (liste des parties). */
export function TagChips({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((id) => {
        const t = TAGS.find((x) => x.id === id);
        return (
          <span key={id} className={clsx("rounded-full border px-2 py-px text-[11px]", TONE[t?.ton ?? "neutre"] ?? TONE.neutre)}>
            {t?.texte ?? id}
          </span>
        );
      })}
    </span>
  );
}

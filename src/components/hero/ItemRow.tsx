import clsx from "clsx";
import { RemoteImage } from "@/components/ui/Portrait";
import { ITEM_CATEGORY_FR, ITEM_TAGS, type ItemCategory, type ItemTag } from "@/data/reference/items";
import type { Item } from "@/lib/data/model";
import { UNAVAILABLE } from "@/lib/domain";

const CAT_COLOR: Record<string, string> = { attack: "#d95926", magic: "#9085e9", defense: "#3987e5", movement: "#199e70", jungle: "#c98500", roam: "#c98500" };

export function ItemIcon({ item, size = 36 }: { item: Pick<Item, "name" | "category" | "imageUrl">; size?: number }) {
  const c = CAT_COLOR[item.category] ?? "#64748b";
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl text-[10px] font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${c}, #1f2545)`, boxShadow: `inset 0 0 0 1px ${c}88` }}
      aria-hidden
    >
      {item.name
        .split(/[\s']+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
      {item.imageUrl && <RemoteImage src={item.imageUrl} className="absolute inset-0 h-full w-full object-cover" />}
    </span>
  );
}

export function ItemRow({ item, order, highlight, reason }: { item: Item | undefined; order?: number; highlight?: boolean; reason?: string }) {
  if (!item) return <li className="text-sm text-muted">Objet inconnu</li>;
  return (
    <li className={clsx("flex items-start gap-3 rounded-2xl border p-2", highlight ? "border-gold/60 bg-gold/5" : "border-line bg-surface-2/50")}>
      {order != null && <span className="h-display mt-2 w-4 text-center text-muted">{order}</span>}
      <ItemIcon item={item} />
      <div className="min-w-0 flex-1 text-xs">
        <p className="text-sm font-medium text-ink">
          {item.name} <span className="ml-1 text-[11px] text-muted">{ITEM_CATEGORY_FR[item.category as ItemCategory] ?? item.category}</span>
          {item.nameEn && item.nameEn !== item.name && <span className="block text-[11px] font-normal text-muted">{item.nameEn}</span>}
        </p>
        <p className="text-ink-2">{reason ?? item.use ?? ""}</p>
        <p className="mt-0.5 text-muted">
          Prix : {item.price != null ? `${item.price} or` : UNAVAILABLE} · Stats :{" "}
          {item.stats ? Object.entries(item.stats).map(([k, v]) => `${k} +${v}`).join(", ") : UNAVAILABLE}
          {item.passive && <> · Passif : {item.passive}</>}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.tags.slice(0, 5).map((t) => (
            <span key={t} className="chip py-0 text-[10px]">
              {ITEM_TAGS[t as ItemTag] ?? t}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

import { ok } from "../_util";
import { getHeroes, getItems } from "@/lib/server/repo";
import { EDITORIAL_EMBLEMS, EDITORIAL_SPELLS, EDITORIAL_TALENTS } from "@/data/reference/items";
import { GUIDES } from "@/data/reference/guides";
import { NAV } from "@/components/layout/nav";
import { LANE_FR, ROLE_FR } from "@/lib/domain";

export const dynamic = "force-dynamic";

export function GET() {
  const entries = [
    ...NAV.map((n) => ({ kind: "Page", label: n.label, sub: "", href: n.href, keywords: n.short })),
    ...getHeroes().map((h) => ({
      kind: "Héros",
      label: h.name,
      sub: [h.roles.map((r) => ROLE_FR[r]).join(" / "), h.lanes.map((l) => LANE_FR[l]).join(", ")].filter(Boolean).join(" · "),
      href: `/heros/${h.slug}`,
      keywords: `${h.slug} ${h.roles.join(" ")} ${h.lanes.join(" ")}`,
    })),
    ...getHeroes().map((h) => ({ kind: "Build", label: `Build ${h.name}`, sub: "Équipements & emblèmes", href: `/builds?hero=${h.slug}`, keywords: h.slug })),
    ...getItems().map((i) => ({ kind: "Objet", label: i.name, sub: i.use ?? "", href: `/builds?tab=items&item=${i.slug}`, keywords: `${i.slug} ${i.tags.join(" ")}` })),
    ...EDITORIAL_SPELLS.map((s) => ({ kind: "Sort", label: s.name, sub: s.nameFr, href: `/builds?tab=spells`, keywords: `${s.nameFr} ${s.use}` })),
    ...EDITORIAL_EMBLEMS.map((e) => ({ kind: "Emblème", label: `Emblème ${e.nameFr}`, sub: e.name, href: `/builds?tab=emblems`, keywords: e.name })),
    ...EDITORIAL_TALENTS.map((t) => ({ kind: "Talent", label: t.name, sub: `Palier ${t.tier}`, href: `/builds?tab=emblems`, keywords: t.use })),
    ...GUIDES.map((g) => ({ kind: "Guide", label: g.title, sub: g.category, href: `/guides/${g.slug}`, keywords: `${g.summary} ${g.roles.join(" ")}` })),
  ];
  return ok(entries);
}

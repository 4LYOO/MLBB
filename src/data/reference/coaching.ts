/** Coaching par rôle — lu depuis data/coaching.json (à modifier à la main, voir MISE-A-JOUR.md). */
import data from "@data/coaching.json";
import heroesData from "@data/heroes.json";
import type { Lane } from "@/lib/domain";

/** Un point de conseil : texte simple, ou objet avec la pastille « à vérifier ». */
export type Point = string | { texte: string; aVerifier?: boolean };
export const texteDe = (p: Point) => (typeof p === "string" ? p : p.texte);
export const aVerifierDe = (p: Point) => typeof p !== "string" && !!p.aVerifier;

export interface CoachingRole {
  id: Lane;
  nom: string;
  couleur: string;
  resume: string;
  responsabilites: string[];
  sections: {
    early: Point[];
    mid: Point[];
    late: Point[];
    vision: Point[];
    erreurs: { erreur: string; correction: string }[];
    checklist: string[];
    rush: Point[];
    duo: Point[];
    meta: string;
    builds: {
      aVerifier?: boolean;
      emblemes: { nom: string; talents: string; pourquoi: string }[];
      base: string[];
      situationnels: { contre: string; items: string[]; quand: string }[];
    };
  };
}

export const COACHING_META = data.meta;
export const COACHING_ROLES = data.roles as CoachingRole[];

/** Héros méta par lane (data/heroes.json → metaParRole). */
export const META_PAR_ROLE = heroesData.metaParRole as unknown as { source: string; aVerifier: boolean } & Record<Lane, string[]>;

/** Aide-mémoire en partie (data/coaching.json → aideMemoire). */
export interface ObjectifAide {
  nom: string;
  timing: string;
  respawn: string;
  conseil: string;
  aVerifier?: boolean;
}
export const AIDE_MEMOIRE = data.aideMemoire as { objectifs: ObjectifAide[]; rappels: string[] };

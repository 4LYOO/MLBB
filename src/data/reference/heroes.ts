/**
 * RÉFÉRENTIEL ÉDITORIAL DES HÉROS — source « editorial ».
 *
 * Ce fichier ne contient AUCUNE statistique (win rate, pick rate, ban rate…).
 * Il décrit uniquement des caractéristiques qualitatives de gameplay (rôles,
 * lanes habituelles, type de dégâts, profil 0–3) utilisées par le moteur de draft
 * lorsqu'aucune donnée de matchup réelle n'a été importée.
 *
 * Fiabilité : moyenne. Ces valeurs sont des estimations d'expert à valider,
 * et peuvent devenir fausses après un remaniement de héros. Toute donnée importée
 * d'une source (rôles, lanes, portraits…) a priorité sur ce fichier.
 *
 * Format d'une ligne :
 * slug | Nom | rôles | lanes | dégâts P/M/H | portée M/R |
 *   cc mobilité durabilité engage protection burst sustain | early mid late |
 *   difficulté 1-3 | étiquettes | confiance h/m/l
 *
 * Une ligne avec des rôles vides marque un héros connu dont le profil n'est pas
 * renseigné (« incomplet ») : il reste sélectionnable mais n'est jamais recommandé.
 */

const ROWS = `
aamon|Aamon|Assassin|jungle|M|M|0 2 1 1 0 3 0|2 3 3|2|invis,burst|h
akai|Akai|Tank,Fighter|roam,jungle|P|M|3 2 3 3 2 0 1|2 3 2|1|aoecc,engage|h
aldous|Aldous|Fighter|exp,jungle|P|M|2 2 2 2 0 3 0|1 2 3|1|global,burst,latecarry|h
alice|Alice|Mage,Tank|exp,mid,roam|M|M|2 2 3 2 0 2 3|2 3 3|2|selfheal,antitank|h
alpha|Alpha|Fighter|jungle,exp|P|M|2 2 2 2 0 2 2|3 3 2|1|engage,dash|h
alucard|Alucard|Fighter,Assassin|jungle,exp|P|M|0 2 2 1 0 2 3|2 3 2|1|selfheal,dash|h
angela|Angela|Support|roam|M|R|2 1 1 0 3 0 2|2 3 3|2|heal,shield,protect|h
argus|Argus|Fighter|jungle,exp|P|M|0 2 1 1 0 2 2|2 3 3|1|immune,dash|h
arlott|Arlott|Fighter,Assassin|exp,roam|P|M|3 3 2 2 0 2 2|3 3 2|3|dash,lockdown,selfheal|h
atlas|Atlas|Tank|roam|M|M|3 2 3 3 2 0 0|2 3 2|2|aoecc,engage|h
aulus|Aulus|Fighter|exp,jungle|P|M|1 1 2 1 0 2 2|1 2 3|1|latecarry|h
aurora|Aurora|Mage|mid|M|R|3 0 1 2 0 3 0|2 3 2|1|aoecc,lockdown,burst|h
badang|Badang|Fighter|exp,jungle|P|M|3 2 2 2 0 3 0|3 3 2|2|lockdown,burst|h
balmond|Balmond|Fighter,Tank|jungle,exp|P|M|1 1 3 2 0 2 2|3 2 1|1|selfheal,earlygame|h
bane|Bane|Fighter,Mage|exp,jungle|H|M|1 1 2 1 0 2 1|2 3 2|1|poke,splitpush|h
barats|Barats|Tank,Fighter|jungle,exp|P|M|2 1 3 2 1 1 2|2 3 3|2|selfheal|h
baxia|Baxia|Tank|roam,jungle|M|M|2 3 3 2 1 0 2|3 3 2|2|antiheal,engage|h
beatrix|Beatrix|Marksman|gold|P|R|1 1 1 0 0 3 0|2 3 3|3|burst|h
belerick|Belerick|Tank|roam|M|M|3 1 3 2 2 0 2|2 3 2|1|taunt,antidive|h
benedetta|Benedetta|Assassin,Fighter|exp,jungle|P|M|1 3 2 1 0 2 1|2 3 2|3|immune,dash,splitpush|h
brody|Brody|Marksman|gold|P|R|1 1 1 0 0 3 0|3 3 2|1|burst|h
bruno|Bruno|Marksman|gold|P|R|1 2 1 0 0 3 0|2 3 3|2|burst|h
carmilla|Carmilla|Support,Tank|roam|M|M|3 2 2 2 1 1 1|2 3 2|2|aoecc,engage|h
cecilion|Cecilion|Mage|mid|M|R|2 0 1 1 0 3 0|1 2 3|2|poke,latecarry|h
change|Chang'e|Mage|mid|M|R|1 1 1 0 0 2 0|2 3 3|1|poke,shield|h
chip|Chip|Tank,Support|roam|M|M|2 2 2 1 2 0 1|2 3 2|2|global,protect|m
chou|Chou|Fighter|exp,roam|P|M|3 3 2 3 1 2 0|3 3 2|3|lockdown,dash,immune,pick|h
cici|Cici|Fighter|exp|P|M|1 3 2 1 0 1 3|2 3 2|2|selfheal,dash|m
claude|Claude|Marksman|gold|P|R|1 3 1 0 0 3 1|2 3 3|3|dash|h
clint|Clint|Marksman|gold|P|R|1 2 1 0 0 3 0|3 3 2|2|burst,earlygame|h
cyclops|Cyclops|Mage|mid,jungle|M|R|2 1 1 1 0 3 0|3 3 2|1|lockdown,burst|h
diggie|Diggie|Support|roam|M|R|2 1 1 0 3 0 0|2 3 2|2|protect|h
dyrroth|Dyrroth|Fighter|exp,jungle|P|M|1 2 2 2 0 3 1|3 3 2|2|burst,antitank,dash|h
edith|Edith|Tank,Marksman|roam,exp|H|M|3 1 3 2 1 1 1|2 3 2|3|aoecc,engage|h
esmeralda|Esmeralda|Mage,Tank|exp,roam|M|M|1 2 3 1 0 2 3|2 3 3|2|shield,selfheal|h
estes|Estes|Support|roam|M|R|2 0 1 0 3 0 3|1 3 3|1|heal,protect|h
eudora|Eudora|Mage|mid|M|R|2 0 1 1 0 3 0|3 3 1|1|lockdown,burst|h
fanny|Fanny|Assassin|jungle|P|M|1 3 1 2 0 3 0|2 3 3|3|dash,burst|h
faramis|Faramis|Support,Mage|roam,mid|M|R|1 1 1 1 2 2 0|2 3 2|2|poke,protect|h
floryn|Floryn|Support|roam|M|R|1 1 1 0 2 0 3|2 3 3|1|heal,global|h
franco|Franco|Tank|roam|P|M|3 1 3 3 1 1 0|3 3 1|2|lockdown,pick,engage|h
fredrinn|Fredrinn|Tank,Fighter|jungle,exp|P|M|3 1 3 2 1 2 2|2 3 3|3|taunt,selfheal|h
freya|Freya|Fighter|exp,jungle|P|M|2 2 2 2 0 2 2|2 3 2|2|dash,shield|h
gatotkaca|Gatotkaca|Tank,Fighter|roam,exp|M|M|3 1 3 3 1 1 1|2 3 2|2|aoecc,engage,taunt|h
gloo|Gloo|Tank|roam,exp|M|M|3 2 3 2 1 0 2|2 3 2|3|engage,selfheal|h
gord|Gord|Mage|mid|M|R|2 0 1 0 1 2 0|2 3 2|1|poke|h
granger|Granger|Marksman|gold,jungle|P|R|0 2 1 0 0 3 0|3 3 2|2|burst|h
grock|Grock|Tank|roam,exp|P|M|3 1 3 2 2 1 1|3 3 2|2|engage|h
guinevere|Guinevere|Fighter|exp,jungle|M|M|3 2 2 3 0 3 0|3 3 2|2|aoecc,burst,dash|h
gusion|Gusion|Assassin|jungle,mid|M|M|1 3 1 1 0 3 0|2 3 2|3|dash,burst|h
hanabi|Hanabi|Marksman|gold|P|R|1 0 1 0 0 2 1|1 2 3|1|shield,latecarry|h
hanzo|Hanzo|Assassin|jungle|P|M|0 1 1 0 0 3 0|1 2 3|2|latecarry|h
harith|Harith|Mage|mid,gold|M|R|0 3 1 1 0 2 0|1 3 3|3|dash,shield,latecarry|h
harley|Harley|Assassin,Mage|jungle,mid|M|R|0 2 1 1 0 3 0|2 3 2|2|burst,dash|h
hayabusa|Hayabusa|Assassin|jungle|P|M|0 3 1 1 0 3 0|2 3 3|3|immune,dash,splitpush,burst|h
helcurt|Helcurt|Assassin|jungle|P|M|1 2 1 2 0 3 0|2 3 2|2|silence,burst|h
hilda|Hilda|Fighter,Tank|roam,exp|P|M|2 2 3 2 1 2 2|3 2 1|1|selfheal,earlygame|h
hylos|Hylos|Tank|roam|M|M|3 1 3 2 2 0 2|2 3 2|1|lockdown,selfheal|h
irithel|Irithel|Marksman|gold|P|R|1 2 1 0 0 2 0|2 3 2|2||h
ixia|Ixia|Marksman|gold|P|R|2 1 1 0 0 2 2|1 2 3|1|selfheal,latecarry|h
jawhead|Jawhead|Fighter|exp,roam,jungle|P|M|3 2 2 3 1 2 0|3 3 2|2|lockdown,pick,engage|h
johnson|Johnson|Tank,Support|roam|M|M|3 3 3 3 1 2 0|2 3 2|2|global,engage|h
joy|Joy|Assassin|jungle|M|M|1 3 1 2 0 3 0|2 3 2|3|immune,dash|h
julian|Julian|Fighter,Mage|jungle,exp|M|M|2 2 2 2 0 3 1|3 3 2|2|burst,dash|h
kadita|Kadita|Mage|mid,roam|M|R|3 2 1 2 0 3 0|2 3 2|2|aoecc,immune|h
kagura|Kagura|Mage|mid|M|R|2 3 1 1 1 3 0|2 3 2|3|burst,dash|h
kaja|Kaja|Support,Fighter|roam|M|M|3 2 2 2 1 2 1|3 3 2|2|lockdown,pick|h
kalea|Kalea|Support,Fighter|roam|M|M|2 2 2 2 2 1 2|2 3 2|2|heal|l
karina|Karina|Assassin|jungle|M|M|0 2 1 1 0 3 1|2 3 2|2|burst,execute,dash|h
karrie|Karrie|Marksman|gold|P|R|1 2 1 0 0 2 0|2 3 3|2|antitank|h
khaleed|Khaleed|Fighter|exp|P|M|2 2 3 2 0 2 2|3 3 2|1|aoecc,selfheal|h
khufra|Khufra|Tank|roam|P|M|3 2 3 3 2 0 1|2 3 2|2|antidash,engage|h
kimmy|Kimmy|Marksman,Mage|gold,mid|M|R|1 2 1 0 0 2 0|2 3 3|2|poke|h
lancelot|Lancelot|Assassin|jungle|P|M|0 3 1 1 0 3 0|2 3 2|3|immune,dash,burst|h
lapu-lapu|Lapu-Lapu|Fighter|exp,jungle|P|M|2 2 2 2 0 2 2|2 3 2|2|aoecc,dash|h
layla|Layla|Marksman|gold|P|R|0 0 1 0 0 2 0|1 2 3|1|poke,latecarry|h
leomord|Leomord|Fighter|jungle,exp|P|M|1 3 2 2 0 2 2|2 3 3|2|dash|h
lesley|Lesley|Marksman,Assassin|gold,jungle|P|R|0 1 1 0 0 3 0|2 3 3|2|poke,execute,burst|h
ling|Ling|Assassin|jungle|P|M|0 3 1 1 0 3 0|1 3 3|3|immune,dash,burst|h
lolita|Lolita|Tank,Support|roam|P|M|3 1 3 2 3 0 0|2 3 2|2|aoecc,shield,protect|h
lukas|Lukas|Fighter|exp|P|M|2 2 3 2 0 2 2|2 3 2|2||l
lunox|Lunox|Mage|mid|M|R|1 2 1 1 0 3 2|2 3 3|3|antitank,immune,dash|h
luo-yi|Luo Yi|Mage|mid|M|R|3 1 1 2 0 2 0|2 3 2|3|aoecc,global|h
lylia|Lylia|Mage|mid|M|R|2 2 1 1 0 3 0|3 3 2|2|poke,burst|h
martis|Martis|Fighter|jungle,exp|P|M|2 2 2 2 0 2 1|3 3 2|2|immune,dash,execute|h
masha|Masha|Fighter,Tank|exp|P|M|1 2 3 2 0 2 1|2 3 3|2|splitpush,antitank|h
mathilda|Mathilda|Support,Assassin|roam|M|R|1 3 1 2 2 1 0|3 3 2|2|shield,dash,protect|h
melissa|Melissa|Marksman|gold|P|R|1 1 1 0 1 2 0|2 3 3|2|antidive|h
minotaur|Minotaur|Tank,Support|roam|P|M|3 1 3 3 3 0 2|2 3 2|2|aoecc,engage,heal|h
minsitthar|Minsitthar|Fighter|exp,roam|P|M|3 2 2 3 1 1 0|3 3 2|2|antidash,engage|h
miya|Miya|Marksman|gold|P|R|1 1 1 0 0 1 0|1 2 3|1|latecarry|h
moskov|Moskov|Marksman|gold|P|R|2 2 1 0 0 2 0|2 3 3|2|lockdown|h
nana|Nana|Mage,Support|mid,roam|M|R|3 1 1 2 2 2 0|3 3 1|1|aoecc,poke|h
natalia|Natalia|Assassin|roam,jungle|P|M|1 2 1 1 0 3 0|3 3 1|2|invis,burst,silence|h
natan|Natan|Marksman|gold|M|R|1 2 1 0 0 2 1|1 2 3|2|latecarry|h
nolan|Nolan|Assassin|jungle|P|M|1 3 1 1 0 3 0|2 3 2|3|dash,burst|h
novaria|Novaria|Mage|mid,roam|M|R|1 1 1 1 0 3 0|2 3 2|2|poke|h
odette|Odette|Mage|mid|M|R|2 1 1 2 0 3 0|2 3 2|1|teamfightult|h
paquito|Paquito|Fighter|exp,jungle|P|M|2 2 2 2 0 3 1|3 3 2|2|burst,dash|h
pharsa|Pharsa|Mage|mid|M|R|1 2 1 1 0 3 0|2 3 2|2|poke,teamfightult|h
phoveus|Phoveus|Fighter|exp|M|M|2 2 3 2 0 2 2|2 3 2|2|antidash|h
popol-and-kupa|Popol and Kupa|Marksman|gold,roam|P|R|2 1 2 0 1 2 0|3 3 2|2||h
rafaela|Rafaela|Support|roam|M|R|2 2 1 1 2 1 2|2 3 2|1|heal|h
roger|Roger|Fighter,Marksman|jungle|P|R|1 2 1 1 0 3 1|3 3 2|2|burst,execute|h
ruby|Ruby|Fighter|exp,roam|P|M|3 2 3 2 1 1 3|2 3 2|2|aoecc,selfheal,dash|h
saber|Saber|Assassin|jungle,roam|P|M|3 2 1 2 0 3 0|3 3 1|1|lockdown,burst,pick|h
selena|Selena|Assassin,Mage|roam,mid,jungle|M|R|3 2 1 2 0 3 0|3 3 2|3|pick,burst|h
silvanna|Silvanna|Fighter|exp,roam|M|M|3 2 2 3 1 2 1|3 3 2|2|lockdown,engage|h
sun|Sun|Fighter|exp,jungle|P|M|0 2 2 1 0 1 2|2 3 3|1|splitpush,selfheal|h
suyou|Suyou|Assassin,Fighter|jungle|P|M|2 3 1 1 0 3 1|2 3 2|3|dash,burst|l
terizla|Terizla|Fighter|exp|P|M|3 1 3 2 1 2 2|2 3 2|1|aoecc,selfheal|h
thamuz|Thamuz|Fighter|exp,jungle|P|M|1 2 3 2 0 2 3|2 3 2|1|selfheal,antitank|h
tigreal|Tigreal|Tank,Support|roam|P|M|3 1 3 3 2 0 0|2 3 2|1|aoecc,engage|h
uranus|Uranus|Tank|exp|M|M|1 2 3 1 0 0 3|2 3 3|1|selfheal,splitpush|h
vale|Vale|Mage|mid,roam|M|R|3 1 1 2 0 3 0|2 3 2|2|aoecc,burst|h
valentina|Valentina|Mage|mid|M|R|2 2 1 2 0 3 2|2 3 3|3|selfheal,dash|h
valir|Valir|Mage|mid|M|R|3 1 1 1 3 2 0|3 3 2|2|poke,protect,antidive|h
vexana|Vexana|Mage|mid|M|R|2 0 1 1 0 3 0|2 3 2|1|poke,burst|h
wanwan|Wanwan|Marksman|gold|P|R|0 3 1 0 0 2 0|1 3 3|3|dash,immune|h
x-borg|X.Borg|Fighter|exp|P|M|1 2 3 1 0 2 2|3 3 2|2|antitank|h
xavier|Xavier|Mage|mid|M|R|2 1 1 1 0 3 0|2 3 3|2|poke,global|h
yi-sun-shin|Yi Sun-shin|Assassin,Marksman|jungle,gold|P|R|1 2 1 1 0 2 0|2 3 2|2|global|h
yin|Yin|Fighter|jungle,exp|P|M|3 2 2 2 0 3 1|3 3 2|2|lockdown,burst,pick|h
yu-zhong|Yu Zhong|Fighter|exp|P|M|2 2 3 2 0 2 3|2 3 2|2|selfheal,aoecc|h
yve|Yve|Mage|mid|M|R|3 0 1 1 1 3 0|2 3 2|2|poke,aoecc,teamfightult|h
zetian|Zetian|Mage|mid|M|R|2 1 1 1 0 3 0|2 3 2|2|poke|l
zhask|Zhask|Mage|mid|M|R|1 0 1 0 0 2 0|2 3 2|2|poke,splitpush|h
zhuxin|Zhuxin|Mage|mid|M|R|3 1 1 1 1 2 1|2 3 2|2|aoecc,lockdown|m
zilong|Zilong|Fighter,Assassin|exp,jungle|P|M|1 2 1 1 0 2 1|2 3 3|1|splitpush,dash|h
obsidia|Obsidia|||||||||l
sora|Sora|||||||||l
marcel|Marcel|||||||||l
`;

export interface EditorialHeroRow {
  slug: string;
  name: string;
  roles: string[];
  lanes: string[];
  damage: string | null;
  range: string | null;
  profile: number[] | null; // cc mob dur eng peel burst sus early mid late
  difficulty: number | null;
  tags: string[];
  confidence: "high" | "medium" | "low";
  incomplete: boolean;
}

const CONF = { h: "high", m: "medium", l: "low" } as const;

export function parseEditorialHeroes(): EditorialHeroRow[] {
  return ROWS.trim()
    .split("\n")
    .map((line) => {
      const [slug, name, roles, lanes, dmg, range, attrs, phases, diff, tags, conf] = line.split("|");
      const incomplete = !roles;
      const nums = incomplete ? null : `${attrs} ${phases}`.trim().split(/\s+/).map(Number);
      return {
        slug,
        name,
        roles: roles ? roles.split(",") : [],
        lanes: lanes ? lanes.split(",") : [],
        damage: dmg || null,
        range: range || null,
        profile: nums,
        difficulty: diff ? Number(diff) : null,
        tags: tags ? tags.split(",").filter(Boolean) : [],
        confidence: CONF[(conf || "l") as keyof typeof CONF] ?? "low",
        incomplete,
      };
    });
}

/**
 * Synergies connues et largement documentées dans la communauté (combos d'ultimes).
 * Source éditoriale, fiabilité moyenne. Les synergies importées d'une source
 * statistique (ex. « joué avec » Liquipedia) sont prioritaires.
 */
export const EDITORIAL_COMBOS: { a: string; b: string; why: string }[] = [
  { a: "tigreal", b: "odette", why: "Implosion de Tigreal regroupe les ennemis sous l'ultime d'Odette." },
  { a: "atlas", b: "odette", why: "Fatal Links d'Atlas immobilise un groupe pour l'ultime d'Odette." },
  { a: "atlas", b: "pharsa", why: "Atlas regroupe, Pharsa bombarde la zone de loin." },
  { a: "atlas", b: "yve", why: "Le contrôle d'Atlas maintient les ennemis dans la grille d'Yve." },
  { a: "johnson", b: "odette", why: "Johnson transporte Odette au cœur du combat (combo classique)." },
  { a: "tigreal", b: "yve", why: "Engage de zone suivi d'un contrôle prolongé." },
  { a: "angela", b: "ling", why: "Angela s'attache au plongeur et absorbe le burst à son arrivée." },
  { a: "angela", b: "hayabusa", why: "Bouclier et soins pendant les plongées d'Hayabusa." },
  { a: "lolita", b: "layla", why: "Lolita bloque les projectiles devant un tireur statique." },
  { a: "estes", b: "miya", why: "Soins continus pour un tireur hyper-carry peu mobile." },
  { a: "diggie", b: "aldous", why: "Purification d'équipe pour sécuriser les engages." },
  { a: "khufra", b: "pharsa", why: "Khufra bloque les dashs et regroupe pour le bombardement." },
];

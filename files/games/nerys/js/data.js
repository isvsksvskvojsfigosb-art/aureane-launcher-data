'use strict';
/* ==========================================================
   Nérys — données : ressources, recettes, constructions,
   recherches, créatures, poissons, cosmétiques, répliques
   ========================================================== */
const TS = 16, WW = 256, WH = 256, WM = WW - 1, WP = WW * TS, HP = WH * TS, DAY = 480;
const NM = { m: 'Vaël', f: 'Lysséa' };

const BIOMES = [
  { n: 'Plaine violette', c: '#5a4879' },
  { n: 'Forêt de champignons', c: '#35566a' },
  { n: 'Désert de cristal', c: '#e09d78' },
  { n: 'Marais gluant', c: '#4a6640' },
  { n: 'Toundra pétillante', c: '#d8e4f4' },
  { n: 'Terres volcaniques', c: '#3f2f37' },
];

/* ---------- ressources (v = prix de vente chez Zorg) ---------- */
const ITEMS = {
  fer: { n: 'Ferraille', c: '#9aa3c0', v: 1 },
  cuivre: { n: 'Cuivre', c: '#e08a3c', v: 2 },
  cristal: { n: 'Cristal', c: '#4fe3e0', v: 3 },
  bois: { n: 'Champibois', c: '#c98b5a', v: 1 },
  fibre: { n: 'Fibre-spaghetti', c: '#e3e070', v: 1 },
  gelee: { n: 'Gelée', c: '#7ce86a', v: 2 },
  glace: { n: 'Glace', c: '#bfe9ff', v: 2 },
  soufre: { n: 'Soufre', c: '#f2d230', v: 3 },
  fruit: { n: 'Fruit-bulle', c: '#ff6fae', v: 1 },
  spore: { n: 'Spores', c: '#b78cff', v: 2 },
  graine: { n: 'Graines', c: '#a0d060', v: 1 },
  bananium: { n: 'Bananium', c: '#fff04a', v: 25 },
  poisson: { n: 'Poisson', c: '#7fb8ff', v: 6 },
  plaque: { n: 'Plaque', c: '#c9cfe6', v: 4, cr: 1 },
  cable: { n: 'Câble', c: '#ffa257', v: 2, cr: 1 },
  planche: { n: 'Planche', c: '#e0a46c', v: 3, cr: 1 },
  tissu: { n: 'Tissu', c: '#ff9ccf', v: 5, cr: 1 },
  circuit: { n: 'Circuit', c: '#62e07a', v: 10, cr: 1 },
  engrais: { n: 'Engrais', c: '#9a7a4a', v: 5, cr: 1 },
  pousse: { n: 'Pousse d’arbre', c: '#5fd068', v: 8, cr: 1 },
  verre: { n: 'Verre', c: '#a8f0ff', v: 8, cr: 1 },
  batterie: { n: 'Batterie', c: '#ffe066', v: 15, cr: 1 },
  moteur: { n: 'Moteur', c: '#8fa0ff', v: 40, cr: 1 },
  puce: { n: 'Puce quantique', c: '#ff5ad9', v: 120, cr: 1 },
  smoothie: { n: 'Smoothie gluant', c: '#9cff7a', v: 20, food: { b: 'speed', t: 180, d: 'Vitesse +40 % (3 min)' } },
  pizza: { n: 'Pizza aux spores', c: '#ffb050', v: 25, food: { b: 'harvest', t: 180, d: 'Récolte ×2 (3 min)' } },
  sushi: { n: 'Sushi cosmique', c: '#ff8a8a', v: 25, food: { b: 'luck', t: 240, d: 'Chance ×3 : dorés, poissons rares (4 min)' } },
  soupe: { n: 'Soupe de glace chaude', c: '#ffcf8a', v: 40, food: { b: 'all', t: 300, d: 'Un peu de tout (5 min)' } },
};
const RAW = ['fer', 'cuivre', 'cristal', 'bois', 'fibre', 'gelee', 'glace', 'soufre', 'fruit', 'spore', 'graine', 'bananium', 'poisson'];

/* ---------- recettes (st = station nécessaire, construite n'importe où) ---------- */
const RECIPES = [
  { o: 'plaque', n: 1, i: { fer: 3 }, st: 'etabli' },
  { o: 'cable', n: 3, i: { cuivre: 2 }, st: 'etabli' },
  { o: 'planche', n: 2, i: { bois: 2 }, st: 'etabli' },
  { o: 'tissu', n: 1, i: { fibre: 4 }, st: 'etabli' },
  { o: 'circuit', n: 1, i: { cristal: 1, cable: 2 }, st: 'etabli' },
  { o: 'engrais', n: 2, i: { spore: 2, gelee: 1 }, st: 'etabli', r: 'r_jardin' },
  { o: 'pousse', n: 1, i: { graine: 2, engrais: 1 }, st: 'etabli', r: 'r_jardin' },
  { o: 'verre', n: 2, i: { cristal: 2, soufre: 1 }, st: 'fonderie' },
  { o: 'batterie', n: 1, i: { soufre: 2, cuivre: 2, gelee: 1 }, st: 'fonderie' },
  { o: 'moteur', n: 1, i: { plaque: 3, circuit: 1, cable: 2 }, st: 'atelier' },
  { o: 'puce', n: 1, i: { bananium: 2, circuit: 2, verre: 1 }, st: 'atelier', r: 'r_bananium' },
  { o: 'smoothie', n: 1, i: { fruit: 3, gelee: 2 }, st: 'cuisine' },
  { o: 'pizza', n: 1, i: { spore: 3, fruit: 2, bois: 1 }, st: 'cuisine' },
  { o: 'sushi', n: 1, i: { poisson: 2, fibre: 2 }, st: 'cuisine' },
  { o: 'soupe', n: 1, i: { glace: 4, soufre: 1, fruit: 2 }, st: 'cuisine' },
];
const STATIONS = { etabli: 'Établi', fonderie: 'Fonderie', atelier: 'Atelier', cuisine: 'Cuisine' };

/* ---------- objets du monde (couche O) ----------
   h: coups, it: ressource, y: quantité par coup, rg: repousse (s), seed: chance de graine */
const OBJ = {
  1: { k: 'rock', n: 'Rocher', h: 3, solid: 1, loot: [['fer', .35], ['cristal', .06]] },
  2: { k: 'debris', n: 'Débris de l’Aurore', h: 3, it: 'fer', y: 2, solid: 1, rg: 500 },
  3: { k: 'fibreplant', n: 'Herbe-spaghetti', h: 2, it: 'fibre', y: 2, rg: 240, seed: .25 },
  4: { k: 'bush', n: 'Buisson à bulles', h: 1, it: 'fruit', y: 3, rg: 200, seed: .2, left: 5 },
  5: { k: 'bush_e', n: 'Buisson (repousse)' },
  6: { k: 'mushtree', n: 'Champignon géant', h: 4, it: 'bois', y: 2, solid: 1, rg: 420, seed: .15, left: 7 },
  7: { k: 'stump', n: 'Souche (repousse)' },
  8: { k: 'sporepuff', n: 'Vesse-de-loup', h: 2, it: 'spore', y: 2, rg: 300 },
  9: { k: 'crystal', n: 'Grappe de cristal', h: 4, it: 'cristal', y: 1, solid: 1, rg: 600, ore: 1 },
  10: { k: 'copper', n: 'Filon de cuivre', h: 4, it: 'cuivre', y: 2, solid: 1, rg: 600, ore: 1 },
  11: { k: 'gelpod', n: 'Cosse de gelée', h: 2, it: 'gelee', y: 2, rg: 300 },
  12: { k: 'reed', n: 'Roseau-nouille', h: 2, it: 'fibre', y: 2, rg: 240, seed: .2 },
  13: { k: 'iceblock', n: 'Bloc de glace', h: 3, it: 'glace', y: 2, solid: 1, rg: 480, ore: 1 },
  14: { k: 'ironore', n: 'Minerai de fer', h: 4, it: 'fer', y: 3, solid: 1, rg: 600, ore: 1 },
  15: { k: 'sulfur', n: 'Geyser de soufre', h: 4, it: 'soufre', y: 2, solid: 1, rg: 600, ore: 1 },
  16: { k: 'bananium', n: 'Bananium', h: 6, it: 'bananium', y: 1, solid: 1, rg: 1800, ore: 1 },
  17: { k: 'cactus', n: 'Cactus-bouclette', h: 2, it: 'fibre', y: 3, solid: 1, rg: 300, seed: .2 },
  18: { k: 'capsule', n: 'Capsule de fret', h: 1, solid: 1, special: 'cap' },
  19: { k: 'monolith', n: 'Statue de canard', solid: 1, special: 'mono' },
  20: { k: 'meteor', n: 'Météorite', h: 3, solid: 1, special: 'meteor' },
  21: { k: 'flower', n: 'Fleur', h: 1, it: 'graine', y: 1 },
  22: { k: 'tree', n: 'Arbre-bulle', h: 4, it: 'bois', y: 3, solid: 1, rg: 420, seed: .3, left: 7 },
  23: { k: 'wreck', n: 'Épave de l’Aurore-7', solid: 1, special: 'wreck' },
  24: { k: 'mono_done', n: 'Statue de canard (vénérée)', solid: 1, special: 'mono2' },
};

/* ---------- constructions ---------- */
const BLD = {
  etabli: { n: 'Établi', cat: 'base', c: { fer: 10 }, st: 1, d: 'Plaques, câbles, planches, tissu, circuits.', eyes: [[5, 7], [10, 7]] },
  caisse: { n: 'Caisse de rangement', cat: 'base', c: { planche: 4, fer: 6 }, r: 'r_stock', cap: 60, d: '+60 places pour chaque ressource.' },
  jardin: { n: 'Jardinière', cat: 'base', c: { planche: 4, fer: 4 }, r: 'r_jardin', solid: 0, d: 'Plante une graine, attends, récolte. Ça marche hors-ligne.' },
  labo: { n: 'Labo', cat: 'base', c: { plaque: 8, circuit: 2, cristal: 4 }, pw: -4, r: 'r_labo', sci: .25, d: 'Produit 0,25 science/s, même quand tu dors.', eyes: [[5, 9], [10, 9]] },
  fonderie: { n: 'Fonderie', cat: 'base', c: { plaque: 8, cuivre: 6, cristal: 2 }, pw: -3, r: 'r_fonderie', st: 1, d: 'Verre et batteries.', eyes: [[4, 10], [11, 10]] },
  cuisine: { n: 'Cuisine', cat: 'base', c: { plaque: 6, planche: 6, fruit: 5 }, r: 'r_cuisine', st: 1, d: 'Des plats qui donnent des super-pouvoirs (temporaires).', eyes: [[5, 10], [10, 10]] },
  atelier: { n: 'Atelier', cat: 'base', c: { plaque: 12, circuit: 4, planche: 6 }, pw: -4, r: 'r_atelier', st: 1, d: 'Moteurs et puces quantiques.', eyes: [[5, 8], [10, 8]] },
  foreuse: { n: 'Foreuse', cat: 'base', c: { plaque: 6, cable: 4, circuit: 1 }, pw: -3, r: 'r_foreuse', on: 'ore', rate: 1 / 20, buf: 40, d: 'À poser SUR un filon (cuivre, fer, cristal, glace, soufre…). Fore à l’infini.', eyes: [[5, 9], [10, 9]] },
  foreuse2: { n: 'Super-foreuse', cat: 'base', c: { moteur: 2, plaque: 10, batterie: 2 }, pw: -8, r: 'r_foreuse2', on: 'ore', rate: 1 / 5, buf: 80, d: 'Comme la foreuse, mais en colère. 4× plus rapide.', eyes: [[5, 9], [10, 9]] },
  niche: { n: 'Niche', cat: 'base', c: { planche: 6, tissu: 2 }, r: 'r_niche', d: 'Maison pour une créature adoptée. Elle y produit des ressources.' },
  ruche: { n: 'Ruche à drones', cat: 'base', c: { moteur: 2, circuit: 4, batterie: 2 }, pw: -6, r: 'r_drones', rad: 14, d: 'Ramène toute seule la production des machines à 14 cases autour.', eyes: [[5, 11], [10, 11]] },
  silo: { n: 'Silo', cat: 'base', c: { plaque: 20, verre: 6, moteur: 1 }, r: 'r_stock2', cap: 300, d: '+300 places pour chaque ressource.' },
  radar: { n: 'Radar', cat: 'base', c: { plaque: 6, circuit: 3, cable: 6 }, pw: -2, r: 'r_radar', d: 'Dévoile la carte sur 40 cases et repère toutes les capsules.' },
  tp: { n: 'Téléporteur', cat: 'base', c: { moteur: 1, circuit: 4, verre: 4 }, pw: -5, r: 'r_tp', solid: 0, d: 'Voyage instantané entre téléporteurs. Ne pas éternuer dedans.' },
  piste: { n: 'Piste de Zorg', cat: 'base', c: { plaque: 12, planche: 8, cable: 6 }, r: 'r_piste', max: 1, d: 'Zorg, marchand interstellaire, y gare sa théière volante.' },
  superlabo: { n: 'Super-labo', cat: 'base', c: { moteur: 2, verre: 10, circuit: 6 }, pw: -15, r: 'r_labo2', sci: 2, d: '2 science/s. Sent légèrement le brûlé.', eyes: [[5, 9], [10, 9]] },
  fusee: { n: 'Fusée de la Fête', cat: 'base', c: { puce: 20, moteur: 20, batterie: 20, bananium: 30, plaque: 100 }, r: 'r_fusee', max: 1, d: 'Pour célébrer la planète la plus goofy de la galaxie.' },

  solaire: { n: 'Panneau solaire', cat: 'energie', c: { plaque: 3, cristal: 2, cable: 2 }, pw: 4, solar: 1, r: 'r_energie', solid: 1, d: '+4 ⚡ le jour, rien la nuit.' },
  eolienne: { n: 'Éolienne', cat: 'energie', c: { plaque: 4, planche: 3, cable: 3 }, pw: 3, r: 'r_energie', d: '+3 ⚡ jour et nuit. Fait « whouuu ».' },
  roue: { n: 'Roue à Blobo', cat: 'energie', c: { planche: 8, gelee: 6, cable: 2 }, pw: 6, r: 'r_roue', d: '+6 ⚡. Un Blobo court dedans. Il adore ça. Promis.' },
  generateur: { n: 'Générateur à soufre', cat: 'energie', c: { plaque: 8, soufre: 6, cable: 4 }, pw: 12, r: 'r_soufre', d: '+12 ⚡. Sent l’œuf pourri.', eyes: [[5, 9], [10, 9]] },
  geo: { n: 'Géothermie', cat: 'energie', c: { plaque: 12, moteur: 1, verre: 4 }, pw: 35, r: 'r_geo', on: 'volcan', d: '+35 ⚡. Seulement sur les terres volcaniques.' },
  reacteur: { n: 'Réacteur au Bananium', cat: 'energie', c: { puce: 3, moteur: 4, batterie: 6, bananium: 10 }, pw: 150, r: 'r_bananium', d: '+150 ⚡ et une légère odeur de banane.', eyes: [[5, 11], [10, 11]] },

  souffleur: { n: 'Souffleur à bulles', cat: 'terra', c: { plaque: 4, cable: 3, fruit: 3 }, pw: -2, tf: { o: .2 }, r: 'r_terra1', eyes: [[5, 8], [10, 8]] },
  radiateur: { n: 'Radiateur de jardin', cat: 'terra', c: { plaque: 4, cable: 3, cuivre: 4 }, pw: -2, tf: { h: .2 }, r: 'r_terra1', eyes: [[5, 8], [10, 8]] },
  fonte: { n: 'Fonte-glace', cat: 'terra', c: { plaque: 4, cable: 3, glace: 4 }, pw: -2, tf: { w: .2 }, r: 'r_terra1', eyes: [[5, 9], [10, 9]] },
  semeur: { n: 'Semeur de spores', cat: 'terra', c: { plaque: 4, cable: 3, spore: 4 }, pw: -2, tf: { b: .2 }, r: 'r_terra1', eyes: [[5, 9], [10, 9]] },
  pompe: { n: 'Pompe à oxygène', cat: 'terra', c: { plaque: 10, circuit: 3, verre: 3, fruit: 10 }, pw: -8, tf: { o: 1.5 }, r: 'r_terra2', eyes: [[5, 10], [10, 10]] },
  grillepain: { n: 'Grille-pain géant', cat: 'terra', c: { plaque: 10, circuit: 3, verre: 3, soufre: 10 }, pw: -8, tf: { h: 1.5 }, r: 'r_terra2', eyes: [[5, 11], [10, 11]] },
  nuage: { n: 'Arroseur de nuages', cat: 'terra', c: { plaque: 10, circuit: 3, verre: 3, glace: 10 }, pw: -8, tf: { w: 1.5 }, r: 'r_terra2', eyes: [[5, 11], [10, 11]] },
  lichen: { n: 'Ferme à lichen', cat: 'terra', c: { plaque: 10, circuit: 3, verre: 3, gelee: 10 }, pw: -8, tf: { b: 1.5 }, r: 'r_terra2', eyes: [[5, 11], [10, 11]] },
  poumon: { n: 'Poumon géant', cat: 'terra', c: { moteur: 3, batterie: 3, plaque: 20, verre: 8, fruit: 25 }, pw: -30, tf: { o: 10 }, r: 'r_terra3', eyes: [[5, 12], [10, 12]] },
  soleil: { n: 'Soleil de poche', cat: 'terra', c: { moteur: 3, batterie: 3, plaque: 20, verre: 8, soufre: 25 }, pw: -30, tf: { h: 10 }, r: 'r_terra3', eyes: [[6, 9], [9, 9]] },
  pluie: { n: 'Machine à pluie', cat: 'terra', c: { moteur: 3, batterie: 3, plaque: 20, verre: 8, glace: 25 }, pw: -30, tf: { w: 10 }, r: 'r_terra3', eyes: [[5, 12], [10, 12]] },
  coeur: { n: 'Cœur-forêt', cat: 'terra', c: { moteur: 3, batterie: 3, plaque: 20, verre: 8, spore: 25 }, pw: -30, tf: { b: 10 }, r: 'r_terra3', eyes: [[5, 12], [10, 12]] },
  megao: { n: 'Arbre-poumon cosmique', cat: 'terra', c: { puce: 4, moteur: 6, batterie: 6, bananium: 6, fruit: 50 }, pw: -100, tf: { o: 60 }, r: 'r_terra4', eyes: [[5, 14], [10, 14]] },
  megah: { n: 'Noyau de lave', cat: 'terra', c: { puce: 4, moteur: 6, batterie: 6, bananium: 6, soufre: 50 }, pw: -100, tf: { h: 60 }, r: 'r_terra4', eyes: [[5, 12], [10, 12]] },
  megaw: { n: 'Comète apprivoisée', cat: 'terra', c: { puce: 4, moteur: 6, batterie: 6, bananium: 6, glace: 50 }, pw: -100, tf: { w: 60 }, r: 'r_terra4', eyes: [[5, 12], [10, 12]] },
  megab: { n: 'Mère-champignon', cat: 'terra', c: { puce: 4, moteur: 6, batterie: 6, bananium: 6, spore: 50 }, pw: -100, tf: { b: 60 }, r: 'r_terra4', eyes: [[6, 13], [9, 13]] },
  arbre: { n: 'Arbre planté', cat: 'terra', c: { pousse: 1 }, r: 'r_jardin', grow: 600, tf: { b: .4 }, d: 'Pousse en 10 min, puis +0,4 biomasse/s sans électricité. Gratuit et joli.' },
};
const TFD = {
  souffleur: 'Fait des bulles d’oxygène. Pop.', radiateur: 'Chauffe la planète. Lentement. Très lentement.', fonte: 'Fait fondre de la glace en vapeur d’eau.', semeur: 'Lâche des spores un peu partout. Atchoum.',
  pompe: 'Pompe de l’oxygène depuis… quelque part.', grillepain: 'Personne ne sait pourquoi ça chauffe autant.', nuage: 'Fabrique des petits nuages. Ils sont mignons.', lichen: 'Du lichen, du lichen, encore du lichen.',
  poumon: 'Il respire. Il est vivant ? Ne pose pas de questions.', soleil: 'Un soleil. De poche. Ne pas mettre en poche.', pluie: 'Il pleut. Exprès.', coeur: 'Un cœur qui bat pour les forêts.',
  megao: 'Un arbre qui respire pour toute la planète.', megah: 'Un petit morceau du centre de la planète, apprivoisé.', megaw: 'Une comète en laisse. Elle fond doucement.', megab: 'La maman de tous les champignons.',
};
for (const k in TFD) BLD[k].d = TFD[k];

/* ---------- déco : [id, nom, coût, charme, recherche, options] ---------- */
const DECO = [
  ['pot', 'Plante en pot', { planche: 1, fibre: 2 }, 2, 'r_deco1'],
  ['chaise', 'Chaise', { planche: 3 }, 1, 'r_deco1', { solid: 0 }],
  ['table', 'Table', { planche: 4 }, 1, 'r_deco1'],
  ['lampe', 'Lampe de chevet', { plaque: 1, cristal: 1 }, 2, 'r_deco1', { light: 40 }],
  ['pancarte', 'Pancarte « Chez nous »', { planche: 2 }, 2, 'r_deco1'],
  ['nain', 'Nain de jardin alien', { fer: 4, gelee: 2 }, 3, 'r_deco1'],
  ['chaussettes', 'Tas de chaussettes', { tissu: 2 }, 1, 'r_deco1', { solid: 0, act: 'sock' }],
  ['flamant', 'Flamant rose en plastique', { plaque: 2, fruit: 4 }, 3, 'r_deco1'],
  ['drapeau', 'Drapeau de l’Aurore', { tissu: 2, fer: 2 }, 2, 'r_deco1'],
  ['canape', 'Canapé moelleux', { tissu: 6, planche: 4 }, 4, 'r_deco2'],
  ['lit', 'Lit douillet', { tissu: 4, planche: 6 }, 4, 'r_deco2', { act: 'sleep' }],
  ['tele', 'Télé rétro', { circuit: 2, verre: 2, plaque: 3 }, 5, 'r_deco2', { act: 'tv', light: 24 }],
  ['lavalampe', 'Lampe à lave', { verre: 2, gelee: 3 }, 4, 'r_deco2', { light: 44 }],
  ['frigo', 'Frigo qui ronronne', { plaque: 6, glace: 4 }, 3, 'r_deco2', { act: 'purr' }],
  ['aquarium', 'Aquarium', { verre: 6, poisson: 3 }, 6, 'r_deco2', { light: 20 }],
  ['arcade', 'Borne d’arcade', { circuit: 4, plaque: 4, verre: 2 }, 6, 'r_deco2', { act: 'arcade', light: 24 }],
  ['trampoline', 'Trampoline', { tissu: 4, plaque: 2 }, 5, 'r_deco2', { solid: 0, act: 'boing' }],
  ['barbecue', 'Barbecue', { plaque: 4, soufre: 2 }, 3, 'r_deco2', { light: 20 }],
  ['lampadaire', 'Lampadaire', { plaque: 3, cristal: 2, cable: 2 }, 3, 'r_deco2', { light: 70 }],
  ['bonhomme', 'Bonhomme de neige', { glace: 8 }, 3, 'r_deco2'],
  ['disco', 'Boule disco', { verre: 8, batterie: 1 }, 10, 'r_deco3', { light: 70, act: 'disco' }],
  ['fontaine', 'Fontaine', { plaque: 6, verre: 4, glace: 6 }, 8, 'r_deco3'],
  ['statue', 'Statue du Canard', { bananium: 2, plaque: 6 }, 12, 'r_deco3', { act: 'quack' }],
  ['toilettes', 'Toilettes en or', { bananium: 4, plaque: 4 }, 15, 'r_deco3', { act: 'flush' }],
  ['piano', 'Piano', { planche: 10, plaque: 4, tissu: 2 }, 10, 'r_deco3', { act: 'piano' }],
  ['jukebox', 'Juke-box', { circuit: 4, verre: 4, batterie: 2 }, 10, 'r_deco3', { act: 'juke', light: 30 }],
  ['dino', 'Crâne de dino', { fer: 20 }, 8, 'r_deco3'],
  ['baignoire', 'Baignoire à bulles', { plaque: 6, verre: 2, gelee: 4 }, 6, 'r_deco3'],
  ['carnivore', 'Plante carnivore', { spore: 10, gelee: 5 }, 7, 'r_deco3', { act: 'chomp' }],
  ['neon', 'Néon « GOOFY »', null, 14, null, { light: 50, shop: 300 }],
  ['statuezorg', 'Statue de Zorg', null, 12, null, { shop: 250 }],
  ['nainor', 'Nain doré', null, 16, null, { shop: 400 }],
  ['chaisebanane', 'Chaise-banane', null, 8, null, { shop: 150, solid: 0 }],
  ['licorne', 'Licorne gonflable', null, 10, null, { shop: 200 }],
  ['fuseejouet', 'Fusée jouet', null, 8, null, { shop: 180 }],
];
for (const [id, n, c, ch, r, o] of DECO) BLD[id] = { n, cat: 'deco', c: c || {}, ch, r, ...(o || {}) };

const FLOORS = [
  ['f_metal', 'Sol en métal', { plaque: 1 }, null, ['#7d86a3', '#6a7290', '#949cb8']],
  ['f_pierre', 'Dalles de pierre', { fer: 2 }, null, ['#8a7f9a', '#776c88', '#9d93ad']],
  ['f_bois', 'Parquet', { planche: 1 }, 'r_deco1', ['#b07a4a', '#9a6a40', '#c48c58']],
  ['f_moquette', 'Moquette rose', { tissu: 1 }, 'r_deco1', ['#e57aa6', '#d46a96', '#f08cb4']],
  ['f_herbe', 'Gazon synthétique', { fibre: 2 }, 'r_deco1', ['#4fbf5a', '#43a84e', '#62d06a']],
  ['f_damier', 'Damier', { plaque: 1, tissu: 1 }, 'r_deco2', ['#f2ecf8', '#2c2440', '#f2ecf8']],
  ['f_carrelage', 'Carrelage bleu', { verre: 1 }, 'r_deco2', ['#6ab4e8', '#5aa0d6', '#8ccaf4']],
  ['f_bulle', 'Sol à bulles', { gelee: 2 }, 'r_deco2', ['#8de87a', '#7ad468', '#b0f4a0']],
  ['f_or', 'Sol en or', { bananium: 1 }, 'r_deco3', ['#f2c230', '#d9a820', '#ffe070']],
];
for (const [id, n, c, r, pal] of FLOORS) BLD[id] = { n, cat: 'sol', c, r, pal, solid: 0, floor: 1 };
const WALLS = [
  ['w_metal', 'Mur en métal', { plaque: 2 }, null, ['#9aa3c0', '#6a7290']],
  ['w_bois', 'Mur en bois', { planche: 2 }, 'r_deco1', ['#c48c58', '#8a5a34']],
  ['w_brique', 'Mur en briques', { fer: 3 }, 'r_deco1', ['#d0705a', '#94443a']],
  ['w_verre', 'Mur en verre', { verre: 2 }, 'r_deco2', ['#bff4ff', '#6ab4d8']],
  ['w_haie', 'Haie taillée', { fibre: 4, graine: 1 }, 'r_deco2', ['#4fbf5a', '#2f8a3e']],
  ['w_bonbon', 'Mur en bonbon', { fruit: 3, gelee: 2 }, 'r_deco3', ['#ff9ccf', '#d0508a']],
];
for (const [id, n, c, r, pal] of WALLS) BLD[id] = { n, cat: 'mur', c, r, pal, wall: 1 };

const CATS = [['base', 'Base'], ['energie', 'Énergie'], ['terra', 'Terraformation'], ['deco', 'Déco'], ['sol', 'Sols'], ['mur', 'Murs']];

/* ---------- recherche ---------- */
const RES = [
  { id: 'r_energie', n: 'Électricité', d: 'Panneaux solaires et éoliennes.', c: 5 },
  { id: 'r_deco1', n: 'Déco maison', d: 'Meubles, sols et murs de base.', c: 6 },
  { id: 'r_stock', n: 'Rangement', d: 'Caisse de rangement : +60 places.', c: 8 },
  { id: 'r_terra1', n: 'Terraformation I', d: 'Les 4 machines de base pour rendre la planète moins grognonne.', c: 10, req: ['r_energie'] },
  { id: 'r_labo', n: 'Laboratoire', d: 'Produit de la science en continu.', c: 15 },
  { id: 'r_jardin', n: 'Jardinage', d: 'Jardinière, engrais et pousses d’arbres.', c: 15, req: ['r_terra1'] },
  { id: 'r_peche', n: 'Canne à pêche', d: 'Pêche dans les lacs (et dans la lave, si si).', c: 20 },
  { id: 'r_fonderie', n: 'Fonderie', d: 'Verre et batteries.', c: 20, req: ['r_labo'] },
  { id: 'r_outil1', n: 'Multi-outil Mk2', d: '+1 ressource par coup.', c: 25 },
  { id: 'r_roue', n: 'Roue à Blobo', d: 'De l’énergie verte (et gluante).', c: 30, req: ['r_energie'] },
  { id: 'r_cuisine', n: 'Cuisine', d: 'Des plats à super-pouvoirs.', c: 30, req: ['r_jardin'] },
  { id: 'r_foreuse', n: 'Forage', d: 'Foreuse automatique à poser sur les filons.', c: 40, req: ['r_fonderie'] },
  { id: 'r_soufre', n: 'Générateur à soufre', d: '+12 ⚡ par générateur.', c: 40, req: ['r_energie'] },
  { id: 'r_niche', n: 'Apprivoisement', d: 'Adopte des créatures, elles produisent pour toi.', c: 50 },
  { id: 'r_bottes', n: 'Bottes à ressort', d: '+25 % de vitesse. Boing.', c: 50 },
  { id: 'r_atelier', n: 'Atelier', d: 'Moteurs et machines avancées.', c: 60, req: ['r_fonderie'] },
  { id: 'r_radar', n: 'Radar', d: 'Dévoile la carte et repère les capsules.', c: 80, req: ['r_labo'] },
  { id: 'r_deco2', n: 'Déco cosy', d: 'Canapé, télé, trampoline, lampadaire…', c: 100, req: ['r_deco1'] },
  { id: 'r_piste', n: 'Commerce', d: 'Zorg vient vendre, acheter et passer des commandes.', c: 100, req: ['r_atelier'] },
  { id: 'r_terra2', n: 'Terraformation II', d: 'Des machines 7× plus puissantes.', c: 120, req: ['r_terra1', 'r_fonderie'], st: 2 },
  { id: 'r_stock2', n: 'Silo', d: '+300 places par ressource.', c: 150, req: ['r_stock', 'r_atelier'] },
  { id: 'r_outil2', n: 'Multi-outil Mk3', d: '+2 ressources par coup.', c: 150, req: ['r_outil1'], st: 2 },
  { id: 'r_drones', n: 'Drones', d: 'Ruche à drones : collecte automatique des machines.', c: 200, req: ['r_atelier', 'r_foreuse'] },
  { id: 'r_geo', n: 'Géothermie', d: '+35 ⚡ sur les volcans.', c: 250, req: ['r_atelier'], st: 3 },
  { id: 'r_tp', n: 'Téléportation', d: 'Voyage instantané entre téléporteurs.', c: 300, req: ['r_atelier'], st: 3 },
  { id: 'r_labo2', n: 'Super-labo', d: '2 science/s.', c: 400, req: ['r_labo', 'r_atelier'], st: 3 },
  { id: 'r_foreuse2', n: 'Super-foreuse', d: 'Fore 4× plus vite.', c: 400, req: ['r_foreuse', 'r_atelier'], st: 3 },
  { id: 'r_trotti', n: 'Trottinette à réaction', d: 'Encore +40 % de vitesse.', c: 500, req: ['r_bottes'], st: 3 },
  { id: 'r_terra3', n: 'Terraformation III', d: 'Des machines géantes.', c: 600, req: ['r_terra2', 'r_atelier'], st: 4 },
  { id: 'r_boost1', n: 'Optimisation planétaire', d: 'Terraformation +25 %.', c: 800, req: ['r_terra2'], st: 4 },
  { id: 'r_deco3', n: 'Déco de luxe', d: 'Boule disco, toilettes en or, juke-box…', c: 1000, req: ['r_deco2'], st: 4 },
  { id: 'r_bananium', n: 'Bananium', d: 'Puces quantiques et réacteur au bananium.', c: 1000, req: ['r_atelier'], st: 5 },
  { id: 'r_outil3', n: 'Multi-outil Mk4', d: '+4 ressources par coup.', c: 1200, req: ['r_outil2'], st: 4 },
  { id: 'r_absence', n: 'Machines autonomes', d: 'Production hors-ligne jusqu’à 24 h (au lieu de 8 h).', c: 1500, req: ['r_drones'], st: 4 },
  { id: 'r_boost2', n: 'Optimisation II', d: 'Terraformation +50 %.', c: 4000, req: ['r_boost1'], st: 6 },
  { id: 'r_terra4', n: 'Terraformation IV', d: 'Des machines cosmiques.', c: 6000, req: ['r_terra3', 'r_bananium'], st: 7 },
  { id: 'r_boost3', n: 'Optimisation III', d: 'Terraformation +100 %.', c: 15000, req: ['r_boost2'], st: 8 },
  { id: 'r_fusee', n: 'Fusée de la Fête', d: 'La fête ultime. Tu l’as méritée.', c: 30000, req: ['r_terra4'], st: 10 },
];
const RESI = Object.fromEntries(RES.map(r => [r.id, r]));

/* ---------- stades de la planète ---------- */
const STAGES = [
  { n: 'Caillou grognon', t: 0, d: 'Rien ne pousse, tout est grognon.' },
  { n: 'Brume rose', t: 300, d: 'Une brume rose se lève. C’est mignon.' },
  { n: 'Premières flaques', t: 1500, d: 'Les creux se remplissent d’eau.' },
  { n: 'Mousse timide', t: 6000, d: 'De la mousse apparaît. Elle rougit.' },
  { n: 'Ciel pastel', t: 25000, d: 'Le ciel prend des couleurs.' },
  { n: 'Pluie tiède', t: 100000, d: 'Il pleut parfois. C’est tiède. C’est bien.' },
  { n: 'Air respirable', t: 400000, d: 'On peut enlever le casque !' },
  { n: 'Herbe partout', t: 1.5e6, d: 'L’herbe pousse vraiment partout.' },
  { n: 'Forêts dansantes', t: 5e6, d: 'Des arbres poussent tout seuls.' },
  { n: 'Océans', t: 1.5e7, d: 'Les lacs deviennent bleus et pleins.' },
  { n: 'Paradis Goofy', t: 5e7, d: 'La planète la plus goofy de la galaxie.' },
];
function stageThr(n) { return n < STAGES.length ? STAGES[n].t : STAGES[10].t * Math.pow(3, n - 10); }
function stageName(n) { return n < STAGES.length ? STAGES[n].n : 'Paradis Goofy +' + (n - 10); }

/* ---------- créatures ---------- */
const MOBS = {
  blobo: { n: 'Blobo', b: [3, 0], c: '#7ce86a', drop: 'gelee', d: 'Gélatineux et très câlin. Fait « blop ».' },
  champi: { n: 'Champichon', b: [1], c: '#e0607a', drop: 'spore', d: 'Un cochon-champignon. Il sent le sous-bois.' },
  cristaloup: { n: 'Cristaloup', b: [2], c: '#4fe3e0', drop: 'cristal', d: 'Un chiot de cristal. Ne pas lancer de bâton : il le mange.' },
  pingou: { n: 'Pingouflon', b: [4], c: '#eef4ff', drop: 'glace', d: 'Mi-pingouin, mi-mouton, 100 % duvet.' },
  lavachat: { n: 'Lavachat', b: [5], c: '#ff7a3a', drop: 'soufre', d: 'Un chat de lave. Ronronne à 800 °C.' },
  canardo: { n: 'Canardo', b: [0, 3], c: '#ffd23f', drop: 'fruit', st: 2, d: 'Un canard extraterrestre. Ou un canard tout court ?' },
  meduse: { n: 'Flottigelée', b: [0, 1, 2, 3, 4, 5], c: '#c9a0ff', drop: 'gelee', night: 1, d: 'Flotte la nuit. Brille un peu. Ne pique pas.' },
};
const PET_NAMES = ['Gloubi', 'Bidule', 'Pompon', 'Choupette', 'Sergent Mou', 'Patate', 'Trucmuche', 'Zigouigoui', 'Biscotte', 'Nouille', 'Croquette', 'Moumoute', 'Gros Jean', 'Pétunia', 'Flan', 'Tartiflette', 'Cornichon', 'Bulot', 'Kiwi', 'Raclette', 'Capitaine Pouet', 'Mochi', 'Saucisse', 'Brioche'];

/* ---------- poissons (b: biome, -1 = partout ; r: poids de rareté) ---------- */
const FISH = [
  { id: 'chaussette', n: 'Poisson-chaussette', b: 0, r: 40, v: 4, c: ['#ff6f91', '#ffffff'] },
  { id: 'pyjama', n: 'Carpe-pyjama', b: 0, r: 18, v: 9, c: ['#8fb8ff', '#ffffff'] },
  { id: 'truite', n: 'Truite-champignon', b: 1, r: 40, v: 5, c: ['#e0607a', '#fff0d0'] },
  { id: 'anguille', n: 'Anguille-spaghetti', b: 1, r: 15, v: 10, c: ['#f2e070', '#c9a040'] },
  { id: 'cristalfish', n: 'Poisson-cristal', b: 2, r: 35, v: 6, c: ['#4fe3e0', '#d0ffff'] },
  { id: 'paillette', n: 'Sardine à paillettes', b: 2, r: 15, v: 12, c: ['#ff9ce0', '#fff04a'] },
  { id: 'grenouille', n: 'Grenouille qui se croit poisson', b: 3, r: 40, v: 4, c: ['#6ad050', '#2f7a30'] },
  { id: 'silure', n: 'Silure gluant', b: 3, r: 15, v: 12, c: ['#7a8a5a', '#b0e070'] },
  { id: 'moufle', n: 'Saumon-moufle', b: 4, r: 35, v: 6, c: ['#ff8a6a', '#d0e8ff'] },
  { id: 'glacon', n: 'Morue-glaçon', b: 4, r: 15, v: 12, c: ['#bfe9ff', '#ffffff'] },
  { id: 'pizzafish', n: 'Poisson-pizza', b: 5, r: 35, v: 8, c: ['#ffb050', '#e0402a'] },
  { id: 'thonvolcan', n: 'Thon volcanique', b: 5, r: 12, v: 16, c: ['#3a2a30', '#ff6a2a'] },
  { id: 'botte', n: 'Vieille botte', b: -1, r: 10, v: 1, c: ['#7a5a3a', '#4a3020'] },
  { id: 'requin', n: 'Requin en plastique', b: -1, r: 4, v: 30, c: ['#8fa0c0', '#ffffff'] },
  { id: 'banane', n: 'Poisson-banane', b: -1, r: 3, v: 40, st: 5, c: ['#fff04a', '#c0a020'] },
  { id: 'glouglou', n: 'Roi Glouglou', b: -1, r: 1, v: 200, st: 6, c: ['#ffd23f', '#ff4d6d'] },
];

/* ---------- cosmétiques ---------- */
const HATS = [
  ['none', 'Aucun', 'start'], ['casquette', 'Casquette', 'start'],
  ['cowboy', 'Chapeau de cowboy', 'shop:150'], ['antennes', 'Antennes', 'shop:90'], ['sombrero', 'Sombrero', 'shop:180'], ['hautforme', 'Haut-de-forme', 'shop:300'],
  ['bonnet', 'Bonnet à pompon', 'cap'], ['champi', 'Chapeau-champignon', 'cap'], ['poulpe', 'Poulpe affectueux', 'cap'], ['viking', 'Casque viking', 'cap'], ['lunettes', 'Lunettes 3D', 'cap'],
  ['banane', 'Banane', 'Récolter du bananium'], ['cone', 'Cône de chantier', '50 constructions'], ['helice', 'Casquette à hélice', '2 000 coups d’outil'],
  ['noeud', 'Gros nœud', '100 caresses'], ['pirate', 'Chapeau de pirate', '40 poissons'], ['poisson', 'Tête de poisson', 'Pêcher le Roi Glouglou'],
  ['canard', 'Canard sur la tête', '50 canards ramassés'], ['chef', 'Toque de chef', '10 plats mangés'], ['couronne', 'Couronne', 'Stade 5'],
  ['fleur', 'Couronne de fleurs', 'Stade 7'], ['canardroi', 'Couronne du Canard', '8 statues de canard'], ['aureole', 'Auréole', 'Stade 10'], ['fete', 'Chapeau de fête', 'Lancer la fusée'],
];
const SUITS = [
  ['orange', 'Orange Aurore', '#f0a030', 'start'], ['teal', 'Bleu-vert', '#2fb7a8', 'start'], ['blanc', 'Blanc NASA', '#e8e8f0', 'start'],
  ['rose', 'Rose bonbon', '#ff8ac0', 'shop:100'], ['menthe', 'Menthe', '#7de0b0', 'shop:100'], ['violet', 'Violet', '#9a6aff', 'shop:100'], ['jaune', 'Jaune poussin', '#ffd84a', 'shop:100'], ['rouge', 'Rouge pompier', '#e8483a', 'shop:120'],
  ['noir', 'Noir classe', '#3a3448', '50 commandes livrées'], ['camo', 'Camouflage', '#6a8a4a', '25 capsules ouvertes'], ['dore', 'Doré', '#ffcc33', '200 constructions'], ['arcenciel', 'Arc-en-ciel', '#ff6f91', 'Lancer la fusée'],
];

/* ---------- trophées (discrets : juste pour la collection) ---------- */
const TROPHIES = [
  ['hits100', 'Petit·e bûcheron·ne', '100 coups d’outil', () => cnt('hits') >= 100],
  ['hits2k', 'Machine à récolter', '2 000 coups d’outil', () => cnt('hits') >= 2000, { hat: 'helice' }],
  ['b10', 'Architecte', '10 constructions', () => cnt('build') >= 10],
  ['b50', 'Urbaniste', '50 constructions', () => cnt('build') >= 50, { hat: 'cone' }],
  ['b200', 'Promoteur·rice cosmique', '200 constructions', () => cnt('build') >= 200, { suit: 'dore' }],
  ['pet10', 'Câlineur·se', '10 caresses', () => cnt('pet') >= 10],
  ['pet100', 'Câlins à volonté', '100 caresses', () => cnt('pet') >= 100, { hat: 'noeud' }],
  ['gold', 'Ça brille !', 'Croiser une créature dorée', () => cnt('goldseen') >= 1],
  ['tame3', 'Ménagerie', 'Adopter 3 créatures', () => cnt('tame') >= 3],
  ['zoo', 'Zoologiste', 'Rencontrer les 7 espèces', () => nMobs() >= 7],
  ['fish10', 'Patience de pêcheur', '10 poissons', () => cnt('fish') >= 10],
  ['fish40', 'Vieux loup de mer', '40 poissons', () => cnt('fish') >= 40, { hat: 'pirate' }],
  ['fishall', 'Encyclopédie aquatique', 'Toutes les espèces de poissons', () => nFish() >= FISH.length],
  ['king', 'Sa Majesté Glouglou', 'Pêcher le Roi Glouglou', () => !!G.fish.glouglou, { hat: 'poisson' }],
  ['cap1', 'Colis surprise', 'Ouvrir une capsule', () => cnt('cap') >= 1],
  ['cap25', 'Fouineur·se de l’espace', '25 capsules', () => cnt('cap') >= 25, { suit: 'camo' }],
  ['mono8', 'Grand prêtre du Canard', '8 statues de canard', () => cnt('mono') >= 8, { hat: 'canardroi' }],
  ['ducks50', 'Pluie de canards', '50 canards ramassés', () => cnt('ducks') >= 50, { hat: 'canard' }],
  ['eat10', 'Gourmet de l’espace', '10 plats mangés', () => cnt('eat') >= 10, { hat: 'chef' }],
  ['bana', 'Ça glisse', 'Récolter du bananium', () => cnt('got_bananium') >= 1, { hat: 'banane' }],
  ['exp25', 'Promeneur·se', 'Explorer 25 % de la planète', () => explored() >= .25],
  ['exp60', 'Cartographe', 'Explorer 60 %', () => explored() >= .6],
  ['exp95', 'Tour du monde', 'Explorer 95 %', () => explored() >= .95],
  ['walk', 'Marathonien·ne', 'Marcher 42 km', () => cnt('walk') >= 42000],
  ['st1', 'Brume rose', 'Stade 1', () => stg() >= 1],
  ['st3', 'Mousse timide', 'Stade 3', () => stg() >= 3],
  ['st5', 'Pluie tiède', 'Stade 5', () => stg() >= 5, { hat: 'couronne' }],
  ['st7', 'Herbe partout', 'Stade 7', () => stg() >= 7, { hat: 'fleur' }],
  ['st10', 'Paradis', 'Stade 10', () => stg() >= 10, { hat: 'aureole' }],
  ['st15', 'Au-delà du paradis', 'Stade 15', () => stg() >= 15],
  ['coins', 'Riche comme Zorg', 'Gagner 2 000 pièces', () => cnt('coins') >= 2000],
  ['ord10', 'Livreur·se express', '10 commandes livrées', () => cnt('order') >= 10],
  ['ord50', 'Partenaire de Zorg', '50 commandes livrées', () => cnt('order') >= 50, { suit: 'noir' }],
  ['com100', 'Nid douillet', '100 de confort', () => comfort() >= 100],
  ['com300', 'Palace', '300 de confort', () => comfort() >= 300],
  ['sleep', 'Gros dodo', 'Dormir dans un lit', () => cnt('sleep') >= 1],
  ['flush', 'Chasse royale', 'Tirer la chasse des toilettes en or', () => cnt('flush') >= 1],
  ['trampo', 'Boing boing', '30 sauts de trampoline', () => cnt('boing') >= 30],
  ['d10', 'Habitué·e', 'Atteindre le jour 10', () => dayN() >= 10],
  ['d100', 'Résident·e permanent·e', 'Atteindre le jour 100', () => dayN() >= 100],
  ['hats15', 'Fashion week', 'Posséder 15 chapeaux', () => G.hats.length >= 15],
  ['res20', 'Puits de science', '20 recherches', () => G.res.length >= 20],
  ['resall', 'Savant·e fou·folle', 'Toutes les recherches', () => G.res.length >= RES.length],
  ['launch', 'Fête cosmique', 'Lancer la fusée', () => cnt('launch') >= 1, { hat: 'fete', suit: 'arcenciel' }],
];

/* ---------- répliques ---------- */
const INTRO = [
  ['', '…bip… …bip… …BIIIIP…'],
  ['', 'L’Aurore-7 vient de faire un atterrissage. Enfin… un « atterrissage ».'],
  ['{me}', 'Aïe. Ma tête. Pourquoi le ciel est violet ?'],
  ['{p}', '{me} ! Tu es vivant·e ! J’ai cru que tu étais un rocher. Je t’ai parlé pendant dix minutes.'],
  ['{me}', 'On est où ?'],
  ['{p}', 'Sur Nérys. Une exoplanète. Grognonne, froide, sans air, sans eau. Le rêve.'],
  ['{p}', 'Bonne nouvelle : l’ordinateur de bord marche encore et il fait de la science tout seul. Bip boup.'],
  ['{p}', 'Plan : on récupère des trucs, on construit des machines et on rend cette planète vivable. Sans se presser.'],
  ['{me}', 'Et on commence par quoi ?'],
  ['{p}', 'Par ce que tu veux. C’est toi le·la chef. Moi je te suis et je dis des bêtises.'],
  ['', 'Joystick : bouger. Bouton A : récolter et interagir. Marteau : construire. Sac : menu.'],
];
const SAY_IDLE = [
  'J’ai léché un cristal. Ne fais pas ça.', 'Tu crois que les rochers ont des sentiments ?', 'J’ai nommé ce caillou Gérard.', 'Ma combinaison sent la soupe. Je ne sais pas pourquoi.',
  'Si on trouve un canard, on l’appelle Capitaine.', 'Je me demande si on peut faire des crêpes avec de la gelée.', 'On est les premiers humains ici. Fais une tête sérieuse.',
  'Mon casque a une rayure. Je vois tout en deux.', 'J’ai l’impression que les machines nous regardent.', 'Pause pipi ? Non ? D’accord.', 'J’ai compté les étoiles. J’en suis à quatre.',
  'Tu as vu ce rocher ? Il a une tête de patate.', 'Si on rentre un jour, je raconte que j’ai tout fait toute seule. Ou tout seul.', '♪ Lalalaaa… ♪', 'Hé. Hé. Hé. Rien. Je voulais juste dire hé.',
  'Ma grand-mère disait : une planète par jour éloigne le médecin.', 'J’ai faim. J’ai toujours faim. C’est l’espace.', 'Je crois que j’ai marché dans de la gelée.',
];
const SAY_BIOME = [
  ['Ah, la plaine. Violette. Comme mes rêves.', 'Ici c’est chez nous. Enfin, c’est l’épave.'],
  ['Ces champignons sont plus grands que notre vaisseau.', 'Ça sent la forêt. Et le fromage. Surtout le fromage.'],
  ['Ça brille tellement que j’ai mis mes lunettes de soleil. À l’intérieur du casque.', 'Du sable rose. On dirait une plage de vacances bizarre.'],
  ['C’est gluant. Tout est gluant. MÊME L’AIR.', 'J’ai perdu une botte. Ah non, elle est là.'],
  ['Brrr. J’ai froid jusqu’au fond des chaussettes.', 'Ça pétille sous les pieds. C’est de la neige gazeuse ?'],
  ['Chaud chaud chaud. On grille comme des marshmallows.', 'Si tu tombes dans la lave, je garde ton chapeau.'],
];
const SAY_NIGHT = ['Il fait nuit. Les machines brillent. C’est joli, non ?', 'Tu as peur du noir ? Moi non. Un peu. Beaucoup.', 'Les Flottigelées sortent la nuit. Elles sont toutes douces.'];
const SAY_HELMET = ['On peut enlever le casque !! Respire ! Ça sent… la planète !', 'Mes cheveux sont tout aplatis. Ne regarde pas.'];
const ZORG = ['Bienvenue, petits terriens ! Zorg vend, Zorg achète, Zorg ne rembourse pas.', 'Ma théière volante consomme du thé. Beaucoup de thé.', 'Prix d’ami ! Vous n’êtes pas mes amis, mais prix d’ami quand même.', 'Zorg a vu des planètes plus goofy. Non. Zorg ment.', 'Revenez vite, Zorg s’ennuie entre deux galaxies.'];
const ENDING = [
  ['{p}', 'Regarde-la. Notre planète. Elle est verte, bleue, rose… et complètement goofy.'],
  ['{me}', 'On a vraiment fait tout ça ?'],
  ['{p}', 'Avec quelques milliers de coups de multi-outil. Et une bonne dose de bêtises.'],
  ['{me}', 'On reste ?'],
  ['{p}', 'Évidemment qu’on reste. Il y a encore des poissons à pêcher et des canards à caresser.'],
  ['', '★ Merci d’avoir joué à Nérys ★  La planète continue de vivre : tu peux continuer aussi longtemps que tu veux.'],
];

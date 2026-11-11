export const COMPETENCES_360 = [
  "Administration systèmes et réseaux", "Gestion des logiciels et applications", "Support technique",
  "Programmation et gestion web", "Cybersécurité", "Gestion des données", "Cloud computing",
  "Intelligence artificielle", "IA générative", "Relationnel et communication",
  "Veille technologique et enjeux environnementaux", "Gestion de projets IT",
] as const;

const HINTS: [RegExp, number[]][] = [
  [/web|digital|e-?commerce|agence|saas|logiciel|num[ée]rique/i, [3, 1, 11]],
  [/banque|assurance|finance|fintech/i, [5, 4, 11, 9]],
  [/sant[ée]|hopital|clinique|pharma/i, [5, 4, 5]],
  [/cloud|h[ée]bergement|infra|r[ée]seau|t[ée]l[ée]com/i, [0, 6, 4, 2]],
  [/data|donn[ée]es|analytics|bi\b/i, [5, 7, 3]],
  [/ia\b|intelligence artificielle|machine learning|recherche/i, [7, 8, 5]],
  [/industrie|logistique|transport|[ée]nergie|environnement/i, [10, 0, 11, 5]],
  [/conseil|esn|ssii|services?/i, [11, 9, 3, 2]],
];

/** Suggestion (modifiable) de compétences 360 pertinentes selon le secteur saisi. */
export function suggestSkills360(sector: string): string[] {
  const idx = new Set<number>([9]);
  for (const [re, list] of HINTS) if (re.test(sector)) list.forEach((i) => idx.add(i));
  if (idx.size === 1) [3, 5, 2].forEach((i) => idx.add(i));
  return [...idx].slice(0, 5).map((i) => COMPETENCES_360[i]);
}

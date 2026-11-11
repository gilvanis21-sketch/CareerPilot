export type ContractType = "STAGE" | "ALTERNANCE" | "APPRENTISSAGE" | "PROFESSIONNALISATION" | "CDI" | "CDD" | "AUTRE";

export interface RawOffer {
  externalId: string;
  title: string;
  company?: string;
  location?: string;
  contractType: ContractType;
  description?: string;
  skills?: string[];
  sector?: string;
  publishedAt?: Date;
  deadline?: Date;
  url: string;
}

export interface SearchQuery {
  keywords: string[];
  location?: string;
  goal: "STAGE" | "ALTERNANCE";
}

/**
 * Un connecteur = une source. Pour en ajouter une : implémenter cette interface,
 * vérifier ses conditions d'utilisation (termsUrl/termsNote), l'enregistrer dans registry.ts.
 */
export interface Connector {
  slug: string;
  name: string;
  kind: "API_OFFICIELLE" | "JOBBOARD" | "AGREGATEUR" | "SITE_CARRIERE" | "MEDIA" | "LIEN_RECHERCHE" | "DEMO";
  termsUrl?: string;
  termsNote: string;
  /** false = clé/autorisation manquante : la source est ignorée (pas d'erreur). */
  isConfigured(): boolean;
  /** Absent pour les sources "liens de recherche" (aucune collecte automatique). */
  search?(q: SearchQuery): Promise<RawOffer[]>;
  /** Pour LinkedIn & co : liens préremplis que l'étudiant ouvre lui-même. */
  searchLinks?(q: SearchQuery): { label: string; url: string }[];
}

import type { ContractType } from "@/connectors/types";

/**
 * Jeu de référence FICTIF (20 offres) pour mesurer le matching.
 * Profil cible : étudiante B3 Informatique, recherche une ALTERNANCE (web / data / DevOps junior).
 * Annotation `relevant` = jugement de pertinence pour CE profil, écrit indépendamment de l'algorithme.
 * ⚠ Annotation à faire valider/compléter par un humain (tuteur) avant toute conclusion forte.
 */
export const BENCHMARK_PROFILE = {
  formation: "Bachelor 3 Informatique – aivancity",
  studyYear: "B3" as const,
  goal: "ALTERNANCE" as const,
  keywords: ["développeur", "data"],
  skills: ["Python", "SQL", "Docker", "React", "Git", "Scrum", "Anglais"],
  experiences: ["Stage développeur web – Agence Fictive", "Projet étudiant : application de gestion de stock"],
};

export interface BenchOffer {
  externalId: string;
  title: string;
  company: string;
  location: string;
  contractType: ContractType;
  description: string;
  skills: string[];
  sector: string;
  daysAgo: number;
  relevant: boolean;
  why: string;
}

export const BENCHMARK_OFFERS: BenchOffer[] = [
  { externalId: "b01", title: "Alternance Développeur Web Full Stack (H/F)", company: "NovaWeb", location: "Paris (75)", contractType: "ALTERNANCE", sector: "Numérique", daysAgo: 2, skills: ["React", "Node.js", "Git"], description: "Rejoignez notre équipe produit pour développer des interfaces React et des API Node.js. Méthodes Agile/Scrum, Git, tests.", relevant: true, why: "Cœur de cible : web, React, Git, Scrum, alternance" },
  { externalId: "b02", title: "Alternance Data Analyst", company: "DataLoop", location: "Lyon (69)", contractType: "ALTERNANCE", sector: "Données", daysAgo: 5, skills: ["SQL", "Python", "Power BI"], description: "Analyse de données, requêtes SQL, scripts Python, tableaux de bord Power BI.", relevant: true, why: "SQL + Python, data, alternance" },
  { externalId: "b03", title: "Alternant DevOps junior", company: "CloudNine", location: "Paris (75)", contractType: "APPRENTISSAGE", sector: "Cloud", daysAgo: 1, skills: ["Docker", "Linux", "CI/CD", "Git"], description: "Conteneurisation avec Docker, pipelines CI/CD, administration Linux, supervision.", relevant: true, why: "Docker, Git, apprentissage, junior" },
  { externalId: "b04", title: "Alternance Développeur Python / IA", company: "Synapse Labs", location: "Remote / Paris", contractType: "ALTERNANCE", sector: "Intelligence artificielle", daysAgo: 7, skills: ["Python", "Pandas", "Scikit-learn", "Git"], description: "Prototypage de modèles de machine learning en Python, traitement de données avec Pandas.", relevant: true, why: "Python, data, IA, alternance" },
  { externalId: "b05", title: "Apprenti développeur front-end React", company: "PixelForge", location: "Nantes (44)", contractType: "APPRENTISSAGE", sector: "Numérique", daysAgo: 3, skills: ["React", "TypeScript", "HTML", "CSS"], description: "Intégration et développement d'interfaces React/TypeScript, design system, accessibilité.", relevant: true, why: "React, front-end, apprentissage" },
  { externalId: "b06", title: "Alternance Ingénieur Data (BI)", company: "Banque Fictive", location: "La Défense (92)", contractType: "PROFESSIONNALISATION", sector: "Finance", daysAgo: 10, skills: ["SQL", "Python", "Excel"], description: "Alimentation d'un datawarehouse, requêtes SQL, reporting, automatisation Python.", relevant: true, why: "SQL/Python, data, professionnalisation" },
  { externalId: "b07", title: "Alternance Développeur Java Spring", company: "AssurTech", location: "Lille (59)", contractType: "ALTERNANCE", sector: "Assurance", daysAgo: 4, skills: ["Java", "Spring", "SQL", "Git"], description: "Développement de micro-services Java/Spring, base de données SQL, méthodes Agile.", relevant: true, why: "Développeur, SQL, Git, Agile ; Java absent du profil mais compatible niveau B3 (pertinence partielle)" },
  { externalId: "b08", title: "Alternance Administrateur Systèmes et Réseaux", company: "InfraPlus", location: "Toulouse (31)", contractType: "ALTERNANCE", sector: "Infrastructure", daysAgo: 6, skills: ["Linux", "Active Directory", "Docker"], description: "Administration serveurs Linux et Windows, Active Directory, supervision, conteneurs Docker.", relevant: true, why: "Informatique, Docker, alternance (pertinence moyenne)" },
  { externalId: "b09", title: "Alternance Développeur Mobile Flutter", company: "AppMakers", location: "Bordeaux (33)", contractType: "ALTERNANCE", sector: "Numérique", daysAgo: 12, skills: ["Dart", "Flutter", "Git"], description: "Développement d'applications mobiles Flutter, intégration d'API REST, Git.", relevant: false, why: "Développement mais Flutter/Dart sans lien avec le profil (écarté)" },
  { externalId: "b10", title: "Alternance Chef de projet digital", company: "AgenceCom", location: "Paris (75)", contractType: "ALTERNANCE", sector: "Communication", daysAgo: 8, skills: ["Scrum", "Jira"], description: "Pilotage de projets web, coordination des équipes, Scrum, reporting client.", relevant: true, why: "Scrum/gestion de projet IT, alternance (pertinence moyenne)" },
  { externalId: "b11", title: "Développeur Java Senior (H/F) - 8 ans d'expérience", company: "BigCorp", location: "Paris (75)", contractType: "CDI", sector: "Numérique", daysAgo: 1, skills: ["Java", "Kubernetes", "AWS"], description: "Poste confirmé, 8 ans d'expérience minimum, architecture micro-services, encadrement d'équipe.", relevant: false, why: "CDI senior, hors cible" },
  { externalId: "b12", title: "Stage Développeur Web (6 mois)", company: "WebStudio", location: "Paris (75)", contractType: "STAGE", sector: "Numérique", daysAgo: 2, skills: ["React", "Git"], description: "Stage de 6 mois sur notre plateforme React.", relevant: false, why: "Bon contenu mais STAGE alors que l'objectif est l'ALTERNANCE" },
  { externalId: "b13", title: "Alternance Assistant comptable", company: "Cabinet Dubois", location: "Rennes (35)", contractType: "ALTERNANCE", sector: "Comptabilité", daysAgo: 3, skills: ["Excel"], description: "Saisie comptable, rapprochements bancaires, déclarations de TVA.", relevant: false, why: "Hors domaine" },
  { externalId: "b14", title: "Alternance Commercial B2B", company: "SalesUp", location: "Paris (75)", contractType: "ALTERNANCE", sector: "Vente", daysAgo: 5, skills: ["Prospection", "CRM"], description: "Prospection téléphonique, rendez-vous clients, suivi CRM.", relevant: false, why: "Hors domaine" },
  { externalId: "b15", title: "Apprenti cuisinier", company: "Maison Gourmande", location: "Lyon (69)", contractType: "APPRENTISSAGE", sector: "Restauration", daysAgo: 9, skills: [], description: "Préparation des plats, respect des normes d'hygiène HACCP.", relevant: false, why: "Hors domaine" },
  { externalId: "b16", title: "Data Scientist confirmé - CDI", company: "Predictia", location: "Paris (75)", contractType: "CDI", sector: "Intelligence artificielle", daysAgo: 2, skills: ["Python", "TensorFlow", "SQL"], description: "5 ans d'expérience requis, déploiement de modèles en production.", relevant: false, why: "Bon domaine mais CDI confirmé" },
  { externalId: "b17", title: "Alternance Infirmier(ère) en soins généraux", company: "Clinique Fictive", location: "Marseille (13)", contractType: "ALTERNANCE", sector: "Santé", daysAgo: 4, skills: [], description: "Soins infirmiers, suivi des patients, travail en équipe pluridisciplinaire.", relevant: false, why: "Hors domaine" },
  { externalId: "b18", title: "Stage Analyste cybersécurité", company: "SecuriNet", location: "Paris (75)", contractType: "STAGE", sector: "Cybersécurité", daysAgo: 6, skills: ["Wireshark", "Nmap", "Linux"], description: "Audit de sécurité, analyse de journaux, tests d'intrusion.", relevant: false, why: "STAGE et compétences cybersécurité absentes du profil" },
  { externalId: "b19", title: "Alternance Graphiste / Motion designer", company: "Studio Lumière", location: "Paris (75)", contractType: "ALTERNANCE", sector: "Création", daysAgo: 11, skills: ["Figma", "After Effects"], description: "Création de visuels et d'animations pour les réseaux sociaux.", relevant: false, why: "Hors domaine principal" },
  { externalId: "b20", title: "Technicien support informatique - CDD 3 mois", company: "HelpDeskPro", location: "Lille (59)", contractType: "CDD", sector: "Support", daysAgo: 15, skills: ["Windows", "Support"], description: "Assistance aux utilisateurs, gestion des tickets, installation de postes.", relevant: false, why: "CDD, ni stage ni alternance" },
];

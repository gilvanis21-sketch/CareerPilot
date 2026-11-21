import { demo } from "./demo";
import { franceTravail } from "./france-travail";
import { laBonneAlternance } from "./la-bonne-alternance";
import { linkedin } from "./linkedin";
import type { Connector } from "./types";

/** Ajouter une source = importer son connecteur ici (voir docs/connectors.md). */
export const CONNECTORS: Connector[] = [laBonneAlternance, franceTravail, linkedin, demo];
export const getConnector = (slug: string) => CONNECTORS.find((c) => c.slug === slug);

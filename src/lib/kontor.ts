import type { Koordinat } from "../types";

/**
 * Kontoret vises alltid på kartet, som fast referansepunkt for crewet, og er
 * utgangspunktet for kjøretiden på hvert oppdrag.
 *
 * Posisjonen er målt opp på selve bygget og ligger her som en fast koordinat,
 * ikke som et adresseoppslag: Økern Portal dekker flere adresser, og
 * Kartverkets treff på gateadressen lander ikke nødvendigvis på inngangen
 * crewet kjører fra. Skal punktet flyttes, er det denne konstanten som endres.
 */
export const KONTOR = {
  navn: "Telia – Økern Portal",
  adresse: "Lørenfaret 1, Oslo",
  posisjon: { lat: 59.931173, lon: 10.798813 } satisfies Koordinat,
};

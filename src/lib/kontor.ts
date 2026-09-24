import type { Koordinat } from "../types";

export type Kontor = {
  navn: string;
  /** Kort stedsnavn brukt i teksten, som i «Ca. 23 min fra Bergen». */
  sted: string;
  adresse: string;
  posisjon: Koordinat;
};

/**
 * Hovedkontoret vises alltid på kartet, som fast referansepunkt for crewet, og
 * er der kartet starter.
 *
 * Posisjonen er målt opp på selve bygget og ligger her som en fast koordinat,
 * ikke som et adresseoppslag: Økern Portal dekker flere adresser, og
 * Kartverkets treff på gateadressen lander ikke nødvendigvis på inngangen
 * crewet kjører fra. Skal punktet flyttes, er det denne konstanten som endres.
 */
export const KONTOR: Kontor = {
  navn: "Telia – Økern Portal",
  sted: "Økern",
  adresse: "Lørenfaret 1, Oslo",
  posisjon: { lat: 59.931173, lon: 10.798813 },
};

/**
 * Alle kontorene kjøretid regnes fra. Hvert stopp får kjøretiden fra det
 * kontoret som ligger nærmest i luftlinje – et oppdrag i Bergen skal ikke
 * vise sju timer fra Oslo.
 *
 * Som for Økern er posisjonene faste koordinater, ikke oppslag. De er satt ut
 * fra gateadressen; flyttes et kontor, eller treffer punktet feil inngang,
 * er det konstanten her som endres.
 */
export const KONTORER: Kontor[] = [
  KONTOR,
  {
    navn: "Telia – Bergen",
    sted: "Bergen",
    adresse: "Fjøsangerveien 50, 5059 Bergen",
    posisjon: { lat: 60.36205, lon: 5.34392 },
  },
  {
    navn: "Telia – Trondheim",
    sted: "Trondheim",
    adresse: "Skonnertvegen 7, 7053 Trondheim",
    posisjon: { lat: 63.43005, lon: 10.51652 },
  },
  {
    navn: "Telia – Kristiansand",
    sted: "Kristiansand",
    adresse: "Henrik Wergelands gate 24, Kristiansand",
    posisjon: { lat: 58.14668, lon: 7.99148 },
  },
];

const JORDRADIUS_M = 6_371_000;

/** Kontoret som ligger nærmest punktet i luftlinje. */
export function naermesteKontor(punkt: Koordinat): Kontor {
  let naermest = KONTORER[0];
  let korteste = Infinity;
  for (const kontor of KONTORER) {
    const avstand = luftlinjeMeter(kontor.posisjon, punkt);
    if (avstand < korteste) {
      naermest = kontor;
      korteste = avstand;
    }
  }
  return naermest;
}

/** Avstand i meter mellom to koordinater (haversine). */
export function luftlinjeMeter(fra: Koordinat, til: Koordinat): number {
  const tilRadianer = (grader: number) => (grader * Math.PI) / 180;
  const dLat = tilRadianer(til.lat - fra.lat);
  const dLon = tilRadianer(til.lon - fra.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(tilRadianer(fra.lat)) * Math.cos(tilRadianer(til.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * JORDRADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

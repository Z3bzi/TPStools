import type { Koordinat } from "../types";

/**
 * Crewet kjører alltid ut fra Økern Portal, så kjøretiden på hvert oppdrag
 * regnes herfra. Skal oppmøtestedet endres, er det denne konstanten som
 * redigeres – ingen andre steder i appen har adressen hardkodet.
 *
 * Koordinatene peker på Økern Portal i Oslo og er nøyaktige nok til at
 * kjøretiden stemmer på minuttet; juster dem om markøren står litt skjevt.
 */
export const STARTPUNKT: Koordinat & { navn: string } = {
  navn: "Økern Portal",
  lat: 59.929,
  lon: 10.8062,
};

import { KONTOR } from "./kontor";
import type { Kjoretid, Koordinat } from "../types";

const OSRM_URL = "https://router.project-osrm.org/table/v1/driving";

/**
 * Adresser per tabellkall. OSRMs demoserver tar maks 100 punkter i slengen, og
 * kortere kall gir svar på lista før hele leveransen er rutet.
 */
const MAKS_PER_KALL = 24;

/** Veien er lengre enn luftlinja. Faktoren brukes kun i fallback-anslaget. */
const OMVEISFAKTOR = 1.35;
/**
 * Snittfart i fallback-anslaget. Korte turer går i by med lys og kø, lange
 * turer ligger mest på hovedvei – én fart for alt bommer grovt på begge.
 */
const SNITTFART_KMT: { opptilKm: number; fart: number }[] = [
  { opptilKm: 5, fart: 30 },
  { opptilKm: 25, fart: 45 },
  { opptilKm: Infinity, fart: 70 },
];
const JORDRADIUS_M = 6_371_000;

type OsrmTabell = {
  code?: string;
  /** Én rad per kilde; her bare kontoret. Sekunder til hvert mål. */
  durations?: (number | null)[][];
  /** Samme form som durations, i meter. Demoserveren kan utelate den. */
  distances?: (number | null)[][];
};

/**
 * Estimert kjøretid fra kontoret til hvert av målene, i samme rekkefølge.
 *
 * Primærkilden er OSRMs åpne demo-API, som ruter på ekte veinett uten
 * API-nøkkel – samme prinsipp som adresseoppslaget hos Kartverket. Tabell-
 * tjenesten gir alle adressene i én forespørsel, slik at en importert
 * leveranseliste ikke blir til like mange kall som den har rader.
 *
 * Svarer ikke tjenesten, faller hvert mål tilbake på et anslag regnet fra
 * luftlinje. Resultatet er merket med `kilde`, så UI-et kan si fra hvilket av
 * tallene det viser.
 *
 * Kaster bare når `signal` avbryter oppslaget; ellers gir den alltid svar.
 */
export async function hentKjoretider(
  mal: Koordinat[],
  signal?: AbortSignal,
): Promise<Kjoretid[]> {
  const fra = KONTOR.posisjon;
  const kjoretider: Kjoretid[] = [];

  // Bitene tas etter tur, ikke parallelt: demoserveren er en delt ressurs, og
  // lista fylles inn ovenfra uansett.
  for (let start = 0; start < mal.length; start += MAKS_PER_KALL) {
    const bit = mal.slice(start, start + MAKS_PER_KALL);

    let rutet: Kjoretid[] | null = null;
    try {
      rutet = await hentOsrmTabell(fra, bit, signal);
    } catch (feil) {
      if (feil instanceof DOMException && feil.name === "AbortError") throw feil;
      // Alt annet – nett, CORS, ugyldig JSON – havner i anslaget under.
    }

    kjoretider.push(...(rutet ?? bit.map((punkt) => anslaFraLuftlinje(fra, punkt))));
  }

  return kjoretider;
}

async function hentOsrmTabell(
  fra: Koordinat,
  mal: Koordinat[],
  signal?: AbortSignal,
): Promise<Kjoretid[] | null> {
  // OSRM tar koordinatene som lon,lat – motsatt rekkefølge av Leaflet.
  const punkter = [fra, ...mal].map((p) => `${p.lon},${p.lat}`).join(";");
  const params = new URLSearchParams({
    // Kontoret er eneste kilde: én rad ut, ikke en full matrise.
    sources: "0",
    annotations: "duration,distance",
  });

  const respons = await fetch(`${OSRM_URL}/${punkter}?${params}`, { signal });
  if (!respons.ok) return null;

  const data = (await respons.json()) as OsrmTabell;
  if (data.code !== "Ok") return null;

  // Første kolonne er kontoret til seg selv, så målene starter på indeks 1.
  const sekunder = data.durations?.[0]?.slice(1);
  const meter = data.distances?.[0]?.slice(1);
  if (!sekunder || sekunder.length !== mal.length) return null;

  const kjoretider: Kjoretid[] = [];
  for (const [indeks, tid] of sekunder.entries()) {
    // Et enkelt mål uten rute (øy, adresse langt fra vei) skal ikke felle
    // resten av biten – det får anslaget sitt i stedet.
    if (typeof tid !== "number") {
      kjoretider.push(anslaFraLuftlinje(fra, mal[indeks]));
      continue;
    }

    const avstand = meter?.[indeks];
    kjoretider.push({
      sekunder: tid,
      meter: typeof avstand === "number" ? avstand : null,
      kilde: "vei",
    });
  }

  return kjoretider;
}

/** Grovt anslag når ruting ikke er tilgjengelig: luftlinje × omvei ÷ snittfart. */
function anslaFraLuftlinje(fra: Koordinat, til: Koordinat): Kjoretid {
  const meter = luftlinjeMeter(fra, til) * OMVEISFAKTOR;
  const km = meter / 1000;
  const fart = SNITTFART_KMT.find((trinn) => km <= trinn.opptilKm)?.fart ?? 70;
  return { sekunder: (km / fart) * 3600, meter, kilde: "luftlinje" };
}

/** Avstand i meter mellom to koordinater (haversine). */
function luftlinjeMeter(fra: Koordinat, til: Koordinat): number {
  const tilRadianer = (grader: number) => (grader * Math.PI) / 180;
  const dLat = tilRadianer(til.lat - fra.lat);
  const dLon = tilRadianer(til.lon - fra.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(tilRadianer(fra.lat)) * Math.cos(tilRadianer(til.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * JORDRADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Kjøretid som «23 min» eller «1 t 20 min», rundet til nærmeste minutt. */
export function formaterVarighet(sekunder: number): string {
  const minutter = Math.max(1, Math.round(sekunder / 60));
  if (minutter < 60) return `${minutter} min`;

  const timer = Math.floor(minutter / 60);
  const resten = minutter % 60;
  return resten === 0 ? `${timer} t` : `${timer} t ${resten} min`;
}

/** Kjørelengde som «4,2 km» eller «37 km». */
export function formaterAvstand(meter: number): string {
  const km = meter / 1000;
  const desimaler = km < 10 ? 1 : 0;
  return `${km.toLocaleString("nb-NO", {
    minimumFractionDigits: desimaler,
    maximumFractionDigits: desimaler,
  })} km`;
}

import type { Kjoretid, Koordinat } from "../types";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

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

type OsrmRute = {
  /** Kjøretid i sekunder. */
  duration?: number;
  /** Kjørelengde i meter. */
  distance?: number;
};

type OsrmRespons = {
  code?: string;
  routes?: OsrmRute[];
};

/**
 * Estimert kjøretid mellom to punkter.
 *
 * Primærkilden er OSRMs åpne demo-API, som ruter på ekte veinett uten
 * API-nøkkel – samme prinsipp som adresseoppslaget hos Kartverket. Svarer den
 * ikke, faller vi tilbake på et anslag regnet fra luftlinje. Resultatet er
 * merket med `kilde`, slik at UI-et kan si fra hvilket av tallene det viser.
 *
 * Kaster bare når `signal` avbryter oppslaget; ellers gir den alltid et svar.
 */
export async function hentKjoretid(
  fra: Koordinat,
  til: Koordinat,
  signal?: AbortSignal,
): Promise<Kjoretid> {
  try {
    const rute = await hentOsrmRute(fra, til, signal);
    if (rute) {
      return { sekunder: rute.duration, meter: rute.distance, kilde: "vei" };
    }
  } catch (feil) {
    if (feil instanceof DOMException && feil.name === "AbortError") throw feil;
    // Alt annet – nett, CORS, ugyldig JSON – havner i anslaget under.
  }

  return anslaFraLuftlinje(fra, til);
}

async function hentOsrmRute(
  fra: Koordinat,
  til: Koordinat,
  signal?: AbortSignal,
): Promise<{ duration: number; distance: number } | null> {
  // OSRM tar koordinatene som lon,lat – motsatt rekkefølge av Leaflet.
  const punkter = `${fra.lon},${fra.lat};${til.lon},${til.lat}`;
  const respons = await fetch(`${OSRM_URL}/${punkter}?overview=false`, { signal });
  if (!respons.ok) return null;

  const data = (await respons.json()) as OsrmRespons;
  if (data.code !== "Ok") return null;

  const [rute] = data.routes ?? [];
  if (typeof rute?.duration !== "number" || typeof rute.distance !== "number") return null;

  return { duration: rute.duration, distance: rute.distance };
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

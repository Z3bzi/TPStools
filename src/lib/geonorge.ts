import type { AdresseTreff } from "../types";

const SOK_URL = "https://ws.geonorge.no/adresser/v1/sok";

type GeonorgeAdresse = {
  adressetekst?: string;
  postnummer?: string;
  poststed?: string;
  kommunenavn?: string;
  representasjonspunkt?: {
    lat?: number;
    lon?: number;
  };
};

type GeonorgeRespons = {
  adresser?: GeonorgeAdresse[];
};

export class GeokodingFeil extends Error {}

/**
 * Slår opp en norsk adresse via Kartverkets åpne adresse-API.
 * Ingen API-nøkkel kreves, og oppslaget skjer direkte fra nettleseren.
 *
 * @throws {GeokodingFeil} når tjenesten svarer med feil, eller ingen adresse har koordinater.
 */
export async function sokAdresse(
  sok: string,
  signal?: AbortSignal,
): Promise<AdresseTreff[]> {
  const params = new URLSearchParams({
    sok,
    treffPerSide: "5",
    // EPSG:4326 (WGS84) er koordinatsystemet Leaflet forventer.
    utkoordsys: "4326",
  });

  let respons: Response;
  try {
    respons = await fetch(`${SOK_URL}?${params}`, { signal });
  } catch (feil) {
    if (feil instanceof DOMException && feil.name === "AbortError") throw feil;
    throw new GeokodingFeil(
      "Fikk ikke kontakt med Kartverkets adressesøk. Sjekk nettverket og prøv igjen.",
    );
  }

  if (!respons.ok) {
    throw new GeokodingFeil(
      `Kartverkets adressesøk svarte med feil (${respons.status}). Prøv igjen om litt.`,
    );
  }

  const data = (await respons.json()) as GeonorgeRespons;
  const treff = (data.adresser ?? [])
    .map(tilAdresseTreff)
    .filter((adresse): adresse is AdresseTreff => adresse !== null);

  if (treff.length === 0) {
    throw new GeokodingFeil(
      `Fant ingen adresse som matcher «${sok}». Prøv med gatenavn, nummer og poststed.`,
    );
  }

  return treff;
}

function tilAdresseTreff(adresse: GeonorgeAdresse): AdresseTreff | null {
  const lat = adresse.representasjonspunkt?.lat;
  const lon = adresse.representasjonspunkt?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  return {
    lat,
    lon,
    adressetekst: adresse.adressetekst ?? "",
    postnummer: adresse.postnummer ?? "",
    poststed: adresse.poststed ?? "",
    kommunenavn: adresse.kommunenavn ?? "",
  };
}

/** Adressen på én linje, slik den vises i popup og oppdragsliste. */
export function formaterAdresse(adresse: AdresseTreff): string {
  const sted = [adresse.postnummer, adresse.poststed].filter(Boolean).join(" ");
  return [adresse.adressetekst, sted].filter(Boolean).join(", ");
}

import { erFarge, fordelFarger } from "./farger";
import {
  TOMT_UTSTYR,
  type AdresseTreff,
  type Kjoretid,
  type Kommentar,
  type Leveranse,
  type Stopp,
  type Utstyr,
  type UtstyrKategori,
} from "../types";

/**
 * Dagsfila: leveransene på kartet, lagret som JSON på egen maskin og åpnet
 * igjen senere. Poenget er å kunne gjøre klar en dag i forveien – importere
 * lista, sette crewet, la adressene bli geokodet – og så ha alt liggende klart
 * når briefingen skal holdes, uten å måtte kjøre importen på nytt.
 *
 * Formatet er leveransene slik de ligger i appen, inkludert kjøretidene som
 * allerede er hentet. Ingenting sendes noe sted: fila lastes ned lokalt og
 * leses lokalt.
 */

const FORMAT = "tpstools-briefingkart";

/** Økes bare hvis eldre filer ikke lenger kan leses slik de er. */
const VERSJON = 1;

export class DagsfilFeil extends Error {}

type Dagsfil = {
  format: string;
  versjon: number;
  lagret: string;
  leveranser: Leveranse[];
};

/** Leveransene som JSON-tekst, klar til å lastes ned. */
export function lagDagsfil(leveranser: Leveranse[]): string {
  const fil: Dagsfil = {
    format: FORMAT,
    versjon: VERSJON,
    lagret: new Date().toISOString(),
    leveranser,
  };

  return JSON.stringify(fil, null, 2);
}

/**
 * Filnavnet dagen lastes ned med. Datoene fra leveransene tas med når de
 * finnes, slik at fila kjennes igjen i nedlastingsmappa uten å åpnes.
 */
export function dagsfilnavn(leveranser: Leveranse[]): string {
  const datoer = [...new Set(leveranser.map((l) => l.dato).filter((d): d is string => !!d))];
  const merkelapp = datoer.length > 0 ? datoer.join("-") : new Date().toISOString().slice(0, 10);
  const trygg = merkelapp.replace(/[^\wÆØÅæøå.-]+/g, "_").slice(0, 60);

  return `briefing-${trygg}.json`;
}

/**
 * Leser en lagret dagsfil. Alt valideres felt for felt: fila kommer fra disk
 * og kan være redigert, avkortet eller noe helt annet. Feiler den, sier den
 * hvorfor i stedet for å legge en halv leveranse på kartet.
 */
export function lesDagsfil(tekst: string): Leveranse[] {
  let data: unknown;
  try {
    data = JSON.parse(tekst);
  } catch {
    throw new DagsfilFeil("Fila er ikke gyldig JSON. Velg en dag lagret fra Briefingkart.");
  }

  const fil = somObjekt(data, "Fila");
  if (fil.format !== FORMAT) {
    throw new DagsfilFeil("Dette er ikke en dag lagret fra Briefingkart.");
  }
  if (typeof fil.versjon !== "number" || fil.versjon > VERSJON) {
    throw new DagsfilFeil(
      "Fila er lagret med en nyere versjon av Briefingkart. Oppdater siden og prøv igjen.",
    );
  }

  const leveranser = somListe(fil.leveranser, "Leveransene").map((leveranse, indeks) =>
    lesLeveranse(leveranse, indeks + 1),
  );

  if (leveranser.length === 0) {
    throw new DagsfilFeil("Fila inneholder ingen leveranser.");
  }

  // Hver leveranse beholder fargen den ble lagret med. Filer uten farger – og
  // to leveranser som endte med samme farge – får ryddet opp her, slik at
  // dagene uansett skilles fra hverandre på kartet.
  const farger = fordelFarger(
    [],
    leveranser.map((leveranse) => leveranse.farge),
  );

  return leveranser.map((leveranse, indeks) => ({ ...leveranse, farge: farger[indeks] }));
}

function lesLeveranse(verdi: unknown, nr: number): Leveranse {
  const rad = somObjekt(verdi, `Leveranse ${nr}`);
  const stopp = somListe(rad.stopp, `Adressene i leveranse ${nr}`).map((s, indeks) =>
    lesStopp(s, `${nr}.${indeks + 1}`),
  );

  if (stopp.length === 0) {
    throw new DagsfilFeil(`Leveranse ${nr} har ingen adresser.`);
  }

  return {
    // Nye id-er, slik at samme fil kan åpnes to ganger uten at markørene og
    // kortene kolliderer med dem som allerede ligger på kartet.
    id: crypto.randomUUID(),
    dato: typeof rad.dato === "string" && rad.dato !== "" ? rad.dato : null,
    toppinfo: somTekstliste(rad.toppinfo),
    ansvarlige: somTekstliste(rad.ansvarlige),
    notat: typeof rad.notat === "string" ? rad.notat : "",
    opprettet: typeof rad.opprettet === "string" ? rad.opprettet : new Date().toISOString(),
    farge: erFarge(rad.farge) ? rad.farge : "",
    stopp,
  };
}

function lesStopp(verdi: unknown, hvor: string): Stopp {
  const rad = somObjekt(verdi, `Adresse ${hvor}`);

  return {
    id: crypto.randomUUID(),
    soketekst: typeof rad.soketekst === "string" ? rad.soketekst : "",
    adresse: lesAdresse(rad.adresse, hvor),
    antallKunder: somTall(rad.antallKunder),
    utstyr: lesUtstyr(rad.utstyr),
    kommentarer: lesKommentarer(rad.kommentarer),
    kjoretid: lesKjoretid(rad.kjoretid),
  };
}

function lesAdresse(verdi: unknown, hvor: string): AdresseTreff {
  const rad = somObjekt(verdi, `Adresse ${hvor}`);
  const lat = somTall(rad.lat);
  const lon = somTall(rad.lon);

  // Uten koordinater er det ingenting å sette på kartet, og adressen kan ikke
  // slås opp på nytt uten nett – da er fila ubrukelig som briefing.
  if (lat === null || lon === null) {
    throw new DagsfilFeil(`Adresse ${hvor} mangler koordinater.`);
  }

  return {
    lat,
    lon,
    adressetekst: typeof rad.adressetekst === "string" ? rad.adressetekst : "",
    postnummer: typeof rad.postnummer === "string" ? rad.postnummer : "",
    poststed: typeof rad.poststed === "string" ? rad.poststed : "",
    kommunenavn: typeof rad.kommunenavn === "string" ? rad.kommunenavn : "",
  };
}

function lesUtstyr(verdi: unknown): Utstyr | null {
  if (verdi === null || verdi === undefined) return null;
  if (typeof verdi !== "object") return null;

  const rad = verdi as Record<string, unknown>;
  const utstyr: Utstyr = { ...TOMT_UTSTYR };
  for (const kategori of Object.keys(TOMT_UTSTYR) as UtstyrKategori[]) {
    utstyr[kategori] = somTall(rad[kategori]) ?? 0;
  }

  return utstyr;
}

function lesKommentarer(verdi: unknown): Kommentar[] {
  if (!Array.isArray(verdi)) return [];

  return verdi
    .filter((k): k is Record<string, unknown> => typeof k === "object" && k !== null)
    .map((k) => ({
      leilighet: typeof k.leilighet === "string" ? k.leilighet : "",
      tekst: typeof k.tekst === "string" ? k.tekst : "",
    }))
    .filter((k) => k.tekst !== "");
}

function lesKjoretid(verdi: unknown): Kjoretid | null {
  if (typeof verdi !== "object" || verdi === null) return null;

  const rad = verdi as Record<string, unknown>;
  const sekunder = somTall(rad.sekunder);
  if (sekunder === null) return null;

  return {
    sekunder,
    meter: somTall(rad.meter),
    // Ukjent kilde regnes som anslag, så et tall aldri ser mer presist ut enn
    // det er.
    kilde: rad.kilde === "vei" ? "vei" : "luftlinje",
  };
}

function somObjekt(verdi: unknown, hva: string): Record<string, unknown> {
  if (typeof verdi !== "object" || verdi === null || Array.isArray(verdi)) {
    throw new DagsfilFeil(`${hva} har ikke det formatet Briefingkart lagrer.`);
  }
  return verdi as Record<string, unknown>;
}

function somListe(verdi: unknown, hva: string): unknown[] {
  if (!Array.isArray(verdi)) {
    throw new DagsfilFeil(`${hva} mangler i fila.`);
  }
  return verdi;
}

function somTekstliste(verdi: unknown): string[] {
  if (!Array.isArray(verdi)) return [];
  return verdi.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

function somTall(verdi: unknown): number | null {
  return typeof verdi === "number" && Number.isFinite(verdi) ? verdi : null;
}

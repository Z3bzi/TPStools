import { lesArbeidsbok, XlsxFeil, type Ark, type Celle } from "./xlsx";
import {
  TOMT_UTSTYR,
  type Leveranse,
  type LeveranseUtkast,
  type StoppUtkast,
  type Utstyr,
  type UtstyrKategori,
} from "../types";

export { XlsxFeil };

/**
 * Leser en leveranseliste (GDA-uttrekk) og lager én leveranse per dagsark.
 *
 * Hvert ark med datoer i navnet er én dag crewet er ute, med én rad per kunde.
 * Radene grupperes på gate + husnummer, slik at hver oppgang blir ett stopp i
 * leveransen – med antall kunder, utstyrsfordeling og kommentarer samlet.
 * Dagen holdes samlet som én leveranse, ikke som like mange løse oppdrag som
 * den har adresser.
 */
export function lesLeveranser(data: Uint8Array): LeveranseUtkast[] {
  const ark = lesArbeidsbok(data);
  const info = lesInformasjonsfane(ark);
  const utkast = velgDagsark(ark)
    .map((a) => lesDagsark(a, info))
    .filter((leveranse): leveranse is LeveranseUtkast => leveranse !== null);

  if (utkast.length === 0) {
    throw new XlsxFeil(
      'Fant ingen leveranserader. Arket må ha en overskriftsrad med "Subscriber name", "Street name" og "House number".',
    );
  }

  return utkast;
}

/**
 * Arbeidsboka har både dagsark og hjelpeark. «Underlag» er rålista med alle
 * kunder i prosjektet og ville blitt en egen leveranse med duplikater av hver
 * adresse, så hjelpearkene lukes ut på navn først. Av resten kjennes dagsarkene
 * igjen på inn-/ut-kolonnene crewet fyller ut.
 */
function velgDagsark(ark: Ark[]): Ark[] {
  const medListe = ark.filter(
    (a) => finnOverskriftsrad(a) !== -1 && !/informasjon|underlag/i.test(a.navn),
  );
  const dagsark = medListe.filter((a) => {
    const overskrifter = overskrifterFor(a);
    return ["inn", "ut", "tps"].some((o) => overskrifter.includes(o));
  });

  // Skulle en fil mangle inn-/ut-kolonnene, er det bedre å ta med arkene som
  // ligner en liste enn å importere ingenting.
  return dagsark.length > 0 ? dagsark : medListe;
}

function overskrifterFor(ark: Ark): string[] {
  const rad = finnOverskriftsrad(ark);
  return rad === -1 ? [] : ark.rader[rad].map((c) => c.verdi.trim().toLowerCase());
}

function finnOverskriftsrad(ark: Ark): number {
  return ark.rader.findIndex((rad) =>
    rad.some((celle) => celle.verdi.trim().toLowerCase() === "subscriber name"),
  );
}

/** Overskrifter som hører til selve lista. Resten er navn på ansvarlige. */
const KJENTE_OVERSKRIFTER = new Set(
  [
    "tps",
    "subscriber id",
    "subscriber name",
    "street name",
    "house number",
    "house number alphanumeric",
    "apartament number",
    "apartment number",
    "inn",
    "ut",
    "kommentar 1",
    "kommentar 2",
    "mobile priceplans",
    "age",
  ].map((o) => o.toLowerCase()),
);

function lesDagsark(ark: Ark, info: Map<string, string>): LeveranseUtkast | null {
  const overskriftsrad = finnOverskriftsrad(ark);
  if (overskriftsrad === -1) return null;

  const overskrifter = ark.rader[overskriftsrad].map((c) => c.verdi.trim());
  const kolonne = (navn: string) =>
    overskrifter.findIndex((o) => o.toLowerCase() === navn.toLowerCase());

  const kNavn = kolonne("Subscriber name");
  const kGate = kolonne("Street name");
  const kNummer = kolonne("House number");
  const kBokstav = kolonne("House number alphanumeric");
  const kLeilighet = kolonne("Apartament number");
  const kKommentar1 = kolonne("Kommentar 1");
  const kKommentar2 = kolonne("Kommentar 2");
  if (kGate === -1 || kNummer === -1) return null;

  // Navnene på crewet står som egne kolonneoverskrifter etter "Ut".
  const ansvarlige = overskrifter.filter(
    (o) => o !== "" && !KJENTE_OVERSKRIFTER.has(o.toLowerCase()),
  );

  const perAdresse = new Map<string, StoppUtkast>();

  for (const rad of ark.rader.slice(overskriftsrad + 1)) {
    const gate = tekst(rad[kGate]);
    const nummer = tekst(rad[kNummer]);
    if (!gate || !nummer) continue;

    const bokstav = kBokstav === -1 ? "" : tekst(rad[kBokstav]);
    const adresse = `${gate} ${nummer}${bokstav && bokstav !== "-" ? bokstav : ""}`;

    let stopp = perAdresse.get(adresse);
    if (!stopp) {
      stopp = {
        soketekst: [adresse, info.get("sted")].filter(Boolean).join(", "),
        antallKunder: 0,
        utstyr: { ...TOMT_UTSTYR },
        kommentarer: [],
      };
      perAdresse.set(adresse, stopp);
    }

    stopp.antallKunder = (stopp.antallKunder ?? 0) + 1;
    if (stopp.utstyr) {
      stopp.utstyr[klassifiserUtstyr(rad[kNavn]?.fyll ?? null)] += 1;
    }

    const leilighet = kLeilighet === -1 ? "" : tekst(rad[kLeilighet]);
    for (const kolonneNr of [kKommentar1, kKommentar2]) {
      const kommentar = kolonneNr === -1 ? "" : tekst(rad[kolonneNr]);
      if (kommentar && kommentar !== "-") {
        stopp.kommentarer.push({ leilighet, tekst: kommentar });
      }
    }
  }

  const stopp = [...perAdresse.values()];
  if (stopp.length === 0) return null;

  return {
    dato: ark.navn,
    toppinfo: lesToppinfo(ark),
    ansvarlige,
    notat: byggNotat(info),
    stopp,
  };
}

/**
 * B1, C1 og H1 i dagsarket er det crewet må vite først – de står derfor øverst
 * i briefingen, før adressen. Tomme celler faller bort.
 */
function lesToppinfo(ark: Ark): string[] {
  const rad = ark.rader[0] ?? [];
  return [1, 2, 7]
    .map((kolonne) => tekst(rad[kolonne]))
    .filter((verdi) => verdi !== "" && verdi !== "-");
}

/** Informasjonsfanen er en ren nøkkel/verdi-liste med felles info for leveransen. */
function lesInformasjonsfane(ark: Ark[]): Map<string, string> {
  const info = new Map<string, string>();
  const fane = ark.find((a) => a.navn.toLowerCase().includes("informasjon"));
  if (!fane) return info;

  for (const rad of fane.rader) {
    const nokkel = tekst(rad[0]).toLowerCase();
    const verdi = tekst(rad[1]);
    if (nokkel && verdi) info.set(nokkel, verdi);
  }

  // Postnummer og poststed står gjerne i kommentarfeltet ("1188 OSLO. ...").
  // Tas med i adressesøket, siden gatenavn alene kan finnes flere steder.
  const sted = /\b(\d{4})\s+([A-ZÆØÅ][A-ZÆØÅa-zæøå-]+)/.exec(info.get("kommentar") ?? "");
  if (sted) info.set("sted", `${sted[1]} ${sted[2]}`);

  return info;
}

function byggNotat(info: Map<string, string>): string {
  const felt: [string, string][] = [
    ["Leveransetype", info.get("leveransetype") ?? ""],
    ["Plattform", info.get("plattform") ?? ""],
    ["Bredbånd", info.get("bb") ?? ""],
    ["TV", info.get("tv") ?? ""],
    ["Avtale", info.get("avtaleinfo") ?? ""],
    ["Kontaktperson", info.get("kontaktperson") ?? ""],
    ["Parkering", info.get("info om parkering") ?? ""],
    ["Prosjektleder", info.get("prosjektleder delivery") ?? ""],
  ];

  return felt
    .filter(([, verdi]) => verdi !== "")
    .map(([navn, verdi]) => `${navn}: ${verdi}`)
    .join("\n");
}

/** Fargene slik de brukes i listene i dag. */
const FARGEKART: Record<string, UtstyrKategori> = {
  FFFF00: "ruter-og-tv",
  "00B0F0": "kun-ruter",
  FFC000: "kun-tv",
};

/**
 * Nyansene varierer litt mellom filer, så eksakt treff prøves først og
 * deretter en grov vurdering av fargen. Alt annet blir "annet" framfor å bli
 * tolket som et utstyrsvalg det ikke er dekning for.
 */
export function klassifiserUtstyr(fyll: string | null): UtstyrKategori {
  if (!fyll) return "annet";

  const hex = fyll.toUpperCase();
  const kjent = FARGEKART[hex];
  if (kjent) return kjent;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "annet";

  if (b >= 128 && b > r + 30) return "kun-ruter";
  if (r >= 200 && g >= 200 && b <= 150) return "ruter-og-tv";
  if (r >= 200 && g >= 100 && g < 200 && b <= 150) return "kun-tv";
  return "annet";
}

export function summerUtstyr(utstyr: Utstyr | null): [UtstyrKategori, number][] {
  if (!utstyr) return [];
  return (Object.entries(utstyr) as [UtstyrKategori, number][]).filter(([, antall]) => antall > 0);
}

/** Kundene i hele leveransen. Stopp uten tall teller som null kunder. */
export function tellKunder(leveranse: Leveranse): number {
  return leveranse.stopp.reduce((sum, stopp) => sum + (stopp.antallKunder ?? 0), 0);
}

/**
 * Utstyret for hele leveransen, summert over stoppene som har merking. Null
 * når ingen av adressene har utstyr – da er det ingenting å oppsummere, og
 * lista og utskriften hopper over avsnittet framfor å vise fire nuller.
 */
export function summerLeveranseUtstyr(leveranse: Leveranse): Utstyr | null {
  const medUtstyr = leveranse.stopp.filter((stopp) => stopp.utstyr !== null);
  if (medUtstyr.length === 0) return null;

  const sum: Utstyr = { ...TOMT_UTSTYR };
  for (const stopp of medUtstyr) {
    for (const [kategori, antall] of Object.entries(stopp.utstyr ?? {}) as [
      UtstyrKategori,
      number,
    ][]) {
      sum[kategori] += antall;
    }
  }

  return sum;
}

function tekst(celle: Celle | undefined): string {
  return celle?.verdi.trim() ?? "";
}

import { strFromU8, unzipSync } from "fflate";

/**
 * Minimal XLSX-leser. Leser celleverdier *og* bakgrunnsfargen på cellene,
 * som er det leveranselistene bruker til å merke hvilket utstyr kunden skal ha.
 * Vanlige regnearkbibliotek dropper enten stiler eller drar med seg
 * Node-avhengigheter som ikke hører hjemme i en ren klient-app.
 */

export type Celle = {
  verdi: string;
  /** Bakgrunnsfarge som "RRGGBB", eller null når cellen er ufarget. */
  fyll: string | null;
};

export type Ark = {
  navn: string;
  /** rader[radnr][kolonnenr], 0-indeksert. Hull er fylt med tomme celler. */
  rader: Celle[][];
};

const TOM_CELLE: Celle = { verdi: "", fyll: null };

export class XlsxFeil extends Error {}

export function lesArbeidsbok(data: Uint8Array): Ark[] {
  let filer: Record<string, Uint8Array>;
  try {
    filer = unzipSync(data);
  } catch {
    throw new XlsxFeil("Klarte ikke å lese filen. Er det en .xlsx-fil?");
  }

  const les = (sti: string) => (filer[sti] ? strFromU8(filer[sti]) : null);
  const arbeidsbok = les("xl/workbook.xml");
  if (!arbeidsbok) {
    throw new XlsxFeil("Fant ingen regnearkdata i filen. Er det en .xlsx-fil?");
  }

  const delte = lesDelteStrenger(les("xl/sharedStrings.xml"));
  const fyllPerStil = lesFyll(les("xl/styles.xml"));
  const relasjoner = lesRelasjoner(les("xl/_rels/workbook.xml.rels"));

  const ark: Ark[] = [];
  for (const node of finnAlle(parse(arbeidsbok), "sheet")) {
    const navn = node.getAttribute("name") ?? "";
    const rId = node.getAttribute("r:id") ?? node.getAttribute("id") ?? "";
    const mal = relasjoner.get(rId);
    const xml = mal ? les(`xl/${mal}`) : null;
    if (!xml) continue;
    ark.push({ navn, rader: lesRader(xml, delte, fyllPerStil) });
  }

  if (ark.length === 0) throw new XlsxFeil("Fant ingen ark i filen.");
  return ark;
}

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function finnAlle(rot: Document | Element, navn: string): Element[] {
  return Array.from(rot.getElementsByTagName(navn));
}

function lesDelteStrenger(xml: string | null): string[] {
  if (!xml) return [];
  // Hver <si> kan være delt i flere <t>-biter når deler av teksten er formatert.
  return finnAlle(parse(xml), "si").map((si) =>
    finnAlle(si, "t")
      .map((t) => t.textContent ?? "")
      .join(""),
  );
}

/** Slår opp bakgrunnsfarge per stilindeks (cellenes `s`-attributt). */
function lesFyll(xml: string | null): (string | null)[] {
  if (!xml) return [];
  const dok = parse(xml);

  const fyllFarger = finnAlle(dok, "fill").map((fill) => {
    const monster = fill.getElementsByTagName("patternFill")[0];
    if (!monster || monster.getAttribute("patternType") !== "solid") return null;
    // Bare eksplisitte rgb-farger brukes. Tema- og indeksfarger må slås opp i
    // temaet for å gi mening, og listene bruker rene farger satt for hånd.
    const argb = monster.getElementsByTagName("fgColor")[0]?.getAttribute("rgb");
    return argb ? argb.slice(-6).toUpperCase() : null;
  });

  const stiler = dok.getElementsByTagName("cellXfs")[0];
  if (!stiler) return [];
  return finnAlle(stiler, "xf").map((xf) => {
    const id = Number(xf.getAttribute("fillId") ?? "0");
    return fyllFarger[id] ?? null;
  });
}

function lesRelasjoner(xml: string | null): Map<string, string> {
  const kart = new Map<string, string>();
  if (!xml) return kart;
  for (const rel of finnAlle(parse(xml), "Relationship")) {
    const id = rel.getAttribute("Id");
    const mal = rel.getAttribute("Target");
    if (id && mal) kart.set(id, mal.replace(/^\/?xl\//, "").replace(/^\.\//, ""));
  }
  return kart;
}

function lesRader(xml: string, delte: string[], fyllPerStil: (string | null)[]): Celle[][] {
  const rader: Celle[][] = [];

  for (const rad of finnAlle(parse(xml), "row")) {
    const radnr = Number(rad.getAttribute("r") ?? "0") - 1;
    if (radnr < 0) continue;

    const celler: Celle[] = [];
    for (const celle of finnAlle(rad, "c")) {
      const kolonne = kolonneIndeks(celle.getAttribute("r") ?? "");
      if (kolonne < 0) continue;
      while (celler.length < kolonne) celler.push(TOM_CELLE);

      const stil = Number(celle.getAttribute("s") ?? "-1");
      celler[kolonne] = {
        verdi: celleVerdi(celle, delte),
        fyll: stil >= 0 ? (fyllPerStil[stil] ?? null) : null,
      };
    }

    while (rader.length < radnr) rader.push([]);
    rader[radnr] = celler;
  }

  return rader;
}

function celleVerdi(celle: Element, delte: string[]): string {
  const type = celle.getAttribute("t");

  if (type === "s") {
    const indeks = Number(celle.getElementsByTagName("v")[0]?.textContent ?? "-1");
    return delte[indeks] ?? "";
  }
  if (type === "inlineStr") {
    return finnAlle(celle, "t")
      .map((t) => t.textContent ?? "")
      .join("");
  }
  // Formelceller har både <f> og en bufret <v> med siste beregnede verdi.
  return celle.getElementsByTagName("v")[0]?.textContent?.trim() ?? "";
}

/** "C12" -> 2. Returnerer -1 for referanser uten bokstavdel. */
function kolonneIndeks(ref: string): number {
  const bokstaver = /^[A-Z]+/.exec(ref)?.[0];
  if (!bokstaver) return -1;
  let indeks = 0;
  for (const tegn of bokstaver) indeks = indeks * 26 + (tegn.charCodeAt(0) - 64);
  return indeks - 1;
}

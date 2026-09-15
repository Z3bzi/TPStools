export type Koordinat = {
  lat: number;
  lon: number;
};

/** Ett treff fra Kartverkets adresse-API, redusert til det appen bruker. */
export type AdresseTreff = Koordinat & {
  /** Full adresse slik Kartverket skriver den, f.eks. "Storgata 1". */
  adressetekst: string;
  postnummer: string;
  poststed: string;
  kommunenavn: string;
};

/**
 * Utstyret kunden skal ha. I leveranselistene er dette kodet som
 * bakgrunnsfarge på navnecellen: gul = ruter og TV-boks, blå = bare ruter,
 * oransje = bare TV-boks. Andre farger havner i "annet" i stedet for å bli
 * gjettet på.
 */
export type UtstyrKategori = "ruter-og-tv" | "kun-ruter" | "kun-tv" | "annet";

export type Utstyr = Record<UtstyrKategori, number>;

export type Kommentar = {
  leilighet: string;
  tekst: string;
};

/** Et oppdrag slik det vises som markør på kartet. */
export type Oppdrag = {
  id: string;
  /** Adressen slik den ble skrevet inn eller lest fra lista. */
  soketekst: string;
  /** Adressen slik Kartverket bekreftet den. */
  adresse: AdresseTreff;
  ansvarlige: string[];
  antallKunder: number | null;
  notat: string;
  opprettet: string;
  /** Arkfanen oppdraget kom fra, f.eks. "15.09". Null for manuelle oppdrag. */
  dato: string | null;
  utstyr: Utstyr | null;
  kommentarer: Kommentar[];
};

/** Et oppdrag før adressen er slått opp hos Kartverket. */
export type OppdragUtkast = {
  soketekst: string;
  ansvarlige: string[];
  antallKunder: number | null;
  notat: string;
  dato: string | null;
  utstyr: Utstyr | null;
  kommentarer: Kommentar[];
};

export const TOMT_UTSTYR: Utstyr = {
  "ruter-og-tv": 0,
  "kun-ruter": 0,
  "kun-tv": 0,
  annet: 0,
};

export const UTSTYR_ETIKETT: Record<UtstyrKategori, string> = {
  "ruter-og-tv": "Ruter og TV-boks",
  "kun-ruter": "Kun ruter",
  "kun-tv": "Kun TV-boks",
  annet: "Annen merking",
};

/** Fargene fra lista, brukt som prikk i UI-et så merkingen kjennes igjen. */
export const UTSTYR_FARGE: Record<UtstyrKategori, string> = {
  "ruter-og-tv": "#ffff00",
  "kun-ruter": "#00b0f0",
  "kun-tv": "#ffc000",
  annet: "#9e9e9e",
};

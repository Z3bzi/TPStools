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

/** Estimert kjøring fra kontoret til et stopp. */
export type Kjoretid = {
  /** Kjøretid i sekunder. */
  sekunder: number;
  /** Kjørelengde i meter. Null når ruting ikke oppga lengde. */
  meter: number | null;
  /** `vei` = rutet på ekte veinett, `luftlinje` = grovt anslag når ruting feiler. */
  kilde: "vei" | "luftlinje";
};

/** Ett stopp i en leveranse: én oppgang, med kundene som bor der. */
export type Stopp = {
  id: string;
  /** Adressen slik den ble skrevet inn eller lest fra lista. */
  soketekst: string;
  /** Adressen slik Kartverket bekreftet den. */
  adresse: AdresseTreff;
  antallKunder: number | null;
  utstyr: Utstyr | null;
  kommentarer: Kommentar[];
  /** Kjøretid fra kontoret. `null` mens ruting pågår. */
  kjoretid: Kjoretid | null;
};

/**
 * En leveranse er én dag crewet er ute: ett dagsark fra lista, eller ett
 * manuelt innlegg. Alle adressene dagen består av ligger som stopp, og vises
 * som hver sin markør på kartet.
 */
export type Leveranse = {
  id: string;
  /** Dagsarkets navn, f.eks. "15.09". Null når leveransen er lagt inn manuelt. */
  dato: string | null;
  /** Toppinfoen fra dagsarket (B1, C1, H1) – står øverst i briefingen. */
  toppinfo: string[];
  ansvarlige: string[];
  notat: string;
  opprettet: string;
  /** Markørfargen leveransen har på kartet, som hex-kode. Se `lib/farger.ts`. */
  farge: string;
  stopp: Stopp[];
};

/** En leveranse slik den bygges opp, før den har fått farge av lista den legges i. */
export type UfargetLeveranse = Omit<Leveranse, "farge">;

/** Et stopp før adressen er slått opp hos Kartverket. */
export type StoppUtkast = {
  soketekst: string;
  antallKunder: number | null;
  utstyr: Utstyr | null;
  kommentarer: Kommentar[];
};

/** En leveranse slik den kommer ut av lista, før adressene er slått opp. */
export type LeveranseUtkast = {
  dato: string | null;
  toppinfo: string[];
  /**
   * Navnene som sto i arket. Vises som hint i importdialogen, men fylles aldri
   * inn i feltet: det er navnene noen skriver selv som blir med videre.
   */
  ansvarlige: string[];
  notat: string;
  stopp: StoppUtkast[];
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

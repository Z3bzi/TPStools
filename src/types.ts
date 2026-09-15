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

/** Et oppdrag slik det vises som markør på kartet. */
export type Oppdrag = {
  id: string;
  /** Adressen slik den ble skrevet inn i skjemaet. */
  soketekst: string;
  /** Adressen slik Kartverket bekreftet den. */
  adresse: AdresseTreff;
  ansvarlige: string[];
  antallKunder: number | null;
  notat: string;
  opprettet: string;
};

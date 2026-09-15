import { useEffect, useState } from "react";

import { sokAdresse } from "./geonorge";
import type { Koordinat } from "../types";

/** Kontoret vises alltid på kartet, som fast referansepunkt for crewet. */
export const KONTOR = {
  navn: "Telia – Økern Portal",
  adresse: "Lørenfaret 1, Oslo",
  /**
   * Omtrentlig plassering, brukt til kartet slipper å vente på – eller feile
   * på – adresseoppslaget. Byttes ut med Kartverkets punkt når oppslaget er
   * ferdig.
   */
  posisjon: { lat: 59.9285, lon: 10.8035 } satisfies Koordinat,
};

/**
 * Adresseoppslaget gjøres én gang per økt og deles av alle som trenger
 * kontorets posisjon – kartet og kjøretidsrutingen skal peke på samme punkt,
 * uten å spørre Kartverket to ganger. Faller tilbake på den faste posisjonen
 * hvis oppslaget ikke går gjennom; markøren skal alltid vises.
 */
let oppslag: Promise<Koordinat> | null = null;

export function hentKontorPosisjon(): Promise<Koordinat> {
  oppslag ??= sokAdresse(KONTOR.adresse)
    .then(([treff]): Koordinat => ({ lat: treff.lat, lon: treff.lon }))
    .catch(() => KONTOR.posisjon);

  return oppslag;
}

/** Kontorets posisjon for kartet: fast punkt først, Kartverkets når det er klart. */
export function useKontorPosisjon(): Koordinat {
  const [posisjon, setPosisjon] = useState<Koordinat>(KONTOR.posisjon);

  useEffect(() => {
    let avbrutt = false;

    hentKontorPosisjon().then((treff) => {
      if (!avbrutt) setPosisjon(treff);
    });

    return () => {
      avbrutt = true;
    };
  }, []);

  return posisjon;
}

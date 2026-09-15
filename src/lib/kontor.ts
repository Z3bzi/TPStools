import { useEffect, useState } from "react";

import { sokAdresse } from "./geonorge";
import type { Koordinat } from "../types";

/** Kontoret vises alltid på kartet, som fast referansepunkt for crewet. */
export const KONTOR = {
  navn: "Telia – Økern Portal",
  adresse: "Ulvenveien 75, Oslo",
  /**
   * Omtrentlig plassering, brukt til kartet slipper å vente på – eller feile
   * på – adresseoppslaget. Byttes ut med Kartverkets punkt når oppslaget er
   * ferdig.
   */
  posisjon: { lat: 59.9299, lon: 10.8106 } satisfies Koordinat,
};

/**
 * Slår opp kontoradressen én gang, og faller tilbake på den faste posisjonen
 * hvis Kartverket ikke svarer. Markøren skal alltid vises.
 */
export function useKontorPosisjon(): Koordinat {
  const [posisjon, setPosisjon] = useState<Koordinat>(KONTOR.posisjon);

  useEffect(() => {
    let avbrutt = false;

    sokAdresse(KONTOR.adresse)
      .then(([treff]) => {
        if (!avbrutt) setPosisjon({ lat: treff.lat, lon: treff.lon });
      })
      .catch(() => {
        // Beholder den faste posisjonen.
      });

    return () => {
      avbrutt = true;
    };
  }, []);

  return posisjon;
}

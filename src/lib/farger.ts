/**
 * Fargene leveransene skilles på. Hver leveranse – altså hver dag, eller hvert
 * dagsark fra lista – får sin egen farge, og markørene på kartet tegnes i den.
 * Da ser crewet med én gang hvilke adresser som hører til samme dag.
 *
 * Paletten er holdt mørk nok til at hvit kontur og hvitt senter i markøren
 * leses tydelig, og unna gul, lyseblå og oransje, som allerede betyr utstyr i
 * fargeprikkene fra lista.
 */
export const LEVERANSEFARGER = [
  "#7d3ac1", // lilla
  "#0063a3", // blå
  "#00786a", // grønnblå
  "#a8004b", // rødrosa
  "#3d6b00", // olivengrønn
  "#9e4c00", // brunoransje
  "#1f4b99", // mørkeblå
  "#6b0f6b", // plomme
] as const;

/** Sjekker at en farge er en hex-kode vi trygt kan tegne markøren med. */
export function erFarge(verdi: unknown): verdi is string {
  return typeof verdi === "string" && /^#[0-9a-f]{6}$/i.test(verdi);
}

/**
 * Fargene et sett nye leveranser skal ha, gitt fargene som allerede er i bruk.
 *
 * `onsket` er fargen hver leveranse helst vil ha – en leveranse lest fra en
 * lagret dagsfil har fargen den ble forberedt med, og beholder den når den er
 * ledig. Resten får første ledige farge i paletten, slik at en dag som fjernes
 * frigjør fargen sin igjen. Er hele paletten i bruk, går den rundt på nytt: to
 * dager kan da dele farge, men så mange dager ligger sjelden på kartet samtidig.
 */
export function fordelFarger(brukte: string[], onsket: (string | undefined)[]): string[] {
  const tatt = new Set(brukte);
  const farger: string[] = [];

  onsket.forEach((onske, nr) => {
    const ledig = LEVERANSEFARGER.find((farge) => !tatt.has(farge));
    const farge =
      erFarge(onske) && !tatt.has(onske)
        ? onske
        : (ledig ?? LEVERANSEFARGER[(brukte.length + nr) % LEVERANSEFARGER.length]);

    tatt.add(farge);
    farger.push(farge);
  });

  return farger;
}

import { useState } from "react";
import { Heading, Paragraph } from "@purpurds/purpur";

import { Briefingkart } from "./components/Briefingkart";
import { ExcelOpplasting } from "./components/ExcelOpplasting";
import { OppdragSkjema, type SkjemaUtkast } from "./components/OppdragSkjema";
import { OppdragsListe } from "./components/OppdragsListe";
import { sokAdresser } from "./lib/geonorge";
import { lesLeveranser, XlsxFeil } from "./lib/leveranse";
import type { Oppdrag, OppdragUtkast } from "./types";

export function App() {
  const [oppdrag, setOppdrag] = useState<Oppdrag[]>([]);
  const [aktivtOppdragId, setAktivtOppdragId] = useState<string | null>(null);
  // Økes hver gang et oppdrag velges, slik at kartet flyr dit igjen selv om
  // det allerede var det aktive oppdraget.
  const [fokusTeller, setFokusTeller] = useState(0);
  const [visAlleTeller, setVisAlleTeller] = useState(0);

  const [lasterSkjema, setLasterSkjema] = useState(false);
  const [skjemaFeil, setSkjemaFeil] = useState<string | null>(null);
  const [lasterFil, setLasterFil] = useState(false);
  const [importResultat, setImportResultat] = useState<string | null>(null);
  const [importFeil, setImportFeil] = useState<string | null>(null);

  const velgOppdrag = (id: string) => {
    setAktivtOppdragId(id);
    setFokusTeller((forrige) => forrige + 1);
  };

  const visAlle = () => setVisAlleTeller((forrige) => forrige + 1);

  /**
   * Slår opp adressene og legger til de som ble funnet. Utkast som ikke lar seg
   * geokode rapporteres tilbake, slik at ingen rad forsvinner i stillhet.
   */
  const leggTil = async (utkast: OppdragUtkast[]): Promise<{ lagtTil: number; feilet: string[] }> => {
    const treff = await sokAdresser(utkast.map((u) => u.soketekst));

    const nye: Oppdrag[] = [];
    const feilet: string[] = [];

    treff.forEach((resultat, indeks) => {
      if (!resultat.adresse) {
        feilet.push(resultat.soketekst);
        return;
      }
      nye.push({
        ...utkast[indeks],
        id: crypto.randomUUID(),
        adresse: resultat.adresse,
        opprettet: new Date().toISOString(),
      });
    });

    if (nye.length > 0) {
      setOppdrag((forrige) => [...forrige, ...nye]);
      // Ett nytt oppdrag: åpne briefingen med en gang. Kameraet rammer inn
      // kontoret og alle oppdrag, slik at begge deler er synlig.
      if (nye.length === 1) setAktivtOppdragId(nye[0].id);
      visAlle();
    }
    return { lagtTil: nye.length, feilet };
  };

  const lagreFraSkjema = async (skjema: SkjemaUtkast) => {
    setLasterSkjema(true);
    setSkjemaFeil(null);

    try {
      const { lagtTil, feilet } = await leggTil(
        skjema.adresser.map((adresse) => ({
          soketekst: adresse,
          ansvarlige: skjema.ansvarlige,
          antallKunder: skjema.antallKunder,
          notat: skjema.notat,
          dato: null,
          utstyr: null,
          kommentarer: [],
        })),
      );

      if (feilet.length > 0) {
        setSkjemaFeil(
          `Fant ingen treff på:\n${feilet.map((a) => `• ${a}`).join("\n")}\n` +
            "Prøv med gatenavn, nummer og poststed.",
        );
      }

      if (lagtTil === 0) return false;
      return feilet.length === 0;
    } finally {
      setLasterSkjema(false);
    }
  };

  const importerFil = async (fil: File) => {
    setLasterFil(true);
    setImportFeil(null);
    setImportResultat(null);

    try {
      const utkast = lesLeveranser(new Uint8Array(await fil.arrayBuffer()));
      const { lagtTil, feilet } = await leggTil(utkast);

      const dager = new Set(utkast.map((u) => u.dato).filter(Boolean));
      const kunder = utkast.reduce((sum, u) => sum + (u.antallKunder ?? 0), 0);

      setImportResultat(
        `La til ${lagtTil} adresser fra ${dager.size} dagsark, med til sammen ${kunder} kunder.` +
          (feilet.length > 0
            ? `\nFant ingen treff på:\n${feilet.map((a) => `• ${a}`).join("\n")}`
            : ""),
      );
    } catch (feil) {
      setImportFeil(
        feil instanceof XlsxFeil
          ? feil.message
          : "Noe gikk galt under lesing av filen. Sjekk at det er et GDA-uttrekk i .xlsx-format.",
      );
    } finally {
      setLasterFil(false);
    }
  };

  const fjernOppdrag = (id: string) => {
    setOppdrag((forrige) => forrige.filter((o) => o.id !== id));
    setAktivtOppdragId((forrige) => (forrige === id ? null : forrige));
  };

  const fjernAlle = () => {
    setOppdrag([]);
    setAktivtOppdragId(null);
  };

  return (
    <div className="app">
      <header className="app__topp">
        <Heading tag="h1" variant="title-300">
          Briefingkart
        </Heading>
        <Paragraph variant="paragraph-100">
          Telia Personlig Service Crew – oppdrag med adresse, ansvarlige, antall kunder og notat,
          klart til oppstartsmøtet.
        </Paragraph>
      </header>

      <main className="app__innhold">
        <div className="app__panel">
          <ExcelOpplasting
            onFil={importerFil}
            laster={lasterFil}
            resultat={importResultat}
            feilmelding={importFeil}
            onLukkMelding={() => {
              setImportResultat(null);
              setImportFeil(null);
            }}
          />
          <OppdragSkjema
            onLagre={lagreFraSkjema}
            laster={lasterSkjema}
            feilmelding={skjemaFeil}
            onLukkFeil={() => setSkjemaFeil(null)}
          />
          <OppdragsListe
            oppdrag={oppdrag}
            aktivtOppdragId={aktivtOppdragId}
            onVis={velgOppdrag}
            onVisAlle={visAlle}
            onFjern={fjernOppdrag}
            onFjernAlle={fjernAlle}
          />
        </div>

        <section className="app__kart" aria-label="Kart med oppdrag">
          <Briefingkart
            oppdrag={oppdrag}
            aktivtOppdragId={aktivtOppdragId}
            fokusTeller={fokusTeller}
            visAlleTeller={visAlleTeller}
          />
        </section>
      </main>
    </div>
  );
}

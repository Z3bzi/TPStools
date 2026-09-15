import { useState } from "react";
import { Heading, Paragraph } from "@purpurds/purpur";

import { Briefingkart } from "./components/Briefingkart";
import { OppdragSkjema, type OppdragUtkast } from "./components/OppdragSkjema";
import { OppdragsListe } from "./components/OppdragsListe";
import { GeokodingFeil, sokAdresse } from "./lib/geonorge";
import type { Oppdrag } from "./types";

export function App() {
  const [oppdrag, setOppdrag] = useState<Oppdrag[]>([]);
  const [aktivtOppdragId, setAktivtOppdragId] = useState<string | null>(null);
  // Økes hver gang et oppdrag velges, slik at kartet flyr dit igjen selv om
  // det allerede var det aktive oppdraget.
  const [fokusTeller, setFokusTeller] = useState(0);
  const [laster, setLaster] = useState(false);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

  const velgOppdrag = (id: string) => {
    setAktivtOppdragId(id);
    setFokusTeller((forrige) => forrige + 1);
  };

  const leggTilOppdrag = async (utkast: OppdragUtkast) => {
    setLaster(true);
    setFeilmelding(null);

    try {
      // Første treff er Kartverkets beste match. Hele den bekreftede adressen
      // vises i lista og popup-en, slik at feiltreff er lett å oppdage.
      const [adresse] = await sokAdresse(utkast.soketekst);
      const nytt: Oppdrag = {
        id: crypto.randomUUID(),
        soketekst: utkast.soketekst,
        adresse,
        ansvarlige: utkast.ansvarlige,
        antallKunder: utkast.antallKunder,
        notat: utkast.notat,
        opprettet: new Date().toISOString(),
      };

      setOppdrag((forrige) => [...forrige, nytt]);
      velgOppdrag(nytt.id);
      return true;
    } catch (feil) {
      setFeilmelding(
        feil instanceof GeokodingFeil
          ? feil.message
          : "Noe gikk galt under adresseoppslaget. Prøv igjen.",
      );
      return false;
    } finally {
      setLaster(false);
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
          <OppdragSkjema
            onLagre={leggTilOppdrag}
            laster={laster}
            feilmelding={feilmelding}
            onLukkFeil={() => setFeilmelding(null)}
          />
          <OppdragsListe
            oppdrag={oppdrag}
            aktivtOppdragId={aktivtOppdragId}
            onVis={velgOppdrag}
            onFjern={fjernOppdrag}
            onFjernAlle={fjernAlle}
          />
        </div>

        <section className="app__kart" aria-label="Kart med oppdrag">
          <Briefingkart
            oppdrag={oppdrag}
            aktivtOppdragId={aktivtOppdragId}
            fokusTeller={fokusTeller}
          />
        </section>
      </main>
    </div>
  );
}

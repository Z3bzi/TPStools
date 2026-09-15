import { useState } from "react";
import { Heading, Paragraph } from "@purpurds/purpur";

import { Briefingkart, type Innramming } from "./components/Briefingkart";
import { ExcelOpplasting } from "./components/ExcelOpplasting";
import { LeveranseDialog, type VentendeImport } from "./components/LeveranseDialog";
import { LeveranseListe } from "./components/LeveranseListe";
import { LeveranseSkjema, type SkjemaUtkast } from "./components/LeveranseSkjema";
import { sokAdresser } from "./lib/geonorge";
import { hentKjoretider } from "./lib/kjoretid";
import { lesLeveranser, XlsxFeil } from "./lib/leveranse";
import type { Leveranse, LeveranseUtkast, Stopp } from "./types";

export function App() {
  const [leveranser, setLeveranser] = useState<Leveranse[]>([]);
  const [aktivtStoppId, setAktivtStoppId] = useState<string | null>(null);
  // Økes hver gang et stopp velges, slik at kartet flyr dit igjen selv om
  // det allerede var det aktive stoppet.
  const [fokusTeller, setFokusTeller] = useState(0);
  const [innramming, setInnramming] = useState<Innramming>({ leveranseId: null, teller: 0 });

  // Leveransene fra en importert fil venter her mens dialogen spør hvem som
  // skal ut på dem. Adressene slås ikke opp før det er avklart.
  const [ventende, setVentende] = useState<VentendeImport | null>(null);

  const [lasterSkjema, setLasterSkjema] = useState(false);
  const [skjemaFeil, setSkjemaFeil] = useState<string | null>(null);
  const [lasterFil, setLasterFil] = useState(false);
  const [importResultat, setImportResultat] = useState<string | null>(null);
  const [importFeil, setImportFeil] = useState<string | null>(null);

  const velgStopp = (id: string) => {
    setAktivtStoppId(id);
    setFokusTeller((forrige) => forrige + 1);
  };

  const rammInn = (leveranseId: string | null) =>
    setInnramming((forrige) => ({ leveranseId, teller: forrige.teller + 1 }));

  /**
   * Slår opp adressene og legger til leveransene som ble funnet. Adresser som
   * ikke lar seg geokode rapporteres tilbake, slik at ingen rad forsvinner i
   * stillhet.
   */
  const leggTil = async (
    utkast: LeveranseUtkast[],
  ): Promise<{ nye: Leveranse[]; feilet: string[] }> => {
    const treff = await sokAdresser(utkast.flatMap((l) => l.stopp.map((s) => s.soketekst)));

    const nye: Leveranse[] = [];
    const feilet: string[] = [];
    let neste = 0;

    for (const leveranse of utkast) {
      const stopp: Stopp[] = [];

      for (const utkastStopp of leveranse.stopp) {
        const resultat = treff[neste++];
        if (!resultat.adresse) {
          feilet.push(resultat.soketekst);
          continue;
        }
        stopp.push({
          ...utkastStopp,
          id: crypto.randomUUID(),
          adresse: resultat.adresse,
          kjoretid: null,
        });
      }

      // En leveranse uten en eneste adresse som lot seg geokode har ingenting
      // å vise på kartet.
      if (stopp.length === 0) continue;

      nye.push({
        id: crypto.randomUUID(),
        dato: leveranse.dato,
        ansvarlige: leveranse.ansvarlige,
        notat: leveranse.notat,
        opprettet: new Date().toISOString(),
        stopp,
      });
    }

    if (nye.length > 0) {
      setLeveranser((forrige) => [...forrige, ...nye]);

      // Én ny adresse: åpne briefingen med en gang. Ellers rammes kartet inn
      // rundt kontoret og alt som ligger der.
      const alleStopp = nye.flatMap((leveranse) => leveranse.stopp);
      if (alleStopp.length === 1) setAktivtStoppId(alleStopp[0].id);
      rammInn(null);

      // Ruting skal ikke holde igjen markørene: de legges ut med én gang, og
      // kjøretiden fylles inn i kortene og boblene når svaret kommer.
      void beregnKjoretider(nye);
    }

    return { nye, feilet };
  };

  /** Henter kjøretid for alle nye stopp i én forespørsel. */
  const beregnKjoretider = async (nye: Leveranse[]) => {
    const stopp = nye.flatMap((leveranse) => leveranse.stopp);
    // hentKjoretider faller tilbake på luftlinje-anslag om ruting feiler, og
    // kaster bare hvis oppslaget avbrytes – det gjør vi ikke her.
    const kjoretider = await hentKjoretider(stopp.map((s) => s.adresse));
    const perId = new Map(stopp.map((s, indeks) => [s.id, kjoretider[indeks]]));

    setLeveranser((forrige) =>
      forrige.map((leveranse) => {
        if (!leveranse.stopp.some((s) => perId.has(s.id))) return leveranse;
        return {
          ...leveranse,
          stopp: leveranse.stopp.map((s) => {
            const kjoretid = perId.get(s.id);
            return kjoretid ? { ...s, kjoretid } : s;
          }),
        };
      }),
    );
  };

  const lagreFraSkjema = async (skjema: SkjemaUtkast) => {
    setLasterSkjema(true);
    setSkjemaFeil(null);

    try {
      const { nye, feilet } = await leggTil([
        {
          dato: null,
          ansvarlige: skjema.ansvarlige,
          notat: skjema.notat,
          stopp: skjema.adresser.map((adresse) => ({
            soketekst: adresse,
            antallKunder: skjema.antallKunder,
            utstyr: null,
            kommentarer: [],
          })),
        },
      ]);

      if (feilet.length > 0) {
        setSkjemaFeil(
          `Fant ingen treff på:\n${feilet.map((a) => `• ${a}`).join("\n")}\n` +
            "Prøv med gatenavn, nummer og poststed.",
        );
      }

      if (nye.length === 0) return false;
      return feilet.length === 0;
    } finally {
      setLasterSkjema(false);
    }
  };

  /** Leser fila og lar dialogen ta over – ingenting legges på kartet ennå. */
  const importerFil = async (fil: File) => {
    setLasterFil(true);
    setImportFeil(null);
    setImportResultat(null);

    try {
      setVentende({
        id: crypto.randomUUID(),
        leveranser: lesLeveranser(new Uint8Array(await fil.arrayBuffer())),
      });
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

  /** Crewet er satt i dialogen: nå slås adressene opp og leveransene legges ut. */
  const bekreftVentende = async (ansvarlige: string[][]) => {
    if (!ventende) return;
    setLasterFil(true);

    try {
      const { nye, feilet } = await leggTil(
        ventende.leveranser.map((leveranse, indeks) => ({
          ...leveranse,
          ansvarlige: ansvarlige[indeks] ?? leveranse.ansvarlige,
        })),
      );

      const adresser = nye.reduce((sum, leveranse) => sum + leveranse.stopp.length, 0);
      const kunder = nye.reduce(
        (sum, leveranse) =>
          sum + leveranse.stopp.reduce((delsum, stopp) => delsum + (stopp.antallKunder ?? 0), 0),
        0,
      );

      setImportResultat(
        `La til ${nye.length} ${nye.length === 1 ? "leveranse" : "leveranser"} med ${adresser} adresser og til sammen ${kunder} kunder.` +
          (feilet.length > 0
            ? `\nFant ingen treff på:\n${feilet.map((a) => `• ${a}`).join("\n")}`
            : ""),
      );
      setVentende(null);
    } finally {
      setLasterFil(false);
    }
  };

  const fjernLeveranse = (id: string) => {
    const fjernet = leveranser.find((leveranse) => leveranse.id === id);
    setLeveranser((forrige) => forrige.filter((leveranse) => leveranse.id !== id));
    setAktivtStoppId((forrige) =>
      fjernet?.stopp.some((stopp) => stopp.id === forrige) ? null : forrige,
    );
  };

  const fjernAlle = () => {
    setLeveranser([]);
    setAktivtStoppId(null);
  };

  return (
    <div className="app">
      <header className="app__topp">
        <Heading tag="h1" variant="title-300">
          Briefingkart
        </Heading>
        <Paragraph variant="paragraph-100">
          Telia Personlig Service Crew – én leveranse per dag, med alle adressene på kartet,
          ansvarlige, antall kunder, notat og kjøretid fra kontoret.
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
          <LeveranseSkjema
            onLagre={lagreFraSkjema}
            laster={lasterSkjema}
            feilmelding={skjemaFeil}
            onLukkFeil={() => setSkjemaFeil(null)}
          />
          <LeveranseListe
            leveranser={leveranser}
            aktivtStoppId={aktivtStoppId}
            onVisStopp={velgStopp}
            onVisLeveranse={rammInn}
            onVisAlle={() => rammInn(null)}
            onFjern={fjernLeveranse}
            onFjernAlle={fjernAlle}
          />
        </div>

        <section className="app__kart" aria-label="Kart med leveranser">
          <Briefingkart
            leveranser={leveranser}
            aktivtStoppId={aktivtStoppId}
            fokusTeller={fokusTeller}
            innramming={innramming}
          />
        </section>
      </main>

      <LeveranseDialog
        ventende={ventende}
        laster={lasterFil}
        onBekreft={bekreftVentende}
        onAvbryt={() => setVentende(null)}
      />
    </div>
  );
}

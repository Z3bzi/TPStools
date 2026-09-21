import { useEffect, useState } from "react";
import { Button, Heading } from "@purpurds/purpur";

import { Briefingkart, type Boblekommando, type Innramming } from "./components/Briefingkart";
import { Dagslagring } from "./components/Dagslagring";
import { ExcelOpplasting } from "./components/ExcelOpplasting";
import { LeveranseDialog, type VentendeImport } from "./components/LeveranseDialog";
import { LeveranseListe } from "./components/LeveranseListe";
import { LeveranseRedigering } from "./components/LeveranseRedigering";
import { LeveranseSkjema, type SkjemaUtkast } from "./components/LeveranseSkjema";
import { DagsfilFeil, lesDagsfil } from "./lib/dagsfil";
import { fordelFarger } from "./lib/farger";
import { sokAdresser } from "./lib/geonorge";
import { hentKjoretider } from "./lib/kjoretid";
import { lesLeveranser, XlsxFeil } from "./lib/leveranse";
import type { Leveranse, LeveranseUtkast, Stopp, UfargetLeveranse } from "./types";

/**
 * Legger nye leveranser bakerst i lista og gir hver av dem sin egen
 * markørfarge, slik at dagene kan skilles fra hverandre på kartet. En leveranse
 * som allerede har en farge – den kommer fra en lagret dagsfil – beholder den
 * når fargen er ledig.
 */
function leggIListe(
  forrige: Leveranse[],
  nye: (UfargetLeveranse & { farge?: string })[],
): Leveranse[] {
  const farger = fordelFarger(
    forrige.map((leveranse) => leveranse.farge),
    nye.map((leveranse) => leveranse.farge),
  );

  return [...forrige, ...nye.map((leveranse, indeks) => ({ ...leveranse, farge: farger[indeks] }))];
}

export function App() {
  const [leveranser, setLeveranser] = useState<Leveranse[]>([]);
  /**
   * Fremvisning er modusen briefingen holdes i: kart og leveranser, ingen
   * import, ingen skjema, ingenting som kan endres ved et uhell mens crewet
   * ser på. Planlegging er modusen dagen gjøres klar i.
   */
  const [fremvisning, setFremvisning] = useState(false);
  const [aktivtStoppId, setAktivtStoppId] = useState<string | null>(null);
  // Økes hver gang et stopp velges, slik at kartet flyr dit igjen selv om
  // det allerede var det aktive stoppet.
  const [fokusTeller, setFokusTeller] = useState(0);
  const [innramming, setInnramming] = useState<Innramming>({ leveranseId: null, teller: 0 });
  // Boblene på kartet står åpne til de lukkes, og styres herfra så lista kan
  // åpne en hel dag om gangen.
  const [bobler, setBobler] = useState<Boblekommando>({
    handling: "lukk",
    leveranseId: null,
    teller: 0,
  });

  // Leveransene fra en importert fil venter her mens dialogen spør hvilke ark
  // som skal med og hvem som skal ut på dem. Adressene slås ikke opp før det
  // er avklart.
  const [ventende, setVentende] = useState<VentendeImport | null>(null);

  // Leveransen som redigeres, som id: da følger modalen med når leveransen
  // endres, i stedet for å holde på en utdatert kopi.
  const [redigererId, setRedigererId] = useState<string | null>(null);

  const [lasterSkjema, setLasterSkjema] = useState(false);
  const [skjemaFeil, setSkjemaFeil] = useState<string | null>(null);
  const [lasterFil, setLasterFil] = useState(false);
  const [importResultat, setImportResultat] = useState<string | null>(null);
  const [importFeil, setImportFeil] = useState<string | null>(null);
  const [lasterDag, setLasterDag] = useState(false);
  const [dagResultat, setDagResultat] = useState<string | null>(null);
  const [dagFeil, setDagFeil] = useState<string | null>(null);

  // Escape er den vanlige veien ut av en fullskjermvisning, og raskere enn å
  // lete etter knappen mens prosjektoren står på.
  useEffect(() => {
    if (!fremvisning) return;
    const paTast = (hendelse: KeyboardEvent) => {
      if (hendelse.key === "Escape") setFremvisning(false);
    };
    window.addEventListener("keydown", paTast);
    return () => window.removeEventListener("keydown", paTast);
  }, [fremvisning]);

  const velgStopp = (id: string) => {
    setAktivtStoppId(id);
    setFokusTeller((forrige) => forrige + 1);
  };

  const rammInn = (leveranseId: string | null) =>
    setInnramming((forrige) => ({ leveranseId, teller: forrige.teller + 1 }));

  /** Åpner boblene til alle adressene i én leveranse på én gang. */
  const visBobler = (leveranseId: string) =>
    setBobler((forrige) => ({ handling: "apne", leveranseId, teller: forrige.teller + 1 }));

  const lukkBobler = () =>
    setBobler((forrige) => ({ handling: "lukk", leveranseId: null, teller: forrige.teller + 1 }));

  /**
   * Slår opp adressene og legger til leveransene som ble funnet. Adresser som
   * ikke lar seg geokode rapporteres tilbake, slik at ingen rad forsvinner i
   * stillhet.
   */
  const leggTil = async (
    utkast: LeveranseUtkast[],
  ): Promise<{ nye: UfargetLeveranse[]; feilet: string[] }> => {
    const treff = await sokAdresser(utkast.flatMap((l) => l.stopp.map((s) => s.soketekst)));

    const nye: UfargetLeveranse[] = [];
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
        toppinfo: leveranse.toppinfo,
        ansvarlige: leveranse.ansvarlige,
        notat: leveranse.notat,
        opprettet: new Date().toISOString(),
        stopp,
      });
    }

    if (nye.length > 0) {
      setLeveranser((forrige) => leggIListe(forrige, nye));

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
  const beregnKjoretider = async (nye: { stopp: Stopp[] }[]) => {
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
          toppinfo: [],
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

  /**
   * Arkene er valgt og crewet satt i dialogen: nå slås adressene opp og
   * leveransene legges ut. Ark som ikke ble huket av er allerede luket bort.
   */
  const bekreftVentende = async (valgte: LeveranseUtkast[]) => {
    if (!ventende) return;
    setLasterFil(true);

    try {
      const { nye, feilet } = await leggTil(valgte);

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

  /**
   * Åpner en dag som er lagret som fil. Adressene er allerede slått opp, så
   * leveransene legges rett på kartet – det er hele poenget med å forberede
   * dagen i forveien. Kjøretider som manglet da fila ble lagret hentes i
   * bakgrunnen, akkurat som ved en vanlig import.
   */
  const apneDagsfil = async (fil: File) => {
    setLasterDag(true);
    setDagFeil(null);
    setDagResultat(null);

    try {
      const apnet = lesDagsfil(await fil.text());

      setLeveranser((forrige) => leggIListe(forrige, apnet));
      rammInn(null);

      const adresser = apnet.reduce((sum, leveranse) => sum + leveranse.stopp.length, 0);
      setDagResultat(
        `Åpnet ${apnet.length} ${apnet.length === 1 ? "leveranse" : "leveranser"} med ${adresser} adresser.`,
      );

      const utenKjoretid = apnet.filter((leveranse) =>
        leveranse.stopp.some((stopp) => stopp.kjoretid === null),
      );
      if (utenKjoretid.length > 0) void beregnKjoretider(utenKjoretid);
    } catch (feil) {
      setDagFeil(
        feil instanceof DagsfilFeil
          ? feil.message
          : "Klarte ikke å lese fila. Velg en dag lagret fra Briefingkart.",
      );
    } finally {
      setLasterDag(false);
    }
  };

  /**
   * Lagrer en redigert leveranse. Adressene som er lagt til må slås opp først;
   * de som ikke blir funnet gis tilbake, slik at modalen kan si fra om dem i
   * stedet for å la dem forsvinne.
   */
  const lagreRedigering = async (endret: Leveranse, nyeAdresser: string[]): Promise<string[]> => {
    const treff = nyeAdresser.length > 0 ? await sokAdresser(nyeAdresser) : [];

    const nyeStopp: Stopp[] = [];
    const feilet: string[] = [];
    for (const resultat of treff) {
      if (!resultat.adresse) {
        feilet.push(resultat.soketekst);
        continue;
      }
      nyeStopp.push({
        id: crypto.randomUUID(),
        soketekst: resultat.soketekst,
        adresse: resultat.adresse,
        antallKunder: null,
        utstyr: null,
        kommentarer: [],
        kjoretid: null,
      });
    }

    const oppdatert: Leveranse = { ...endret, stopp: [...endret.stopp, ...nyeStopp] };
    setLeveranser((forrige) =>
      forrige.map((leveranse) => (leveranse.id === oppdatert.id ? oppdatert : leveranse)),
    );

    // Sto briefingen åpen på en adresse som nå er fjernet, er det ingenting
    // igjen å vise.
    const gammel = leveranser.find((leveranse) => leveranse.id === endret.id);
    setAktivtStoppId((forrige) =>
      forrige !== null &&
      gammel?.stopp.some((stopp) => stopp.id === forrige) &&
      !oppdatert.stopp.some((stopp) => stopp.id === forrige)
        ? null
        : forrige,
    );

    // Nye adresser har ingen kjøretid ennå. Den hentes i bakgrunnen, som ved
    // en vanlig import.
    if (nyeStopp.length > 0) {
      rammInn(null);
      void beregnKjoretider([{ stopp: nyeStopp }]);
    }

    return feilet;
  };

  const fjernLeveranse = (id: string) => {
    const fjernet = leveranser.find((leveranse) => leveranse.id === id);
    setLeveranser((forrige) => forrige.filter((leveranse) => leveranse.id !== id));
    setAktivtStoppId((forrige) =>
      fjernet?.stopp.some((stopp) => stopp.id === forrige) ? null : forrige,
    );
    if (redigererId === id) setRedigererId(null);
  };

  const fjernAlle = () => {
    setLeveranser([]);
    setAktivtStoppId(null);
    setRedigererId(null);
  };

  return (
    <div className={fremvisning ? "app app--fremvisning" : "app"}>
      {/* Overskriften står bare for skjermlesere – kartet er det som skal fylle skjermen. */}
      <Heading tag="h1" variant="title-100" className="kun-skjermleser">
        Briefingkart – Telia Personlig Service Crew
      </Heading>

      <main className="app__innhold">
        <div className="app__panel">
          {/*
            I fremvisning er panelet bare leveransene: import, skjema og lagring
            hører til forberedelsen, ikke til møtet.
          */}
          {!fremvisning && (
            <>
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
              <Dagslagring
                leveranser={leveranser}
                onApne={apneDagsfil}
                laster={lasterDag}
                resultat={dagResultat}
                feilmelding={dagFeil}
                onLukkMelding={() => {
                  setDagResultat(null);
                  setDagFeil(null);
                }}
              />
            </>
          )}
          <LeveranseListe
            leveranser={leveranser}
            aktivtStoppId={aktivtStoppId}
            fremvisning={fremvisning}
            onVisStopp={velgStopp}
            onVisLeveranse={rammInn}
            onVisBobler={visBobler}
            onLukkBobler={lukkBobler}
            onVisAlle={() => rammInn(null)}
            onRediger={setRedigererId}
            onFjern={fjernLeveranse}
            onFjernAlle={fjernAlle}
          />
        </div>

        <section className="app__kart" aria-label="Kart med leveranser">
          {/*
            Modusknappen ligger over kartet i stedet for i en topprad: i
            fremvisning skal ingenting annet enn kartet og leveransene ta plass,
            og knappen må være der uansett om det ligger leveranser inne.
          */}
          <div className="app__modus">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFremvisning((forrige) => !forrige)}
            >
              {fremvisning ? "Avslutt fremvisning" : "Fremvisningsmodus"}
            </Button>
          </div>

          <Briefingkart
            leveranser={leveranser}
            aktivtStoppId={aktivtStoppId}
            fokusTeller={fokusTeller}
            innramming={innramming}
            bobler={bobler}
          />
        </section>
      </main>

      <LeveranseDialog
        ventende={ventende}
        laster={lasterFil}
        onBekreft={bekreftVentende}
        onAvbryt={() => setVentende(null)}
      />

      <LeveranseRedigering
        leveranse={leveranser.find((leveranse) => leveranse.id === redigererId) ?? null}
        onLagre={lagreRedigering}
        onLukk={() => setRedigererId(null)}
      />
    </div>
  );
}

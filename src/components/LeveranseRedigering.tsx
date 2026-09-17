import { useState } from "react";
import {
  Accordion,
  Button,
  Modal,
  Notification,
  Paragraph,
  TextArea,
  TextField,
} from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import { formaterNavneliste, tolkNavneliste } from "../lib/navn";
import {
  TOMT_UTSTYR,
  UTSTYR_ETIKETT,
  type AdresseTreff,
  type Kjoretid,
  type Kommentar,
  type Leveranse,
  type Stopp,
  type Utstyr,
  type UtstyrKategori,
} from "../types";

/**
 * Retting av en leveranse som alt ligger på kartet.
 *
 * Det som kommer ut av en arbeidsliste er ikke alltid det crewet møter: navn
 * endres, en adresse faller fra eller kommer til, og antall kunder stemmer
 * ikke. Her rettes alt det uten å importere lista på nytt – også på en dag som
 * er åpnet fra fil.
 *
 * Adresser som legges til må geokodes, så lagringen er asynkron og kan feile
 * per adresse. Resten av endringene er allerede lagret når det skjer.
 */

/** Ett stopp under redigering. Tallfeltene står som tekst mens det skrives i dem. */
type StoppFelt = {
  id: string;
  adresse: AdresseTreff;
  soketekst: string;
  antallKunder: string;
  /**
   * Om stoppet hadde utstyrsmerking fra lista. Et stopp uten merking skal bli
   * stående uten, i stedet for å få fire nuller det ikke er dekning for.
   */
  haddeUtstyr: boolean;
  utstyr: Record<UtstyrKategori, string>;
  kommentarer: Kommentar[];
  kjoretid: Kjoretid | null;
};

type Felt = {
  dato: string;
  ansvarlige: string;
  toppinfo: string;
  notat: string;
  stopp: StoppFelt[];
  nyeAdresser: string;
};

const KATEGORIER = Object.keys(TOMT_UTSTYR) as UtstyrKategori[];

type Props = {
  leveranse: Leveranse | null;
  /**
   * Lagrer endringene og slår opp adressene som er lagt til. Gir tilbake
   * adressene som ikke lot seg geokode – er lista tom, er alt på plass.
   */
  onLagre: (endret: Leveranse, nyeAdresser: string[]) => Promise<string[]>;
  onLukk: () => void;
};

export function LeveranseRedigering({ leveranse, onLagre, onLukk }: Props) {
  if (!leveranse) return null;
  return <Redigering leveranse={leveranse} onLagre={onLagre} onLukk={onLukk} />;
}

function Redigering({
  leveranse,
  onLagre,
  onLukk,
}: {
  leveranse: Leveranse;
  onLagre: (endret: Leveranse, nyeAdresser: string[]) => Promise<string[]>;
  onLukk: () => void;
}) {
  const [felt, setFelt] = useState<Felt>(() => lagFelt(leveranse));
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  // Leveransen bytter identitet først når den faktisk er endret i appen – ved
  // lagring, eller når kjøretiden for en ny adresse kommer inn. Da leses
  // feltene inn på nytt fra det som er lagret, slik at en ny lagring bygger
  // videre på sannheten og ikke på et utdatert utkast. Justeringen gjøres
  // under rendringen, ikke i en effekt: da slipper skjemaet å blinke innom de
  // gamle verdiene først.
  const [sistLest, setSistLest] = useState(leveranse);
  if (sistLest !== leveranse) {
    setSistLest(leveranse);
    // Adressene som er skrevet inn, men ikke slått opp ennå, blir stående:
    // de er ikke en del av leveransen som er lagret, og etter en mislykket
    // lagring er det nettopp dem som skal rettes.
    setFelt((forrige) => ({ ...lagFelt(leveranse), nyeAdresser: forrige.nyeAdresser }));
  }

  const oppdater = (endring: Partial<Felt>) => setFelt((forrige) => ({ ...forrige, ...endring }));

  const oppdaterStopp = (id: string, endring: Partial<StoppFelt>) =>
    setFelt((forrige) => ({
      ...forrige,
      stopp: forrige.stopp.map((s) => (s.id === id ? { ...s, ...endring } : s)),
    }));

  const fjernStopp = (id: string) =>
    setFelt((forrige) => ({ ...forrige, stopp: forrige.stopp.filter((s) => s.id !== id) }));

  const nyeAdresser = felt.nyeAdresser
    .split("\n")
    .map((linje) => linje.trim())
    .filter((linje) => linje !== "");

  const lagre = async () => {
    // En leveranse uten en eneste adresse har ingenting å vise på kartet.
    // Skal hele dagen bort, er det «Fjern» på leveransekortet som gjør det.
    if (felt.stopp.length === 0 && nyeAdresser.length === 0) {
      setFeil(
        "Leveransen må ha minst én adresse. Vil du fjerne hele leveransen, bruk «Fjern» på " +
          "leveransekortet.",
      );
      return;
    }

    setLaster(true);
    setFeil(null);

    try {
      const feilet = await onLagre(byggLeveranse(leveranse, felt), nyeAdresser);

      if (feilet.length === 0) {
        onLukk();
        return;
      }

      // Resten er lagret. Adressene som ikke ble funnet blir stående i feltet,
      // slik at de kan rettes og forsøkes på nytt.
      setFelt((forrige) => ({ ...forrige, nyeAdresser: feilet.join("\n") }));
      setFeil(
        `Fant ingen treff på:\n${feilet.map((a) => `• ${a}`).join("\n")}\n` +
          "Resten er lagret. Prøv med gatenavn, nummer og poststed.",
      );
    } finally {
      setLaster(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(apen) => {
        if (!apen && !laster) onLukk();
      }}
    >
      <Modal.Content
        title="Rediger leveransen"
        description="Endringene gjelder denne dagen på kartet, og følger med når dagen lagres som fil."
        disableCloseOnClickOutside
        stickyButtons
        actions={
          <>
            <Button variant="primary" type="button" loading={laster} onClick={lagre}>
              Lagre endringene
            </Button>
            <Button variant="secondary" type="button" onClick={onLukk} disabled={laster}>
              Avbryt
            </Button>
          </>
        }
      >
        <div className="stabel">
          <TextField
            id="rediger-dato"
            label="Dato eller navn"
            helperText="Står som overskrift på leveransekortet og som merke i boblen."
            value={felt.dato}
            onChange={(event) => oppdater({ dato: event.target.value })}
          />

          <TextField
            id="rediger-ansvarlige"
            label="Hvem skal dit?"
            helperText="Ett navn eller flere skilt med komma."
            value={felt.ansvarlige}
            onChange={(event) => oppdater({ ansvarlige: event.target.value })}
          />

          <TextArea
            id="rediger-toppinfo"
            label="Toppinfo"
            helperText="Én linje per punkt. Står øverst i briefingen, før adressen."
            rows={3}
            value={felt.toppinfo}
            onChange={(event) => oppdater({ toppinfo: event.target.value })}
          />

          <TextArea
            id="rediger-notat"
            label="Notat / mer info"
            helperText="Felles for alle adressene i leveransen."
            rows={6}
            value={felt.notat}
            onChange={(event) => oppdater({ notat: event.target.value })}
          />

          <Paragraph variant="additional-100-bold">
            Adresser ({felt.stopp.length})
          </Paragraph>

          {felt.stopp.length === 0 ? (
            <Paragraph variant="paragraph-100">
              Alle adressene er fjernet. Legg til minst én under for å kunne lagre.
            </Paragraph>
          ) : (
            <Accordion>
              {felt.stopp.map((stopp) => (
                <Accordion.Item
                  key={stopp.id}
                  title={`${formaterAdresse(stopp.adresse)} · ${
                    stopp.antallKunder.trim() === "" ? "antall ikke satt" : `${stopp.antallKunder} kunder`
                  }`}
                  titleTag="h3"
                >
                  <div className="stabel">
                    <TextField
                      id={`rediger-kunder-${stopp.id}`}
                      label="Antall kunder"
                      type="number"
                      min={0}
                      value={stopp.antallKunder}
                      onChange={(event) =>
                        oppdaterStopp(stopp.id, { antallKunder: event.target.value })
                      }
                    />

                    <div>
                      <Paragraph variant="additional-100-bold">Utstyr</Paragraph>
                      <div className="redigering__utstyr">
                        {KATEGORIER.map((kategori) => (
                          <TextField
                            key={kategori}
                            id={`rediger-utstyr-${stopp.id}-${kategori}`}
                            label={UTSTYR_ETIKETT[kategori]}
                            type="number"
                            min={0}
                            value={stopp.utstyr[kategori]}
                            onChange={(event) =>
                              oppdaterStopp(stopp.id, {
                                utstyr: { ...stopp.utstyr, [kategori]: event.target.value },
                              })
                            }
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Paragraph variant="additional-100-bold">
                        Kommentarer ({stopp.kommentarer.length})
                      </Paragraph>
                      <div className="stabel">
                        {stopp.kommentarer.map((kommentar, indeks) => (
                          <div className="rad" key={indeks}>
                            <TextField
                              id={`rediger-leilighet-${stopp.id}-${indeks}`}
                              label="Leilighet"
                              value={kommentar.leilighet}
                              onChange={(event) =>
                                oppdaterStopp(stopp.id, {
                                  kommentarer: endreKommentar(stopp.kommentarer, indeks, {
                                    leilighet: event.target.value,
                                  }),
                                })
                              }
                            />
                            <div className="rad__vokser">
                              <TextField
                                id={`rediger-kommentar-${stopp.id}-${indeks}`}
                                label="Kommentar"
                                value={kommentar.tekst}
                                onChange={(event) =>
                                  oppdaterStopp(stopp.id, {
                                    kommentarer: endreKommentar(stopp.kommentarer, indeks, {
                                      tekst: event.target.value,
                                    }),
                                  })
                                }
                              />
                            </div>
                            <Button
                              variant="text"
                              type="button"
                              onClick={() =>
                                oppdaterStopp(stopp.id, {
                                  kommentarer: stopp.kommentarer.filter((_, i) => i !== indeks),
                                })
                              }
                            >
                              Fjern
                            </Button>
                          </div>
                        ))}
                        <div className="rad">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() =>
                              oppdaterStopp(stopp.id, {
                                kommentarer: [...stopp.kommentarer, { leilighet: "", tekst: "" }],
                              })
                            }
                          >
                            Legg til kommentar
                          </Button>
                          <Button
                            variant="text"
                            type="button"
                            onClick={() => fjernStopp(stopp.id)}
                          >
                            Fjern adressen
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Accordion.Item>
              ))}
            </Accordion>
          )}

          <TextArea
            id="rediger-nye-adresser"
            label="Legg til adresser"
            helperText="Én adresse per linje. De slås opp hos Kartverket når du lagrer."
            rows={2}
            value={felt.nyeAdresser}
            onChange={(event) => oppdater({ nyeAdresser: event.target.value })}
          />

          {feil && (
            <Notification
              status="error"
              heading="Sjekk dette"
              onClose={() => setFeil(null)}
              closeButtonAriaLabel="Lukk feilmelding"
            >
              <Paragraph variant="paragraph-100" className="notat">
                {feil}
              </Paragraph>
            </Notification>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function endreKommentar(
  kommentarer: Kommentar[],
  indeks: number,
  endring: Partial<Kommentar>,
): Kommentar[] {
  return kommentarer.map((k, i) => (i === indeks ? { ...k, ...endring } : k));
}

function lagFelt(leveranse: Leveranse): Felt {
  return {
    dato: leveranse.dato ?? "",
    ansvarlige: formaterNavneliste(leveranse.ansvarlige),
    toppinfo: leveranse.toppinfo.join("\n"),
    notat: leveranse.notat,
    nyeAdresser: "",
    stopp: leveranse.stopp.map((stopp) => ({
      id: stopp.id,
      adresse: stopp.adresse,
      soketekst: stopp.soketekst,
      antallKunder: stopp.antallKunder === null ? "" : String(stopp.antallKunder),
      haddeUtstyr: stopp.utstyr !== null,
      utstyr: Object.fromEntries(
        KATEGORIER.map((kategori) => [kategori, String(stopp.utstyr?.[kategori] ?? 0)]),
      ) as Record<UtstyrKategori, string>,
      kommentarer: stopp.kommentarer.map((kommentar) => ({ ...kommentar })),
      kjoretid: stopp.kjoretid,
    })),
  };
}

/** Feltene tilbake til en leveranse. Adressene som er lagt til kommer i tillegg. */
function byggLeveranse(leveranse: Leveranse, felt: Felt): Leveranse {
  return {
    ...leveranse,
    dato: felt.dato.trim() === "" ? null : felt.dato.trim(),
    ansvarlige: tolkNavneliste(felt.ansvarlige),
    toppinfo: felt.toppinfo
      .split("\n")
      .map((linje) => linje.trim())
      .filter((linje) => linje !== ""),
    notat: felt.notat.trim(),
    stopp: felt.stopp.map(
      (stopp): Stopp => ({
        id: stopp.id,
        soketekst: stopp.soketekst,
        adresse: stopp.adresse,
        antallKunder: tilTall(stopp.antallKunder),
        utstyr: byggUtstyr(stopp),
        // Tomme kommentarer er rader noen har lagt til og ikke fylt ut.
        kommentarer: stopp.kommentarer.filter((kommentar) => kommentar.tekst.trim() !== ""),
        kjoretid: stopp.kjoretid,
      }),
    ),
  };
}

function byggUtstyr(stopp: StoppFelt): Utstyr | null {
  const utstyr = { ...TOMT_UTSTYR };
  for (const kategori of KATEGORIER) utstyr[kategori] = tilTall(stopp.utstyr[kategori]) ?? 0;

  const harNoe = KATEGORIER.some((kategori) => utstyr[kategori] > 0);
  return harNoe || stopp.haddeUtstyr ? utstyr : null;
}

/** Tall fra et tekstfelt. Tomt, negativt eller ugyldig blir null. */
function tilTall(tekst: string): number | null {
  const trimmet = tekst.trim();
  if (trimmet === "") return null;

  const tall = Number(trimmet);
  return Number.isFinite(tall) && tall >= 0 ? Math.round(tall) : null;
}

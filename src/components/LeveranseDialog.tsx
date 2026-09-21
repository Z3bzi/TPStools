import { useState } from "react";
import { Button, Checkbox, Modal, Paragraph, TextField } from "@purpurds/purpur";

import { formaterNavneliste, tolkNavneliste } from "../lib/navn";
import type { LeveranseUtkast } from "../types";

/** Én importert fil som venter på at arkene velges og crewet settes. */
export type VentendeImport = {
  /** Ny for hver import, slik at dialogen starter med blanke ark hver gang. */
  id: string;
  leveranser: LeveranseUtkast[];
};

type Props = {
  ventende: VentendeImport | null;
  laster: boolean;
  onBekreft: (valgte: LeveranseUtkast[]) => void;
  onAvbryt: () => void;
};

/**
 * Spør hva som skal importeres, før adressene slås opp: hvilke av dagsarkene i
 * fila som skal med, og hvem som skal ut på hver av dem. En arbeidsliste
 * inneholder gjerne flere dager enn den ene crewet skal ut på, så arkene hukes
 * av enkeltvis.
 *
 * Navnefeltet står alltid tomt. Navnene i arket stemmer ikke nødvendigvis med
 * hvem som faktisk skal ut, så de vises som hint under feltet i stedet for å
 * fylles inn – det som står der, er det noen har skrevet selv.
 */
export function LeveranseDialog({ ventende, laster, onBekreft, onAvbryt }: Props) {
  if (!ventende) return null;

  return (
    <Dialog
      key={ventende.id}
      leveranser={ventende.leveranser}
      laster={laster}
      onBekreft={onBekreft}
      onAvbryt={onAvbryt}
    />
  );
}

function Dialog({
  leveranser,
  laster,
  onBekreft,
  onAvbryt,
}: {
  leveranser: LeveranseUtkast[];
  laster: boolean;
  onBekreft: (valgte: LeveranseUtkast[]) => void;
  onAvbryt: () => void;
}) {
  // Alle arkene er med til å begynne med: den vanlige importen er hele fila,
  // og det er raskere å hake av det ene arket man ikke vil ha.
  const [valgt, setValgt] = useState(() => leveranser.map(() => true));
  const [felt, setFelt] = useState(() => leveranser.map(() => ""));

  const settValgt = (indeks: number, verdi: boolean) =>
    setValgt((forrige) => forrige.map((v, i) => (i === indeks ? verdi : v)));

  const oppdater = (indeks: number, verdi: string) =>
    setFelt((forrige) => forrige.map((f, i) => (i === indeks ? verdi : f)));

  const alene = leveranser.length === 1;
  const antallValgte = valgt.filter(Boolean).length;
  const alleValgt = antallValgte === leveranser.length;

  const bekreft = () =>
    onBekreft(
      leveranser
        .map((leveranse, indeks) => ({ leveranse, indeks }))
        .filter(({ indeks }) => valgt[indeks])
        .map(({ leveranse, indeks }) => ({
          ...leveranse,
          ansvarlige: tolkNavneliste(felt[indeks] ?? ""),
        })),
    );

  return (
    <Modal
      open
      onOpenChange={(apen) => {
        if (!apen && !laster) onAvbryt();
      }}
    >
      <Modal.Content
        title={alene ? "Importer leveransen" : "Hva skal importeres?"}
        description={
          alene
            ? "Skriv hvem som skal ut på leveransen."
            : "Huk av arkene du vil ha med, og skriv hvem som skal ut på hver av dem."
        }
        disableCloseOnClickOutside
        stickyButtons
        actions={
          <>
            <Button
              variant="primary"
              type="button"
              loading={laster}
              disabled={antallValgte === 0}
              onClick={bekreft}
            >
              {antallValgte === 1 ? "Legg på kartet" : `Legg ${antallValgte} leveranser på kartet`}
            </Button>
            <Button variant="secondary" type="button" onClick={onAvbryt} disabled={laster}>
              Avbryt
            </Button>
          </>
        }
      >
        <div className="stabel">
          {!alene && (
            <div className="rad rad--mellomrom">
              <Paragraph variant="additional-100">
                {antallValgte} av {leveranser.length} ark valgt
              </Paragraph>
              <Button
                variant="text"
                type="button"
                onClick={() => setValgt(leveranser.map(() => !alleValgt))}
              >
                {alleValgt ? "Fjern alle" : "Velg alle"}
              </Button>
            </div>
          )}

          {leveranser.map((leveranse, indeks) => (
            <div
              key={`${leveranse.dato ?? "leveranse"}-${indeks}`}
              className={valgt[indeks] ? "arkvalg arkvalg--valgt" : "arkvalg"}
            >
              <Checkbox
                id={`ark-${indeks}`}
                label={leveranse.dato ?? `Ark ${indeks + 1}`}
                helperText={oppsummer(leveranse)}
                checked={valgt[indeks]}
                disabled={laster}
                onChange={(verdi) => settValgt(indeks, verdi === true)}
              />
              <TextField
                id={`ansvarlige-${indeks}`}
                label="Hvem skal dit?"
                helperText={navnehint(leveranse)}
                value={felt[indeks] ?? ""}
                disabled={!valgt[indeks] || laster}
                onChange={(event) => oppdater(indeks, event.target.value)}
              />
            </div>
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function oppsummer(leveranse: LeveranseUtkast): string {
  const kunder = leveranse.stopp.reduce((sum, stopp) => sum + (stopp.antallKunder ?? 0), 0);
  const adresser = `${leveranse.stopp.length} ${leveranse.stopp.length === 1 ? "adresse" : "adresser"}`;
  return `${adresser} · ${kunder} kunder`;
}

/** Navnene i arket vises som hint, men fylles aldri inn i feltet. */
function navnehint(leveranse: LeveranseUtkast): string {
  const standard = "Ett navn eller flere skilt med komma.";
  return leveranse.ansvarlige.length > 0
    ? `${standard} I arket sto: ${formaterNavneliste(leveranse.ansvarlige)}`
    : standard;
}

import { useState } from "react";
import { Button, Modal, TextField } from "@purpurds/purpur";

import { formaterNavneliste, tolkNavneliste } from "../lib/navn";
import type { LeveranseUtkast } from "../types";

/** Én importert fil som venter på at crewet settes. */
export type VentendeImport = {
  /** Ny for hver import, slik at dialogen starter med blanke ark hver gang. */
  id: string;
  leveranser: LeveranseUtkast[];
};

type Props = {
  ventende: VentendeImport | null;
  laster: boolean;
  onBekreft: (ansvarlige: string[][]) => void;
  onAvbryt: () => void;
};

/**
 * Spør hvem som skal ut på hver leveranse, før adressene slås opp. Ett felt
 * per dagsark, forhåndsutfylt med navnene som allerede sto i arket – da er
 * dialogen en bekreftelse når lista stemmer, og et sted å rette når den ikke
 * gjør det.
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
  onBekreft: (ansvarlige: string[][]) => void;
  onAvbryt: () => void;
}) {
  const [felt, setFelt] = useState(() =>
    leveranser.map((leveranse) => formaterNavneliste(leveranse.ansvarlige)),
  );

  const oppdater = (indeks: number, verdi: string) =>
    setFelt((forrige) => forrige.map((f, i) => (i === indeks ? verdi : f)));

  const alene = leveranser.length === 1;

  return (
    <Modal
      open
      onOpenChange={(apen) => {
        if (!apen && !laster) onAvbryt();
      }}
    >
      <Modal.Content
        title={alene ? "Hvem skal på leveransen?" : "Hvem skal på leveransene?"}
        description="Skriv navnene skilt med komma."
        disableCloseOnClickOutside
        actions={
          <>
            <Button
              variant="primary"
              type="button"
              loading={laster}
              onClick={() => onBekreft(felt.map(tolkNavneliste))}
            >
              {alene ? "Legg på kartet" : "Legg alle på kartet"}
            </Button>
            <Button variant="secondary" type="button" onClick={onAvbryt} disabled={laster}>
              Avbryt
            </Button>
          </>
        }
      >
        <div className="stabel">
          {leveranser.map((leveranse, indeks) => (
            <TextField
              key={`${leveranse.dato ?? "leveranse"}-${indeks}`}
              id={`ansvarlige-${indeks}`}
              label={leveranse.dato ?? "Leveranse"}
              helperText={oppsummer(leveranse)}
              value={felt[indeks] ?? ""}
              onChange={(event) => oppdater(indeks, event.target.value)}
            />
          ))}
        </div>
      </Modal.Content>
    </Modal>
  );
}

function oppsummer(leveranse: LeveranseUtkast): string {
  const kunder = leveranse.stopp.reduce((sum, stopp) => sum + (stopp.antallKunder ?? 0), 0);
  const adresser = `${leveranse.stopp.length} ${leveranse.stopp.length === 1 ? "adresse" : "adresser"}`;
  return `${adresser} · ${kunder} kunder. Skill navnene med komma.`;
}

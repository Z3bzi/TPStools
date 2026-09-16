import { useRef, type ChangeEvent } from "react";
import { Button, Card, Notification, Paragraph } from "@purpurds/purpur";

import { dagsfilnavn, lagDagsfil } from "../lib/dagsfil";
import type { Leveranse } from "../types";

type Props = {
  leveranser: Leveranse[];
  onApne: (fil: File) => void;
  laster: boolean;
  resultat: string | null;
  feilmelding: string | null;
  onLukkMelding: () => void;
};

/**
 * Lagring av dagen som fil, og åpning av en lagret dag igjen. Dette er det som
 * gjør at en briefing kan gjøres klar kvelden før: importer lista, sett
 * crewet, last ned dagen – og åpne fila når møtet starter, ferdig geokodet og
 * med kjøretidene på plass.
 */
export function Dagslagring({
  leveranser,
  onApne,
  laster,
  resultat,
  feilmelding,
  onLukkMelding,
}: Props) {
  const filvelger = useRef<HTMLInputElement>(null);

  const lastNed = () => {
    const blob = new Blob([lagDagsfil(leveranser)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const lenke = document.createElement("a");
    lenke.href = url;
    lenke.download = dagsfilnavn(leveranser);
    lenke.click();
    URL.revokeObjectURL(url);
  };

  const velgFil = (event: ChangeEvent<HTMLInputElement>) => {
    const fil = event.target.files?.[0];
    if (fil) onApne(fil);
    // Nullstilles så samme fil kan åpnes på nytt.
    event.target.value = "";
  };

  return (
    <Card variant="secondary">
      <Card.ContentContainer>
        <Card.Heading title="Lagre eller åpne en dag" titleTag="h2" />
        <Card.Content>
          <div className="stabel">
            <Paragraph variant="paragraph-100">
              Last ned dagen som fil når den er klar, så slipper du å importere lista på nytt.
              Adresser, crew, notater og kjøretider ligger i fila, og den åpnes igjen rett før
              briefingen. Fila blir liggende på din egen maskin.
            </Paragraph>

            <input
              ref={filvelger}
              type="file"
              accept=".json,application/json"
              className="skjult-fil"
              onChange={velgFil}
            />
            <div className="rad">
              <Button
                variant="secondary"
                type="button"
                onClick={lastNed}
                disabled={leveranser.length === 0}
              >
                Last ned dagen
              </Button>
              <Button
                variant="secondary"
                type="button"
                loading={laster}
                onClick={() => filvelger.current?.click()}
              >
                Åpne lagret dag
              </Button>
            </div>

            {leveranser.length === 0 && (
              <Paragraph variant="additional-100">
                Ingenting å lagre ennå – importer en liste eller åpne en lagret dag.
              </Paragraph>
            )}

            {resultat && (
              <Notification
                status="success"
                heading="Dagen er åpnet"
                onClose={onLukkMelding}
                closeButtonAriaLabel="Lukk melding"
              >
                <Paragraph variant="paragraph-100" className="notat">
                  {resultat}
                </Paragraph>
              </Notification>
            )}

            {feilmelding && (
              <Notification
                status="error"
                heading="Klarte ikke å åpne dagen"
                onClose={onLukkMelding}
                closeButtonAriaLabel="Lukk feilmelding"
              >
                <Paragraph variant="paragraph-100" className="notat">
                  {feilmelding}
                </Paragraph>
              </Notification>
            )}
          </div>
        </Card.Content>
      </Card.ContentContainer>
    </Card>
  );
}

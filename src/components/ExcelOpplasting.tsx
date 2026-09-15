import { useRef, type ChangeEvent } from "react";
import { Button, Card, ColorDot, Notification, Paragraph } from "@purpurds/purpur";

import { UTSTYR_ETIKETT, UTSTYR_FARGE, type UtstyrKategori } from "../types";

type Props = {
  onFil: (fil: File) => void;
  laster: boolean;
  resultat: string | null;
  feilmelding: string | null;
  onLukkMelding: () => void;
};

const FARGEFORKLARING: UtstyrKategori[] = ["ruter-og-tv", "kun-ruter", "kun-tv"];

export function ExcelOpplasting({ onFil, laster, resultat, feilmelding, onLukkMelding }: Props) {
  const filvelger = useRef<HTMLInputElement>(null);

  const velgFil = (event: ChangeEvent<HTMLInputElement>) => {
    const fil = event.target.files?.[0];
    if (fil) onFil(fil);
    // Nullstilles så samme fil kan velges på nytt etter en retting.
    event.target.value = "";
  };

  return (
    <Card variant="secondary">
      <Card.ContentContainer>
        <Card.Heading title="Importer leveranseliste" titleTag="h2" />
        <Card.Content>
          <div className="stabel">
            <Paragraph variant="paragraph-100">
              Last opp GDA-uttrekket (.xlsx). Hvert dagsark blir én leveranse med alle adressene
              sine, antall kunder telles automatisk, og du får spørsmål om hvem som skal ut på hver
              av dem.
            </Paragraph>

            <div>
              <Paragraph variant="additional-100-bold">Fargene i navnekolonnen</Paragraph>
              <div className="utstyr">
                {FARGEFORKLARING.map((kategori) => (
                  <div className="utstyr__rad" key={kategori}>
                    <ColorDot color={UTSTYR_FARGE[kategori]} size="sm" withBorder />
                    <Paragraph variant="paragraph-100">{UTSTYR_ETIKETT[kategori]}</Paragraph>
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={filvelger}
              type="file"
              accept=".xlsx"
              className="skjult-fil"
              onChange={velgFil}
            />
            <div className="rad">
              <Button
                variant="secondary"
                type="button"
                loading={laster}
                onClick={() => filvelger.current?.click()}
              >
                Velg leveranseliste
              </Button>
            </div>

            {resultat && (
              <Notification
                status="success"
                heading="Lista er lest"
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
                heading="Klarte ikke å lese lista"
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

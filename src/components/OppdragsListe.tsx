import { Badge, Button, Card, ColorDot, Heading, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import { summerUtstyr } from "../lib/leveranse";
import { UTSTYR_ETIKETT, UTSTYR_FARGE, type Oppdrag } from "../types";
import { Kjoretidsbadge } from "./Kjoretidsbadge";

type Props = {
  oppdrag: Oppdrag[];
  aktivtOppdragId: string | null;
  onVis: (id: string) => void;
  onVisAlle: () => void;
  onFjern: (id: string) => void;
  onFjernAlle: () => void;
};

export function OppdragsListe({
  oppdrag,
  aktivtOppdragId,
  onVis,
  onVisAlle,
  onFjern,
  onFjernAlle,
}: Props) {
  if (oppdrag.length === 0) {
    return (
      <Card variant="secondary">
        <Card.ContentContainer>
          <Card.Content>
            <Paragraph variant="paragraph-100">
              Ingen oppdrag på kartet ennå. Importer en leveranseliste eller legg inn adresser i
              skjemaet, så settes oppdragene som markører med briefing i boblen.
            </Paragraph>
          </Card.Content>
        </Card.ContentContainer>
      </Card>
    );
  }

  const kunder = oppdrag.reduce((sum, o) => sum + (o.antallKunder ?? 0), 0);

  return (
    <div className="stabel">
      <div className="rad rad--mellomrom">
        <Heading tag="h2" variant="title-100">
          Oppdrag på kartet ({oppdrag.length})
        </Heading>
        <div className="rad">
          <Button variant="text" onClick={onVisAlle}>
            Vis alle
          </Button>
          <Button variant="text" onClick={onFjernAlle}>
            Tøm kartet
          </Button>
        </div>
      </div>

      <Paragraph variant="additional-100">{kunder} kunder totalt</Paragraph>

      {oppdrag.map((o) => {
        const utstyr = summerUtstyr(o.utstyr);

        return (
          <Card key={o.id} variant={o.id === aktivtOppdragId ? "primary" : "secondary"}>
            <Card.ContentContainer>
              <Card.Heading title={formaterAdresse(o.adresse)} titleTag="h3" />
              <Card.Content>
                <div className="stabel">
                  <div className="rad">
                    {o.dato && (
                      <Badge variant="special" showIcon={false}>
                        {o.dato}
                      </Badge>
                    )}
                    <Badge
                      variant={o.antallKunder === null ? "neutral" : "information"}
                      showIcon={false}
                    >
                      {o.antallKunder === null ? "Antall kunder ikke satt" : `${o.antallKunder} kunder`}
                    </Badge>
                    <Kjoretidsbadge kjoretid={o.kjoretid} medKontor />
                  </div>

                  <Paragraph variant="paragraph-100">
                    {o.ansvarlige.length > 0 ? o.ansvarlige.join(", ") : "Ingen ansvarlige satt"}
                  </Paragraph>

                  {utstyr.length > 0 && (
                    <div className="utstyr">
                      {utstyr.map(([kategori, antall]) => (
                        <div className="utstyr__rad" key={kategori}>
                          <ColorDot color={UTSTYR_FARGE[kategori]} size="sm" withBorder />
                          <Paragraph variant="paragraph-100">
                            {UTSTYR_ETIKETT[kategori]}: {antall}
                          </Paragraph>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rad">
                    <Button variant="secondary" onClick={() => onVis(o.id)}>
                      Vis på kartet
                    </Button>
                    <Button variant="text" onClick={() => onFjern(o.id)}>
                      Fjern
                    </Button>
                  </div>
                </div>
              </Card.Content>
            </Card.ContentContainer>
          </Card>
        );
      })}
    </div>
  );
}

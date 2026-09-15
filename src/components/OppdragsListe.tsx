import { Badge, Button, Card, Heading, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import type { Oppdrag } from "../types";

type Props = {
  oppdrag: Oppdrag[];
  aktivtOppdragId: string | null;
  onVis: (id: string) => void;
  onFjern: (id: string) => void;
  onFjernAlle: () => void;
};

export function OppdragsListe({ oppdrag, aktivtOppdragId, onVis, onFjern, onFjernAlle }: Props) {
  if (oppdrag.length === 0) {
    return (
      <Card variant="secondary">
        <Card.ContentContainer>
          <Card.Content>
            <Paragraph variant="paragraph-100">
              Ingen oppdrag på kartet ennå. Legg inn en adresse over, så settes oppdraget som markør
              med briefing i boblen.
            </Paragraph>
          </Card.Content>
        </Card.ContentContainer>
      </Card>
    );
  }

  return (
    <div className="stabel">
      <div className="rad rad--mellomrom">
        <Heading tag="h2" variant="title-100">
          Oppdrag på kartet ({oppdrag.length})
        </Heading>
        <Button variant="text" onClick={onFjernAlle}>
          Tøm kartet
        </Button>
      </div>

      {oppdrag.map((o) => (
        <Card key={o.id} variant={o.id === aktivtOppdragId ? "primary" : "secondary"}>
          <Card.ContentContainer>
            <Card.Heading title={formaterAdresse(o.adresse)} titleTag="h3" />
            <Card.Content>
              <div className="stabel">
                <Paragraph variant="paragraph-100">
                  {o.ansvarlige.length > 0 ? o.ansvarlige.join(", ") : "Ingen ansvarlige satt"}
                </Paragraph>
                <div className="rad">
                  <Badge
                    variant={o.antallKunder === null ? "neutral" : "information"}
                    showIcon={false}
                  >
                    {o.antallKunder === null ? "Antall kunder ikke satt" : `${o.antallKunder} kunder`}
                  </Badge>
                </div>
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
      ))}
    </div>
  );
}

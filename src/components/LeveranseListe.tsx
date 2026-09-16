import { Badge, Button, Card, ColorDot, Heading, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import { summerUtstyr } from "../lib/leveranse";
import {
  TOMT_UTSTYR,
  UTSTYR_ETIKETT,
  UTSTYR_FARGE,
  type Leveranse,
  type Utstyr,
  type UtstyrKategori,
} from "../types";
import { Kjoretidsbadge } from "./Kjoretidsbadge";
import { Toppinfo } from "./Toppinfo";

type Props = {
  leveranser: Leveranse[];
  aktivtStoppId: string | null;
  /** I fremvisning står lista til å leses, ikke til å endres. */
  fremvisning?: boolean;
  onVisStopp: (id: string) => void;
  onVisLeveranse: (id: string) => void;
  onVisAlle: () => void;
  onFjern: (id: string) => void;
  onFjernAlle: () => void;
};

export function LeveranseListe({
  leveranser,
  aktivtStoppId,
  fremvisning = false,
  onVisStopp,
  onVisLeveranse,
  onVisAlle,
  onFjern,
  onFjernAlle,
}: Props) {
  if (leveranser.length === 0) {
    return (
      <Card variant="secondary">
        <Card.ContentContainer>
          <Card.Content>
            <Paragraph variant="paragraph-100">
              {fremvisning
                ? "Ingen leveranser på kartet. Avslutt fremvisningen for å importere en liste " +
                  "eller åpne en lagret dag."
                : "Ingen leveranser på kartet ennå. Importer en leveranseliste, åpne en lagret " +
                  "dag eller legg inn adresser i skjemaet, så settes hver adresse som markør " +
                  "med briefing i boblen."}
            </Paragraph>
          </Card.Content>
        </Card.ContentContainer>
      </Card>
    );
  }

  const stopp = leveranser.reduce((sum, leveranse) => sum + leveranse.stopp.length, 0);
  const kunder = leveranser.reduce((sum, leveranse) => sum + tellKunder(leveranse), 0);

  return (
    <div className="stabel">
      <div className="rad rad--mellomrom">
        <Heading tag="h2" variant="title-100">
          Leveranser ({leveranser.length})
        </Heading>
        <div className="rad">
          <Button variant="text" onClick={onVisAlle}>
            Vis alle
          </Button>
          {!fremvisning && (
            <Button variant="text" onClick={onFjernAlle}>
              Tøm kartet
            </Button>
          )}
        </div>
      </div>

      <Paragraph variant="additional-100">
        {stopp} adresser · {kunder} kunder totalt
      </Paragraph>

      {leveranser.map((leveranse) => {
        const utstyr = summerUtstyr(summerLeveranse(leveranse));
        const harAktivtStopp = leveranse.stopp.some((s) => s.id === aktivtStoppId);

        return (
          <Card key={leveranse.id} variant={harAktivtStopp ? "primary" : "secondary"}>
            <Card.ContentContainer>
              <Card.Heading
                title={leveranse.dato ?? "Lagt inn manuelt"}
                titleTag="h3"
                // Samme farge som markørene leveransen har på kartet.
                icon={<ColorDot color={leveranse.farge} size="md" withBorder />}
              />
              <Card.Content>
                <div className="stabel">
                  <Toppinfo linjer={leveranse.toppinfo} />

                  <div className="rad">
                    <Badge variant="information" showIcon={false}>
                      {leveranse.stopp.length} {leveranse.stopp.length === 1 ? "adresse" : "adresser"}
                    </Badge>
                    <Badge variant="information" showIcon={false}>
                      {tellKunder(leveranse)} kunder
                    </Badge>
                  </div>

                  <Paragraph variant="paragraph-100">
                    {leveranse.ansvarlige.length > 0
                      ? leveranse.ansvarlige.join(", ")
                      : "Ingen ansvarlige satt"}
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

                  <Paragraph variant="additional-100-bold">
                    Adresser og kjøretid fra kontoret
                  </Paragraph>
                  <ul className="stoppliste">
                    {leveranse.stopp.map((s) => (
                      <li
                        key={s.id}
                        className={
                          s.id === aktivtStoppId ? "stoppliste__rad stoppliste__rad--aktiv" : "stoppliste__rad"
                        }
                      >
                        <Paragraph variant="paragraph-100-bold">
                          {formaterAdresse(s.adresse)}
                        </Paragraph>
                        <div className="rad">
                          <Badge
                            variant={s.antallKunder === null ? "neutral" : "information"}
                            showIcon={false}
                          >
                            {s.antallKunder === null ? "Antall kunder ikke satt" : `${s.antallKunder} kunder`}
                          </Badge>
                          <Kjoretidsbadge kjoretid={s.kjoretid} />
                          <Button variant="text" onClick={() => onVisStopp(s.id)}>
                            Vis
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="rad">
                    <Button variant="secondary" onClick={() => onVisLeveranse(leveranse.id)}>
                      Vis leveransen
                    </Button>
                    {!fremvisning && (
                      <Button variant="text" onClick={() => onFjern(leveranse.id)}>
                        Fjern
                      </Button>
                    )}
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

function tellKunder(leveranse: Leveranse): number {
  return leveranse.stopp.reduce((sum, stopp) => sum + (stopp.antallKunder ?? 0), 0);
}

/** Utstyret for hele leveransen, summert over stoppene som har merking. */
function summerLeveranse(leveranse: Leveranse): Utstyr | null {
  const medUtstyr = leveranse.stopp.filter((stopp) => stopp.utstyr !== null);
  if (medUtstyr.length === 0) return null;

  const sum: Utstyr = { ...TOMT_UTSTYR };
  for (const stopp of medUtstyr) {
    for (const [kategori, antall] of Object.entries(stopp.utstyr ?? {}) as [
      UtstyrKategori,
      number,
    ][]) {
      sum[kategori] += antall;
    }
  }

  return sum;
}

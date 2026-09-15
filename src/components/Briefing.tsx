import { Badge, ColorDot, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import { summerUtstyr } from "../lib/leveranse";
import { UTSTYR_ETIKETT, UTSTYR_FARGE, type Leveranse, type Stopp } from "../types";
import { Kjoretidsbadge } from "./Kjoretidsbadge";

/** Innholdet i markørboblen – det crewet leser i oppstartsmøtet. */
export function Briefing({ leveranse, stopp }: { leveranse: Leveranse; stopp: Stopp }) {
  const utstyr = summerUtstyr(stopp.utstyr);

  return (
    <div className="briefing stabel">
      <div className="rad">
        <Paragraph variant="paragraph-100-bold">{formaterAdresse(stopp.adresse)}</Paragraph>
        {leveranse.dato && (
          <Badge variant="special" showIcon={false}>
            {leveranse.dato}
          </Badge>
        )}
      </div>

      <Felt tittel="Ansvarlige">
        {leveranse.ansvarlige.length > 0 ? leveranse.ansvarlige.join(", ") : "Ikke satt"}
      </Felt>

      <Felt tittel="Antall kunder">
        {stopp.antallKunder === null ? "Ikke satt" : String(stopp.antallKunder)}
      </Felt>

      <div>
        <Paragraph variant="additional-100-bold">Kjøretid fra kontoret</Paragraph>
        <div className="rad">
          <Kjoretidsbadge kjoretid={stopp.kjoretid} />
        </div>
      </div>

      {utstyr.length > 0 && (
        <div>
          <Paragraph variant="additional-100-bold">Utstyr</Paragraph>
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
        </div>
      )}

      {leveranse.notat !== "" && (
        <div>
          <Paragraph variant="additional-100-bold">Notat</Paragraph>
          <Paragraph variant="paragraph-100" className="notat">
            {leveranse.notat}
          </Paragraph>
        </div>
      )}

      {stopp.kommentarer.length > 0 && (
        <div>
          <Paragraph variant="additional-100-bold">
            Kommentarer ({stopp.kommentarer.length})
          </Paragraph>
          {stopp.kommentarer.map((kommentar, indeks) => (
            <Paragraph variant="paragraph-100" key={`${kommentar.leilighet}-${indeks}`}>
              {kommentar.leilighet ? `${kommentar.leilighet}: ` : ""}
              {kommentar.tekst}
            </Paragraph>
          ))}
        </div>
      )}
    </div>
  );
}

function Felt({ tittel, children }: { tittel: string; children: React.ReactNode }) {
  return (
    <div>
      <Paragraph variant="additional-100-bold">{tittel}</Paragraph>
      <Paragraph variant="paragraph-100">{children}</Paragraph>
    </div>
  );
}

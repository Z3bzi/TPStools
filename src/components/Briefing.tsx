import { Badge, ColorDot, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import { summerUtstyr } from "../lib/leveranse";
import { UTSTYR_ETIKETT, UTSTYR_FARGE, type Oppdrag } from "../types";
import { Kjoretidsbadge } from "./Kjoretidsbadge";

/** Innholdet i markørboblen – det crewet leser i oppstartsmøtet. */
export function Briefing({ oppdrag }: { oppdrag: Oppdrag }) {
  const utstyr = summerUtstyr(oppdrag.utstyr);

  return (
    <div className="briefing stabel">
      <div className="rad">
        <Paragraph variant="paragraph-100-bold">{formaterAdresse(oppdrag.adresse)}</Paragraph>
        {oppdrag.dato && (
          <Badge variant="special" showIcon={false}>
            {oppdrag.dato}
          </Badge>
        )}
      </div>

      <Felt tittel="Ansvarlige">
        {oppdrag.ansvarlige.length > 0 ? oppdrag.ansvarlige.join(", ") : "Ikke satt"}
      </Felt>

      <Felt tittel="Antall kunder">
        {oppdrag.antallKunder === null ? "Ikke satt" : String(oppdrag.antallKunder)}
      </Felt>

      <div>
        <Paragraph variant="additional-100-bold">Kjøretid fra kontoret</Paragraph>
        <div className="rad">
          <Kjoretidsbadge kjoretid={oppdrag.kjoretid} />
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

      {oppdrag.notat !== "" && (
        <div>
          <Paragraph variant="additional-100-bold">Notat</Paragraph>
          <Paragraph variant="paragraph-100" className="notat">
            {oppdrag.notat}
          </Paragraph>
        </div>
      )}

      {oppdrag.kommentarer.length > 0 && (
        <div>
          <Paragraph variant="additional-100-bold">
            Kommentarer ({oppdrag.kommentarer.length})
          </Paragraph>
          {oppdrag.kommentarer.map((kommentar, indeks) => (
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

import { Paragraph } from "@purpurds/purpur";

/**
 * Toppinfoen fra dagsarket (B1, C1, H1). Står øverst både i leveransekortet og
 * i markørboblen – samme tekst begge steder, så crewet ser den uansett hvor de
 * leser.
 */
export function Toppinfo({ linjer }: { linjer: string[] }) {
  if (linjer.length === 0) return null;

  return (
    <div className="toppinfo">
      {linjer.map((linje, indeks) => (
        <Paragraph variant="paragraph-100-bold" key={`${linje}-${indeks}`}>
          {linje}
        </Paragraph>
      ))}
    </div>
  );
}

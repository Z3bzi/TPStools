import { Badge } from "@purpurds/purpur";

import { formaterAvstand, formaterVarighet } from "../lib/kjoretid";
import { STARTPUNKT } from "../lib/startpunkt";
import type { Kjoretid } from "../types";

type Props = {
  kjoretid: Kjoretid | null;
  /** Tar med «fra Økern Portal» i teksten, for steder uten egen overskrift. */
  medStartpunkt?: boolean;
};

/** Kjøretiden fra oppmøtestedet, lik i oppdragslista og i kartboblen. */
export function Kjoretidsbadge({ kjoretid, medStartpunkt = false }: Props) {
  const fra = medStartpunkt ? ` fra ${STARTPUNKT.navn}` : "";

  if (kjoretid === null) {
    return (
      <Badge variant="neutral" showIcon={false}>
        {`Beregner kjøretid${fra} …`}
      </Badge>
    );
  }

  // Luftlinje-anslaget er merkbart grovere enn en rutet kjøretid, og skal
  // aldri se ut som det samme tallet.
  const anslag = kjoretid.kilde === "luftlinje";
  const deler = [
    `Ca. ${formaterVarighet(kjoretid.sekunder)}`,
    `${formaterAvstand(kjoretid.meter)}${fra}`,
    ...(anslag ? ["anslag"] : []),
  ];

  return (
    <Badge variant={anslag ? "neutral" : "information"} showIcon={false}>
      {deler.join(" · ")}
    </Badge>
  );
}

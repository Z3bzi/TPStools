import { Badge } from "@purpurds/purpur";

import { formaterAvstand, formaterVarighet } from "../lib/kjoretid";
import type { Kjoretid } from "../types";

type Props = {
  kjoretid: Kjoretid | null;
};

/** Kjøretiden fra nærmeste kontor, lik i oppdragslista og i kartboblen. */
export function Kjoretidsbadge({ kjoretid }: Props) {
  if (kjoretid === null) {
    return (
      <Badge variant="neutral" showIcon={false}>
        Beregner kjøretid …
      </Badge>
    );
  }

  // Luftlinje-anslaget er merkbart grovere enn en rutet kjøretid, og skal
  // aldri se ut som det samme tallet.
  const anslag = kjoretid.kilde === "luftlinje";
  const deler = [
    `Ca. ${formaterVarighet(kjoretid.sekunder)}`,
    ...(kjoretid.meter !== null ? [formaterAvstand(kjoretid.meter)] : []),
    `fra ${kjoretid.fra}`,
    ...(anslag ? ["anslag"] : []),
  ];

  return (
    <Badge variant={anslag ? "neutral" : "information"} showIcon={false}>
      {deler.join(" · ")}
    </Badge>
  );
}

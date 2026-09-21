import { formaterAdresse } from "../lib/geonorge";
import { formaterAvstand, formaterVarighet } from "../lib/kjoretid";
import { summerLeveranseUtstyr, summerUtstyr, tellKunder } from "../lib/leveranse";
import { UTSTYR_ETIKETT, type Kjoretid, type Leveranse, type UtstyrKategori } from "../types";

/**
 * Dagen på papir: én leveranse per side, med alt crewet trenger når skjermen
 * ikke er framme. Arket ligger skjult på skjerm og vises kun i `@media print`
 * (se `.utskrift` i `index.css`), og rendres fra leveransene i tilstanden –
 * ikke fra det som står på skjermen.
 *
 * Det er grunnen til at dette er en egen komponent og ikke en omstyling av
 * panelet: leveransekortene i `LeveranseListe` har verken notat eller
 * kommentarer, og briefingen som har alt ligger i Leaflet-bobler som bare
 * finnes i DOM-en mens boblen står åpen. Utskriften skal være den samme
 * uansett hvilke bobler som er oppe.
 *
 * Markupen er ren og semantisk, uten Purpur-kort: bakgrunnsfarger og
 * fargeprikker spiser blekk, og på papir kommer merkingen fram som tekst i
 * stedet. `aria-hidden` holder skjermlesere fra å lese hele dagen to ganger,
 * siden det samme innholdet allerede finnes i lista og i boblene.
 */
export function Utskrift({ leveranser }: { leveranser: Leveranse[] }) {
  if (leveranser.length === 0) return null;

  return (
    <div className="utskrift" aria-hidden="true">
      {leveranser.map((leveranse) => {
        const utstyr = summerUtstyr(summerLeveranseUtstyr(leveranse));

        return (
          <article className="utskrift__dag" key={leveranse.id}>
            <header className="utskrift__topp">
              <h2 className="utskrift__dato">{leveranse.dato ?? "Lagt inn manuelt"}</h2>
              <p className="utskrift__ansvarlige">
                {leveranse.ansvarlige.length > 0
                  ? leveranse.ansvarlige.join(", ")
                  : "Ingen ansvarlige satt"}
              </p>

              {leveranse.toppinfo.map((linje, indeks) => (
                <p className="utskrift__toppinfo" key={`${linje}-${indeks}`}>
                  {linje}
                </p>
              ))}

              {leveranse.notat !== "" && <p className="utskrift__notat notat">{leveranse.notat}</p>}

              <p className="utskrift__sum">
                {leveranse.stopp.length}{" "}
                {leveranse.stopp.length === 1 ? "adresse" : "adresser"} ·{" "}
                {tellKunder(leveranse)} kunder
                {utstyr.length > 0 && <> · {utstyrstekst(utstyr)}</>}
              </p>
            </header>

            <ol className="utskrift__stoppliste">
              {leveranse.stopp.map((stopp) => {
                const stoppUtstyr = summerUtstyr(stopp.utstyr);

                return (
                  <li className="utskrift__stopp" key={stopp.id}>
                    <h3 className="utskrift__adresse">{formaterAdresse(stopp.adresse)}</h3>

                    <p className="utskrift__fakta">
                      {stopp.antallKunder === null
                        ? "Antall kunder ikke satt"
                        : `${stopp.antallKunder} kunder`}{" "}
                      · Kjøretid fra kontoret: {kjoretidstekst(stopp.kjoretid)}
                    </p>

                    {stoppUtstyr.length > 0 && (
                      <p className="utskrift__fakta">Utstyr: {utstyrstekst(stoppUtstyr)}</p>
                    )}

                    {stopp.kommentarer.length > 0 && (
                      <ul className="utskrift__kommentarer">
                        {stopp.kommentarer.map((kommentar, indeks) => (
                          <li key={`${kommentar.leilighet}-${indeks}`}>
                            {kommentar.leilighet ? `${kommentar.leilighet}: ` : ""}
                            {kommentar.tekst}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </article>
        );
      })}
    </div>
  );
}

/** Utstyrsfordelingen som tekst – fargeprikkene fra skjermen blir ikke med. */
function utstyrstekst(utstyr: [UtstyrKategori, number][]): string {
  return utstyr.map(([kategori, antall]) => `${UTSTYR_ETIKETT[kategori]}: ${antall}`).join(", ");
}

/**
 * Kjøretiden i én linje. Luftlinje-anslaget merkes, akkurat som i badgen på
 * skjermen: tallet skal aldri se ut som en rutet kjøretid.
 */
function kjoretidstekst(kjoretid: Kjoretid | null): string {
  if (kjoretid === null) return "ikke beregnet";

  const deler = [`ca. ${formaterVarighet(kjoretid.sekunder)}`];
  if (kjoretid.meter !== null) deler.push(formaterAvstand(kjoretid.meter));
  if (kjoretid.kilde === "luftlinje") deler.push("anslag i luftlinje");

  return deler.join(", ");
}

import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  DismissableChipGroup,
  Notification,
  Paragraph,
  TextArea,
  TextField,
} from "@purpurds/purpur";

export type SkjemaUtkast = {
  /** Én eller flere adresser – alle får samme ansvarlige, antall og notat. */
  adresser: string[];
  ansvarlige: string[];
  antallKunder: number | null;
  notat: string;
};

type Props = {
  onLagre: (utkast: SkjemaUtkast) => Promise<boolean>;
  laster: boolean;
  feilmelding: string | null;
  onLukkFeil: () => void;
};

const TOMT_SKJEMA = {
  adresser: "",
  ansvarlig: "",
  antallKunder: "",
  notat: "",
};

export function OppdragSkjema({ onLagre, laster, feilmelding, onLukkFeil }: Props) {
  const [felt, setFelt] = useState(TOMT_SKJEMA);
  const [ansvarlige, setAnsvarlige] = useState<string[]>([]);
  const [adresseFeil, setAdresseFeil] = useState<string | undefined>(undefined);

  const oppdaterFelt = (navn: keyof typeof TOMT_SKJEMA, verdi: string) =>
    setFelt((forrige) => ({ ...forrige, [navn]: verdi }));

  const leggTilAnsvarlig = () => {
    const navn = felt.ansvarlig.trim();
    if (!navn || ansvarlige.includes(navn)) {
      oppdaterFelt("ansvarlig", "");
      return;
    }
    setAnsvarlige((forrige) => [...forrige, navn]);
    oppdaterFelt("ansvarlig", "");
  };

  const fjernAnsvarlig = (navn: string) =>
    setAnsvarlige((forrige) => forrige.filter((n) => n !== navn));

  const tomSkjema = () => {
    setFelt(TOMT_SKJEMA);
    setAnsvarlige([]);
    setAdresseFeil(undefined);
    onLukkFeil();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const adresser = felt.adresser
      .split("\n")
      .map((linje) => linje.trim())
      .filter((linje) => linje !== "");

    if (adresser.length === 0) {
      setAdresseFeil("Skriv inn minst én adresse.");
      return;
    }
    setAdresseFeil(undefined);

    // Et navn som står igjen i feltet uten å være lagt til som tag skal telle med.
    const ventende = felt.ansvarlig.trim();
    const alleAnsvarlige =
      ventende && !ansvarlige.includes(ventende) ? [...ansvarlige, ventende] : ansvarlige;

    const antall = felt.antallKunder.trim();
    const lagret = await onLagre({
      adresser,
      ansvarlige: alleAnsvarlige,
      antallKunder: antall === "" ? null : Number(antall),
      notat: felt.notat.trim(),
    });

    if (lagret) tomSkjema();
  };

  return (
    <Card>
      <Card.ContentContainer>
        <Card.Heading title="Nytt oppdrag" titleTag="h2" />
        <Card.Content>
          <form onSubmit={submit} noValidate>
            <div className="stabel">
              <TextArea
                id="adresser"
                label="Adresser"
                helperText="Én adresse per linje. Flere linjer gir ett oppdrag per adresse, med samme ansvarlige, antall kunder og notat."
                errorText={adresseFeil}
                rows={3}
                value={felt.adresser}
                onChange={(event) => oppdaterFelt("adresser", event.target.value)}
              />

              <div className="stabel">
                <div className="rad">
                  <div className="rad__vokser">
                    <TextField
                      id="ansvarlig"
                      label="Ansvarlige"
                      helperText="Skriv et navn og trykk «Legg til»."
                      value={felt.ansvarlig}
                      onChange={(event) => oppdaterFelt("ansvarlig", event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          leggTilAnsvarlig();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={leggTilAnsvarlig}
                    disabled={felt.ansvarlig.trim() === ""}
                  >
                    Legg til
                  </Button>
                </div>

                {ansvarlige.length > 0 && (
                  <DismissableChipGroup>
                    {ansvarlige.map((navn) => (
                      <DismissableChipGroup.Item
                        key={navn}
                        id={navn}
                        aria-label={`Fjern ${navn} fra ansvarlige`}
                        onDismiss={() => fjernAnsvarlig(navn)}
                      >
                        {navn}
                      </DismissableChipGroup.Item>
                    ))}
                  </DismissableChipGroup>
                )}
              </div>

              <TextField
                id="antall-kunder"
                label="Antall kunder"
                type="number"
                min={0}
                value={felt.antallKunder}
                onChange={(event) => oppdaterFelt("antallKunder", event.target.value)}
              />

              <TextArea
                id="notat"
                label="Notat / mer info"
                helperText="Det crewet trenger å vite før oppdraget starter."
                rows={4}
                value={felt.notat}
                onChange={(event) => oppdaterFelt("notat", event.target.value)}
              />

              {feilmelding && (
                <Notification
                  status="error"
                  heading="Adressesøket"
                  onClose={onLukkFeil}
                  closeButtonAriaLabel="Lukk feilmelding"
                >
                  <Paragraph variant="paragraph-100" className="notat">
                    {feilmelding}
                  </Paragraph>
                </Notification>
              )}

              <div className="rad">
                <Button variant="primary" type="submit" loading={laster}>
                  Legg på kartet
                </Button>
                <Button variant="text" type="button" onClick={tomSkjema} disabled={laster}>
                  Tøm / nytt oppdrag
                </Button>
              </div>
            </div>
          </form>
        </Card.Content>
      </Card.ContentContainer>
    </Card>
  );
}

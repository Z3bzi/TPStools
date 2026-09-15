# Briefingkart – Telia Personlig Service Crew

Verktøy som viser leveransene på kart. Én leveranse er én dag crewet er ute,
med alle adressene sine som markører – hver med en boble som inneholder det
crewet trenger i oppstartsmøtet: ansvarlige, antall kunder, utstyr, notat og
estimert kjøretid fra kontoret.

Alt kjører i nettleseren. Ingen backend, ingen database, ingen API-nøkler.

## Slik virker det

Kontoret på Økern Portal ligger alltid på kartet som en lilla boble, så det er
lett å se leveransene i forhold til det. Når noe legges til, rammes kartet inn
slik at både kontoret og alle adressene er synlige, og hver adresse får estimert
kjøretid fra kontoret i lista og i boblen. «Vis leveransen» rammer inn adressene
til én enkelt dag.

**Importer en leveranseliste (.xlsx)**

1. Velg GDA-uttrekket. Hvert dagsark blir én leveranse – ikke én per adresse.
2. Radene grupperes per adresse, og antall kunder telles per oppgang. Hver
   adresse blir ett stopp i leveransen, med sin egen markør på kartet.
3. Bakgrunnsfargen på navnecellen leses som utstyr:
   gul = ruter og TV-boks, blå = kun ruter, oransje = kun TV-boks.
   Andre farger telles som «annen merking» framfor å bli gjettet på.
4. B1, C1 og H1 i dagsarket leses som toppinfo og står øverst i boblen, før
   adressen. Tomme celler faller bort.
5. Ansvarlige hentes fra navnekolonnene i overskriftsraden, og fellesinfo
   (leveransetype, plattform, TV/BB, kontaktperson, parkering, prosjektleder)
   fra informasjonsfanen. Radkommentarer følger med per leilighet.
6. En dialog spør hvem som skal ut på hver leveranse, med ett felt per dagsark
   forhåndsutfylt med navnene fra arket. Navn skrives skilt med komma.
7. Først når crewet er bekreftet, geokodes adressene og leveransene legges på
   kartet. Avbryter du dialogen, er ingenting slått opp.

**Eller legg inn adresser manuelt**

1. Skriv én adresse per linje. Alle linjene blir én leveranse, med samme
   ansvarlige, antall kunder og notat.
2. Ansvarlige skrives som ett navn eller flere skilt med komma.
3. Ved lagring slås adressene opp hos Kartverkets åpne adresse-API, og hver
   adresse settes som markør med briefingen i boblen.

Leveransene lever i nettleserens minne så lenge fanen er åpen, og forsvinner ved
refresh. Det er bevisst for et briefingverktøy – ingen kundedata lagres noe sted,
og Excel-filen forlater aldri nettleseren.

## Teknologi

| Del             | Valg                                                                 |
| --------------- | -------------------------------------------------------------------- |
| Rammeverk       | React 19 + Vite                                                       |
| Design          | [`@purpurds/purpur`](https://www.npmjs.com/package/@purpurds/purpur) – Telias designsystem |
| Kart            | react-leaflet + Leaflet, tiles fra OpenStreetMap                       |
| Geokoding       | Kartverket: `https://ws.geonorge.no/adresser/v1/sok`                   |
| Kjøretid        | OSRM: `https://router.project-osrm.org/table/v1/driving`               |
| Excel           | Egen minimal .xlsx-leser på `fflate`                                   |
| Hosting         | Statisk build på GitHub Pages                                          |

Alt UI utenom selve kartflaten er bygget med Purpur-komponenter (`Button`,
`Card`, `TextField`, `TextArea`, `DismissableChipGroup`, `Modal`,
`Notification`, `Badge`, `ColorDot`, `Heading`, `Paragraph`). Egen CSS brukes kun til
sidelayout, kartflaten og kontormarkøren, og henter farger, avstander og radier
fra Purpurs designtokens. Kontorikonet er Purpurs `connected-building`.

### Hvorfor en egen Excel-leser

Utstyrsmerkingen ligger i *bakgrunnsfargen* på cellene, ikke i en kolonne.
SheetJS' åpne utgave leser ikke cellestiler, og ExcelJS drar med seg
Node-avhengigheter som ikke hører hjemme i en ren klient-app. `src/lib/xlsx.ts`
pakker derfor ut arbeidsboka med `fflate` og leser `styles.xml` direkte – rundt
150 linjer, og full kontroll på fargene.

### Kjøretid fra kontoret

Kjøretiden hentes fra OSRMs åpne demo-API, som ruter på ekte veinett uten
API-nøkkel og kalles direkte fra nettleseren – samme prinsipp som
Kartverket-oppslaget. Appen bruker *tabell*-tjenesten med kontoret som eneste
kilde, så en importert leveranseliste på 60 adresser blir tre forespørsler i
stedet for seksti. Rutingen skjer i bakgrunnen: markørene legges ut med én gang,
og tallet fylles inn i kortene og boblene når svaret kommer.

Utgangspunktet er kontorets faste koordinat i `src/lib/kontor.ts` – samme punkt
som markøren står på.

Svarer ikke tjenesten, regner appen et grovt anslag fra luftlinje ganget med en
omveisfaktor, med lavere snittfart på korte turer enn på lange. Anslaget er
merket «anslag» i badgen og vises nøytralt i stedet for blått, slik at ingen
forveksler det med en rutet kjøretid. Samme fallback brukes for enkeltadresser
uten rute, f.eks. langt fra vei.

To ting å være klar over: tallet er fri flyt uten trafikk- eller føredata, og
demoserveren til OSRM er ment for lett bruk. Skal verktøyet brukes av mange crew
samtidig, bør ruting flyttes til en egen OSRM-instans eller en tjeneste med
avtale.

### Merk om `--purpur-rescale`

Purpurs avstands- og typografitokens er definert som
`calc(<verdi> * var(--purpur-rescale))`, men pakken setter ikke selve faktoren.
Uten `--purpur-rescale` blir alle disse `calc()`-ene ugyldige, og UI-et mister
avstander og skriftstørrelser. Appen setter den derfor til `1` i
`src/index.css`.

## Kom i gang

```bash
npm install
npm run dev      # utviklingsserver
npm run build    # typesjekk + produksjonsbuild til dist/
npm run preview  # se på produksjonsbuilden lokalt
npm run lint     # oxlint
```

## Struktur

| Fil                                | Ansvar                                              |
| ---------------------------------- | --------------------------------------------------- |
| `src/App.tsx`                      | Tilstand for leveranser, geokoding og valgt stopp    |
| `src/components/LeveranseSkjema.tsx` | Skjemaet, bygget med Purpur-komponenter            |
| `src/components/ExcelOpplasting.tsx` | Import av leveranseliste, med fargeforklaring      |
| `src/components/LeveranseDialog.tsx` | Dialogen som spør hvem som skal ut på leveransene  |
| `src/components/Briefingkart.tsx`  | Leaflet-kartet, kontormarkør og briefing-popup       |
| `src/components/Briefing.tsx`      | Innholdet i markørboblen                             |
| `src/components/LeveranseListe.tsx` | Leveransene som kort, med adressene sine            |
| `src/components/Kjoretidsbadge.tsx`| Kjøretiden som Purpur-badge, lik i lista og i boblen |
| `src/lib/xlsx.ts`                  | Minimal .xlsx-leser som også henter cellefarger      |
| `src/lib/leveranse.ts`             | Tolker leveranselista til én leveranse per dagsark   |
| `src/lib/kontor.ts`                | Kontoret på Økern Portal                             |
| `src/lib/navn.ts`                  | Navnelister skrevet med komma                        |
| `src/lib/kjoretid.ts`              | Ruting mot OSRM, med luftlinje-anslag som fallback   |
| `src/lib/geonorge.ts`              | Adressesøk mot Kartverket                            |
| `src/index.css`                    | Sidelayout og kartflate, bygget på Purpur-tokens     |

## Deploy

`.github/workflows/deploy.yml` bygger og publiserer til GitHub Pages ved push
til `main`. Pages må stå på «GitHub Actions» som kilde under
Settings → Pages.

Builden bruker `base: "./"` i `vite.config.ts`, slik at samme artefakt virker
både på `https://<bruker>.github.io/TPStools/` og på et eget domene.

## Kjente begrensninger

- Kontorets posisjon er en fast koordinat i `src/lib/kontor.ts`, målt opp på
  bygget. Økern Portal dekker flere adresser, så et adresseoppslag lander ikke
  nødvendigvis på inngangen crewet kjører fra. Flyttes kontoret, endres
  koordinaten der.
- Samme adresse på to dagsark gir to markører oppå hverandre – én per
  leveranse. Datoen står i boblen, men markørene ligger på samme punkt.
- Ark som heter «Underlag» eller «Informasjon» hoppes over. Et dagsark må ha
  en overskriftsrad med «Subscriber name», «Street name» og «House number».
- Ved tvetydig adresse brukes Kartverkets beste treff. Hele den bekreftede
  adressen vises, slik at feiltreff er synlige.

## Videre arbeid

- Adresseforslag mens man skriver (Purpur `Autocomplete` mot samme Kartverk-API).
- Filtrering på leveranse, så én dag kan vises om gangen.
- Egen markørfarge per leveranse, så dagene skilles fra hverandre på kartet.
- Spre markører som ligger på samme punkt, f.eks. med klynging.
- Deling av en briefing via lenke, f.eks. leveransen kodet i URL-en.
- Sortering av adressene i en leveranse etter kjøretid, og samlet kjøretid for
  runden der crewet tar adressene etter hverandre.

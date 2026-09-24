# Briefingkart – Telia Personlig Service Crew

Verktøy som viser leveransene på kart. Én leveranse er én dag crewet er ute,
med alle adressene sine som markører – hver med en boble som inneholder det
crewet trenger i oppstartsmøtet: ansvarlige, antall kunder, utstyr, notat og
estimert kjøretid fra kontoret.

Hver leveranse har sin egen markørfarge, flere infobobler kan stå åpne samtidig
og trekkes og strekkes dit de skal stå, dagen kan lagres som fil og åpnes igjen
rett før møtet, fremvisningsmodus rydder bort alt annet enn kartet og
leveransene når briefingen holdes, og hele dagen kan skrives ut eller lagres
som PDF.

Alt kjører i nettleseren. Ingen backend, ingen database, ingen API-nøkler.

## Slik virker det

Telia-kontorene på Økern (Oslo), i Bergen, Trondheim og Kristiansand ligger
alltid på kartet som lilla bobler, så det er lett å se leveransene i forhold til
dem. Når noe legges til, rammes kartet inn slik at alle adressene og kontorene
de hører til er synlige, og hver adresse får estimert kjøretid fra nærmeste
kontor i lista og i boblen – med navnet på kontoret, f.eks. «fra Bergen». «Vis leveransen» rammer inn adressene
til én enkelt dag.

Hver leveranse får sin egen markørfarge: alle adressene fra ett dagsark står i
samme farge, neste dagsark i en annen. Samme farge går igjen som prikk i
leveransekortet og i boblen, så det er lett å se hvilke adresser som hører
sammen når flere dager ligger på kartet samtidig.

**Importer en leveranseliste (.xlsx)**

1. Velg GDA-uttrekket. Hvert dagsark blir én leveranse – ikke én per adresse.
2. Radene grupperes per adresse, og antall kunder telles per oppgang. Hver
   adresse blir ett stopp i leveransen, med sin egen markør på kartet.
3. Bakgrunnsfargen på navnecellen leses som utstyr:
   gul = ruter og TV-boks, blå = kun ruter, oransje = kun TV-boks.
   Andre farger telles som «annen merking» framfor å bli gjettet på.
4. B1, C1 og H1 i dagsarket leses som toppinfo og står øverst både i
   leveransekortet og i boblen. Tomme celler faller bort.
5. Navnene i overskriftsraden leses som hint om hvem som var tenkt ut, og
   fellesinfo
   (leveransetype, plattform, TV/BB, kontaktperson, parkering, prosjektleder)
   hentes fra informasjonsfanen. Radkommentarer følger med per leilighet.
6. En dialog viser dagsarkene fila inneholder, med antall adresser og kunder
   per ark. Huk av dem som skal importeres – en arbeidsliste inneholder gjerne
   flere dager enn den ene crewet skal ut på. Arkene er huket av på forhånd,
   så det er nok å fjerne dem du ikke vil ha.
7. Samme dialog spør hvem som skal ut på hver leveranse. Feltet står alltid
   tomt: navnene i arket stemmer ikke nødvendigvis med hvem som faktisk skal
   ut, så de vises som hint under feltet i stedet for å fylles inn. Navn
   skrives skilt med komma.
8. Først når arkene er valgt og crewet satt, geokodes adressene og leveransene
   legges på kartet. Avbryter du dialogen, er ingenting slått opp.

**Eller legg inn adresser manuelt**

1. Skriv én adresse per linje. Alle linjene blir én leveranse, med samme
   ansvarlige, antall kunder og notat.
2. Ansvarlige skrives som ett navn eller flere skilt med komma.
3. Ved lagring slås adressene opp hos Kartverkets åpne adresse-API, og hver
   adresse settes som markør med briefingen i boblen.

**Rett opp en leveranse etterpå**

1. «Rediger» på et leveransekort åpner dagen for retting – enten den kom fra en
   liste, fra skjemaet eller fra en lagret dagsfil.
2. Dato, ansvarlige, toppinfo og notat rettes i toppen av dialogen. Under ligger
   adressene, én og én: antall kunder, utstyrsfordelingen og kommentarene kan
   endres, og en adresse kan fjernes fra leveransen.
3. Nye adresser skrives nederst, én per linje. De slås opp hos Kartverket når du
   lagrer, og får kjøretid fra kontoret som alle andre. Adresser som ikke blir
   funnet sier dialogen fra om, og blir stående så de kan rettes – resten er
   lagret.
4. En leveranse må ha minst én adresse. Skal hele dagen bort, er det «Fjern» på
   leveransekortet som gjør det.
5. Endringene følger med når dagen lastes ned som fil.

**Flere bobler oppe samtidig**

1. Boblene lukker ikke hverandre. Klikk på markørene, eller «Vis boblene» på et
   leveransekort, så står hele dagen framme på én gang. «Lukk boblene» tømmer
   kartet for bobler igjen.
2. Hver boble har et håndtak øverst. Dra i det, så flyttes boblen dit den skal
   stå – da kan flere bobler leses samtidig uten å dekke hverandre.
3. Kantene og hjørnene på boblen endrer størrelsen. Dra dem ut, så er det plass
   til hele briefingen uten å rulle – notatet og kommentarene er ofte lengre enn
   standardboblen. Kanten du drar i er den som flytter seg; motsatt side står i
   ro. Dobbeltklikk på en kant setter størrelsen tilbake.
4. En flyttet boble får en stiplet linje tilbake til markøren sin, så det er
   tydelig hvilken adresse briefingen gjelder. Dobbeltklikk på håndtaket setter
   boblen tilbake på markøren.
5. Boblene holder seg innenfor kartflaten. En adresse helt ute ved kanten får
   boblen sin plassert innenfor i stedet for utenfor skjermen, og kartet står i
   ro når bobler åpnes – det er boblene som flytter seg, ikke kartet.
6. Plassering og størrelse følger boblen til den lukkes og åpnes igjen, så en
   briefing kan rigges ferdig før møtet starter.

**Lagre dagen og åpne den igjen**

1. «Last ned dagen» lagrer alle leveransene på kartet som en `.json`-fil på din
   egen maskin – adresser med ferdige koordinater, crew, notater, kommentarer og
   kjøretidene som allerede er hentet.
2. «Åpne lagret dag» legger fila på kartet igjen. Adressene er alt slått opp, så
   dagen står klar med én gang, uten import og uten nye oppslag.
3. Dagen kan altså gjøres klar i forveien, kvelden før eller på kontoret, og
   åpnes rett før briefingen starter.
4. Leveransene legges til dem som allerede ligger på kartet. Åpner du den samme
   fila to ganger, får du dagen to ganger – med hver sin markørfarge.
5. Filer som ikke er lagret fra Briefingkart avvises med en forklaring i stedet
   for å legge igjen en halv leveranse på kartet.

**Skriv ut dagen, eller lagre den som PDF**

1. «Skriv ut» over leveransekortene åpner nettleserens utskriftsdialog. Der
   ligger «Lagre som PDF» også, så dagen kan tas med som fil eller på papir.
2. Utskriften er sitt eget ark, ikke et bilde av skjermen: én leveranse per
   side, med dato, ansvarlige, toppinfo og notat øverst, en oppsummering av
   adresser, kunder og utstyr, og deretter hver adresse med antall kunder,
   utstyr, kjøretid fra kontoret og kommentarene sine med leilighetsnummer.
3. Papiret blir det samme uansett hvilke bobler som står åpne på kartet, og en
   adresse deles aldri over to sider.
4. Kartet blir ikke med. Kartflisene gjengis ikke pålitelig i utskrift, så arket
   er tekst – det er kommentarene og kjøretidene crewet trenger i bilen.

**Fremvisningsmodus**

Knappen oppe til høyre på kartet bytter til fremvisning: da vises bare kartet og
leveransene. Import, skjema og lagring – og knappene som fjerner noe – er borte,
kartet fyller høyden og siden slutter å rulle. Det er modusen selve briefingen
holdes i, med boblene åpne og plassert der de skal stå. «Avslutt fremvisning»
eller Escape går tilbake til planlegging.

Appen har ingen topprad: kartet skal fylle skjermen, og den eneste knappen som
ligger over kartflaten er modusknappen.

Leveransene lever i nettleserens minne så lenge fanen er åpen, og forsvinner ved
refresh – med mindre dagen er lastet ned som fil først. Excel-filen forlater
aldri nettleseren, og dagsfila lastes ned lokalt og leses lokalt; ingenting
sendes noe sted. Merk at en nedlastet dagsfil inneholder kundedata – adresser,
leilighetsnumre og kommentarer – og skal behandles deretter.

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

Infoboblene er Leaflets egne popups, satt opp med `autoClose: false` og
`closeOnClick: false` slik at flere kan stå åpne samtidig. Flyttingen endrer
Leaflets `offset` på boblen i stedet for å flytte elementet selv – da blir
boblen hengende ved markøren sin gjennom panorering og zoom, og havner der den
ble sluppet i forhold til adressen.

Størrelsen settes som CSS-variabler på boblen (`--boble-bredde` og
`--boble-hoyde`), fordi Leaflet skriver en målt bredde rett på elementet hver
gang boblen tegnes om – variablene brukes i regler med `!important` og
overlever det. Leaflet henger boblen opp i bunnen og midtstiller den over
markøren, så forskyvningen justeres samtidig med størrelsen: da er det kanten
man drar i som flytter seg, og ikke hele boblen.

Alt UI utenom selve kartflaten er bygget med Purpur-komponenter (`Button`,
`Card`, `TextField`, `TextArea`, `DismissableChipGroup`, `Modal`,
`Notification`, `Badge`, `ColorDot`, `Heading`, `Paragraph`). Egen CSS brukes kun til
sidelayout, kartflaten og markørene, og henter farger, avstander og radier
fra Purpurs designtokens. Kontorikonet er Purpurs `connected-building`.

Stoppmarkørene tegnes som SVG i Leaflets `divIcon` i stedet for å bruke
Leaflets eget markørbilde. Det er det som gjør at hver leveranse kan ha sin egen
farge – bildet kan ikke farges, og fargene ligger uansett i appen, ikke i
Leaflet. Palettverdiene står i `src/lib/farger.ts`.

### Hvorfor en egen Excel-leser

Utstyrsmerkingen ligger i *bakgrunnsfargen* på cellene, ikke i en kolonne.
SheetJS' åpne utgave leser ikke cellestiler, og ExcelJS drar med seg
Node-avhengigheter som ikke hører hjemme i en ren klient-app. `src/lib/xlsx.ts`
pakker derfor ut arbeidsboka med `fflate` og leser `styles.xml` direkte – rundt
150 linjer, og full kontroll på fargene.

### Kjøretid fra nærmeste kontor

Kjøretiden hentes fra OSRMs åpne demo-API, som ruter på ekte veinett uten
API-nøkkel og kalles direkte fra nettleseren – samme prinsipp som
Kartverket-oppslaget. Hver adresse knyttes først til kontoret som ligger
nærmest i luftlinje, og appen bruker *tabell*-tjenesten med det kontoret som
eneste kilde, så en importert leveranseliste på 60 adresser blir tre forespørsler i
stedet for seksti. Rutingen skjer i bakgrunnen: markørene legges ut med én gang,
og tallet fylles inn i kortene og boblene når svaret kommer.

Utgangspunktet er kontorenes faste koordinater i `src/lib/kontor.ts` – samme
punkt som markørene står på. Nærmeste kontor velges i luftlinje, ikke etter
kjøretid, så et sted omtrent midt mellom to kontorer kan få det som i praksis
er nest nærmest.

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
| `src/components/LeveranseDialog.tsx` | Dialogen som velger dagsark og setter crewet        |
| `src/components/LeveranseRedigering.tsx` | Retting av en leveranse som ligger på kartet   |
| `src/components/Briefingkart.tsx`  | Leaflet-kartet, markører, og bobler som kan flyttes  |
| `src/components/Briefing.tsx`      | Innholdet i markørboblen                             |
| `src/components/LeveranseListe.tsx` | Leveransene som kort, med adressene sine            |
| `src/components/Dagslagring.tsx`   | Nedlasting og åpning av dagen som `.json`-fil        |
| `src/components/Kjoretidsbadge.tsx`| Kjøretiden som Purpur-badge, lik i lista og i boblen |
| `src/components/Toppinfo.tsx`      | Toppinfoen fra dagsarket, lik i lista og i boblen     |
| `src/components/Utskrift.tsx`      | Dagen på papir: ett ark per leveranse, kun i `@media print` |
| `src/lib/xlsx.ts`                  | Minimal .xlsx-leser som også henter cellefarger      |
| `src/lib/leveranse.ts`             | Tolker leveranselista til én leveranse per dagsark   |
| `src/lib/kontor.ts`                | Kontorene kjøretid regnes fra, og nærmeste kontor    |
| `src/lib/dagsfil.ts`               | Dagen lagret som JSON, med validering ved åpning     |
| `src/lib/farger.ts`                | Markørfargene leveransene skilles på                 |
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
  koordinaten der. Koordinatene for Bergen, Trondheim og Kristiansand er satt
  ut fra gateadressen og ikke målt opp på bygget.
- Samme adresse på to dagsark gir to markører oppå hverandre – én per
  leveranse. De har hver sin farge og datoen står i boblen, men markørene ligger
  fortsatt på samme punkt, så den øverste skjuler den andre. Boblene kan
  derimot trekkes fra hverandre.
- En boble som er dratt til side eller strukket ut, blir liggende slik til den
  tilbakestilles. Plassering og størrelse lagres ikke i dagsfila.
- Modusknappen ligger over kartet og kan dekke en boble som er plassert helt
  oppe i høyre hjørne.
- Paletten har åtte farger. Ligger det flere leveranser enn det på kartet
  samtidig, går fargene rundt på nytt og to dager deler farge.
- En dagsfil er knyttet til formatet appen har nå. Filer fra en nyere versjon av
  Briefingkart avvises framfor å bli lest halvveis.
- Ark som heter «Underlag» eller «Informasjon» hoppes over, og kommer derfor
  heller ikke opp som valg i importdialogen. Et dagsark må ha en overskriftsrad
  med «Subscriber name», «Street name» og «House number».
- Utskriften tar ikke med kartet: Leaflet-flisene gjengis ikke pålitelig i
  utskrift, så arket er tekst. Boblenes plassering og størrelse er heller ikke
  en del av papiret.
- Ved tvetydig adresse brukes Kartverkets beste treff. Hele den bekreftede
  adressen vises, slik at feiltreff er synlige.

## Videre arbeid

- Adresseforslag mens man skriver (Purpur `Autocomplete` mot samme Kartverk-API).
- Filtrering på leveranse, så én dag kan vises om gangen.
- Spre markører som ligger på samme punkt, f.eks. med klynging.
- Deling av en briefing via lenke, f.eks. leveransen kodet i URL-en.
- Sortering av adressene i en leveranse etter kjøretid, og samlet kjøretid for
  runden der crewet tar adressene etter hverandre.

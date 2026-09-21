# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Språk

Hele kodebasen er på **norsk bokmål** – identifikatorer, typenavn, kommentarer,
JSDoc, UI-tekst, feilmeldinger, README og commit-meldinger. Ny kode skrives på
samme måte (`leveranse`, `stopp`, `kjoretid`, `fjernAlle`), ikke på engelsk og
ikke på nynorsk. Æ/ø/å brukes i tekst, men ikke i identifikatorer (`hoyde`,
`kjoretid`, `soketekst`). Commit-meldinger er imperativ på bokmål uten prefiks,
f.eks. «Endre størrelsen på boblene ved å dra i kantene».

## Kommandoer

```bash
npm install
npm run dev        # utviklingsserver (Vite)
npm run build      # tsc -b && vite build -> dist/
npm run typecheck  # tsc -b --noEmit
npm run lint       # oxlint
npm run preview    # se produksjonsbuilden lokalt
```

Det finnes **ingen testoppsett** i repoet – ingen test-runner, ingen
testfiler. CI (`.github/workflows/deploy.yml`) kjører `npm ci`, `npm run lint`
og `npm run build` ved push til `main`, og deployer `dist/` til GitHub Pages.
Portene før en push er altså lint + build; verifiser endringer i `npm run dev`.

### TypeScript-flaggene som stopper builden

`npm run lint` er en tynn port: `.oxlintrc.json` slår bare på
`react/rules-of-hooks` og `react/only-export-components`. Typefeil kommer først
i `npm run typecheck` eller `npm run build`, som begge kjører `tsc -b`.

`tsconfig.app.json` kjører uten `strict` – null-håndteringen i `types.ts`
(`utstyr: Utstyr | null`, `kjoretid: Kjoretid | null`) er konvensjon, ikke noe
kompilatoren håndhever. Til gjengjeld står fire flagg som velter builden der
linten sier alt er bra:

- `verbatimModuleSyntax` – typer må importeres med `import type`.
- `erasableSyntaxOnly` – ingen `enum`, `namespace` eller parameter-properties.
- `noUnusedLocals` / `noUnusedParameters` – en ubrukt variabel er en byggefeil.

## Arkitektur

Ren klient-app: React 19 + Vite, ingen backend, ingen database, ingen
API-nøkler. All tilstand ligger i `useState` i `src/App.tsx` og forsvinner ved
refresh – med mindre dagen er lastet ned som `.json`-fil først.

### Dataflyten

```
.xlsx  -> lib/xlsx.ts      (unzip + styles.xml -> Celle{verdi, fyll})
       -> lib/leveranse.ts (ett dagsark = én LeveranseUtkast, rader gruppert per adresse)
       -> LeveranseDialog  (dagsark hukes av og crewet skrives – ingenting
                           slås opp før dette)
       -> lib/geonorge.ts  (sokAdresser -> AdresseTreff med koordinat)
       -> App.leggTil      (LeveranseUtkast -> UfargetLeveranse -> Leveranse)
       -> lib/farger.ts    (fordelFarger gir hver leveranse markørfarge)
       -> Briefingkart     (markører + bobler)
          lib/kjoretid.ts kjører i bakgrunnen og fyller inn `kjoretid` etterpå
       -> Utskrift         (samme leveranser som eget ark, kun i @media print)
```

Typenavnene i `src/types.ts` koder hvor i flyten dataene er:
`LeveranseUtkast`/`StoppUtkast` = før geokoding, `UfargetLeveranse` = før
fargen er tildelt, `Leveranse`/`Stopp` = ferdig, det som ligger på kartet og i
dagsfila. `LeveranseRedigering` går andre veien: den bygger et
`Leveranse`-objekt tilbake fra tekstfelt, og adressene som legges til der er
det eneste som geokodes etter import. En **leveranse** er én dag crewet er ute (ett dagsark), et **stopp**
er én adresse/oppgang i den dagen.

Komponentene tar imot props og callbacks – ingen context, ingen store, ingen
imperative API-er. `App.leggTil` geokoder først, og adresser Kartverket ikke
fant kommer tilbake som `feilet` så UI-et kan si fra; en leveranse der ingen
adresse lot seg slå opp legges ikke på kartet i det hele tatt. Kjøretidene
hentes etterpå av `beregnKjoretider` og flettes inn per stopp-id, så markørene,
lista og utskriften står ferdig før tallene kommer.

### App.tsx styrer kartet med tellere, ikke med kall

`Briefingkart` eksponerer ingen imperativ API. Kommandoer sendes inn som props
med en teller som økes for hver forespørsel (`fokusTeller`, `Innramming`,
`Boblekommando`), og effektene inne i kartet kjører på telleren alene og leser
posisjoner fra refs. Det er dette som gjør at kartet ikke flytter seg av seg
selv når en leveranse legges til eller fjernes – og at samme handling kan bes
om to ganger på rad. Nye kartkommandoer følger samme mønster.

### Boblene (Leaflet-popups)

Popups er satt opp med `autoClose: false`, `closeOnClick: false`,
`autoPan: false` og `closeOnEscapeKey: false`, slik at flere briefinger kan stå
åpne samtidig mens kartet står i ro (Escape er reservert til å avslutte
fremvisningsmodus). `Bobleflytting` i `Briefingkart.tsx` er der kompleksiteten
ligger, og to valg der er lette å ødelegge ved en refaktorering:

- **Flytting endrer Leaflets `offset`**, ikke elementets posisjon – da henger
  boblen fortsatt ved markøren gjennom panorering og zoom. Etter endret offset
  kalles `setLatLng(getLatLng())` (eller `update()` når bredden er endret, som
  måler boblen på nytt før den midtstilles).
- **Størrelsen settes som CSS-variabler** (`--boble-bredde`, `--boble-hoyde`)
  brukt med `!important` i `index.css`, fordi Leaflet skriver en målt bredde
  rett på elementet hver gang boblen tegnes om. Boblen henger i bunnen og er
  midtstilt, så forskyvningen justeres samtidig med størrelsen for at kanten
  man drar i skal være den som flytter seg.

Lytterne for `pointerdown`/`dblclick` ligger på `document` i **fangstfasen**,
fordi Leaflet stopper disse hendelsene inne i boblen.

### Utskriften er et eget ark

`components/Utskrift.tsx` rendrer hele briefingen for alle leveransene én gang
til, skjult på skjerm og synlig kun i `@media print` (se `.utskrift` nederst i
`index.css`). Den er bevisst ikke en omstyling av skjermbildet: leveransekortene
i `LeveranseListe` har verken notat eller kommentarer, og briefingen som har alt
ligger i Leaflet-bobler som bare finnes i DOM-en mens boblen står åpen. Arket
bygges fra tilstanden, så papiret blir likt uansett hvilke bobler som står oppe.

Konsekvensen er at **nytt innhold i briefingen må legges inn to steder**:
`Briefing.tsx` for boblen og `Utskrift.tsx` for papiret. Summeringene de deler
(`tellKunder`, `summerLeveranseUtstyr`, `summerUtstyr`) ligger i
`lib/leveranse.ts` nettopp for å slippe en tredje kopi.

I print slås `.app__innhold` av, og alt som portaleres ut på `<body>` med den.
Kommer det nye kontroller utenfor `.app__innhold`, må de skjules der på samme
måte. Papiret er rein, semantisk markup uten Purpur-kort og uten fargeprikker:
kortbakgrunner spiser blekk, og farge krever `print-color-adjust: exact` for i
det hele tatt å komme med, så utstyrsmerkingen står som tekst.
`break-after: page` på hver dag gir én leveranse per side – `:last-child`-
unntaket må stå, ellers blir det en tom side til slutt – og `break-inside:
avoid` på hvert stopp er det som holder en adresse samlet. Arket er `aria-hidden`
på skjerm, så skjermlesere ikke leser dagen to ganger. Kartet holdes utenfor:
Leaflet-flisene gjengis ikke pålitelig i utskrift.

### Purpur (Telias designsystem)

Alt UI utenom selve kartflaten bygges med `@purpurds/purpur`-komponenter, og
`src/index.css` bruker kun Purpur-tokens – ingen egendefinerte farge-, avstands-
eller radiusverdier. `--purpur-rescale: 1` settes i `index.css` og **må stå
der**: pakkens tokens er `calc(<verdi> * var(--purpur-rescale))`, og uten
faktoren blir alle avstander og skriftstørrelser ugyldige.

All egen CSS ligger i én global `src/index.css` – ingen CSS-moduler, ingen
styling-bibliotek. Klassenavnene er norske og BEM-aktige (`app__panel`,
`app--fremvisning`, `utskrift__stopp`, `boble-kant--nordost`).
`@purpurds/purpur/styles` og `leaflet/dist/leaflet.css` importeres i
`main.tsx`, før `index.css`.

Markørene tegnes som SVG i `L.divIcon` i stedet for Leaflets bilde, siden
bildet ikke kan farges per leveranse.

## Ting som lett går galt

- **Fargeverdier havner i markup.** `stoppIkon()` og dagsfil-lesingen kjører
  alt gjennom `erFarge()` i `lib/farger.ts` før det brukes. En dagsfil kommer
  fra disk og kan inneholde hva som helst.
- **Dagsfilformatet er versjonert** (`FORMAT`/`VERSJON` i `lib/dagsfil.ts`).
  `VERSJON` økes bare når eldre filer ikke lenger kan leses som de er. Alle
  felt valideres enkeltvis med forklarende `DagsfilFeil` framfor å legge en
  halv leveranse på kartet, og id-er genereres på nytt ved lesing slik at samme
  fil kan åpnes to ganger.
- **Utstyr ligger i cellens bakgrunnsfarge**, ikke i en kolonne – derfor den
  egne xlsx-leseren. `klassifiserUtstyr()` prøver eksakt treff først og en grov
  RGB-vurdering etterpå; ukjent farge blir `"annet"`, aldri gjettet.
- **Eksterne tjenester kalles direkte fra nettleseren** uten nøkkel:
  Kartverket (`ws.geonorge.no`) og OSRMs demoserver. OSRM kalles som
  *tabell* med kontoret som eneste kilde (én forespørsel per 24 adresser, ikke
  én per adresse), og faller tilbake på et luftlinje-anslag merket
  `kilde: "luftlinje"` – som UI-et viser nøytralt, ikke som en rutet tid.
  `hentKjoretider` kaster kun ved abort.
- **Kontorets posisjon er en fast koordinat** i `lib/kontor.ts`, ikke et
  adresseoppslag. Skal kontoret flyttes, endres konstanten.
- **Navnene fra arket fylles aldri inn.** Importdialogen starter med tomt
  navnefelt og viser arkets navn som hint: det er navnene noen har skrevet selv
  som blir med videre. `LeveranseUtkast.ansvarlige` overskrives derfor av
  dialogen.
- **Redigeringsmodalen leser feltene inn på nytt under rendringen** når
  leveransen bytter identitet (`sistLest !== leveranse`), slik at en ny lagring
  bygger på det som faktisk er lagret. Adresser som er skrevet inn, men ikke
  slått opp ennå, bæres med over – de er ikke en del av den lagrede leveransen.
- **Fremvisningsmodus** (`app--fremvisning`) skjuler alt som endrer data –
  import, skjema, lagring og fjern-knapper. Nye kontroller som kan endre noe
  må også skjules der. «Skriv ut» står igjen, siden den bare åpner
  utskriftsdialogen.
- **`base: "./"` i `vite.config.ts` må stå.** Relativ base er det som gjør at
  samme build virker både på `https://<bruker>.github.io/TPStools/` og på et
  eget domene. En absolutt base gir blanke sider på Pages uten at noe feiler
  lokalt.
- Ingenting sendes noe sted, men en nedlastet dagsfil inneholder kundedata
  (adresser, leilighetsnumre, kommentarer).

## Kjent bakgrunn

`README.md` har en fil-for-fil-tabell under «Struktur» – den vedlikeholdes der,
ikke her. Den beskriver også funksjonaliteten sett fra crewet, begrunnelsene
bak den egne xlsx-leseren og kjøretidsanslaget, samt kjente begrensninger og
planlagt videre arbeid. Les den før større endringer i import eller
kartoppførsel.

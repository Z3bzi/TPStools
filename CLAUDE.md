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

## Arkitektur

Ren klient-app: React 19 + Vite, ingen backend, ingen database, ingen
API-nøkler. All tilstand ligger i `useState` i `src/App.tsx` og forsvinner ved
refresh – med mindre dagen er lastet ned som `.json`-fil først.

### Dataflyten

```
.xlsx  -> lib/xlsx.ts      (unzip + styles.xml -> Celle{verdi, fyll})
       -> lib/leveranse.ts (ett dagsark = én LeveranseUtkast, rader gruppert per adresse)
       -> LeveranseDialog  (crewet bekreftes – ingenting slås opp før dette)
       -> lib/geonorge.ts  (sokAdresser -> AdresseTreff med koordinat)
       -> App.leggTil      (LeveranseUtkast -> UfargetLeveranse -> Leveranse)
       -> lib/farger.ts    (fordelFarger gir hver leveranse markørfarge)
       -> Briefingkart     (markører + bobler)
          lib/kjoretid.ts kjører i bakgrunnen og fyller inn `kjoretid` etterpå
```

Typenavnene i `src/types.ts` koder hvor i flyten dataene er:
`LeveranseUtkast`/`StoppUtkast` = før geokoding, `UfargetLeveranse` = før
fargen er tildelt, `Leveranse`/`Stopp` = ferdig, det som ligger på kartet og i
dagsfila. En **leveranse** er én dag crewet er ute (ett dagsark), et **stopp**
er én adresse/oppgang i den dagen.

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

### Purpur (Telias designsystem)

Alt UI utenom selve kartflaten bygges med `@purpurds/purpur`-komponenter, og
`src/index.css` bruker kun Purpur-tokens – ingen egendefinerte farge-, avstands-
eller radiusverdier. `--purpur-rescale: 1` settes i `index.css` og **må stå
der**: pakkens tokens er `calc(<verdi> * var(--purpur-rescale))`, og uten
faktoren blir alle avstander og skriftstørrelser ugyldige.

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
- **Fremvisningsmodus** (`app--fremvisning`) skjuler alt som endrer data –
  import, skjema, lagring og fjern-knapper. Nye kontroller som kan endre noe
  må også skjules der.
- Ingenting sendes noe sted, men en nedlastet dagsfil inneholder kundedata
  (adresser, leilighetsnumre, kommentarer).

## Kjent bakgrunn

`README.md` beskriver funksjonaliteten sett fra crewet, begrunnelsene bak den
egne xlsx-leseren og kjøretidsanslaget, samt kjente begrensninger og planlagt
videre arbeid. Les den før større endringer i import eller kartoppførsel.

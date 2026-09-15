# Briefingkart – Telia Personlig Service Crew

Verktøy som viser ett eller flere oppdrag på kart, med en markørboble som
inneholder informasjonen crewet trenger i oppstartsmøtet: ansvarlige, antall
kunder, notat og estimert kjøretid fra Økern Portal.

Alt kjører i nettleseren. Ingen backend, ingen database, ingen API-nøkler.

## Slik virker det

1. Fyll ut skjemaet: adresse, ansvarlige, antall kunder og notat.
2. Ved lagring slås adressen opp hos Kartverkets åpne adresse-API.
3. Oppdraget settes som markør, og kartet flyr til stedet med briefingen åpen.
4. Kjøretiden fra Økern Portal hentes i bakgrunnen og fylles inn i kortet og
   boblen når svaret kommer – markøren venter ikke på ruting.
5. Flere oppdrag kan ligge på kartet samtidig, hver med sin egen boble.

Oppdragene lever i nettleserens minne så lenge fanen er åpen, og forsvinner ved
refresh. Det er bevisst for et briefingverktøy – ingen kundedata lagres noe sted.

## Teknologi

| Del             | Valg                                                                 |
| --------------- | -------------------------------------------------------------------- |
| Rammeverk       | React 19 + Vite                                                       |
| Design          | [`@purpurds/purpur`](https://www.npmjs.com/package/@purpurds/purpur) – Telias designsystem |
| Kart            | react-leaflet + Leaflet, tiles fra OpenStreetMap                       |
| Geokoding       | Kartverket: `https://ws.geonorge.no/adresser/v1/sok`                   |
| Kjøretid        | OSRM: `https://router.project-osrm.org/route/v1/driving`               |
| Hosting         | Statisk build på GitHub Pages                                          |

Alt UI utenom selve kartflaten er bygget med Purpur-komponenter (`Button`,
`Card`, `TextField`, `TextArea`, `DismissableChipGroup`, `Notification`,
`Badge`, `Heading`, `Paragraph`). Egen CSS brukes kun til sidelayout og
kartflaten, og henter farger, avstander og radier fra Purpurs designtokens.

### Merk om `--purpur-rescale`

Purpurs avstands- og typografitokens er definert som
`calc(<verdi> * var(--purpur-rescale))`, men pakken setter ikke selve faktoren.
Uten `--purpur-rescale` blir alle disse `calc()`-ene ugyldige, og UI-et mister
avstander og skriftstørrelser. Appen setter den derfor til `1` i
`src/index.css`.

## Kjøretid fra Økern Portal

Crewet kjører alltid ut fra Økern Portal, så oppmøtestedet er en konstant i
`src/lib/startpunkt.ts` – ikke et felt i skjemaet. Skal det byttes, er det den
ene filen som redigeres; både kartmarkøren og alle kjøretidene følger med.

Selve kjøretiden hentes fra OSRMs åpne demo-API, som ruter på ekte veinett uten
API-nøkkel og kalles direkte fra nettleseren – samme prinsipp som
Kartverket-oppslaget. Svarer ikke tjenesten, regner appen et grovt anslag fra
luftlinje ganget med en omveisfaktor, med lavere snittfart på korte turer enn på
lange. Anslaget er merket «anslag» i badgen og vises nøytralt i stedet for blått,
slik at ingen forveksler det med en rutet kjøretid.

To ting å være klar over: tallet er fri flyt uten trafikk- eller føredata, og
demoserveren til OSRM er ment for lett bruk. Skal verktøyet brukes av mange crew
samtidig, bør ruting flyttes til en egen OSRM-instans eller en tjeneste med
avtale.

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
| `src/App.tsx`                      | Tilstand for oppdrag, geokoding og valgt oppdrag     |
| `src/components/OppdragSkjema.tsx` | Skjemaet, bygget med Purpur-komponenter              |
| `src/components/Briefingkart.tsx`  | Leaflet-kartet, markører og briefing-popup           |
| `src/components/OppdragsListe.tsx` | Oppdragene som kort, med «Vis på kartet» og «Fjern»  |
| `src/components/Kjoretidsbadge.tsx`| Kjøretiden som Purpur-badge, lik i lista og i boblen |
| `src/lib/geonorge.ts`              | Adressesøk mot Kartverket                            |
| `src/lib/kjoretid.ts`              | Ruting mot OSRM, med luftlinje-anslag som fallback   |
| `src/lib/startpunkt.ts`            | Oppmøtestedet crewet kjører ut fra                   |
| `src/index.css`                    | Sidelayout og kartflate, bygget på Purpur-tokens     |

## Deploy

`.github/workflows/deploy.yml` bygger og publiserer til GitHub Pages ved push
til `main`. Pages må stå på «GitHub Actions» som kilde under
Settings → Pages.

Builden bruker `base: "./"` i `vite.config.ts`, slik at samme artefakt virker
både på `https://<bruker>.github.io/TPStools/` og på et eget domene.

## Videre arbeid

- Adresseforslag mens man skriver (Purpur `Autocomplete` mot samme Kartverk-API).
- Valg mellom flere adressetreff når søket er tvetydig – i dag brukes Kartverkets
  beste treff, og hele den bekreftede adressen vises slik at feiltreff synes.
- Deling av en briefing via lenke, f.eks. oppdragene kodet i URL-en.
- Sortering av oppdragslista etter kjøretid, og samlet kjøretid for en runde
  der crewet tar flere adresser etter hverandre.

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type DivIcon, type Marker as LeafletMarker } from "leaflet";
import kontorIkonSvg from "@purpurds/purpur/icon/svg/connected-building.svg?raw";
import { Paragraph } from "@purpurds/purpur";

import { Briefing } from "./Briefing";
import { erFarge, LEVERANSEFARGER } from "../lib/farger";
import { KONTOR } from "../lib/kontor";
import type { Leveranse } from "../types";

/**
 * Markørene tegnes selv i stedet for å bruke Leaflets blå bilde, slik at hver
 * leveranse kan få sin egen farge. Formen er den samme dråpen crewet kjenner
 * igjen, med hvit kontur og hvitt senter så den leses mot alle karttyper.
 */
function pinSvg(farge: string): string {
  return (
    '<svg viewBox="0 0 26 38" width="26" height="38" aria-hidden="true">' +
    `<path d="M13 1C6.4 1 1 6.4 1 13c0 8.2 12 24 12 24s12-15.8 12-24c0-6.6-5.4-12-12-12z" fill="${farge}" stroke="#ffffff" stroke-width="2"/>` +
    '<circle cx="13" cy="13" r="4.5" fill="#ffffff"/>' +
    "</svg>"
  );
}

// Ikonene er like for alle stopp i samme leveranse, så de lages én gang per
// farge i stedet for én gang per markør.
const stoppIkoner = new Map<string, DivIcon>();

function stoppIkon(farge: string): DivIcon {
  // Fargen havner i markup, så bare hex-koder slipper gjennom. En leveranse
  // lest fra en lagret dagsfil kan i prinsippet ha hva som helst her.
  const trygg = erFarge(farge) ? farge : LEVERANSEFARGER[0];

  let ikon = stoppIkoner.get(trygg);
  if (!ikon) {
    ikon = L.divIcon({
      html: `<span class="stopp-markor">${pinSvg(trygg)}</span>`,
      className: "",
      iconSize: [26, 38],
      iconAnchor: [13, 37],
      popupAnchor: [0, -34],
    });
    stoppIkoner.set(trygg, ikon);
  }

  return ikon;
}

const kontorIkon = L.divIcon({
  html: `<span class="kontor-markor">${kontorIkonSvg}</span>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const STOPP_ZOOM = 16;
const KONTOR_ZOOM = 12;

/** Hvilke punkter kartet skal ramme inn, og når det skal gjøres på nytt. */
export type Innramming = {
  /** Leveransen som skal rammes inn. Null = kontoret og alle leveranser. */
  leveranseId: string | null;
  /** Økes hver gang noen ber om innramming, også for samme leveranse. */
  teller: number;
};

type Props = {
  leveranser: Leveranse[];
  aktivtStoppId: string | null;
  /** Endres hver gang et stopp velges, også når det samme velges på nytt. */
  fokusTeller: number;
  innramming: Innramming;
};

export function Briefingkart({ leveranser, aktivtStoppId, fokusTeller, innramming }: Props) {
  const markorer = useRef(new Map<string, LeafletMarker>());
  const kontor = KONTOR.posisjon;

  const aktivt = leveranser
    .flatMap((leveranse) => leveranse.stopp.map((stopp) => ({ leveranse, stopp })))
    .find(({ stopp }) => stopp.id === aktivtStoppId);

  const innrammet =
    innramming.leveranseId === null
      ? leveranser
      : leveranser.filter((leveranse) => leveranse.id === innramming.leveranseId);

  const punkter: [number, number][] = innrammet.flatMap((leveranse) =>
    leveranse.stopp.map((stopp): [number, number] => [stopp.adresse.lat, stopp.adresse.lon]),
  );

  useEffect(() => {
    if (!aktivtStoppId) return;
    // Popup-en åpnes etter at markøren er montert, slik at briefingen vises
    // med én gang stoppet legges til eller velges i lista.
    markorer.current.get(aktivtStoppId)?.openPopup();
  }, [aktivtStoppId, fokusTeller, leveranser]);

  return (
    <MapContainer center={[kontor.lat, kontor.lon]} zoom={KONTOR_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <KartKamera
        fokus={aktivt ? [aktivt.stopp.adresse.lat, aktivt.stopp.adresse.lon] : null}
        fokusTeller={fokusTeller}
        // Kontoret rammes inn sammen med alt, men ikke når én leveranse vises
        // for seg – da er det adressene crewet skal se.
        punkter={innramming.leveranseId === null ? [[kontor.lat, kontor.lon], ...punkter] : punkter}
        innrammingTeller={innramming.teller}
      />

      <Marker position={[kontor.lat, kontor.lon]} icon={kontorIkon} zIndexOffset={-100}>
        <Popup>
          <div className="stabel">
            <Paragraph variant="paragraph-100-bold">{KONTOR.navn}</Paragraph>
            <Paragraph variant="paragraph-100">{KONTOR.adresse}</Paragraph>
          </div>
        </Popup>
      </Marker>

      {leveranser.flatMap((leveranse) =>
        leveranse.stopp.map((stopp) => (
          <Marker
            key={stopp.id}
            position={[stopp.adresse.lat, stopp.adresse.lon]}
            icon={stoppIkon(leveranse.farge)}
            ref={(markor) => {
              if (markor) markorer.current.set(stopp.id, markor);
              else markorer.current.delete(stopp.id);
            }}
          >
            <Popup>
              <Briefing leveranse={leveranse} stopp={stopp} />
            </Popup>
          </Marker>
        )),
      )}
    </MapContainer>
  );
}

/**
 * Styrer kameraet. Begge effektene kjører bare når sin egen teller økes, og
 * leser posisjonene fra refs. Da flytter ikke kartet seg av seg selv når et
 * stopp legges til eller fjernes – bare når noen ber om det.
 */
function KartKamera({
  fokus,
  fokusTeller,
  punkter,
  innrammingTeller,
}: {
  fokus: [number, number] | null;
  fokusTeller: number;
  punkter: [number, number][];
  innrammingTeller: number;
}) {
  const kart = useMap();
  const sisteFokus = useRef(fokus);
  const sistePunkter = useRef(punkter);

  // Kartflaten skifter størrelse når fremvisningsmodus slås av og på. Leaflet
  // oppdager det ikke selv, og ville ellers tegnet fliser for den gamle
  // størrelsen til noen panorerer.
  useEffect(() => {
    const observator = new ResizeObserver(() => kart.invalidateSize());
    observator.observe(kart.getContainer());
    return () => observator.disconnect();
  }, [kart]);

  useEffect(() => {
    sisteFokus.current = fokus;
    sistePunkter.current = punkter;
  }, [fokus, punkter]);

  useEffect(() => {
    if (fokusTeller === 0 || !sisteFokus.current) return;
    kart.flyTo(sisteFokus.current, Math.max(kart.getZoom(), STOPP_ZOOM), { duration: 0.8 });
  }, [kart, fokusTeller]);

  useEffect(() => {
    if (innrammingTeller === 0) return;
    const punkter = sistePunkter.current;
    if (punkter.length === 0) return;

    // Én adresse har ingen utstrekning å ramme inn – da flys det dit i stedet.
    if (punkter.length === 1) {
      kart.flyTo(punkter[0], Math.max(kart.getZoom(), STOPP_ZOOM), { duration: 0.8 });
      return;
    }

    kart.fitBounds(L.latLngBounds(punkter), { padding: [48, 48], maxZoom: STOPP_ZOOM });
  }, [kart, innrammingTeller]);

  return null;
}

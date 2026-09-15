import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type Marker as LeafletMarker } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import kontorIkonSvg from "@purpurds/purpur/icon/svg/connected-building.svg?raw";
import { Paragraph } from "@purpurds/purpur";

import { Briefing } from "./Briefing";
import { KONTOR } from "../lib/kontor";
import type { Oppdrag } from "../types";

// Leaflet slår opp markørbildene via relative stier som ikke overlever
// bundling – derfor pekes de eksplisitt på filene Vite har hashet.
const oppdragsIkon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const kontorIkon = L.divIcon({
  html: `<span class="kontor-markor">${kontorIkonSvg}</span>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const OPPDRAG_ZOOM = 16;
const KONTOR_ZOOM = 12;

type Props = {
  oppdrag: Oppdrag[];
  aktivtOppdragId: string | null;
  /** Endres hver gang et oppdrag velges, også når det samme velges på nytt. */
  fokusTeller: number;
  /** Endres når kartet skal ramme inn kontoret og alle oppdrag. */
  visAlleTeller: number;
};

export function Briefingkart({ oppdrag, aktivtOppdragId, fokusTeller, visAlleTeller }: Props) {
  const markorer = useRef(new Map<string, LeafletMarker>());
  const kontor = KONTOR.posisjon;
  const aktivt = oppdrag.find((o) => o.id === aktivtOppdragId) ?? null;

  useEffect(() => {
    if (!aktivtOppdragId) return;
    // Popup-en åpnes etter at markøren er montert, slik at briefingen vises
    // med én gang oppdraget legges til eller velges i lista.
    markorer.current.get(aktivtOppdragId)?.openPopup();
  }, [aktivtOppdragId, fokusTeller, oppdrag]);

  return (
    <MapContainer center={[kontor.lat, kontor.lon]} zoom={KONTOR_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <KartKamera
        fokus={aktivt ? [aktivt.adresse.lat, aktivt.adresse.lon] : null}
        fokusTeller={fokusTeller}
        punkter={[
          [kontor.lat, kontor.lon],
          ...oppdrag.map((o): [number, number] => [o.adresse.lat, o.adresse.lon]),
        ]}
        visAlleTeller={visAlleTeller}
      />

      <Marker position={[kontor.lat, kontor.lon]} icon={kontorIkon} zIndexOffset={-100}>
        <Popup>
          <div className="stabel">
            <Paragraph variant="paragraph-100-bold">{KONTOR.navn}</Paragraph>
            <Paragraph variant="paragraph-100">{KONTOR.adresse}</Paragraph>
          </div>
        </Popup>
      </Marker>

      {oppdrag.map((o) => (
        <Marker
          key={o.id}
          position={[o.adresse.lat, o.adresse.lon]}
          icon={oppdragsIkon}
          ref={(markor) => {
            if (markor) markorer.current.set(o.id, markor);
            else markorer.current.delete(o.id);
          }}
        >
          <Popup>
            <Briefing oppdrag={o} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/**
 * Styrer kameraet. Begge effektene kjører bare når sin egen teller økes, og
 * leser posisjonene fra refs. Da flytter ikke kartet seg av seg selv når et
 * oppdrag legges til eller fjernes – bare når noen ber om det.
 */
function KartKamera({
  fokus,
  fokusTeller,
  punkter,
  visAlleTeller,
}: {
  fokus: [number, number] | null;
  fokusTeller: number;
  punkter: [number, number][];
  visAlleTeller: number;
}) {
  const kart = useMap();
  const sisteFokus = useRef(fokus);
  const sistePunkter = useRef(punkter);

  useEffect(() => {
    sisteFokus.current = fokus;
    sistePunkter.current = punkter;
  }, [fokus, punkter]);

  useEffect(() => {
    if (fokusTeller === 0 || !sisteFokus.current) return;
    kart.flyTo(sisteFokus.current, Math.max(kart.getZoom(), OPPDRAG_ZOOM), { duration: 0.8 });
  }, [kart, fokusTeller]);

  useEffect(() => {
    if (visAlleTeller === 0 || sistePunkter.current.length < 2) return;
    kart.fitBounds(L.latLngBounds(sistePunkter.current), {
      padding: [48, 48],
      maxZoom: OPPDRAG_ZOOM,
    });
  }, [kart, visAlleTeller]);

  return null;
}

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
import type { Leveranse } from "../types";

// Leaflet slår opp markørbildene via relative stier som ikke overlever
// bundling – derfor pekes de eksplisitt på filene Vite har hashet.
const stoppIkon = L.icon({
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
            icon={stoppIkon}
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

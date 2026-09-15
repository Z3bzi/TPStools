import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type Marker as LeafletMarker } from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Badge, Heading, Paragraph } from "@purpurds/purpur";

import { formaterAdresse } from "../lib/geonorge";
import type { Oppdrag } from "../types";

// Leaflet slår opp markørbildene via relative stier som ikke overlever
// bundling – derfor pekes de eksplisitt på filene Vite har hashet.
const ikon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/** Hele Norge, brukt som utgangspunkt før første oppdrag er lagt inn. */
const NORGE_SENTER: [number, number] = [64.5, 13.5];
const NORGE_ZOOM = 4;
const OPPDRAG_ZOOM = 16;

type Props = {
  oppdrag: Oppdrag[];
  aktivtOppdragId: string | null;
  /** Endres hver gang et oppdrag velges, også når det samme velges på nytt. */
  fokusTeller: number;
};

export function Briefingkart({ oppdrag, aktivtOppdragId, fokusTeller }: Props) {
  const markorer = useRef(new Map<string, LeafletMarker>());
  const aktivt = oppdrag.find((o) => o.id === aktivtOppdragId) ?? null;

  useEffect(() => {
    if (!aktivtOppdragId) return;
    // Popup-en åpnes etter at markøren er montert, slik at briefingen vises
    // med én gang oppdraget legges til eller velges i lista.
    markorer.current.get(aktivtOppdragId)?.openPopup();
  }, [aktivtOppdragId, fokusTeller, oppdrag]);

  return (
    <MapContainer center={NORGE_SENTER} zoom={NORGE_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <KartFokus
        lat={aktivt?.adresse.lat ?? null}
        lon={aktivt?.adresse.lon ?? null}
        zoom={OPPDRAG_ZOOM}
        fokusTeller={fokusTeller}
      />

      {oppdrag.map((o) => (
        <Marker
          key={o.id}
          position={[o.adresse.lat, o.adresse.lon]}
          icon={ikon}
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

/** Flytter kartet til det aktive oppdraget. */
function KartFokus({
  lat,
  lon,
  zoom,
  fokusTeller,
}: {
  lat: number | null;
  lon: number | null;
  zoom: number;
  fokusTeller: number;
}) {
  const kart = useMap();

  // Koordinatene sendes som tall, ikke som array, slik at effekten bare kjører
  // når posisjonen faktisk endrer seg – eller når fokusTeller økes.
  useEffect(() => {
    if (lat === null || lon === null) return;
    kart.flyTo([lat, lon], Math.max(kart.getZoom(), zoom), { duration: 0.8 });
  }, [kart, lat, lon, zoom, fokusTeller]);

  return null;
}

/** Innholdet i markørboblen – det crewet leser i oppstartsmøtet. */
export function Briefing({ oppdrag }: { oppdrag: Oppdrag }) {
  return (
    <div className="stabel">
      <Heading tag="h3" variant="title-100">
        {formaterAdresse(oppdrag.adresse)}
      </Heading>

      <div>
        <Paragraph variant="additional-100-bold">Ansvarlige</Paragraph>
        <Paragraph variant="paragraph-100">
          {oppdrag.ansvarlige.length > 0 ? oppdrag.ansvarlige.join(", ") : "Ikke satt"}
        </Paragraph>
      </div>

      <div className="rad">
        <Paragraph variant="additional-100-bold">Antall kunder</Paragraph>
        <Badge variant={oppdrag.antallKunder === null ? "neutral" : "information"} showIcon={false}>
          {oppdrag.antallKunder === null ? "Ikke satt" : String(oppdrag.antallKunder)}
        </Badge>
      </div>

      <div>
        <Paragraph variant="additional-100-bold">Notat</Paragraph>
        <Paragraph variant="paragraph-100">
          {oppdrag.notat !== "" ? oppdrag.notat : "Ingen notater lagt inn."}
        </Paragraph>
      </div>
    </div>
  );
}

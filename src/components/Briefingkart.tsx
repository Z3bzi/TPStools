import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type DivIcon, type Marker as LeafletMarker, type Popup as LeafletPopup } from "leaflet";
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

/**
 * Leaflets standardforskyvning for en boble: rett over markøren. Flyttede
 * bobler settes tilbake hit ved dobbeltklikk på håndtaket.
 */
const STANDARD_FORSKYVNING = L.point(0, 7);

/**
 * Åpning og lukking av bobler, bedt om utenfra. Som innrammingen styres den av
 * en teller, slik at samme handling kan bes om flere ganger på rad.
 */
export type Boblekommando = {
  handling: "apne" | "lukk";
  /** Leveransen boblene skal åpnes for. Null når alle skal lukkes. */
  leveranseId: string | null;
  teller: number;
};

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
  bobler: Boblekommando;
};

export function Briefingkart({
  leveranser,
  aktivtStoppId,
  fokusTeller,
  innramming,
  bobler,
}: Props) {
  const markorer = useRef(new Map<string, LeafletMarker>());
  const popuper = useRef(new Map<string, LeafletPopup>());
  const kontor = KONTOR.posisjon;

  // Leveransene leses fra en ref i bobleeffekten, slik at den bare kjører når
  // noen faktisk ber om å åpne eller lukke bobler.
  const sisteLeveranser = useRef(leveranser);
  useEffect(() => {
    sisteLeveranser.current = leveranser;
  }, [leveranser]);

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
    // med én gang stoppet legges til eller velges i lista. Bobler som alt står
    // åpne blir stående – flere dager skal kunne leses samtidig.
    markorer.current.get(aktivtStoppId)?.openPopup();
  }, [aktivtStoppId, fokusTeller, leveranser]);

  useEffect(() => {
    if (bobler.teller === 0) return;

    if (bobler.handling === "lukk") {
      for (const popup of popuper.current.values()) popup.close();
      return;
    }

    const leveranse = sisteLeveranser.current.find((l) => l.id === bobler.leveranseId);
    for (const stopp of leveranse?.stopp ?? []) markorer.current.get(stopp.id)?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kommandoen er telleren
  }, [bobler.teller]);

  return (
    <MapContainer center={[kontor.lat, kontor.lon]} zoom={KONTOR_ZOOM} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bidragsytere'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <Bobleflytting />

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
            <Popup
              // Boblene lukker ikke hverandre, og lukkes heller ikke av et
              // klikk på kartet: crewet skal kunne ha flere dager oppe
              // samtidig. autoPan er av, slik at kartet blir stående i ro når
              // en boble åpnes eller flyttes.
              autoClose={false}
              closeOnClick={false}
              autoPan={false}
              // Escape er veien ut av fremvisningsmodus. Med flere bobler oppe
              // ville den ellers lukket én tilfeldig av dem på veien.
              closeOnEscapeKey={false}
              ref={(popup) => {
                if (popup) popuper.current.set(stopp.id, popup);
                else popuper.current.delete(stopp.id);
              }}
            >
              <Briefing leveranse={leveranse} stopp={stopp} />
            </Popup>
          </Marker>
        )),
      )}
    </MapContainer>
  );
}

/**
 * Gjør boblene flyttbare. Når flere bobler står åpne samtidig, legger de seg
 * oppå hverandre – særlig i fremvisning, der hele dagen skal være synlig på én
 * skjerm. Håndtaket øverst i boblen drar den dit den skal stå.
 *
 * Flyttingen skjer ved å endre Leaflets egen `offset` på boblen, ikke ved å
 * flytte elementet selv. Da fortsetter boblen å høre til markøren sin: den
 * følger med når kartet panoreres og zoomes, og blir liggende der den ble
 * sluppet i forhold til adressen.
 */
function Bobleflytting() {
  const kart = useMap();

  useEffect(() => {
    // Flyttede bobler får en tynn linje tilbake til markøren sin. Uten den
    // peker halen på boblen ut i ingenting så snart den er dratt vekk, og
    // crewet ser ikke lenger hvilken adresse briefingen gjelder.
    const linjer = new Map<LeafletPopup, L.Polyline>();
    const linjelag = L.layerGroup().addTo(kart);

    // Bobler brukeren selv har plassert skal bli liggende. Resten holdes
    // innenfor kartflaten automatisk.
    const brukerplassert = new Set<LeafletPopup>();
    const overvakere = new Map<LeafletPopup, ResizeObserver>();

    const erFlyttet = (boble: LeafletPopup) =>
      !L.point(boble.options.offset ?? STANDARD_FORSKYVNING).equals(STANDARD_FORSKYVNING);

    /** Punktet på kartet der boblas hale ender, lest av selve elementet. */
    const halepunkt = (boble: LeafletPopup) => {
      const element = boble.getElement();
      if (!element) return null;

      const kartflate = kart.getContainer().getBoundingClientRect();
      const boks = element.getBoundingClientRect();
      return kart.containerPointToLatLng(
        L.point(boks.left + boks.width / 2 - kartflate.left, boks.bottom - kartflate.top),
      );
    };

    const oppdaterLinje = (boble: LeafletPopup) => {
      const markor = boble.getLatLng();
      const hale = erFlyttet(boble) ? halepunkt(boble) : null;

      if (!markor || !hale) {
        const linje = linjer.get(boble);
        if (linje) {
          linjelag.removeLayer(linje);
          linjer.delete(boble);
        }
        return;
      }

      const linje = linjer.get(boble);
      if (linje) {
        linje.setLatLngs([markor, hale]);
        return;
      }

      linjer.set(
        boble,
        L.polyline([markor, hale], {
          color: "#5f5f5f",
          weight: 2,
          opacity: 0.7,
          dashArray: "4 4",
          interactive: false,
        }).addTo(linjelag),
      );
    };

    const oppdaterAlle = () => {
      for (const boble of [...linjer.keys()]) oppdaterLinje(boble);
    };

    /**
     * Trekker en nyåpnet boble inn på kartflaten hvis den stikker utenfor.
     *
     * Boblene panorerer ikke kartet når de åpnes – det ville flyttet alle de
     * andre boblene som alt står ute. En boble på en adresse nær kanten kunne
     * derfor havnet helt utenfor skjermen, uten håndtak å ta tak i. Her får
     * den en forskyvning som legger den innenfor i stedet, og linja tilbake
     * til markøren viser hvor den egentlig hører hjemme.
     */
    const holdInnenfor = (boble: LeafletPopup) => {
      const element = boble.getElement();
      if (!element || !kart.hasLayer(boble)) return;

      const marg = 8;
      const kartflate = kart.getContainer().getBoundingClientRect();
      const boks = element.getBoundingClientRect();

      let dx = 0;
      let dy = 0;
      if (boks.left < kartflate.left + marg) dx = kartflate.left + marg - boks.left;
      else if (boks.right > kartflate.right - marg) dx = kartflate.right - marg - boks.right;
      if (boks.top < kartflate.top + marg) dy = kartflate.top + marg - boks.top;
      else if (boks.bottom > kartflate.bottom - marg) dy = kartflate.bottom - marg - boks.bottom;

      if (dx === 0 && dy === 0) return;

      boble.options.offset = L.point(boble.options.offset ?? STANDARD_FORSKYVNING).add(
        L.point(dx, dy),
      );
      boble.setLatLng(boble.getLatLng()!);
      oppdaterLinje(boble);
    };

    const paBobleApnet = (hendelse: L.PopupEvent) => {
      const element = hendelse.popup.getElement();
      if (!element) return;

      // Innholdet portaleres inn av react-leaflet like etter at boblen åpnes,
      // og vokser igjen når kjøretiden kommer. Boblen måles derfor når den
      // faktisk har fått størrelse, ikke i selve åpningsøyeblikket.
      const overvaker = new ResizeObserver(() => {
        if (!brukerplassert.has(hendelse.popup)) holdInnenfor(hendelse.popup);
      });
      overvaker.observe(element);
      overvakere.set(hendelse.popup, overvaker);
    };

    const paBobleLukket = (hendelse: L.PopupEvent) => {
      overvakere.get(hendelse.popup)?.disconnect();
      overvakere.delete(hendelse.popup);
      brukerplassert.delete(hendelse.popup);

      const linje = linjer.get(hendelse.popup);
      if (!linje) return;
      linjelag.removeLayer(linje);
      linjer.delete(hendelse.popup);
    };

    // Kartflaten skifter størrelse når fremvisningsmodus slås av og på, og da
    // kan en boble bli stående utenfor.
    const paKartstorrelse = () => {
      for (const boble of overvakere.keys()) {
        if (!brukerplassert.has(boble)) holdInnenfor(boble);
      }
    };

    kart.on("zoomend", oppdaterAlle);
    kart.on("resize", paKartstorrelse);
    kart.on("popupopen", paBobleApnet);
    kart.on("popupclose", paBobleLukket);

    /** Finner Leaflet-boblen et element ligger inni. */
    const finnBoble = (element: HTMLElement): LeafletPopup | null => {
      const beholder = element.closest(".leaflet-popup");
      if (!beholder) return null;

      let treff: LeafletPopup | null = null;
      kart.eachLayer((lag) => {
        if (lag instanceof L.Popup && lag.getElement() === beholder) treff = lag;
      });
      return treff;
    };

    const paPekerNed = (hendelse: PointerEvent) => {
      const mal = hendelse.target;
      if (!(mal instanceof HTMLElement)) return;

      const boble = finnBoble(mal);
      if (!boble) return;

      // Boblen det jobbes i skal ligge øverst, uansett hvor i den man tar tak.
      boble.bringToFront();

      const handtak = mal.closest(".briefing__handtak");
      if (!(handtak instanceof HTMLElement)) return;

      // Leaflet drar ikke kartet herfra – boblen stopper mousedown selv – men
      // hendelsen skal heller ikke nå andre lyttere. preventDefault brukes
      // bevisst ikke: det ville slått av dblclick-hendelsen håndtaket
      // tilbakestilles med. Markering av tekst er stengt med user-select i CSS
      // og rulling med touch-action.
      hendelse.stopPropagation();

      brukerplassert.add(boble);
      const start = L.point(hendelse.clientX, hendelse.clientY);
      const startForskyvning = L.point(boble.options.offset ?? STANDARD_FORSKYVNING);
      handtak.classList.add("briefing__handtak--drar");
      handtak.setPointerCapture(hendelse.pointerId);

      const flytt = (steg: PointerEvent) => {
        boble.options.offset = startForskyvning.add(
          L.point(steg.clientX - start.x, steg.clientY - start.y),
        );
        // setLatLng med samme punkt regner ut posisjonen på nytt med den nye
        // forskyvningen, uten å røre innholdet i boblen.
        boble.setLatLng(boble.getLatLng()!);
        // Boblen stopper ved kanten av kartet. Blir den dratt utenfor, er den
        // både uleselig og umulig å få tak i igjen.
        holdInnenfor(boble);
        oppdaterLinje(boble);
      };

      const slipp = () => {
        handtak.classList.remove("briefing__handtak--drar");
        handtak.releasePointerCapture(hendelse.pointerId);
        handtak.removeEventListener("pointermove", flytt);
        handtak.removeEventListener("pointerup", slipp);
        handtak.removeEventListener("pointercancel", slipp);
      };

      handtak.addEventListener("pointermove", flytt);
      handtak.addEventListener("pointerup", slipp);
      handtak.addEventListener("pointercancel", slipp);
    };

    /** Dobbeltklikk på håndtaket setter boblen tilbake på markøren sin. */
    const paDobbeltklikk = (hendelse: MouseEvent) => {
      const mal = hendelse.target;
      if (!(mal instanceof HTMLElement) || !mal.closest(".briefing__handtak")) return;

      const boble = finnBoble(mal);
      if (!boble) return;

      brukerplassert.delete(boble);
      boble.options.offset = STANDARD_FORSKYVNING;
      boble.setLatLng(boble.getLatLng()!);
      oppdaterLinje(boble);
      // Sto boblen på en adresse ute ved kanten, trekkes den inn igjen i
      // stedet for å havne utenfor skjermen.
      holdInnenfor(boble);
    };

    // Leaflet stopper mousedown, dblclick og contextmenu inne i boblen, slik at
    // klikk der ikke drar eller zoomer kartet. Derfor lyttes det i
    // fangstfasen – den kjører før boblen får stoppet hendelsen.
    document.addEventListener("pointerdown", paPekerNed, true);
    document.addEventListener("dblclick", paDobbeltklikk, true);
    return () => {
      document.removeEventListener("pointerdown", paPekerNed, true);
      document.removeEventListener("dblclick", paDobbeltklikk, true);
      kart.off("zoomend", oppdaterAlle);
      kart.off("resize", paKartstorrelse);
      kart.off("popupopen", paBobleApnet);
      kart.off("popupclose", paBobleLukket);
      for (const overvaker of overvakere.values()) overvaker.disconnect();
      linjelag.remove();
    };
  }, [kart]);

  return null;
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

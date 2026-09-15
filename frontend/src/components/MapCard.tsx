import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../state/store';
import type { Location } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const SG_CENTER: [number, number] = [1.3521, 103.8198];
const CARD_ZOOM = 12;
const FULL_ZOOM = 13;

function createPinIcon(loc: Location, isSelected: boolean): L.DivIcon {
  const temp =
    loc.weather?.temperature_c != null ? `${Math.round(loc.weather.temperature_c)}°` : '--°';
  const cond = loc.weather?.condition ?? '';
  const selectedClass = isSelected ? ' map-pin--selected' : '';
  return L.divIcon({
    html: `<div class="map-pin${selectedClass}">
      <div class="map-pin__bubble">
        <span class="map-pin__temp">${temp}</span>
        <span class="map-pin__cond">${cond}</span>
      </div>
      <div class="map-pin__dot"></div>
    </div>`,
    className: '',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-3 w-3"
    >
      <path d="M1.5 1h4v1.5h-2.5v2.5h-1.5v-4zm9 0h4v4h-1.5v-2.5h-2.5v-1.5zm-9 9h1.5v2.5h2.5v1.5h-4v-4zm10.5 2.5v-2.5h1.5v4h-4v-1.5h2.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}

export function MapCard() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { locations, selectedId, select } = useStore();
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isFullscreen) return;
    // The overlay is `absolute` inside Hero's <main>, not `fixed` to the
    // viewport, so scrolling <main> itself (not just the document) would
    // carry the overlay out of view. Lock the actual scroll container.
    const scrollParent = cardRef.current?.closest('main');
    const previousOverflow = scrollParent?.style.overflow ?? '';
    if (scrollParent) scrollParent.style.overflow = 'hidden';
    return () => {
      if (scrollParent) scrollParent.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  return (
    <>
      {/* ── Card view ──────────────────────────────────────────────── */}
      <section
        ref={cardRef}
        className="map-card-view relative h-[250px] overflow-hidden rounded-2xl border border-white/15"
      >
        <MapContainer
          center={SG_CENTER}
          zoom={CARD_ZOOM}
          style={{ height: '100%', width: '100%' }}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomControl={false}
          attributionControl={true}
        >
          <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
          {locations.map((loc) => (
            <Marker
              key={loc.id}
              position={[loc.latitude, loc.longitude]}
              icon={createPinIcon(loc, loc.id === selectedId)}
            />
          ))}
        </MapContainer>

        <div className="pointer-events-none absolute left-4 top-3 z-[400] text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
          Map
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-3 right-3 z-[400] flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md hover:bg-black/60"
          aria-label="Expand map"
        >
          <ExpandIcon />
          Expand
        </button>
      </section>

      {/* ── Fullscreen overlay ─────────────────────────────────────── */}
      {/* absolute (not fixed): fills the Hero pane only — Hero's <main> is
          the nearest `relative` ancestor, so this never covers the Sidebar. */}
      {isFullscreen && (
        <div className="map-overlay absolute inset-0 z-50">
          <MapContainer
            center={SG_CENTER}
            zoom={FULL_ZOOM}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={true}
            attributionControl={true}
          >
            <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
            {locations.map((loc) => (
              <Marker
                key={loc.id}
                position={[loc.latitude, loc.longitude]}
                icon={createPinIcon(loc, loc.id === selectedId)}
                eventHandlers={{
                  click: () => {
                    select(loc.id);
                    setIsFullscreen(false);
                  },
                }}
              />
            ))}
          </MapContainer>

          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-4 top-4 z-[500] flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/80 backdrop-blur-md hover:bg-white"
            aria-label="Close map"
          >
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );
}

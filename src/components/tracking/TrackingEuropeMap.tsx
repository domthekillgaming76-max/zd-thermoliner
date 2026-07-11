import { useMemo, Fragment } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { DeliveryTracking, MapMarker } from '../../lib/trackingTypes';
import { getRoutePoints, resolveCityCoords, resolveRoutePosition } from '../../lib/trackingMapCoords';

const EUROPE_CENTER: LatLngExpression = [50.5, 10.5];
const EUROPE_BOUNDS: [[number, number], [number, number]] = [
  [34, -15],
  [60, 25],
];

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function statusColor(status: DeliveryTracking['status']): string {
  switch (status) {
    case 'on_route':
    case 'late':
      return '#22d3ee';
    case 'paused':
    case 'loading':
      return '#fbbf24';
    case 'delivered':
    case 'arrived':
      return '#34d399';
    case 'cancelled':
      return '#94a3b8';
    default:
      return '#ef4444';
  }
}

interface MapClickHandlerProps {
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ interactive, onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (interactive && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function markerColor(type: MapMarker['marker_type']): string {
  switch (type) {
    case 'garage':
      return '#6366f1';
    case 'depot':
      return '#f97316';
    case 'hub':
      return '#a78bfa';
    default:
      return '#38bdf8';
  }
}

interface TrackingEuropeMapProps {
  deliveries: DeliveryTracking[];
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  compact?: boolean;
}

export function TrackingEuropeMap({
  deliveries,
  markers,
  selectedId,
  onSelect,
  onMapClick,
  interactive,
  compact,
}: TrackingEuropeMapProps) {
  const activeDeliveries = useMemo(
    () =>
      deliveries.filter(d => {
        if (!d.is_active) return false;
        if (d.current_lat != null && d.current_lng != null) return true;
        return Boolean(resolveCityCoords(d.departure_city) && resolveCityCoords(d.arrival_city));
      }),
    [deliveries],
  );

  const mapHeight = compact ? 220 : 480;

  return (
    <div className="tracking-map-card rounded-2xl overflow-hidden relative">
      <MapContainer
        center={EUROPE_CENTER}
        zoom={compact ? 3 : 4}
        minZoom={3}
        maxZoom={12}
        maxBounds={EUROPE_BOUNDS}
        maxBoundsViscosity={0.85}
        scrollWheelZoom={!compact}
        dragging={!compact}
        zoomControl={!compact}
        className={`tracking-leaflet-map ${interactive ? 'tracking-leaflet-map--interactive' : ''}`}
        style={{ height: mapHeight }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        <MapClickHandler interactive={interactive} onMapClick={onMapClick} />

        {activeDeliveries.map(d => {
          const route = getRoutePoints(d);
          const positions: LatLngExpression[] = route.map(p => [p.lat, p.lng]);
          const truckPos = resolveRoutePosition(
            d.departure_city,
            d.arrival_city,
            d.progress_percent,
            d.current_lat != null && d.current_lng != null ? { lat: d.current_lat, lng: d.current_lng } : null,
          );
          const selected = d.id === selectedId;
          const color = statusColor(d.status);

          return (
            <Fragment key={d.id}>
              {positions.length >= 2 && (
                <Polyline
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: selected ? 4 : 2,
                    opacity: selected ? 0.95 : 0.55,
                    dashArray: d.status === 'paused' ? '8 6' : undefined,
                  }}
                />
              )}

              {route[0] && (
                <CircleMarker
                  center={[route[0].lat, route[0].lng]}
                  radius={selected ? 6 : 4}
                  pathOptions={{ color: '#64748b', fillColor: '#64748b', fillOpacity: 0.9, weight: 1 }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    Départ — {d.departure_city}
                  </Tooltip>
                </CircleMarker>
              )}

              {route.length > 1 && route[route.length - 1] && (
                <CircleMarker
                  center={[route[route.length - 1].lat, route[route.length - 1].lng]}
                  radius={selected ? 6 : 4}
                  pathOptions={{ color: '#94a3b8', fillColor: '#94a3b8', fillOpacity: 0.9, weight: 1 }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                    Arrivée — {d.arrival_city}
                  </Tooltip>
                </CircleMarker>
              )}

              <CircleMarker
                center={[truckPos.lat, truckPos.lng]}
                radius={selected ? 10 : 7}
                pathOptions={{
                  color: '#fff',
                  fillColor: color,
                  fillOpacity: 1,
                  weight: selected ? 3 : 2,
                }}
                eventHandlers={{
                  click: e => {
                    e.originalEvent.stopPropagation();
                    onSelect?.(d.id);
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <span className="font-semibold">{d.driver_name ?? 'Chauffeur'}</span>
                  <br />
                  {d.departure_city} → {d.arrival_city}
                  <br />
                  {Math.round(d.progress_percent)}% — {d.remaining_km} km restants
                </Tooltip>
              </CircleMarker>
            </Fragment>
          );
        })}

        {markers.filter(m => m.is_active).map(m => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={6}
            pathOptions={{
              color: markerColor(m.marker_type),
              fillColor: markerColor(m.marker_type),
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
              {m.label}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none z-[1000]">
        <span className="tracking-legend-pill text-[10px] text-white/50 px-2 py-1 rounded-full">
          Carte Europe — OpenStreetMap
        </span>
        <span className="tracking-legend-pill text-[10px] text-cyan-400 px-2 py-1 rounded-full">En route</span>
        <span className="tracking-legend-pill text-[10px] text-amber-400 px-2 py-1 rounded-full">Pause</span>
        <span className="tracking-legend-pill text-[10px] text-emerald-400 px-2 py-1 rounded-full">Livré</span>
      </div>
    </div>
  );
}

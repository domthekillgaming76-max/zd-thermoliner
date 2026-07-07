import type { DeliveryTracking, MapMarker } from '../../lib/trackingTypes';
import { TRACKING_STATUS_COLORS } from '../../lib/trackingTypes';
import { projectToMap } from '../../lib/trackingMapCoords';

const MAP_W = 800;
const MAP_H = 480;

interface TrackingEuropeMapProps {
  deliveries: DeliveryTracking[];
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export function TrackingEuropeMap({
  deliveries,
  markers,
  selectedId,
  onSelect,
  onMapClick,
  interactive,
}: TrackingEuropeMapProps) {
  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onMapClick || !interactive) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const y = ((e.clientY - rect.top) / rect.height) * MAP_H;
    const { minLat, maxLat, minLng, maxLng } = { minLat: 35, maxLat: 58, minLng: -10, maxLng: 20 };
    const lng = minLng + (x / MAP_W) * (maxLng - minLng);
    const lat = maxLat - (y / MAP_H) * (maxLat - minLat);
    onMapClick(lat, lng);
  }

  return (
    <div className="tracking-map-card rounded-2xl overflow-hidden relative">
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="w-full h-auto tracking-map-svg"
        onClick={handleSvgClick}
        role="img"
        aria-label="Carte Europe tracking"
      >
        <defs>
          <linearGradient id="trackingMapBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c1220" />
            <stop offset="100%" stopColor="#080810" />
          </linearGradient>
          <filter id="truckGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={MAP_W} height={MAP_H} fill="url(#trackingMapBg)" />

        {/* Simplified Europe outline */}
        <path
          d="M 80 120 L 120 90 L 200 70 L 320 60 L 450 75 L 560 95 L 640 130 L 700 180 L 720 250 L 700 320 L 650 380 L 580 420 L 480 440 L 360 430 L 250 400 L 150 350 L 90 280 L 70 200 Z"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />

        {/* Grid */}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={MAP_H} stroke="rgba(255,255,255,0.03)" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 80} x2={MAP_W} y2={i * 80} stroke="rgba(255,255,255,0.03)" />
        ))}

        {/* Static markers */}
        {markers.map(m => {
          const p = projectToMap(m.lat, m.lng, MAP_W, MAP_H);
          const color = m.marker_type === 'garage' ? '#f59e0b' : m.marker_type === 'client' ? '#a78bfa' : '#64748b';
          return (
            <g key={m.id} transform={`translate(${p.x}, ${p.y})`}>
              <rect x={-5} y={-5} width={10} height={10} rx={2} fill={color} opacity={0.85} />
              <title>{m.label}</title>
            </g>
          );
        })}

        {/* Routes */}
        {deliveries.map(d => {
          if (!d.departure_lat || !d.arrival_lat) return null;
          const dep = projectToMap(d.departure_lat, d.departure_lng!, MAP_W, MAP_H);
          const arr = projectToMap(d.arrival_lat, d.arrival_lng!, MAP_W, MAP_H);
          const color = TRACKING_STATUS_COLORS[d.status];
          const selected = d.id === selectedId;
          return (
            <g key={`route-${d.id}`}>
              <line
                x1={dep.x} y1={dep.y} x2={arr.x} y2={arr.y}
                stroke={color}
                strokeWidth={selected ? 3 : 1.5}
                strokeOpacity={selected ? 0.7 : 0.35}
                strokeDasharray={d.status === 'planned' ? '6 4' : undefined}
              />
              <circle cx={dep.x} cy={dep.y} r={4} fill="#94a3b8" opacity={0.8} />
              <circle cx={arr.x} cy={arr.y} r={4} fill={color} opacity={0.9} />
            </g>
          );
        })}

        {/* Truck markers */}
        {deliveries.map(d => {
          const lat = d.current_lat ?? d.departure_lat;
          const lng = d.current_lng ?? d.departure_lng;
          if (lat == null || lng == null) return null;
          const p = projectToMap(lat, lng, MAP_W, MAP_H);
          const color = TRACKING_STATUS_COLORS[d.status];
          const selected = d.id === selectedId;
          return (
            <g
              key={`truck-${d.id}`}
              transform={`translate(${p.x}, ${p.y})`}
              className="cursor-pointer"
              onClick={e => { e.stopPropagation(); onSelect?.(d.id); }}
              filter={selected ? 'url(#truckGlow)' : undefined}
            >
              <circle r={selected ? 14 : 10} fill={color} fillOpacity={0.25} />
              <circle r={selected ? 8 : 6} fill={color} />
              <text y={-14} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" opacity={0.9}>
                {d.truck_label?.split(' ').pop()?.slice(0, 6) ?? '🚛'}
              </text>
              <title>{`${d.driver_name ?? '—'} — ${d.departure_city} → ${d.arrival_city}`}</title>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px]">
        {Object.entries(TRACKING_STATUS_COLORS).slice(0, 6).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1 px-2 py-1 rounded-full tracking-legend-pill">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-white/50 capitalize">{status.replace('_', ' ')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

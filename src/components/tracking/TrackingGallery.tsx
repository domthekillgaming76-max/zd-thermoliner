const TRACKING_RP_PHOTOS = [
  {
    src: '/tracking/fleet-highway.png',
    alt: 'Flotte de camions suivie en temps réel sur autoroute',
    caption: 'Flotte en mouvement',
    subtitle: 'Suivi GPS live sur le réseau européen',
  },
  {
    src: '/tracking/control-room.png',
    alt: 'Ville connectée — réseau de tracking logistique',
    caption: 'Réseau connecté',
    subtitle: 'Salle de contrôle & points de livraison',
  },
  {
    src: '/tracking/gps-navigation.png',
    alt: 'Navigation GPS — itinéraires et positionnement',
    caption: 'Navigation GPS',
    subtitle: 'Itinéraires, ETA & position chauffeur',
  },
] as const;

export function TrackingGallery() {
  return (
    <section className="tracking-rp-gallery rounded-2xl overflow-hidden border border-red-500/15">
      <div className="px-4 md:px-5 py-3 border-b border-white/6 bg-red-500/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/90">
          Terrain RP — tracking GPS
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Flotte en route, réseau connecté et navigation temps réel
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-px bg-white/5">
        {TRACKING_RP_PHOTOS.map((photo, i) => (
          <figure
            key={photo.src}
            className="group relative bg-[#080808] overflow-hidden opacity-0 animate-dashboard-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="aspect-[4/3] overflow-hidden relative">
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <figcaption className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <p className="text-xs font-bold text-white">{photo.caption}</p>
                <p className="text-[10px] text-red-400/80 mt-0.5">{photo.subtitle}</p>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function TrackingHeroBanner() {
  return (
    <div className="relative h-36 md:h-44 rounded-xl overflow-hidden mb-4 border border-white/8">
      <img
        src="/tracking/control-room.png"
        alt="Salle de contrôle GPS Z&D Thermoliner"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4 md:p-5">
        <p className="text-lg md:text-xl font-black text-white tracking-tight">GPS &amp; Tracking</p>
        <p className="text-xs text-red-400 font-semibold">Europe en temps réel — flotte connectée</p>
      </div>
    </div>
  );
}

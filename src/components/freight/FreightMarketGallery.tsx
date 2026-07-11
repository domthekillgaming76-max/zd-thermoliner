const FREIGHT_RP_PHOTOS = [
  {
    src: '/freight/market-hub.png',
    alt: 'Plateforme logistique — marché de gros',
    caption: 'Plateforme logistique',
    subtitle: 'Quais de chargement & flux camions',
  },
  {
    src: '/freight/market-rungis.png',
    alt: 'Semi-remorque frigo — marché international',
    caption: 'Marché international',
    subtitle: 'Fret frigorifique longue distance',
  },
  {
    src: '/freight/market-fleet.png',
    alt: 'Flotte frigorifique au dépôt',
    caption: 'Flotte frigo',
    subtitle: 'Parc véhicules thermiques Z&D',
  },
] as const;

export function FreightMarketGallery() {
  return (
    <section className="freight-rp-gallery rounded-2xl overflow-hidden border border-cyan-500/15">
      <div className="px-4 md:px-5 py-3 border-b border-white/6 bg-cyan-500/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400/90">
          Terrain RP — marché de fret
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Plateformes, hubs frigorifiques et départs de mission
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-px bg-white/5">
        {FREIGHT_RP_PHOTOS.map((photo, i) => (
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
                <p className="text-[10px] text-cyan-400/80 mt-0.5">{photo.subtitle}</p>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function FreightHeroBanner() {
  return (
    <div className="relative h-36 md:h-44 rounded-xl overflow-hidden mb-4 border border-white/8">
      <img
        src="/freight/market-hub.png"
        alt="Marché de fret Z&D Thermoliner"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4 md:p-5">
        <p className="text-lg md:text-xl font-black text-white tracking-tight">Marché Fret</p>
        <p className="text-xs text-cyan-400 font-semibold">Plateformes &amp; missions thermiques</p>
      </div>
    </div>
  );
}

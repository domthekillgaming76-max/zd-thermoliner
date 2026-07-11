const CLOVIS_RP_PHOTOS = [
  {
    src: '/clovis/agency-fleet.png',
    alt: 'Flotte Clovis Location — Renault T',
    caption: 'Parc véhicules Clovis',
    subtitle: 'Avancez l\'esprit libre',
  },
  {
    src: '/clovis/agency-keys.png',
    alt: 'Remise des clés — location Clovis',
    caption: 'Prise en charge',
    subtitle: 'Remise des clés du véhicule',
  },
  {
    src: '/clovis/agency-handshake.png',
    alt: 'Signature contrat location Clovis',
    caption: 'Contrat signé',
    subtitle: 'Partenariat Z&D × Clovis',
  },
] as const;

export function ClovisAgencyGallery() {
  return (
    <section className="clovis-rp-gallery rounded-2xl overflow-hidden border border-amber-500/15">
      <div className="px-4 md:px-5 py-3 border-b border-white/6 bg-amber-500/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/90">
          Agence Clovis — immersion RP
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Flotte, remise des clés et signature de contrat
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-px bg-white/5">
        {CLOVIS_RP_PHOTOS.map((photo, i) => (
          <figure
            key={photo.src}
            className="group relative bg-[#080808] overflow-hidden opacity-0 animate-dashboard-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            </div>
            <figcaption className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
              <p className="text-xs font-bold text-white">{photo.caption}</p>
              <p className="text-[10px] text-amber-400/80 mt-0.5">{photo.subtitle}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function ClovisHeroBanner() {
  return (
    <div className="relative h-36 md:h-44 rounded-xl overflow-hidden mb-4 border border-white/8">
      <img
        src="/clovis/agency-fleet.png"
        alt="Agence Clovis Location"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4 md:p-5">
        <p className="text-lg md:text-xl font-black text-white tracking-tight">Clovis</p>
        <p className="text-xs text-amber-400 font-semibold">Avancez l&apos;esprit libre</p>
      </div>
    </div>
  );
}

const DASHBOARD_RP_PHOTOS = [
  {
    src: '/dashboard/bureaux-logo-wall.png',
    alt: 'Signalétique Z&D Thermoliner Bureaux — gestion et logistique',
    caption: 'Identité corporate',
    subtitle: 'Gestion · Logistique · Performance · Confiance',
    aspect: 'aspect-[4/3]' as const,
  },
  {
    src: '/dashboard/bureaux-headquarters.png',
    alt: 'Siège Z&D Thermoliner — bureaux et flotte',
    caption: 'Siège & bureaux',
    subtitle: 'Headquarters RP — Z&D Thermoliner',
    aspect: 'aspect-[16/10]' as const,
    fallback: '/dashboard/bureaux-logo-wall.png',
  },
  {
    src: '/dashboard/bureaux-banner-erp.png',
    alt: 'Bannière ERP & Logistique VTC Z&D Thermoliner',
    caption: 'ERP & Logistique VTC',
    subtitle: 'Tableau de bord opérationnel',
    aspect: 'aspect-[21/9]' as const,
  },
  {
    src: '/dashboard/bureaux-signature.png',
    alt: 'Signature officielle Z&D Thermoliner — La route, notre passion',
    caption: 'Signature officielle',
    subtitle: 'La route, notre passion',
    aspect: 'aspect-[16/9]' as const,
  },
] as const;

function RpPhoto({
  photo,
  index,
  className = '',
}: {
  photo: (typeof DASHBOARD_RP_PHOTOS)[number];
  index: number;
  className?: string;
}) {
  const src = photo.src;
  const fallback = 'fallback' in photo ? photo.fallback : undefined;

  return (
    <figure
      className={`group relative bg-[#080808] overflow-hidden opacity-0 animate-dashboard-in ${className}`}
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`${photo.aspect} overflow-hidden relative`}>
        <img
          src={src}
          alt={photo.alt}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          onError={e => {
            if (fallback) (e.target as HTMLImageElement).src = fallback;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <figcaption className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <p className="text-xs font-bold text-white">{photo.caption}</p>
          <p className="text-[10px] text-red-400/85 mt-0.5">{photo.subtitle}</p>
        </figcaption>
      </div>
    </figure>
  );
}

export function DashboardBureauxHeroBanner() {
  return (
    <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-red-500/20 mb-2 opacity-0 animate-dashboard-in" style={{ animationFillMode: 'forwards' }}>
      <div className="aspect-[21/7] md:aspect-[21/6] relative">
        <img
          src="/dashboard/bureaux-banner-erp.png"
          alt="Z&D Thermoliner Bureaux — ERP & Logistique VTC"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-400/90 mb-2">
            Z&amp;D Thermoliner — Bureaux
          </p>
          <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">
            ERP &amp; Logistique VTC
          </h2>
          <p className="text-xs md:text-sm text-white/45 mt-1.5 max-w-lg">
            Centre de pilotage corporate — flotte, finances et opérations en temps réel
          </p>
        </div>
        <img
          src="/dashboard/bureaux-logo-wall.png"
          alt=""
          aria-hidden
          className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2 w-36 h-36 rounded-2xl object-cover object-center border border-white/10 shadow-2xl opacity-90"
        />
      </div>
    </div>
  );
}

export function DashboardRpGallery() {
  const [logo, hq, banner, signature] = DASHBOARD_RP_PHOTOS;

  return (
    <section className="dashboard-rp-gallery rounded-2xl overflow-hidden border border-red-500/15">
      <div className="px-4 md:px-5 py-3 border-b border-white/6 bg-red-500/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/90">
          Bureaux Z&amp;D — immersion RP
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Identité corporate, siège, ERP logistique et signature officielle
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-px bg-white/5">
        <RpPhoto photo={logo} index={0} className="lg:col-span-2" />
        <RpPhoto photo={signature} index={3} />
        <RpPhoto photo={banner} index={2} className="lg:col-span-2" />
        <RpPhoto photo={hq} index={1} />
      </div>
    </section>
  );
}

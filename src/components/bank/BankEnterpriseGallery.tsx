const BANK_RP_PHOTOS = [
  {
    src: '/bank/partner-brand.png',
    alt: 'Partenaire bancaire — espace entreprise Z&D Thermoliner',
    caption: 'Partenaire financier',
    subtitle: 'Compte pro & connexion sécurisée',
  },
  {
    src: '/bank/mobile-banking.png',
    alt: 'Application mobile bancaire entreprise',
    caption: 'App mobile entreprise',
    subtitle: 'Comptes, virements & trésorerie live',
  },
] as const;

export function BankEnterpriseGallery() {
  return (
    <section className="bank-rp-gallery rounded-2xl overflow-hidden border border-emerald-500/15">
      <div className="px-4 md:px-5 py-3 border-b border-white/6 bg-emerald-500/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
          Terrain RP — banque entreprise
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Partenaire bancaire, app mobile et gestion de trésorerie
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 sm:gap-px bg-white/5">
        {BANK_RP_PHOTOS.map((photo, i) => (
          <figure
            key={photo.src}
            className="group relative bg-[#080808] overflow-hidden opacity-0 animate-dashboard-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className={`overflow-hidden relative ${i === 1 ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}>
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <figcaption className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <p className="text-xs font-bold text-white">{photo.caption}</p>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">{photo.subtitle}</p>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function BankEnterpriseHeroBanner() {
  return (
    <div className="relative h-36 md:h-44 rounded-xl overflow-hidden border border-emerald-500/20">
      <img
        src="/bank/partner-brand.png"
        alt="Banque entreprise Z&D Thermoliner"
        className="w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#003d24]/90 via-[#003d24]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 p-4 md:p-5">
        <p className="text-lg md:text-xl font-black text-white tracking-tight">Banque Entreprise</p>
        <p className="text-xs text-emerald-300 font-semibold">Trésorerie, virements et suivi des opérations</p>
      </div>
    </div>
  );
}

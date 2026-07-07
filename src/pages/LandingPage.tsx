import { Link } from 'react-router-dom';
import {
  Truck, Shield, Users, Heart, ChevronRight, Mail, MapPin,
} from 'lucide-react';
import { Logo } from '../components/Logo';

const STATS = [
  { value: '50+', label: 'véhicules' },
  { value: '100+', label: 'passionnés' },
  { value: '100%', label: 'sécurité' },
  { value: '5 ans', label: 'à votre service' },
];

const VALUES = [
  { icon: Users, title: 'Esprit d\'équipe', desc: 'Convois, entraide et camaraderie sur la route.' },
  { icon: Shield, title: 'Professionnalisme', desc: 'Flotte organisée, procédures claires et suivi ERP.' },
  { icon: Heart, title: 'Passion', desc: 'Chaque kilomètre compte — ETS2 / ATS au cœur.' },
  { icon: Truck, title: 'Sécurité', desc: 'Conduite responsable et respect du règlement.' },
];

const FLEET = [
  { name: 'Scania R 500', type: 'Tracteur', tag: 'Frigorifique' },
  { name: 'Volvo FH16', type: 'Tracteur', tag: 'Longue distance' },
  { name: 'Mercedes Actros', type: 'Tracteur', tag: 'National' },
  { name: 'Krone Cool Liner', type: 'Remorque', tag: 'Température dirigée' },
];

const NAV = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#apropos', label: 'À propos' },
  { href: '#valeurs', label: 'Nos valeurs' },
  { href: '#flotte', label: 'Notre flotte' },
  { href: '#recrutement', label: 'Recrutement' },
  { href: '#contact', label: 'Contact' },
];

export function LandingPage() {
  return (
    <div className="landing-page min-h-screen text-white overflow-x-hidden">
      <div className="landing-hero-bg" />

      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/"><Logo size="sm" /></Link>
          <nav className="hidden lg:flex items-center gap-6">
            {NAV.map(item => (
              <a key={item.href} href={item.href} className="text-sm text-white/50 hover:text-teal-400 transition-colors">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
              Se connecter
            </Link>
            <Link to="/register" className="hidden sm:inline-flex px-4 py-2 text-sm rounded-xl border border-white/10 hover:border-teal-500/30 transition-colors">
              Créer un compte
            </Link>
            <Link to="/register?type=driver" className="btn-primary px-4 py-2 text-sm rounded-xl font-semibold">
              Rejoindre l&apos;aventure
            </Link>
          </div>
        </div>
      </header>

      <section id="accueil" className="relative pt-28 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="landing-fade-up">
            <p className="text-teal-400 text-sm font-bold uppercase tracking-[0.2em] mb-4">Transport RP — ETS2 / ATS</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4">
              Z<span className="text-red-500">&</span>D THERMOLINER
            </h1>
            <p className="text-xl sm:text-2xl text-white/60 font-light mb-8">
              La passion de la route, notre raison d&apos;être.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link to="/register?type=driver" className="btn-primary px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2">
                Postuler maintenant <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="px-6 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-red-500/30 transition-colors">
                Espace membre
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="landing-stat-card rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-teal-400">{s.value}</p>
                  <p className="text-xs text-white/40 uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="landing-fade-up landing-delay-1 hidden lg:block">
            <div className="landing-truck-visual rounded-3xl aspect-[4/3] flex items-end p-8">
              <div className="w-full">
                <p className="text-white/80 text-lg font-semibold">Flotte thermique premium</p>
                <p className="text-white/40 text-sm">Scania • Volvo • Mercedes — Remorques frigo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="apropos" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center landing-fade-up">
          <h2 className="text-3xl font-black mb-4">À propos</h2>
          <p className="text-white/50 leading-relaxed">
            Z&D Thermoliner est une entreprise virtuelle de transport frigorifique. Nous combinons gestion ERP,
            feuilles de route, comptabilité et communauté Discord pour une expérience RP immersive et professionnelle.
          </p>
        </div>
      </section>

      <section id="valeurs" className="py-20 px-4 sm:px-6 bg-black/40">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Nos valeurs</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map(v => (
              <div key={v.title} className="landing-value-card rounded-2xl p-6">
                <v.icon className="w-8 h-8 text-red-400 mb-4" />
                <h3 className="font-bold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-white/45">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="flotte" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Notre flotte</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 landing-fleet-scroll snap-x">
            {FLEET.map(item => (
              <div key={item.name} className="landing-fleet-card flex-shrink-0 w-72 snap-start rounded-2xl overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center">
                  <Truck className="w-16 h-16 text-white/20" />
                </div>
                <div className="p-4 border-t border-white/5">
                  <p className="font-bold text-white">{item.name}</p>
                  <p className="text-xs text-teal-400 mt-1">{item.type} — {item.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recrutement" className="py-20 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center landing-cta rounded-3xl p-10 sm:p-14">
          <h2 className="text-3xl font-black mb-4">Rejoignez l&apos;aventure Z&D Thermoliner</h2>
          <p className="text-white/50 mb-8">Chauffeur RP ou visiteur — créez votre compte et déposez votre candidature au Bureau du PDG.</p>
          <Link to="/register" className="btn-primary inline-flex px-8 py-3.5 rounded-xl font-bold text-sm items-center gap-2">
            Postuler maintenant <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <section id="contact" className="py-16 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <Mail className="w-4 h-4 text-teal-400" />
            contact@zd-thermoliner.fr
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <MapPin className="w-4 h-4 text-teal-400" />
            Communauté Discord Z&D
          </div>
          <Logo size="sm" showText={false} />
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-white/25 border-t border-white/5">
        © {new Date().getFullYear()} Z&D Thermoliner — Tous droits réservés
      </footer>
    </div>
  );
}

import { motion } from 'framer-motion';
import {
  Activity, ArrowUpRight, Bell, CheckCircle2, CircleDollarSign,
  Gauge, MapPin, Navigation, PackageCheck, RefreshCw, Route,
  ShieldCheck, Sparkles, Trophy, Truck, Users, Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { DashboardData, DashboardNotification } from '../../../types/dashboard';
import type { FleetMapVehicle, LiveOpsMetrics } from '../../../lib/liveOpsTypes';
import type { Driver } from '../../../lib/supabase';
import { fmt, fmtDateTime, fmtEuro } from '../../../lib/format';

interface FleetCommandCenterProps {
  displayName: string;
  data: DashboardData;
  loading: boolean;
  liveOps: LiveOpsMetrics;
  fleetMap: FleetMapVehicle[];
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated?: Date | null;
}

const cardMotion = {
  hidden: { opacity: 0, y: 22, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const tooltipStyle = {
  background: 'rgba(8, 17, 29, .96)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 14,
  boxShadow: '0 20px 60px rgba(0,0,0,.35)',
  color: '#fff',
};

function GlassCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.section
      variants={cardMotion}
      initial="hidden"
      animate="visible"
      transition={{ duration: .55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: .25 } }}
      className={`fleet-glass-card ${className}`}
    >
      {children}
    </motion.section>
  );
}

function WidgetTitle({ icon: Icon, title, subtitle, accent = '#FF4A4A' }: {
  icon: typeof Activity; title: string; subtitle: string; accent?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="fleet-widget-icon" style={{ '--widget-accent': accent } as React.CSSProperties}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[.01em] text-white truncate">{title}</h2>
          <p className="text-[10px] uppercase tracking-[.15em] text-white/35 mt-0.5 truncate">{subtitle}</p>
        </div>
      </div>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.75)] animate-pulse" />
    </div>
  );
}

function ScaniaTruck() {
  return (
    <div className="fleet-truck-wrap" aria-label="Camion Z&D Thermoliner">
      <div className="fleet-headlight fleet-headlight-left" />
      <div className="fleet-headlight fleet-headlight-right" />
      <svg viewBox="0 0 760 360" className="fleet-truck-svg" role="img">
        <defs>
          <linearGradient id="trailer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#323b46" />
            <stop offset=".36" stopColor="#111923" />
            <stop offset="1" stopColor="#05090e" />
          </linearGradient>
          <linearGradient id="cab" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#75808b" />
            <stop offset=".16" stopColor="#1d2731" />
            <stop offset=".65" stopColor="#070d13" />
            <stop offset="1" stopColor="#020407" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7cb0c8" stopOpacity=".72" />
            <stop offset=".45" stopColor="#1c3b4e" stopOpacity=".78" />
            <stop offset="1" stopColor="#071019" />
          </linearGradient>
          <radialGradient id="wheel">
            <stop offset="0" stopColor="#6d7780" />
            <stop offset=".28" stopColor="#202832" />
            <stop offset=".72" stopColor="#05080b" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <filter id="truckShadow" x="-30%" y="-30%" width="170%" height="190%">
            <feDropShadow dx="0" dy="20" stdDeviation="18" floodColor="#000" floodOpacity=".75" />
          </filter>
        </defs>
        <ellipse cx="410" cy="309" rx="294" ry="30" fill="#000" opacity=".56" />
        <g filter="url(#truckShadow)" transform="skewY(-1)">
          <path d="M70 83 444 69 482 239 95 254Z" fill="url(#trailer)" stroke="#7f8993" strokeOpacity=".28" />
          <path d="M83 94 429 82 437 101 88 113Z" fill="#fff" opacity=".08" />
          <path d="M108 122 399 110" stroke="#d62828" strokeWidth="3" opacity=".8" />
          <text x="152" y="190" fill="#fff" fontSize="50" fontWeight="800" letterSpacing="-3">Z&amp;D</text>
          <text x="258" y="188" fill="#FF4A4A" fontSize="21" fontWeight="700" letterSpacing="4">THERMOLINER</text>
          <text x="160" y="216" fill="#a8b0b9" fontSize="11" letterSpacing="5">TRANSPORT • LOGISTIQUE • EXCELLENCE</text>
          <path d="M474 118 600 109 683 169 704 271 456 269 449 180Z" fill="url(#cab)" stroke="#89939c" strokeOpacity=".35" />
          <path d="M510 128 592 121 653 166 526 172Z" fill="url(#glass)" stroke="#b8d7e5" strokeOpacity=".35" />
          <path d="M664 176 685 191 694 231 674 230Z" fill="#09131c" />
          <path d="M487 184 654 176 674 253 467 255Z" fill="#0b1219" stroke="#fff" strokeOpacity=".08" />
          <path d="M486 199 648 191" stroke="#ff3b3b" strokeWidth="3" opacity=".85" />
          <path d="M477 241 664 235 674 253 467 255Z" fill="#030507" />
          <rect x="626" y="225" width="37" height="8" rx="4" fill="#fff5d8" />
          <rect x="478" y="230" width="28" height="7" rx="3.5" fill="#ff4a4a" />
          <path d="M520 205 631 199" stroke="#7c8791" strokeWidth="2" opacity=".7" />
          <text x="537" y="224" fill="#e4e8ec" fontSize="14" fontWeight="700" letterSpacing="3">SCANIA S</text>
          <circle cx="185" cy="266" r="43" fill="url(#wheel)" stroke="#49535c" strokeWidth="4" />
          <circle cx="185" cy="266" r="12" fill="#9aa3aa" />
          <circle cx="420" cy="267" r="42" fill="url(#wheel)" stroke="#49535c" strokeWidth="4" />
          <circle cx="420" cy="267" r="12" fill="#9aa3aa" />
          <circle cx="616" cy="267" r="47" fill="url(#wheel)" stroke="#49535c" strokeWidth="4" />
          <circle cx="616" cy="267" r="13" fill="#9aa3aa" />
        </g>
      </svg>
    </div>
  );
}

function Hero({ displayName, onRefresh, refreshing, lastUpdated }: Pick<FleetCommandCenterProps, 'displayName' | 'onRefresh' | 'refreshing' | 'lastUpdated'>) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: .985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}
      className="fleet-command-hero"
    >
      <div className="fleet-speed-line fleet-speed-line-one" />
      <div className="fleet-speed-line fleet-speed-line-two" />
      <div className="fleet-hero-fog" />
      <div className="relative z-10 grid min-h-[390px] lg:grid-cols-[.9fr_1.1fr] items-center">
        <div className="px-6 py-10 sm:px-10 lg:px-12 xl:px-14">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.26em] font-semibold text-red-300 mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Fleet command center
          </div>
          <div className="fleet-metal-logo" aria-label="Z&D Thermoliner">
            <span>Z<span>&amp;</span>D</span>
            <small>Thermoliner</small>
          </div>
          <p className="text-white/65 text-sm sm:text-base mt-5 max-w-lg leading-relaxed">
            Bonjour <strong className="text-white">{displayName}</strong>. Bienvenue sur votre centre de pilotage logistique nouvelle génération.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-7">
            <div className="fleet-live-pill"><span /> Tous les systèmes opérationnels</div>
            <button type="button" onClick={onRefresh} disabled={refreshing} className="fleet-refresh-button">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Synchroniser
            </button>
            {lastUpdated && <span className="text-[10px] text-white/30">{lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
        <div className="relative self-stretch min-h-[340px] overflow-hidden">
          <div className="fleet-right-light" />
          <ScaniaTruck />
        </div>
      </div>
    </motion.section>
  );
}

function DailyStats({ data, loading }: { data: DashboardData; loading: boolean }) {
  const chart = data.weeklyData.length ? data.weeklyData : Array.from({ length: 7 }, (_, i) => ({ label: ['L','M','M','J','V','S','D'][i], deliveries: 0, revenue: 0 }));
  return (
    <GlassCard className="p-5 sm:p-6 xl:col-span-2" delay={.06}>
      <WidgetTitle icon={Gauge} title="Statistiques du jour" subtitle="Activité opérationnelle en direct" />
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="fleet-stat-tile">
          <Route className="w-4 h-4 text-red-400" />
          <div><p>Kilomètres</p><strong>{loading ? '—' : fmt(data.operational.totalKmMonth)}</strong><small>km suivis</small></div>
        </div>
        <div className="fleet-stat-tile">
          <PackageCheck className="w-4 h-4 text-violet-400" />
          <div><p>Livraisons</p><strong>{loading ? '—' : data.stats.deliveriesCompleted}</strong><small>terminées</small></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}><Line type="monotone" dataKey="revenue" stroke="#FF4A4A" strokeWidth={2.5} dot={false} isAnimationActive /><Tooltip contentStyle={tooltipStyle} /></LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}><Line type="monotone" dataKey="deliveries" stroke="#9b7bff" strokeWidth={2.5} dot={false} isAnimationActive /><Tooltip contentStyle={tooltipStyle} /></LineChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function FleetDistribution({ data }: { data: DashboardData }) {
  const f = data.fleetStatus;
  const items = [
    { name: 'Disponible', value: f.available, color: '#34d399' },
    { name: 'En mission', value: Math.max(0, f.active - f.available), color: '#ff4a4a' },
    { name: 'Maintenance', value: f.maintenance, color: '#fbbf24' },
    { name: 'Inactif', value: f.retired, color: '#64748b' },
  ];
  const safe = items.some(i => i.value > 0) ? items : [{ name: 'Aucune donnée', value: 1, color: '#263445' }];
  return (
    <GlassCard className="p-5 sm:p-6" delay={.1}>
      <WidgetTitle icon={Truck} title="Répartition flotte" subtitle={`${f.total} véhicules enregistrés`} />
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={safe} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={4} stroke="transparent" isAnimationActive>{safe.map(item => <Cell key={item.name} fill={item.color} />)}</Pie></PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><strong className="text-3xl text-white">{f.total}</strong><span className="text-[9px] uppercase tracking-[.18em] text-white/35">véhicules</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => <div key={item.name} className="flex items-center gap-2 text-[10px] text-white/55"><span className="w-2 h-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} /><span className="flex-1">{item.name}</span><strong className="text-white">{item.value}</strong></div>)}
      </div>
    </GlassCard>
  );
}

function MonthlyPerformance({ data }: { data: DashboardData }) {
  return (
    <GlassCard className="p-5 sm:p-6 xl:col-span-2" delay={.14}>
      <WidgetTitle icon={Activity} title="Performance mensuelle" subtitle="Revenus, dépenses et marge" />
      <div className="flex items-end gap-6 mb-4">
        <div><p className="fleet-micro-label">Chiffre d'affaires</p><strong className="text-2xl text-white">{fmtEuro(data.stats.revenueMonth)}</strong></div>
        <div><p className="fleet-micro-label">Résultat net</p><strong className="text-lg text-emerald-400">{fmtEuro(data.stats.netProfit)}</strong></div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.monthData}>
            <defs><linearGradient id="monthlyRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF4A4A" stopOpacity=".4"/><stop offset="1" stopColor="#FF4A4A" stopOpacity="0"/></linearGradient></defs>
            <CartesianGrid stroke="rgba(255,255,255,.045)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={tooltipStyle} formatter={v => fmtEuro(Number(v ?? 0))} />
            <Area type="monotone" dataKey="income" stroke="#FF4A4A" strokeWidth={3} fill="url(#monthlyRed)" isAnimationActive />
            <Area type="monotone" dataKey="profit" stroke="#a78bfa" strokeWidth={2} fill="transparent" isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

function QuickOverview({ data, liveOps }: { data: DashboardData; liveOps: LiveOpsMetrics }) {
  const stats = [
    { icon: Users, label: 'Chauffeurs connectés', value: liveOps.connectedDrivers, color: '#60a5fa' },
    { icon: PackageCheck, label: 'Livraisons', value: liveOps.deliveriesInProgress, color: '#a78bfa' },
    { icon: CircleDollarSign, label: 'Revenus du jour', value: fmtEuro(liveOps.revenueToday), color: '#34d399' },
    { icon: Gauge, label: 'Marge', value: `${Math.round(data.trends.profitMargin)}%`, color: '#ff4a4a' },
  ];
  return (
    <GlassCard className="p-5 sm:p-6" delay={.18}>
      <WidgetTitle icon={ShieldCheck} title="Aperçu rapide" subtitle="Performance instantanée" />
      <div className="space-y-2.5">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="fleet-overview-row">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}14`, border: `1px solid ${color}30` }}><Icon className="w-4 h-4" style={{ color }} /></div>
            <div className="flex-1 min-w-0"><p className="text-[10px] text-white/40 truncate">{label}</p><strong className="text-sm text-white">{value}</strong></div>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/20" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function FranceMap({ vehicles }: { vehicles: FleetMapVehicle[] }) {
  const visible = vehicles.slice(0, 8);
  const coords = (v: FleetMapVehicle) => ({
    left: `${Math.max(8, Math.min(92, ((v.lng + 5.2) / 13.5) * 100))}%`,
    top: `${Math.max(8, Math.min(90, ((51.2 - v.lat) / 9) * 100))}%`,
  });
  return (
    <GlassCard className="p-5 sm:p-6 min-h-[360px]" delay={.22}>
      <WidgetTitle icon={MapPin} title="Carte de France" subtitle={`${vehicles.length} position(s) suivie(s)`} />
      <div className="fleet-france-map">
        <svg viewBox="0 0 420 390" aria-hidden="true">
          <defs><linearGradient id="franceFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#18314a"/><stop offset="1" stopColor="#0a1828"/></linearGradient></defs>
          <path d="M106 42 204 28 275 59 330 112 351 202 315 284 253 355 170 342 97 293 58 216 72 126Z" fill="url(#franceFill)" stroke="#5f7890" strokeOpacity=".55" strokeWidth="2" />
          <path d="M78 131 326 114M61 218 348 201M98 292 313 284M171 45 168 340M255 56 252 352" stroke="#fff" strokeOpacity=".045" />
        </svg>
        {visible.map((vehicle, i) => <motion.div key={vehicle.id} className="fleet-map-pin" style={coords(vehicle)} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .3 + i * .08, type: 'spring' }} title={`${vehicle.driverName} — ${vehicle.routeSummary}`}><span /><Navigation className="w-3 h-3" /></motion.div>)}
        {visible.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-xs text-white/25">Aucune position active</div>}
        <div className="absolute left-3 bottom-3 fleet-map-legend"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Mise à jour temps réel</div>
      </div>
    </GlassCard>
  );
}

function DriverRanking({ drivers }: { drivers: Driver[] }) {
  const medals = ['#fbbf24', '#cbd5e1', '#c08457'];
  return (
    <GlassCard className="p-5 sm:p-6" delay={.26}>
      <WidgetTitle icon={Trophy} title="Classement chauffeurs" subtitle="Podium mensuel" accent="#fbbf24" />
      <div className="space-y-2.5">
        {drivers.slice(0, 5).map((driver, index) => {
          const avatar = driver.avatar_url || driver.photo_url;
          return <div key={driver.id} className={`fleet-driver-row ${index < 3 ? 'is-podium' : ''}`}>
            <div className="fleet-rank-number" style={{ color: medals[index] || '#718096' }}>{index + 1}</div>
            <div className="fleet-driver-avatar">{avatar ? <img src={avatar} alt="" /> : (driver.pseudo || driver.name || '?')[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><strong className="text-xs text-white truncate block">{driver.pseudo || driver.name}</strong><span className="text-[9px] text-white/35">{driver.deliveries_count ?? 0} livraisons • {fmt(driver.total_km ?? 0)} km</span></div>
            {index < 3 && <Trophy className="w-4 h-4" style={{ color: medals[index] }} />}
          </div>;
        })}
        {drivers.length === 0 && <div className="py-16 text-center text-xs text-white/25">Classement en attente de données</div>}
      </div>
    </GlassCard>
  );
}

function NotificationsWidget({ notifications }: { notifications: DashboardNotification[] }) {
  return (
    <GlassCard className="p-5 sm:p-6" delay={.3}>
      <WidgetTitle icon={Bell} title="Notifications" subtitle="Derniers événements" />
      <div className="space-y-2.5">
        {notifications.slice(0, 5).map(n => <div key={n.id} className="fleet-notification-row">
          <div className={`fleet-notification-dot ${n.read ? '' : 'is-unread'}`}>{n.type === 'maintenance' ? <Wrench /> : n.read ? <CheckCircle2 /> : <Bell />}</div>
          <div className="flex-1 min-w-0"><strong className="text-[11px] text-white/85 truncate block">{n.title}</strong><p className="text-[9px] text-white/35 truncate">{n.message || 'Nouvel événement dans votre ERP'}</p></div>
          <time className="text-[8px] text-white/25 whitespace-nowrap">{fmtDateTime(n.created_at)}</time>
        </div>)}
        {notifications.length === 0 && <div className="py-16 text-center"><CheckCircle2 className="w-8 h-8 text-emerald-400/40 mx-auto mb-2"/><p className="text-xs text-white/30">Tout est sous contrôle</p></div>}
      </div>
    </GlassCard>
  );
}

function GoodRoad() {
  return (
    <GlassCard className="fleet-good-road p-6 sm:p-8 xl:col-span-2" delay={.34}>
      <div className="fleet-good-road-lines" />
      <div className="relative z-10 max-w-lg">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-red-300 font-semibold"><Navigation className="w-3.5 h-3.5"/> Prêt au départ</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-3">Bonne route.</h2>
        <p className="text-sm text-white/45 leading-relaxed mt-3">Consultez vos missions, validez les documents de transport et prenez la route en toute sérénité.</p>
        <Link to="/road-sheets" className="fleet-primary-button mt-6">Ouvrir les feuilles de route <ArrowUpRight className="w-4 h-4" /></Link>
      </div>
      <div className="fleet-good-road-truck"><Truck className="w-32 h-32" /></div>
    </GlassCard>
  );
}

export function FleetCommandCenter(props: FleetCommandCenterProps) {
  return (
    <div className="fleet-command-center space-y-5 sm:space-y-6 pb-8">
      <Hero displayName={props.displayName} onRefresh={props.onRefresh} refreshing={props.refreshing} lastUpdated={props.lastUpdated} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
        <DailyStats data={props.data} loading={props.loading} />
        <FleetDistribution data={props.data} />
        <MonthlyPerformance data={props.data} />
        <QuickOverview data={props.data} liveOps={props.liveOps} />
        <FranceMap vehicles={props.fleetMap} />
        <DriverRanking drivers={props.data.topDrivers} />
        <NotificationsWidget notifications={props.data.notifications} />
        <GoodRoad />
      </div>
    </div>
  );
}
